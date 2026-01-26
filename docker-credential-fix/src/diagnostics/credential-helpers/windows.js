const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * Windows Credential Helper Diagnostics
 * Comprehensive diagnostics for Docker credential issues on Windows
 */

class WindowsDiagnostics {
  constructor() {
    this.timeout = 10000;
    this.homeDir = os.homedir();
    this.programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    this.programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  }

  /**
   * Run comprehensive Windows credential helper diagnostics
   */
  async runDiagnostics() {
    const results = {
      platform: 'windows',
      version: await this.getWindowsVersion(),
      build: await this.getWindowsBuild(),
      arch: os.arch(),
      dockerDesktop: await this.checkDockerDesktop(),
      credentialHelper: await this.checkCredentialHelper(),
      credentialManager: await this.checkCredentialManager(),
      permissions: await this.checkWindowsPermissions(),
      registry: await this.checkRegistrySettings(),
      configuration: await this.checkDockerConfig(),
      services: await this.checkWindowsServices(),
      issues: [],
      recommendations: []
    };

    // Analyze results and identify issues
    this.analyzeResults(results);

    return results;
  }

  /**
   * Get Windows version information
   */
  async getWindowsVersion() {
    try {
      const output = await this.executeCommand('cmd', ['/c', 'ver'], { timeout: 3000 });
      const match = output.match(/Microsoft Windows \[Version ([^\]]+)\]/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get Windows build number
   */
  async getWindowsBuild() {
    try {
      const output = await this.executeCommand('cmd', ['/c', 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version"'], { timeout: 5000 });
      return output.trim();
    } catch (error) {
      return 'unknown';
    }
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
      dockerEngineRunning: false,
      windowsContainersEnabled: false,
      errors: []
    };

    // Check Docker Desktop installation
    const possiblePaths = [
      path.join(this.programFiles, 'Docker', 'Docker', 'Docker Desktop.exe'),
      path.join(this.programFilesX86, 'Docker', 'Docker', 'Docker Desktop.exe'),
      path.join(this.homeDir, 'AppData', 'Local', 'Programs', 'Docker', 'Docker Desktop.exe')
    ];

    for (const dockerPath of possiblePaths) {
      try {
        await fs.access(dockerPath);
        checks.dockerDesktopInstalled = true;
        checks.dockerDesktopPath = dockerPath;
        break;
      } catch (error) {
        // Try next path
      }
    }

    if (!checks.dockerDesktopInstalled) {
      checks.errors.push({
        code: 'DOCKER_DESKTOP_NOT_INSTALLED',
        message: 'Docker Desktop is not installed',
        suggestion: 'Install Docker Desktop from https://www.docker.com/products/docker-desktop/'
      });
      return checks;
    }

    // Check Docker Desktop process
    try {
      const processList = await this.executeCommand('tasklist', ['/FI', 'IMAGENAME eq "Docker Desktop.exe"'], { timeout: 3000 });
      checks.dockerDesktopRunning = processList.includes('Docker Desktop.exe');
    } catch (error) {
      checks.dockerDesktopRunning = false;
    }

    // Get Docker Desktop version from registry or file properties
    checks.dockerDesktopVersion = await this.getDockerDesktopVersion();

    // Check Docker Engine status
    try {
      const versionOutput = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
      checks.dockerEngineVersion = this.parseDockerVersion(versionOutput);
      checks.dockerEngineRunning = true;
    } catch (error) {
      checks.dockerEngineRunning = false;
      checks.errors.push({
        code: 'DOCKER_ENGINE_NOT_RUNNING',
        message: 'Docker Engine is not running',
        suggestion: 'Start Docker Desktop or restart Docker service'
      });
    }

    // Check Windows Containers feature
    try {
      const featureStatus = await this.executeCommand('powershell', [
        '-Command',
        'Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V | Select-Object State'
      ], { timeout: 5000 });
      checks.windowsContainersEnabled = featureStatus.includes('Enabled');
    } catch (error) {
      checks.windowsContainersEnabled = false;
    }

    return checks;
  }

  /**
   * Get Docker Desktop version
   */
  async getDockerDesktopVersion() {
    // Try to read from registry first
    try {
      const registryOutput = await this.executeCommand('reg', [
        'query',
        'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Docker Desktop',
        '/v', 'DisplayVersion'
      ], { timeout: 3000 });
      const match = registryOutput.match(/DisplayVersion\s+REG_SZ\s+([^\s]+)/);
      if (match) return match[1];
    } catch (error) {
      // Registry check failed
    }

    // Try to get version from executable properties
    try {
      const versionOutput = await this.executeCommand('powershell', [
        '-Command',
        `(Get-ItemProperty "${checks.dockerDesktopPath}").VersionInfo.FileVersion`
      ], { timeout: 3000 });
      return versionOutput.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Check Docker credential helper
   */
  async checkCredentialHelper() {
    const checks = {
      helperInstalled: false,
      helperWorking: false,
      helperPath: null,
      helperVersion: null,
      helperPermissions: false,
      availableHelpers: [],
      testResults: [],
      errors: []
    };

    const helpers = [
      'docker-credential-wincred.exe',
      'docker-credential-desktop.exe',
      'docker-credential-ecr-login.exe',
      'docker-credential-acr-login.exe'
    ];

    for (const helper of helpers) {
      const helperResult = await this.testCredentialHelper(helper);
      checks.testResults.push(helperResult);

      if (helperResult.installed) {
        checks.availableHelpers.push({
          name: helper,
          path: helperResult.path,
          working: helperResult.working,
          permissions: helperResult.permissions,
          version: helperResult.version
        });
      }
    }

    checks.helperInstalled = checks.availableHelpers.length > 0;

    if (checks.helperInstalled) {
      // Check if any helper is working
      const workingHelper = checks.availableHelpers.find(h => h.working);
      if (workingHelper) {
        checks.helperWorking = true;
        checks.helperPath = workingHelper.path;
        checks.helperVersion = workingHelper.version;
      } else {
        // All installed helpers are broken
        const primaryHelper = checks.availableHelpers[0];
        checks.helperPath = primaryHelper.path;
        checks.helperVersion = primaryHelper.version;
        checks.errors.push({
          code: 'ALL_CREDENTIAL_HELPERS_BROKEN',
          message: `All credential helpers fail with exit status 1`,
          suggestion: 'Remove credential helper from Docker config or fix Windows Credential Manager'
        });
      }
    } else {
      checks.errors.push({
        code: 'NO_CREDENTIAL_HELPER',
        message: 'No Docker credential helper installed',
        suggestion: 'Install Docker Desktop which includes Windows credential helper'
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
      permissions: false,
      version: null,
      error: null
    };

    try {
      // Check if helper is in PATH
      const whichOutput = await this.executeCommand('where', [helperName], { timeout: 3000 });
      result.installed = true;
      result.path = whichOutput.split('\n')[0].trim();

      // Check permissions (on Windows, check if file exists and is executable)
      try {
        await fs.access(result.path, fs.constants.R_OK | fs.constants.X_OK);
        result.permissions = true;
      } catch (error) {
        result.permissions = false;
        result.error = 'Helper not accessible';
        return result;
      }

      // Test helper functionality (this should fail with exit status 1 for problem we're fixing)
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
   * Check Windows Credential Manager
   */
  async checkCredentialManager() {
    const checks = {
      credentialManagerAccessible: false,
      credentialManagerWorking: false,
      dockerCredentialsFound: false,
      totalCredentials: 0,
      credentialTypes: [],
      errors: [],
      testResults: []
    };

    try {
      // Test cmdkey command
      const cmdkeyOutput = await this.executeCommand('cmdkey', ['/list'], { timeout: 5000 });
      checks.credentialManagerAccessible = true;
      checks.credentialManagerWorking = true;

      // Parse credential list
      const lines = cmdkeyOutput.split('\n');
      const credentialLines = lines.filter(line => line.includes('Target:'));

      checks.totalCredentials = credentialLines.length;

      // Find Docker-related credentials
      const dockerCredentials = credentialLines.filter(line =>
        line.toLowerCase().includes('docker') ||
        line.toLowerCase().includes('index.docker.io')
      );
      checks.dockerCredentialsFound = dockerCredentials.length > 0;

      // Categorize credentials
      for (const line of credentialLines) {
        if (line.includes('Index.Docker.IO')) {
          checks.credentialTypes.push('Docker Hub');
        } else if (line.includes('ecr.amazonaws.com')) {
          checks.credentialTypes.push('Amazon ECR');
        } else if (line.includes('azurecr.io')) {
          checks.credentialTypes.push('Azure Container Registry');
        } else if (line.includes('gcr.io')) {
          checks.credentialTypes.push('Google Container Registry');
        }
      }

    } catch (error) {
      checks.credentialManagerAccessible = false;
      checks.credentialManagerWorking = false;
      checks.errors.push({
        code: 'CREDENTIAL_MANAGER_INACCESSIBLE',
        message: `Cannot access Windows Credential Manager: ${error.message}`,
        suggestion: 'Check Windows security settings and run as administrator if needed'
      });
    }

    // Test specific Windows credential operations
    const tests = [
      {
        name: 'List System Credentials',
        command: 'cmdkey',
        args: ['/list'],
        expected: 'Returns list of system credentials'
      },
      {
        name: 'Check User Credentials',
        command: 'cmdkey',
        args: ['/list:Target=*'],
        expected: 'Returns list of user credentials'
      }
    ];

    for (const test of tests) {
      const testResult = await this.runCredentialTest(test);
      checks.testResults.push(testResult);
    }

    return checks;
  }

  /**
   * Run a credential manager test
   */
  async runCredentialTest(test) {
    const result = {
      name: test.name,
      success: false,
      output: null,
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      const output = await this.executeCommand(test.command, test.args, { timeout: 5000 });
      result.success = true;
      result.output = output.trim();
    } catch (error) {
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Check Windows permissions
   */
  async checkWindowsPermissions() {
    const checks = {
      isAdministrator: false,
      uacEnabled: false,
      dockerServiceRunning: false,
      dockerServiceAccess: false,
      fileSystemAccess: false,
      registryAccess: false,
      errors: []
    };

    try {
      // Check if running as administrator
      try {
        await this.executeCommand('net', ['session'], { timeout: 3000 });
        checks.isAdministrator = true;
      } catch (error) {
        checks.isAdministrator = false;
      }

      // Check UAC status
      try {
        const uacOutput = await this.executeCommand('powershell', [
          '-Command',
          'Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name EnableLUA'
        ], { timeout: 3000 });
        checks.uacEnabled = uacOutput.includes('1') || uacOutput.toLowerCase().includes('true');
      } catch (error) {
        checks.uacEnabled = false;
      }

      // Check Docker service
      try {
        const serviceStatus = await this.executeCommand('sc', ['query', 'docker'], { timeout: 3000 });
        checks.dockerServiceRunning = serviceStatus.includes('RUNNING');
      } catch (error) {
        checks.dockerServiceRunning = false;
      }

      // Check Docker service access
      try {
        if (checks.dockerServiceRunning) {
          const serviceConfig = await this.executeCommand('sc', ['qc', 'docker'], { timeout: 3000 });
          checks.dockerServiceAccess = true;
        }
      } catch (error) {
        checks.dockerServiceAccess = false;
        checks.errors.push({
          code: 'DOCKER_SERVICE_ACCESS_DENIED',
          message: 'Cannot access Docker service configuration',
          suggestion: 'Run as administrator or check Docker permissions'
        });
      }

      // Check file system access to Docker directories
      try {
        const dockerDir = path.join(this.homeDir, '.docker');
        await fs.access(dockerDir, fs.constants.R_OK | fs.constants.W_OK);
        checks.fileSystemAccess = true;
      } catch (error) {
        checks.fileSystemAccess = false;
        checks.errors.push({
          code: 'DOCKER_DIRECTORY_ACCESS_DENIED',
          message: 'Cannot access Docker configuration directory',
          suggestion: 'Check file permissions or run as administrator'
        });
      }

      // Check registry access
      try {
        await this.executeCommand('reg', [
          'query',
          'HKEY_LOCAL_MACHINE\\SOFTWARE\\Docker'
        ], { timeout: 3000 });
        checks.registryAccess = true;
      } catch (error) {
        checks.registryAccess = false;
        checks.errors.push({
          code: 'REGISTRY_ACCESS_DENIED',
          message: 'Cannot access Docker registry keys',
          suggestion: 'Run as administrator to access Docker registry settings'
        });
      }

    } catch (error) {
      checks.errors.push({
        code: 'PERMISSION_CHECK_FAILED',
        message: `Permission check failed: ${error.message}`,
        suggestion: 'Run as administrator for full diagnostic capabilities'
      });
    }

    return checks;
  }

  /**
   * Check Windows registry settings
   */
  async checkRegistrySettings() {
    const checks = {
      dockerRegistryExists: false,
      dockerDesktopRegistryExists: false,
      credentialHelperRegistryExists: false,
      registryKeys: [],
      errors: []
    };

    const registryPaths = [
      {
        path: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Docker',
        name: 'Docker Installation',
        exists: false
      },
      {
        path: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Docker Desktop',
        name: 'Docker Desktop',
        exists: false
      },
      {
        path: 'HKEY_CURRENT_USER\\SOFTWARE\\Docker',
        name: 'Docker User Settings',
        exists: false
      },
      {
        path: 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.docker',
        name: 'Docker File Extensions',
        exists: false
      }
    ];

    for (const regPath of registryPaths) {
      try {
        await this.executeCommand('reg', ['query', regPath.path], { timeout: 3000 });
        regPath.exists = true;
        checks.registryKeys.push(regPath);
      } catch (error) {
        // Registry key doesn't exist, that's ok
      }
    }

    checks.dockerRegistryExists = checks.registryKeys.some(key =>
      key.path.includes('SOFTWARE\\Docker')
    );
    checks.dockerDesktopRegistryExists = checks.registryKeys.some(key =>
      key.path.includes('Docker Desktop')
    );

    // Check for credential helper related registry entries
    try {
      const credentialHelperOutput = await this.executeCommand('reg', [
        'query',
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\LastVisitedPidlMRU'
      ], { timeout: 3000 });
      checks.credentialHelperRegistryExists = true;
    } catch (error) {
      checks.credentialHelperRegistryExists = false;
    }

    return checks;
  }

  /**
   * Check Docker configuration
   */
  async checkDockerConfig() {
    const checks = {
      configExists: false,
      configValid: false,
      configPath: path.join(this.homeDir, '.docker', 'config.json'),
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

          // Validate configured helper
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
   * Check Windows services
   */
  async checkWindowsServices() {
    const checks = {
      dockerService: { name: 'Docker', running: false, status: null, error: null },
      dockerDesktopService: { name: 'com.docker.service', running: false, status: null, error: null },
      hyperVService: { name: 'vmms', running: false, status: null, error: null },
      errors: []
    };

    const services = [
      { ...checks.dockerService, key: 'dockerService' },
      { ...checks.dockerDesktopService, key: 'dockerDesktopService' },
      { ...checks.hyperVService, key: 'hyperVService' }
    ];

    for (const service of services) {
      try {
        const output = await this.executeCommand('sc', ['query', service.name], { timeout: 3000 });
        service.running = output.includes('RUNNING');
        service.status = service.running ? 'running' : 'stopped';
      } catch (error) {
        service.status = 'not_found';
        service.error = error.message;
      }
      checks[service.key] = service;
    }

    // Check if Docker service should be running
    if (!checks.dockerService.running && !checks.dockerDesktopService.running) {
      checks.errors.push({
        code: 'NO_DOCKER_SERVICE_RUNNING',
        message: 'Neither Docker service nor Docker Desktop service is running',
        suggestion: 'Start Docker Desktop or start Docker service manually'
      });
    }

    return checks;
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
        timeout,
        shell: true
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

  /**
   * Analyze diagnostic results and identify issues
   */
  analyzeResults(results) {
    // Collect all errors
    const allErrors = [
      ...results.dockerDesktop.errors,
      ...results.credentialHelper.errors,
      ...results.credentialManager.errors,
      ...results.permissions.errors,
      ...results.registry.errors,
      ...results.configuration.errors,
      ...results.services.errors
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
        description: 'Docker Desktop is required for credential management on Windows',
        actions: [
          'Download Docker Desktop from https://www.docker.com/products/docker-desktop/',
          'Run installer with administrator privileges',
          'Restart computer after installation'
        ]
      });
    }

    if (!results.dockerDesktop.dockerDesktopRunning) {
      recommendations.push({
        priority: 'critical',
        title: 'Start Docker Desktop',
        description: 'Docker Desktop must be running for credential management',
        actions: [
          'Launch Docker Desktop from Start menu',
          'Wait for Docker to fully start (check system tray)',
          'If issues persist, restart Docker Desktop'
        ]
      });
    }

    if (!results.credentialHelper.helperInstalled) {
      recommendations.push({
        priority: 'high',
        title: 'Install Docker Credential Helper',
        description: 'Credential helper is needed to store Docker credentials securely',
        actions: [
          'Install Docker Desktop which includes Windows credential helper',
          'Or download and install docker-credential-wincred.exe manually',
          'Ensure credential helper is in system PATH'
        ]
      });
    }

    if (results.credentialHelper.helperInstalled && !results.credentialHelper.helperWorking) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Broken Credential Helper',
        description: 'The credential helper is installed but not working properly',
        actions: [
          'Check Windows Credential Manager is accessible',
          'Remove credsStore from ~/.docker/config.json',
          'Restart Docker Desktop',
          'Run as administrator if permission issues persist'
        ]
      });
    }

    if (!results.credentialManager.credentialManagerAccessible) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Windows Credential Manager',
        description: 'Windows Credential Manager is required for credential storage',
        actions: [
          'Run as administrator',
          'Check Windows security settings',
          'Restart Windows Credential Manager service',
          'Check Windows updates'
        ]
      });
    }

    if (!results.permissions.isAdministrator && results.services.dockerService.status === 'not_found') {
      recommendations.push({
        priority: 'medium',
        title: 'Run with Administrator Privileges',
        description: 'Some Docker operations require administrator privileges',
        actions: [
          'Right-click command prompt and select "Run as administrator"',
          'Or add user to local administrators group',
          'Restart after changing group membership'
        ]
      });
    }

    if (!results.services.dockerService.running && !results.services.dockerDesktopService.running) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Docker Services',
        description: 'Docker services are not running',
        actions: [
          'Start Docker Desktop (recommended)',
          'Or start Docker service: net start docker',
          'Check Windows Services configuration'
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
}

module.exports = WindowsDiagnostics;