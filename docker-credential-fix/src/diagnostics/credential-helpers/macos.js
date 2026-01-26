const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * macOS Credential Helper Diagnostics
 * Comprehensive diagnostics for Docker credential issues on macOS
 */

class MacOSDiagnostics {
  constructor() {
    this.timeout = 10000;
    this.keychainPath = path.join(os.homedir(), 'Library', 'Keychains');
    this.loginKeychain = path.join(this.keychainPath, 'login.keychain-db');
  }

  /**
   * Run comprehensive macOS credential helper diagnostics
   */
  async runDiagnostics() {
    const results = {
      platform: 'macos',
      version: os.release(),
      arch: os.arch(),
      keychain: await this.checkKeychainAccess(),
      credentialHelper: await this.checkCredentialHelper(),
      homebrew: await this.checkHomebrew(),
      dockerDesktop: await this.checkDockerDesktop(),
      permissions: await this.checkSystemPermissions(),
      configuration: await this.checkDockerConfig(),
      issues: [],
      recommendations: []
    };

    // Analyze results and identify issues
    this.analyzeResults(results);

    return results;
  }

  /**
   * Check macOS keychain access
   */
  async checkKeychainAccess() {
    const checks = {
      keychainAccessible: false,
      keychainFiles: [],
      defaultKeychain: null,
      keychainPermissions: false,
      keychainStatus: 'unknown',
      errors: []
    };

    try {
      // Check keychain files exist
      const keychainFiles = await fs.readdir(this.keychainPath);
      checks.keychainFiles = keychainFiles.filter(file =>
        file.endsWith('.keychain-db') || file.endsWith('.keychain')
      );

      // Check login keychain specifically
      try {
        await fs.access(this.loginKeychain);
        checks.defaultKeychain = 'login.keychain-db';
      } catch (error) {
        checks.errors.push({
          code: 'NO_LOGIN_KEYCHAIN',
          message: 'Login keychain not found',
          suggestion: 'Create login keychain through Keychain Access'
        });
      }

      // Test keychain access with security command
      const keychains = await this.executeCommand('security', ['list-keychains']);
      checks.keychainAccessible = true;
      checks.keychainStatus = 'accessible';

      // Check keychain permissions
      if (checks.keychainFiles.length > 0) {
        checks.keychainPermissions = await this.checkKeychainPermissions();
      }

    } catch (error) {
      checks.keychainAccessible = false;
      checks.keychainStatus = 'inaccessible';
      checks.errors.push({
        code: 'KEYCHAIN_ACCESS_DENIED',
        message: `Cannot access keychain: ${error.message}`,
        suggestion: 'Check macOS Security & Privacy settings for keychain access'
      });
    }

    return checks;
  }

  /**
   * Check Docker credential helper
   */
  async checkCredentialHelper() {
    const checks = {
      helperInstalled: false,
      helperPath: null,
      helperWorking: false,
      helperVersion: null,
      helperPermissions: false,
      errors: [],
      testResults: []
    };

    const helpers = ['docker-credential-osxkeychain', 'docker-credential-desktop'];

    for (const helper of helpers) {
      const helperResult = await this.testCredentialHelper(helper);
      checks.testResults.push(helperResult);

      if (helperResult.installed) {
        checks.helperInstalled = true;
        checks.helperPath = helperResult.path;
        checks.helperVersion = helperResult.version;
        checks.helperWorking = helperResult.working;
        checks.helperPermissions = helperResult.permissions;

        // If we found a working helper, break
        if (helperResult.working) {
          break;
        }
      }
    }

    if (!checks.helperInstalled) {
      checks.errors.push({
        code: 'NO_CREDENTIAL_HELPER',
        message: 'Docker credential helper not installed',
        suggestion: 'Install docker-credential-osxkeychain via Homebrew or Docker Desktop'
      });
    }

    if (checks.helperInstalled && !checks.helperWorking) {
      checks.errors.push({
        code: 'CREDENTIAL_HELPER_BROKEN',
        message: `Credential helper exists but fails with: ${checks.testResults[0]?.error || 'Unknown error'}`,
        suggestion: 'Reinstall docker-credential-osxkeychain or reset keychain permissions'
      });
    }

    return checks;
  }

  /**
   * Test a specific credential helper
   */
  async testCredentialHelper(helperName) {
    const result = {
      name: helperName,
      installed: false,
      path: null,
      working: false,
      version: null,
      permissions: false,
      error: null
    };

    try {
      // Check if helper is in PATH
      const whichOutput = await this.executeCommand('which', [helperName], { timeout: 3000 });
      result.installed = true;
      result.path = whichOutput.trim();

      // Check permissions
      const stats = await fs.stat(result.path);
      result.permissions = (stats.mode & parseInt('111', 8)) !== 0;

      if (!result.permissions) {
        result.error = 'Helper not executable';
        return result;
      }

      // Test helper functionality (this should fail with exit status 1 for the problem we're fixing)
      try {
        await this.executeCommand(helperName, ['list'], { timeout: 5000 });
        result.working = true;
      } catch (error) {
        if (error.message.includes('exit status 1')) {
          result.error = 'exit status 1'; // This is the specific error we're detecting
        } else {
          result.error = error.message;
        }
        result.working = false;
      }

      // Try to get version if available
      try {
        const versionOutput = await this.executeCommand(helperName, ['--version'], { timeout: 3000 });
        result.version = versionOutput.trim();
      } catch (error) {
        // Version command not supported, that's ok
        result.version = 'unknown';
      }

    } catch (error) {
      result.installed = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Check Homebrew installation
   */
  async checkHomebrew() {
    const checks = {
      homebrewInstalled: false,
      homebrewPath: null,
      homebrewVersion: null,
      dockerCredentialPackage: false,
      errors: []
    };

    try {
      // Check if Homebrew is installed
      const brewPath = await this.executeCommand('which', ['brew'], { timeout: 3000 });
      checks.homebrewInstalled = true;
      checks.homebrewPath = brewPath.trim();

      // Get Homebrew version
      const versionOutput = await this.executeCommand('brew', ['--version'], { timeout: 5000 });
      checks.homebrewVersion = versionOutput.split('\n')[0].trim();

      // Check if docker-credential-helper is installed via Homebrew
      try {
        const packageInfo = await this.executeCommand('brew', ['list', 'docker-credential-helper'], { timeout: 5000 });
        checks.dockerCredentialPackage = true;
      } catch (error) {
        checks.dockerCredentialPackage = false;
        checks.errors.push({
          code: 'NO_HOMEBREW_PACKAGE',
          message: 'docker-credential-helper not installed via Homebrew',
          suggestion: 'Run "brew install docker-credential-helper"'
        });
      }

    } catch (error) {
      checks.homebrewInstalled = false;
      checks.errors.push({
        code: 'NO_HOMEBREW',
        message: 'Homebrew not installed',
        suggestion: 'Install Homebrew from https://brew.sh/'
      });
    }

    return checks;
  }

  /**
   * Check Docker Desktop installation and status
   */
  async checkDockerDesktop() {
    const checks = {
      dockerDesktopInstalled: false,
      dockerDesktopRunning: false,
      dockerDesktopPath: null,
      dockerDesktopVersion: null,
      dockerEngineVersion: null,
      dockerPermissions: false,
      errors: []
    };

    try {
      // Check if Docker Desktop is installed
      const appPath = '/Applications/Docker.app';
      try {
        await fs.access(appPath);
        checks.dockerDesktopInstalled = true;
        checks.dockerDesktopPath = appPath;
      } catch (error) {
        checks.dockerDesktopInstalled = false;
        checks.errors.push({
          code: 'NO_DOCKER_DESKTOP',
          message: 'Docker Desktop not installed',
          suggestion: 'Install Docker Desktop from https://www.docker.com/products/docker-desktop/'
        });
        return checks;
      }

      // Check if Docker Desktop is running
      try {
        const versionOutput = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
        checks.dockerDesktopRunning = true;
        checks.dockerEngineVersion = this.parseDockerVersion(versionOutput);
      } catch (error) {
        checks.dockerDesktopRunning = false;
        checks.errors.push({
          code: 'DOCKER_NOT_RUNNING',
          message: 'Docker daemon is not running',
          suggestion: 'Start Docker Desktop from Applications folder'
        });
      }

      // Check Docker Desktop permissions
      checks.dockerPermissions = await this.checkDockerPermissions();

      // Try to get Docker Desktop version from Info.plist
      try {
        const plistPath = path.join(appPath, 'Contents', 'Info.plist');
        const plistContent = await fs.readFile(plistPath, 'utf8');
        const versionMatch = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
        if (versionMatch) {
          checks.dockerDesktopVersion = versionMatch[1];
        }
      } catch (error) {
        // Info.plist not accessible, not critical
      }

    } catch (error) {
      checks.errors.push({
        code: 'DOCKER_DESKTOP_ERROR',
        message: `Error checking Docker Desktop: ${error.message}`,
        suggestion: 'Reinstall Docker Desktop'
      });
    }

    return checks;
  }

  /**
   * Check system permissions for Docker
   */
  async checkSystemPermissions() {
    const checks = {
      diskAccess: false,
      fullDiskAccess: false,
      keychainAccess: false,
      securityAssessment: false,
      permissionErrors: []
    };

    try {
      // Check if we can read docker config directory
      const dockerConfigPath = path.join(os.homedir(), '.docker');
      try {
        await fs.access(dockerConfigPath, fs.constants.R_OK | fs.constants.W_OK);
        checks.keychainAccess = true;
      } catch (error) {
        checks.permissionErrors.push({
          area: 'docker-config',
          error: 'Cannot read/write .docker directory',
          suggestion: 'Grant file permissions to Docker Desktop'
        });
      }

      // Check if Docker Desktop has full disk access
      checks.fullDiskAccess = await this.checkFullDiskAccess();

      // Check keychain permissions for Docker
      checks.keychainAccess = await this.checkKeychainPermissions();

    } catch (error) {
      checks.permissionErrors.push({
        area: 'system',
        error: `Permission check failed: ${error.message}`,
        suggestion: 'Check macOS Security & Privacy settings'
      });
    }

    return checks;
  }

  /**
   * Check Docker configuration file
   */
  async checkDockerConfig() {
    const checks = {
      configExists: false,
      configValid: false,
      configPath: path.join(os.homedir(), '.docker', 'config.json'),
      configContent: null,
      credentialHelperConfigured: false,
      errors: [],
      warnings: []
    };

    try {
      // Check if config file exists
      await fs.access(checks.configPath);
      checks.configExists = true;

      // Read and parse config
      const configContent = await fs.readFile(checks.configPath, 'utf8');
      checks.configContent = configContent;

      try {
        const config = JSON.parse(configContent);
        checks.configValid = true;

        // Check for credential helper configuration
        if (config.credsStore) {
          checks.credentialHelperConfigured = true;

          // Validate the configured helper
          const helperValid = await this.validateCredentialHelper(config.credsStore);
          if (!helperValid) {
            checks.errors.push({
              code: 'INVALID_CREDENTIALS_HELPER_CONFIG',
              message: `Configured credential helper not working: ${config.credsStore}`,
              suggestion: 'Remove credsStore from config or fix credential helper'
            });
          }
        }

        // Check for deprecated auths format
        if (config.auths && typeof config.auths === 'string') {
          checks.errors.push({
            code: 'DEPRECATED_AUTHS_FORMAT',
            message: 'auths field should be an object, not a string',
            suggestion: 'Update auths field to object format'
          });
        }

        // Check for missing required fields
        if (!config.auths) {
          checks.warnings.push({
            code: 'MISSING_AUTHS_FIELD',
            message: 'auths field missing from Docker configuration',
            suggestion: 'Add "auths": {} to Docker config'
          });
        }

      } catch (parseError) {
        checks.configValid = false;
        checks.errors.push({
          code: 'CONFIG_PARSE_ERROR',
          message: `Invalid JSON in Docker config: ${parseError.message}`,
          suggestion: 'Fix JSON syntax in Docker configuration file'
        });
      }

    } catch (error) {
      // Config file doesn't exist - this is normal for fresh installations
      checks.configExists = false;
      checks.warnings.push({
        code: 'NO_CONFIG_FILE',
        message: 'Docker configuration file not found',
        suggestion: 'This is normal for fresh Docker installations'
      });
    }

    return checks;
  }

  /**
   * Check keychain permissions
   */
  async checkKeychainPermissions() {
    try {
      const output = await this.executeCommand('security', ['show-keychain-info', this.loginKeychain], { timeout: 3000 });
      return output.includes('accessible');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check full disk access for Docker Desktop
   */
  async checkFullDiskAccess() {
    try {
      // This is a simplified check - in reality, full disk access is complex to detect
      // We'll check if Docker can read system directories
      await fs.access('/Library/Preferences/com.docker.docker.plist', fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Docker permissions
   */
  async checkDockerPermissions() {
    try {
      const output = await this.executeCommand('groups', [], { timeout: 3000 });
      return output.includes('staff') || output.includes('admin');
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate credential helper
   */
  async validateCredentialHelper(helperName) {
    try {
      await this.executeCommand(helperName, ['list'], { timeout: 3000 });
      return true;
    } catch (error) {
      if (error.message.includes('exit status 1')) {
        return false; // This is the broken helper we need to fix
      }
      return false;
    }
  }

  /**
   * Analyze diagnostic results and identify issues
   */
  analyzeResults(results) {
    // Collect all errors
    const allErrors = [
      ...results.keychain.errors,
      ...results.credentialHelper.errors,
      ...results.homebrew.errors,
      ...results.dockerDesktop.errors,
      ...results.permissions.permissionErrors,
      ...results.configuration.errors
    ];

    results.issues = allErrors;

    // Generate recommendations based on issues
    results.recommendations = this.generateRecommendations(results);
  }

  /**
   * Generate recommendations based on diagnostic results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check for critical issues
    if (!results.dockerDesktop.dockerDesktopInstalled) {
      recommendations.push({
        priority: 'critical',
        title: 'Install Docker Desktop',
        description: 'Docker Desktop is required for credential management on macOS',
        actions: [
          'Download Docker Desktop from https://www.docker.com/products/docker-desktop/',
          'Install and restart Docker Desktop'
        ]
      });
    }

    if (!results.dockerDesktop.dockerDesktopRunning) {
      recommendations.push({
        priority: 'critical',
        title: 'Start Docker Desktop',
        description: 'Docker daemon must be running for credential management',
        actions: [
          'Launch Docker Desktop from Applications folder',
          'Wait for Docker to fully start (check menu bar icon)'
        ]
      });
    }

    if (!results.credentialHelper.helperInstalled) {
      recommendations.push({
        priority: 'high',
        title: 'Install Docker Credential Helper',
        description: 'Credential helper is needed to store Docker credentials securely',
        actions: [
          'Install via Homebrew: brew install docker-credential-helper',
          'Or use Docker Desktop built-in credential helper'
        ]
      });
    }

    if (results.credentialHelper.helperInstalled && !results.credentialHelper.helperWorking) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Broken Credential Helper',
        description: 'The credential helper is installed but not working properly',
        actions: [
          'Reinstall credential helper: brew reinstall docker-credential-helper',
          'Or remove credsStore from ~/.docker/config.json'
        ]
      });
    }

    if (!results.permissions.keychainAccess) {
      recommendations.push({
        priority: 'medium',
        title: 'Fix Keychain Permissions',
        description: 'Docker needs access to macOS keychain for credential storage',
        actions: [
          'Open System Preferences > Security & Privacy > Privacy',
          'Add Docker Desktop to Full Disk Access',
          'Restart Docker Desktop'
        ]
      });
    }

    if (results.configuration.configExists && !results.configuration.configValid) {
      recommendations.push({
        priority: 'medium',
        title: 'Fix Docker Configuration',
        description: 'Docker configuration file has syntax or format issues',
        actions: [
          'Backup ~/.docker/config.json',
          'Fix JSON syntax errors in configuration file',
          'Or remove invalid configuration entries'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Parse Docker version string
   */
  parseDockerVersion(versionString) {
    const match = versionString.match(/Docker version (\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Execute a system command with timeout
   */
  async executeCommand(command, args, options = {}) {
    const timeout = options.timeout || this.timeout;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Command execution error: ${error.message}`));
      });
    });
  }
}

module.exports = MacOSDiagnostics;