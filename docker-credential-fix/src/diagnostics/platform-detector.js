const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const { promisify } = require('util');

/**
 * Platform Detection Module
 * Detects the operating system, architecture, and Docker credential helper configuration
 */

class PlatformDetector {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.homedir = os.homedir();
  }

  /**
   * Get comprehensive platform information
   */
  async getPlatformInfo() {
    const info = {
      os: this.platform,
      arch: this.arch,
      version: os.release(),
      homedir: this.homedir,
      dockerVersion: null,
      dockerInfo: null,
      credentialHelper: null,
      dockerConfigPath: this.getDockerConfigPath(),
      keychainAccessible: false
    };

    try {
      // Get Docker version
      info.dockerVersion = await this.getDockerVersion();

      // Detect credential helper
      info.credentialHelper = await this.detectCredentialHelper();

      // Check keychain access (platform-specific)
      info.keychainAccessible = await this.checkKeychainAccess();

      // Get Docker info
      info.dockerInfo = await this.getDockerInfo();
    } catch (error) {
      // Continue with partial information if detection fails
      console.debug('Error during platform detection:', error.message);
    }

    return info;
  }

  /**
   * Get Docker daemon version
   */
  async getDockerVersion() {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Docker version check failed: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Docker not accessible: ${error.message}`));
      });
    });
  }

  /**
   * Get Docker system info
   */
  async getDockerInfo() {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', ['info', '--format', '{{json .}}'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output.trim()));
          } catch (parseError) {
            reject(new Error(`Failed to parse Docker info: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Docker info check failed: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Docker info not accessible: ${error.message}`));
      });
    });
  }

  /**
   * Get Docker configuration file path
   */
  getDockerConfigPath() {
    const dockerConfig = process.env.DOCKER_CONFIG;
    if (dockerConfig) {
      return path.join(dockerConfig, 'config.json');
    }
    return path.join(this.homedir, '.docker', 'config.json');
  }

  /**
   * Detect available credential helper
   */
  async detectCredentialHelper() {
    const helpers = this.getExpectedHelpers();

    // First try to detect from Docker config
    const configHelper = await this.detectFromConfig();
    if (configHelper) {
      return {
        type: 'config',
        helper: configHelper,
        available: await this.testCredentialHelper(configHelper)
      };
    }

    // Then try to detect from PATH
    for (const helper of helpers) {
      const isAvailable = await this.testCredentialHelper(helper);
      if (isAvailable) {
        return {
          type: 'detected',
          helper: helper,
          available: true
        };
      }
    }

    return {
      type: 'none',
      helper: null,
      available: false
    };
  }

  /**
   * Get expected credential helpers based on platform
   */
  getExpectedHelpers() {
    switch (this.platform) {
      case 'darwin':
        return ['docker-credential-osxkeychain'];
      case 'linux':
        return ['docker-credential-secretservice', 'docker-credential-pass'];
      case 'win32':
        return ['docker-credential-wincred.exe'];
      default:
        return [];
    }
  }

  /**
   * Detect credential helper from Docker config
   */
  async detectFromConfig() {
    try {
      const configPath = this.getDockerConfigPath();
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Check for credsStore
      if (config.credsStore) {
        return this.platform === 'win32' ? `${config.credsStore}.exe` : config.credsStore;
      }

      // Check for credHelpers
      if (config.credHelpers && config.credHelpers.length > 0) {
        return config.credHelpers[0];
      }

      return null;
    } catch (error) {
      // Config file might not exist or be malformed
      return null;
    }
  }

  /**
   * Test if a credential helper is working
   */
  async testCredentialHelper(helper) {
    return new Promise((resolve) => {
      const child = spawn(helper, ['list'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });

      let errorOutput = '';

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        // Exit status 1 is the error we're trying to detect
        if (code === 0) {
          resolve(true);
        } else if (code === 1) {
          // This is the specific error we're looking for
          resolve({
            working: false,
            error: 'exit status 1',
            stderr: errorOutput.trim()
          });
        } else {
          resolve(false);
        }
      });

      child.on('error', (error) => {
        resolve(false);
      });
    });
  }

  /**
   * Check keychain access (platform-specific)
   */
  async checkKeychainAccess() {
    switch (this.platform) {
      case 'darwin':
        return this.checkMacKeychainAccess();
      case 'linux':
        return this.checkLinuxSecretService();
      case 'win32':
        return this.checkWindowsCredentialManager();
      default:
        return false;
    }
  }

  /**
   * Check macOS keychain access
   */
  async checkMacKeychainAccess() {
    return new Promise((resolve) => {
      const child = spawn('security', ['list-keychains'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check Linux secret service
   */
  async checkLinuxSecretService() {
    return new Promise((resolve) => {
      const child = spawn('dbus-send', [
        '--session',
        '--dest=org.freedesktop.secrets',
        '--type=method_call',
        '--print-reply',
        '/org/freedesktop/secrets',
        'org.freedesktop.Secret.Service.OpenSession'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check Windows Credential Manager
   */
  async checkWindowsCredentialManager() {
    return new Promise((resolve) => {
      const child = spawn('cmd', ['/c', 'cmdkey', '/list'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get platform-specific diagnostic tests
   */
  getPlatformTests() {
    switch (this.platform) {
      case 'darwin':
        return this.getMacOSTests();
      case 'linux':
        return this.getLinuxTests();
      case 'win32':
        return this.getWindowsTests();
      default:
        return [];
    }
  }

  /**
   * Get macOS-specific diagnostic tests
   */
  getMacOSTests() {
    return [
      {
        name: "Keychain Access",
        test: () => this.checkMacKeychainAccess(),
        expected: "Returns list of available keychains",
        critical: false
      },
      {
        name: "Docker Keychain Entry",
        test: () => this.testCredentialHelper('docker-credential-osxkeychain'),
        expected: "Returns JSON object of stored credentials",
        critical: true
      },
      {
        name: "Homebrew Installation",
        test: () => this.checkCommandExists('brew'),
        expected: "Homebrew package manager available",
        critical: false
      }
    ];
  }

  /**
   * Get Linux-specific diagnostic tests
   */
  getLinuxTests() {
    return [
      {
        name: "D-Bus Service",
        test: () => this.checkLinuxSecretService(),
        expected: "D-Bus responds with session handle",
        critical: true
      },
      {
        name: "Secret Service API",
        test: () => this.testCredentialHelper('docker-credential-secretservice'),
        expected: "Returns JSON array of stored credentials",
        critical: true
      },
      {
        name: "GNOME Keyring",
        test: () => this.checkCommandExists('gnome-keyring-daemon'),
        expected: "GNOME Keyring daemon accessible",
        critical: false
      }
    ];
  }

  /**
   * Get Windows-specific diagnostic tests
   */
  getWindowsTests() {
    return [
      {
        name: "Credential Manager Access",
        test: () => this.testCredentialHelper('docker-credential-wincred.exe'),
        expected: "Returns JSON array of Windows credentials",
        critical: true
      },
      {
        name: "Windows Security Context",
        test: () => this.checkWindowsSecurityContext(),
        expected: "Process runs with appropriate privileges",
        critical: false
      },
      {
        name: "Registry Access",
        test: () => this.checkRegistryAccess(),
        expected: "Can read Docker registry entries",
        critical: false
      }
    ];
  }

  /**
   * Check if a command exists in PATH
   */
  async checkCommandExists(command) {
    return new Promise((resolve) => {
      const child = spawn('which', [command], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 3000
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check Windows security context
   */
  async checkWindowsSecurityContext() {
    // This would check if we're running with appropriate privileges
    // For now, just check if we can access user-level directories
    try {
      await fs.access(this.homedir, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Windows registry access
   */
  async checkRegistryAccess() {
    return new Promise((resolve) => {
      const child = spawn('reg', ['query', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Docker'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 3000
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = PlatformDetector;