const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * Linux Credential Helper Diagnostics
 * Comprehensive diagnostics for Docker credential issues on Linux
 */

class LinuxDiagnostics {
  constructor() {
    this.timeout = 10000;
    this.homeDir = os.homedir();
  }

  /**
   * Run comprehensive Linux credential helper diagnostics
   */
  async runDiagnostics() {
    const results = {
      platform: 'linux',
      distribution: await this.getLinuxDistribution(),
      version: os.release(),
      arch: os.arch(),
      desktopEnvironment: await this.getDesktopEnvironment(),
      secretService: await this.checkSecretService(),
      credentialHelper: await this.checkCredentialHelper(),
      dbus: await this.checkDBusService(),
      packageManager: await this.checkPackageManager(),
      dockerInstallation: await this.checkDockerInstallation(),
      permissions: await this.checkLinuxPermissions(),
      configuration: await this.checkDockerConfig(),
      issues: [],
      recommendations: []
    };

    // Analyze results and identify issues
    this.analyzeResults(results);

    return results;
  }

  /**
   * Get Linux distribution information
   */
  async getLinuxDistribution() {
    const distros = [
      { file: '/etc/os-release', parser: this.parseOsRelease },
      { file: '/etc/lsb-release', parser: this.parseLsbRelease },
      { file: '/etc/redhat-release', parser: this.parseRedhatRelease },
      { file: '/etc/debian_version', parser: () => ({ name: 'Debian', version: 'unknown' }) }
    ];

    for (const { file, parser } of distros) {
      try {
        const content = await fs.readFile(file, 'utf8');
        return parser(content);
      } catch (error) {
        // Continue to next method
      }
    }

    return { name: 'Unknown', version: 'unknown' };
  }

  /**
   * Parse /etc/os-release
   */
  parseOsRelease(content) {
    const lines = content.split('\n');
    const info = {};

    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;

      const [key, value] = line.split('=');
      info[key] = value.replace(/^"|"$/g, '');
    }

    return {
      name: info.NAME || info.ID || 'Unknown',
      version: info.VERSION_ID || info.VERSION || 'unknown',
      id: info.ID || 'unknown'
    };
  }

  /**
   * Parse /etc/lsb-release
   */
  parseLsbRelease(content) {
    const lines = content.split('\n');
    const info = {};

    for (const line of lines) {
      if (!line.includes('=')) continue;
      const [key, value] = line.split('=');
      info[key] = value;
    }

    return {
      name: info.DISTRIB_ID || 'Unknown',
      version: info.DISTRIB_RELEASE || 'unknown'
    };
  }

  /**
   * Parse /etc/redhat-release
   */
  parseRedhatRelease(content) {
    const match = content.match(/(\w+)\s+release\s+([\d.]+)/i);
    if (match) {
      return {
        name: match[1],
        version: match[2]
      };
    }
    return { name: content.trim(), version: 'unknown' };
  }

  /**
   * Detect desktop environment
   */
  async getDesktopEnvironment() {
    const environments = [
      'GNOME',
      'KDE',
      'XFCE',
      'LXDE',
      'MATE',
      'CINNAMON',
      'BUDGIE',
      'UNITY'
    ];

    // Check environment variables
    for (const env of ['XDG_CURRENT_DESKTOP', 'DESKTOP_SESSION', 'GNOME_DESKTOP_SESSION_ID']) {
      if (process.env[env]) {
        const de = process.env[env].toUpperCase();
        const found = environments.find(e => de.includes(e));
        if (found) return found.toLowerCase();
      }
    }

    // Check running processes
    try {
      const output = await this.executeCommand('ps', ['-eo', 'comm'], { timeout: 3000 });
      const processes = output.toLowerCase();

      if (processes.includes('gnome')) return 'gnome';
      if (processes.includes('kwin') || processes.includes('plasmashell')) return 'kde';
      if (processes.includes('xfce')) return 'xfce';
      if (processes.includes('lxde')) return 'lxde';
    } catch (error) {
      // Process check failed
    }

    return 'unknown';
  }

  /**
   * Check Secret Service API
   */
  async checkSecretService() {
    const checks = {
      secretServiceRunning: false,
      gnomeKeyringRunning: false,
      kwalletRunning: false,
      dbusConnected: false,
      secretServiceTest: false,
      keyringAccessible: false,
      errors: [],
      availableMethods: []
    };

    try {
      // Check D-Bus service
      const dbusCheck = await this.checkDBusConnection();
      checks.dbusConnected = dbusCheck.connected;
      checks.errors.push(...dbusCheck.errors);

      if (!checks.dbusConnected) {
        checks.errors.push({
          code: 'NO_DBUS_SESSION',
          message: 'D-Bus session not available',
          suggestion: 'Start D-Bus session or run in desktop environment'
        });
        return checks;
      }

      // Check for Secret Service
      try {
        const secretServiceOutput = await this.executeCommand('dbus-send', [
          '--session',
          '--dest=org.freedesktop.secrets',
          '--type=method_call',
          '--print-reply',
          '/org/freedesktop/secrets',
          'org.freedesktop.Secret.Service.OpenSession'
        ], { timeout: 5000 });

        checks.secretServiceRunning = true;
        checks.secretServiceTest = true;
        checks.availableMethods.push('secret-service');

      } catch (error) {
        checks.secretServiceTest = false;
        checks.errors.push({
          code: 'SECRET_SERVICE_UNAVAILABLE',
          message: `Secret Service API not available: ${error.message}`,
          suggestion: 'Start GNOME Keyring or KDE Wallet'
        });
      }

      // Check for GNOME Keyring
      try {
        await this.executeCommand('gnome-keyring-daemon', ['--version'], { timeout: 3000 });
        checks.gnomeKeyringRunning = true;
        checks.availableMethods.push('gnome-keyring');

        // Test keyring accessibility
        const keyringTest = await this.testGnomeKeyring();
        checks.keyringAccessible = keyringTest.accessible;
        if (!keyringTest.accessible) {
          checks.errors.push({
            code: 'KEYRING_INACCESSIBLE',
            message: `GNOME Keyring not accessible: ${keyringTest.error}`,
            suggestion: 'Unlock keyring or check keyring permissions'
          });
        }

      } catch (error) {
        checks.gnomeKeyringRunning = false;
      }

      // Check for KDE Wallet
      try {
        await this.executeCommand('kwallet-query', ['-l'], { timeout: 3000 });
        checks.kwalletRunning = true;
        checks.availableMethods.push('kwallet');
      } catch (error) {
        checks.kwalletRunning = false;
      }

    } catch (error) {
      checks.errors.push({
        code: 'SECRET_SERVICE_ERROR',
        message: `Error checking Secret Service: ${error.message}`,
        suggestion: 'Ensure desktop environment is properly configured'
      });
    }

    return checks;
  }

  /**
   * Check D-Bus connection
   */
  async checkDBusConnection() {
    const result = {
      connected: false,
      sessionBus: false,
      systemBus: false,
      errors: []
    };

    try {
      // Check session bus
      const sessionEnv = process.env.DBUS_SESSION_BUS_ADDRESS;
      if (!sessionEnv) {
        result.errors.push({
          code: 'NO_DBUS_SESSION_ADDRESS',
          message: 'DBUS_SESSION_BUS_ADDRESS not set',
          suggestion: 'Run in desktop environment or export D-Bus session address'
        });
      } else {
        const sessionTest = await this.executeCommand('dbus-send', [
          '--session',
          '--dest=org.freedesktop.DBus',
          '--type=method_call',
          '--print-reply',
          '/org/freedesktop/DBus',
          'org.freedesktop.DBus.Ping'
        ], { timeout: 3000 });

        result.sessionBus = true;
        result.connected = true;
      }

      // Check system bus (optional for credential storage)
      try {
        await this.executeCommand('dbus-send', [
          '--system',
          '--dest=org.freedesktop.DBus',
          '--type=method_call',
          '--print-reply',
          '/org/freedesktop/DBus',
          'org.freedesktop.DBus.Ping'
        ], { timeout: 3000 });

        result.systemBus = true;
      } catch (error) {
        // System bus not required for credential storage
      }

    } catch (error) {
      result.errors.push({
        code: 'DBUS_CONNECTION_FAILED',
        message: `D-Bus connection failed: ${error.message}`,
        suggestion: 'Start D-Bus service or run in desktop environment'
      });
    }

    return result;
  }

  /**
   * Test GNOME Keyring
   */
  async testGnomeKeyring() {
    const result = {
      accessible: false,
      locked: false,
      error: null
    };

    try {
      // Try to list keys (this will fail if keyring is locked)
      const output = await this.executeCommand('secret-tool', ['search', 'type', 'test'], { timeout: 3000 });
      result.accessible = true;
    } catch (error) {
      if (error.message.includes('Locked') || error.message.includes('locked')) {
        result.locked = true;
        result.error = 'Keyring is locked';
      } else {
        result.error = error.message;
      }
    }

    return result;
  }

  /**
   * Check Docker credential helper
   */
  async checkCredentialHelper() {
    const checks = {
      helperInstalled: false,
      helperWorking: false,
      helperPath: null,
      helperType: null,
      availableHelpers: [],
      testResults: [],
      errors: []
    };

    const helpers = [
      'docker-credential-secretservice',
      'docker-credential-pass',
      'docker-credential-store'
    ];

    for (const helper of helpers) {
      const helperResult = await this.testCredentialHelper(helper);
      checks.testResults.push(helperResult);

      if (helperResult.installed) {
        checks.availableHelpers.push({
          name: helper,
          path: helperResult.path,
          working: helperResult.working,
          permissions: helperResult.permissions
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
        checks.helperType = workingHelper.name;
      } else {
        // All installed helpers are broken
        const primaryHelper = checks.availableHelpers[0];
        checks.helperPath = primaryHelper.path;
        checks.helperType = primaryHelper.name;
        checks.errors.push({
          code: 'ALL_CREDENTIAL_HELPERS_BROKEN',
          message: `All credential helpers fail with exit status 1`,
          suggestion: 'Remove credential helper from Docker config or fix underlying Secret Service'
        });
      }
    } else {
      checks.errors.push({
        code: 'NO_CREDENTIAL_HELPER',
        message: 'No Docker credential helper installed',
        suggestion: 'Install docker-credential-secretservice or docker-credential-pass'
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
   * Check package manager and available packages
   */
  async checkPackageManager() {
    const checks = {
      packageManager: null,
      version: null,
      dockerCredentialHelperAvailable: false,
      dockerPackage: null,
      errors: []
    };

    const managers = [
      { name: 'apt', versionCmd: ['apt', '--version'] },
      { name: 'yum', versionCmd: ['yum', '--version'] },
      { name: 'dnf', versionCmd: ['dnf', '--version'] },
      { name: 'pacman', versionCmd: ['pacman', '--version'] },
      { name: 'zypper', versionCmd: ['zypper', '--version'] },
      { name: 'emerge', versionCmd: ['emerge', '--version'] }
    ];

    for (const manager of managers) {
      try {
        const versionOutput = await this.executeCommand(manager.versionCmd[0], [manager.versionCmd[1]], { timeout: 3000 });
        checks.packageManager = manager.name;
        checks.version = versionOutput.split('\n')[0].trim();
        break;
      } catch (error) {
        // Try next package manager
      }
    }

    if (!checks.packageManager) {
      checks.errors.push({
        code: 'NO_PACKAGE_MANAGER',
        message: 'No supported package manager found',
        suggestion: 'Install apt, yum, dnf, pacman, or another supported package manager'
      });
      return checks;
    }

    // Check for Docker credential helper packages
    try {
      switch (checks.packageManager) {
        case 'apt':
          await this.executeCommand('apt-cache', ['show', 'docker-credential-helpers'], { timeout: 5000 });
          checks.dockerCredentialHelperAvailable = true;
          break;
        case 'yum':
        case 'dnf':
          await this.executeCommand(checks.packageManager, ['info', 'docker-credential-helpers'], { timeout: 5000 });
          checks.dockerCredentialHelperAvailable = true;
          break;
        case 'pacman':
          // Pacman doesn't have a way to check if package exists without installing
          checks.dockerCredentialHelperAvailable = true;
          break;
      }
    } catch (error) {
      checks.dockerCredentialHelperAvailable = false;
      checks.errors.push({
        code: 'NO_DOCKER_CREDENTIAL_PACKAGE',
        message: 'Docker credential helper package not available',
        suggestion: 'Build from source or use alternative credential storage'
      });
    }

    // Check for Docker packages
    try {
      switch (checks.packageManager) {
        case 'apt':
          const aptInfo = await this.executeCommand('apt-cache', ['show', 'docker.io'], { timeout: 5000 });
          checks.dockerPackage = 'docker.io';
          break;
        case 'yum':
        case 'dnf':
          await this.executeCommand(checks.packageManager, ['info', 'docker-ce'], { timeout: 5000 });
          checks.dockerPackage = 'docker-ce';
          break;
      }
    } catch (error) {
      // Docker package check failed
    }

    return checks;
  }

  /**
   * Check Docker installation
   */
  async checkDockerInstallation() {
    const checks = {
      dockerInstalled: false,
      dockerVersion: null,
      dockerService: false,
      dockerInUserGroup: false,
      dockerSocketAccessible: false,
      errors: []
    };

    try {
      // Check if Docker is installed
      const versionOutput = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
      checks.dockerInstalled = true;
      checks.dockerVersion = this.parseDockerVersion(versionOutput);

      // Check if Docker service is running
      try {
        const serviceStatus = await this.executeCommand('systemctl', ['is-active', 'docker'], { timeout: 3000 });
        checks.dockerService = serviceStatus.trim() === 'active';
      } catch (error) {
        checks.dockerService = false;
        checks.errors.push({
          code: 'DOCKER_SERVICE_NOT_RUNNING',
          message: 'Docker service is not running',
          suggestion: 'Run "sudo systemctl start docker" or "sudo service docker start"'
        });
      }

      // Check if user is in docker group
      try {
        const groups = await this.executeCommand('groups', [], { timeout: 3000 });
        checks.dockerInUserGroup = groups.includes('docker');
      } catch (error) {
        checks.errors.push({
          code: 'CANNOT_CHECK_GROUPS',
          message: 'Cannot check user groups',
          suggestion: 'Verify user is in docker group manually'
        });
      }

      // Check Docker socket accessibility
      try {
        await fs.access('/var/run/docker.sock', fs.constants.R_OK | fs.constants.W_OK);
        checks.dockerSocketAccessible = true;
      } catch (error) {
        checks.dockerSocketAccessible = false;
        checks.errors.push({
          code: 'DOCKER_SOCKET_INACCESSIBLE',
          message: 'Cannot access Docker socket',
          suggestion: 'Add user to docker group or run with sudo'
        });
      }

    } catch (error) {
      checks.dockerInstalled = false;
      checks.errors.push({
        code: 'DOCKER_NOT_INSTALLED',
        message: 'Docker is not installed or not in PATH',
        suggestion: 'Install Docker from package manager or official repository'
      });
    }

    return checks;
  }

  /**
   * Check Linux permissions
   */
  async checkLinuxPermissions() {
    const checks = {
      currentUser: process.env.USER || 'unknown',
      userID: process.getuid ? process.getuid() : 'unknown',
      groupID: process.getgid ? process.getgid() : 'unknown',
      sudoAccess: false,
      dockerGroupMembership: false,
      homeDirectoryWritable: false,
      errors: []
    };

    try {
      // Check sudo access
      try {
        await this.executeCommand('sudo', ['-n', 'true'], { timeout: 3000 });
        checks.sudoAccess = true;
      } catch (error) {
        checks.sudoAccess = false;
      }

      // Check docker group membership
      try {
        const groups = await this.executeCommand('groups', [], { timeout: 3000 });
        checks.dockerGroupMembership = groups.includes('docker');
      } catch (error) {
        checks.errors.push({
          code: 'CANNOT_CHECK_DOCKER_GROUP',
          message: 'Cannot check docker group membership',
          suggestion: 'Run "groups" command manually to verify docker group access'
        });
      }

      // Check home directory permissions
      try {
        await fs.access(this.homeDir, fs.constants.R_OK | fs.constants.W_OK);
        checks.homeDirectoryWritable = true;
      } catch (error) {
        checks.errors.push({
          code: 'HOME_DIRECTORY_NOT_WRITABLE',
          message: 'Home directory is not writable',
          suggestion: 'Check file permissions for home directory'
        });
      }

    } catch (error) {
      checks.errors.push({
        code: 'PERMISSION_CHECK_FAILED',
        message: `Permission check failed: ${error.message}`,
        suggestion: 'Run with appropriate user privileges'
      });
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

  /**
   * Analyze diagnostic results and identify issues
   */
  analyzeResults(results) {
    // Collect all errors
    const allErrors = [
      ...results.secretService.errors,
      ...results.credentialHelper.errors,
      ...results.packageManager.errors,
      ...results.dockerInstallation.errors,
      ...results.permissions.errors,
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
    if (!results.dockerInstallation.dockerInstalled) {
      recommendations.push({
        priority: 'critical',
        title: 'Install Docker',
        description: 'Docker is required for credential management',
        actions: [
          'Install Docker using package manager: ' + this.getInstallCommand(results.packageManager),
          'Start Docker service after installation'
        ]
      });
    }

    if (!results.dockerInstallation.dockerService) {
      recommendations.push({
        priority: 'critical',
        title: 'Start Docker Service',
        description: 'Docker daemon must be running for credential management',
        actions: [
          'Start Docker service: sudo systemctl start docker',
          'Enable Docker service: sudo systemctl enable docker'
        ]
      });
    }

    if (!results.secretService.secretServiceTest) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Secret Service',
        description: 'Secret Service API is required for credential storage',
        actions: [
          'Start GNOME Keyring: gnome-keyring-daemon --start',
          'Or start KDE Wallet: kwalletd5',
          'Ensure running in desktop environment with D-Bus'
        ]
      });
    }

    if (!results.credentialHelper.helperInstalled) {
      recommendations.push({
        priority: 'high',
        title: 'Install Docker Credential Helper',
        description: 'Credential helper is needed to store Docker credentials securely',
        actions: [
          'Install using package manager: ' + this.getCredentialHelperInstallCommand(results.packageManager),
          'Or build from source: go get github.com/docker/docker-credential-helpers'
        ]
      });
    }

    if (results.credentialHelper.helperInstalled && !results.credentialHelper.helperWorking) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Broken Credential Helper',
        description: 'The credential helper is installed but not working properly',
        actions: [
          'Check Secret Service is running properly',
          'Remove credsStore from ~/.docker/config.json',
          'Restart Docker service'
        ]
      });
    }

    if (!results.permissions.dockerGroupMembership && !results.permissions.sudoAccess) {
      recommendations.push({
        priority: 'medium',
        title: 'Fix Docker Permissions',
        description: 'User needs permission to access Docker daemon',
        actions: [
          'Add user to docker group: sudo usermod -aG docker $USER',
          'Log out and log back in for group changes to take effect',
          'Or run docker commands with sudo'
        ]
      });
    }

    if (!results.dbus.dbusConnected) {
      recommendations.push({
        priority: 'medium',
        title: 'Fix D-Bus Connection',
        description: 'D-Bus is required for Secret Service API',
        actions: [
          'Ensure running in desktop environment',
          'Export D-Bus session address: export DBUS_SESSION_BUS_ADDRESS=$(dbus-launch)',
          'Start D-Bus session: dbus-daemon --session'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get Docker install command for package manager
   */
  getInstallCommand(packageManager) {
    const commands = {
      'apt': 'sudo apt-get update && sudo apt-get install docker.io',
      'yum': 'sudo yum install docker-ce',
      'dnf': 'sudo dnf install docker-ce',
      'pacman': 'sudo pacman -S docker',
      'zypper': 'sudo zypper install docker'
    };
    return commands[packageManager] || 'Follow Docker installation guide for your distribution';
  }

  /**
   * Get credential helper install command for package manager
   */
  getCredentialHelperInstallCommand(packageManager) {
    const commands = {
      'apt': 'sudo apt-get install docker-credential-helpers',
      'yum': 'sudo yum install docker-credential-helpers',
      'dnf': 'sudo dnf install docker-credential-helpers',
      'pacman': 'yay -S docker-credential-helpers',
      'zypper': 'sudo zypper install docker-credential-helpers'
    };
    return commands[packageManager] || 'go get github.com/docker/docker-credential-helpers/secretservice';
  }
}

module.exports = LinuxDiagnostics;