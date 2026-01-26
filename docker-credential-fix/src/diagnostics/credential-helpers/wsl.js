const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * WSL Credential Helper Diagnostics
 * Comprehensive diagnostics for Docker credential issues in WSL environments
 */

class WSLDiagnostics {
  constructor() {
    this.timeout = 10000;
    this.platform = 'wsl';
    this.isWSL = this.detectWSL();
    this.hostOS = this.detectHostOS();
    this.dockerDesktopPath = this.findDockerDesktopPath();
  }

  /**
   * Detect if running in WSL
   */
  detectWSL() {
    try {
      // Check for WSL-specific environment variables and files
      const wslEnv = process.env.WSL_DISTRO_NAME;
      const wslRelease = fs.existsSync('/proc/version');
      const microsoftName = process.env.NAME?.toLowerCase().includes('microsoft');

      return !!(wslEnv && wslRelease && microsoftName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect the host Windows OS version
   */
  async detectHostOS() {
    try {
      // Read WSL release information
      const releaseInfo = await fs.readFile('/proc/version', 'utf8');
      const buildIdMatch = releaseInfo.match(/BUILD_ID=([^\s]+)/);
      const buildId = buildIdMatch ? buildIdMatch[1] : 'unknown';

      // Map common WSL build IDs to Windows versions
      const versionMap = {
        '19041': 'Windows 10 version 1903',
        '19042': 'Windows 10 version 1909',
        '19043': 'Windows 10 version 2004',
        '19044': 'Windows 10 version 2009',
        '19045': 'Windows 10 version 21H1',
        '19046': 'Windows 10 version 21H2',
        '22000': 'Windows 11',
        '22621': 'Windows 11 version 22H2',
        '22631': 'Windows 11 version 23H2',
        '22635': 'Windows 11 version 24H2'
      };

      return {
        platform: 'wsl',
        hostOS: versionMap[buildId] || 'Windows 10 (unknown WSL build)',
        buildId,
        wslVersion: releaseInfo.split('\n')[0] || 'unknown'
      };
    } catch (error) {
      return {
        platform: 'wsl',
        hostOS: 'Windows (WSL detection failed)',
        buildId: 'unknown',
        wslVersion: 'unknown'
      };
    }
  }

  /**
   * Find Docker Desktop installation path in Windows host
   */
  findDockerDesktopPath() {
    const possiblePaths = [
      '/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe',
      '/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe',
      '/mnt/c/Users/*/AppData/Local/Programs/Docker/Docker/Docker Desktop.exe'
    ];

    for (const windowsPath of possiblePaths) {
      try {
        // Check if the Windows path exists from WSL
        if (fs.existsSync(windowsPath)) {
          return windowsPath;
        }
      } catch (error) {
        // Continue searching
      }
    }

    return null;
  }

  /**
   * Run comprehensive WSL-specific diagnostics
   */
  async runDiagnostics() {
    const results = {
      platform: this.platform,
      wsl: await this.checkWSLEnvironment(),
      dockerDesktop: await this.checkDockerDesktopIntegration(),
      credentialHelper: await this.checkCredentialHelper(),
      filesystem: await this.checkFileSystemIntegration(),
      network: await this.checkNetworkConnectivity(),
      wslDocker: await this.checkWSLDocker(),
      issues: [],
      recommendations: []
    };

    // Analyze results and identify issues
    this.analyzeResults(results);

    return results;
  }

  /**
   * Check WSL environment configuration
   */
  async checkWSLEnvironment() {
    const checks = {
      wslRunning: false,
      wslVersion: null,
      hostWindowsVersion: this.hostOS.hostOS,
      wslDistribution: null,
      systemdAvailable: false,
      interopAvailable: false,
      errors: []
    };

    // Check if actually running in WSL
    checks.wslRunning = this.isWSL;

    // Get WSL distribution information
    try {
      if (fs.existsSync('/etc/os-release')) {
        const osRelease = await fs.readFile('/etc/os-release', 'utf8');
        const distroMatch = osRelease.match(/PRETTY_NAME="([^"]+)"/);
        checks.wslDistribution = distroMatch ? distroMatch[1] : 'Unknown';
      }
    } catch (error) {
      checks.errors.push({
        code: 'WSL_DISTRO_READ_FAILED',
        message: `Failed to read WSL distribution: ${error.message}`,
        severity: 'medium'
      });
    }

    // Check for systemd support
    try {
      await this.executeCommand('systemctl', ['--version'], { timeout: 3000 });
      checks.systemdAvailable = true;
    } catch (error) {
      checks.errors.push({
        code: 'SYSTEMD_NOT_AVAILABLE',
        message: `Systemd not available: ${error.message}`,
        severity: 'low'
      });
    }

    // Check for WSL interop features
    try {
      const interopFile = '/run/WSLInterop';
      checks.interopAvailable = fs.existsSync(interopFile);
    } catch (error) {
      checks.errors.push({
        code: 'WSL_INTEROP_CHECK_FAILED',
        message: `Failed to check WSL interop: ${error.message}`,
        severity: 'medium'
      });
    }

    return checks;
  }

  /**
   * Check Docker Desktop integration
   */
  async checkDockerDesktopIntegration() {
    const checks = {
      dockerDesktopRunning: false,
      dockerDesktopInstalled: false,
      dockerDesktopPath: this.dockerDesktopPath,
      wslIntegrationEnabled: false,
      dockerDaemonInWSL: false,
      dockerSocketAccessible: false,
      errors: []
    };

    // Check if Docker Desktop is installed
    if (this.dockerDesktopPath) {
      checks.dockerDesktopInstalled = true;

      // Check if Docker Desktop is running
      try {
        const windowsProcess = await this.executeWindowsCommand('tasklist', [
          '/FI', 'IMAGENAME eq', 'Docker Desktop.exe'
        ]);
        checks.dockerDesktopRunning = windowsProcess.includes('Docker Desktop.exe');
      } catch (error) {
        checks.errors.push({
          code: 'DOCKER_DESKTOP_STATUS_CHECK_FAILED',
          message: `Failed to check Docker Desktop status: ${error.message}`,
          severity: 'high'
        });
      }
    }

    // Check if Docker daemon is running inside WSL
    try {
      const dockerVersion = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
      checks.dockerDaemonInWSL = true;
    } catch (error) {
      checks.errors.push({
        code: 'DOCKER_NOT_RUNNING_IN_WSL',
        message: `Docker daemon not accessible in WSL: ${error.message}`,
        severity: 'critical'
      });
    }

    // Check Docker socket accessibility
    if (checks.dockerDaemonInWSL) {
      try {
        await fs.access('/var/run/docker.sock', fs.constants.R_OK | fs.constants.W_OK);
        checks.dockerSocketAccessible = true;
      } catch (error) {
        checks.errors.push({
          code: 'DOCKER_SOCKET_INACCESSIBLE',
          message: `Docker socket not accessible: ${error.message}`,
          severity: 'high'
        });
      }
    }

    // Check WSL integration settings
    try {
      const wslConfig = await this.readWindowsRegistry('HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Appx\\appx41a59a8b17ce447581bc8a2b83e5e4f1');
      if (wslConfig && wslConfig.includes('Enabled')) {
        checks.wslIntegrationEnabled = true;
      }
    } catch (error) {
      // Registry access may not be available
      checks.errors.push({
        code: 'WSL_INTEGRATION_CHECK_FAILED',
        message: `Failed to check WSL integration: ${error.message}`,
        severity: 'medium'
      });
    }

    return checks;
  }

  /**
   * Check credential helper availability
   */
  async checkCredentialHelper() {
    const checks = {
      helperInstalled: false,
      helperWorking: false,
      helperPath: null,
      helperType: null,
      wslHelperAvailable: false,
      windowsHelperAccessible: false,
      errors: []
    };

    // Check for WSL-aware credential helpers
    const wslHelpers = [
      'docker-credential-wsl',
      'docker-credential-desktop',
      'docker-credential-wincred'
    ];

    for (const helper of wslHelpers) {
      try {
        const whichResult = await this.executeCommand('which', [helper], { timeout: 3000 });
        checks.helperInstalled = true;
        checks.helperPath = whichResult.trim();

        // Test if helper is working
        try {
          await this.executeCommand(helper, ['list'], { timeout: 5000 });
          checks.helperWorking = true;
          checks.helperType = 'wsl-aware';
        } catch (error) {
          if (error.message.includes('exit status 1')) {
            checks.wslHelperAvailable = true;
            checks.errors.push({
              code: 'WSL_HELPER_BROKEN',
              message: `WSL credential helper failing: ${helper}`,
              severity: 'high',
              autoFixable: true
            });
          }
        }
        break;
      } catch (error) {
        // Helper not found or not working
      }
    }

    // Check if Windows credential helper is accessible via WSL interop
    try {
      const windowsHelper = '/mnt/c/Windows/System32/docker-credential-wincred.exe';
      if (fs.existsSync(windowsHelper)) {
        checks.windowsHelperAccessible = true;
        checks.helperType = 'windows-native';
      }
    } catch (error) {
      checks.errors.push({
        code: 'WINDOWS_HELPER_CHECK_FAILED',
        message: `Failed to check Windows credential helper: ${error.message}`,
        severity: 'medium'
      });
    }

    // If no working helper found, that's a critical issue
    if (!checks.helperWorking && !checks.windowsHelperAccessible) {
      checks.errors.push({
        code: 'NO_WORKING_CREDENTIAL_HELPER',
        message: 'No working credential helper found in WSL environment',
        severity: 'critical',
        autoFixable: false
      });
    }

    return checks;
  }

  /**
   * Check filesystem integration
   */
  async checkFileSystemIntegration() {
    const checks = {
      windowsMountAccessible: false,
      dockerConfigAccessible: false,
      wslPathIssues: false,
      dockerConfigPath: null,
      dockerConfigValid: false,
      errors: []
    };

    // Check Windows mount points
    try {
      await fs.access('/mnt/c', fs.constants.R_OK | fs.constants.X_OK);
      checks.windowsMountAccessible = true;
    } catch (error) {
      checks.errors.push({
        code: 'WINDOWS_MOUNT_INACCESSIBLE',
        message: `Windows mount not accessible: ${error.message}`,
        severity: 'high'
      });
    }

    // Check Docker configuration file accessibility
    const dockerConfigPath = path.join(os.homedir(), '.docker', 'config.json');
    checks.dockerConfigPath = dockerConfigPath;

    try {
      await fs.access(dockerConfigPath, fs.constants.R_OK | fs.constants.W_OK);
      checks.dockerConfigAccessible = true;

      // Validate Docker config if accessible
      const configContent = await fs.readFile(dockerConfigPath, 'utf8');
      JSON.parse(configContent); // This will throw if invalid
      checks.dockerConfigValid = true;
    } catch (error) {
      checks.errors.push({
        code: 'DOCKER_CONFIG_ISSUE',
        message: `Docker config issue: ${error.message}`,
        severity: 'high',
        autoFixable: true
      });
    }

    return checks;
  }

  /**
   * Check network connectivity from WSL
   */
  async checkNetworkConnectivity() {
    const checks = {
      dockerHubAccessible: false,
      proxyConfigured: false,
      wslNetworkIssues: false,
      windowsHostNetworkAccessible: false,
      errors: []
    };

    // Test Docker Hub connectivity from WSL
    try {
      await this.executeCommand('docker', ['pull', 'hello-world'], { timeout: 30000 });
      checks.dockerHubAccessible = true;
    } catch (error) {
      checks.errors.push({
        code: 'DOCKER_HUB_INACCESSIBLE',
        message: `Docker Hub not accessible from WSL: ${error.message}`,
        severity: 'high'
      });
    }

    // Check for proxy configuration
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'FTP_PROXY', 'NO_PROXY'];
    const hasProxy = proxyVars.some(varName => process.env[varName]);
    checks.proxyConfigured = hasProxy;

    // Check Windows host network from WSL
    try {
      const pingResult = await this.executeWindowsCommand('ping', ['-n', '1', '8.8.8.8'], { timeout: 5000 });
      if (pingResult.includes('Reply from')) {
        checks.windowsHostNetworkAccessible = true;
      }
    } catch (error) {
      checks.errors.push({
        code: 'WINDOWS_HOST_NETWORK_CHECK_FAILED',
        message: `Failed to check Windows host network: ${error.message}`,
        severity: 'medium'
      });
    }

    return checks;
  }

  /**
   * Check WSL-specific Docker issues
   */
  async checkWSLDocker() {
    const checks = {
      dockerEngineWSL: false,
      systemdDocker: false,
      dockerDesktopWSLIntegration: false,
      wsl2DockerBridging: false,
      dockerIntegrationIssues: [],
      errors: []
    };

    // Check if Docker Engine is installed in WSL
    try {
      await this.executeCommand('dockerd', ['--version'], { timeout: 5000 });
      checks.dockerEngineWSL = true;
    } catch (error) {
      // Docker Engine may not be installed in WSL
    }

    // Check for systemd Docker service
    if (await this.executeCommand('systemctl', ['--version'], { timeout: 3000 })) {
      try {
        await this.executeCommand('systemctl', ['is-active', 'docker'], { timeout: 3000 });
        checks.systemdDocker = true;
      } catch (error) {
        checks.errors.push({
          code: 'SYSTEMD_DOCKER_CHECK_FAILED',
          message: `Failed to check systemd Docker: ${error.message}`,
          severity: 'medium'
        });
      }
    }

    // Check for WSL2 Docker bridging (if available)
    try {
      // Check for WSL2-specific Docker integration
      const wsl2Config = process.env.WSL_DISTRO_NAME?.toLowerCase().includes('ubuntu') &&
                      os.release().toLowerCase().includes('microsoft');

      if (wsl2Config) {
        checks.wsl2DockerBridging = true;

        // Check if Docker is integrated with WSL2
        const integrationTest = await this.executeCommand('docker', ['info'], { timeout: 5000 });
        if (!integrationTest.includes('Server')) {
          checks.dockerIntegrationIssues.push({
            type: 'WSL2_INTEGRATION_BROKEN',
            message: 'Docker not properly integrated with WSL2',
            severity: 'high',
            autoFixable: false
          });
        }
      }
    } catch (error) {
      checks.errors.push({
        code: 'WSL2_INTEGRATION_CHECK_FAILED',
        message: `Failed to check WSL2 Docker integration: ${error.message}`,
        severity: 'medium'
      });
    }

    return checks;
  }

  /**
   * Execute Windows command from WSL
   */
  async executeWindowsCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      // Execute Windows command through WSL interop
      const windowsCommand = ['cmd.exe', '/c', command, ...args];

      const child = spawn('wsl.exe', windowsCommand, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || this.timeout
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
          reject(new Error(`Windows command failed with exit code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Windows command execution error: ${error.message}`));
      });
    });
  }

  /**
   * Read Windows registry from WSL
   */
  async readWindowsRegistry(registryPath) {
    return new Promise((resolve, reject) => {
      const regCommand = ['cmd.exe', '/c', 'reg', 'query', registryPath];

      const child = spawn('wsl.exe', regCommand, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
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
          reject(new Error(`Registry query failed with exit code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Registry query error: ${error.message}`));
      });
    });
  }

  /**
   * Analyze results and identify issues
   */
  analyzeResults(results) {
    const issues = [];

    // Critical: No working credential helper
    if (!results.credentialHelper.helperWorking && !results.credentialHelper.windowsHelperAccessible) {
      issues.push({
        code: 'WSL_NO_WORKING_CREDENTIAL_HELPER',
        severity: 'critical',
        message: 'No working credential helper found in WSL environment',
        impact: 'Cannot authenticate to Docker registries',
        recommendation: 'Install WSL-aware Docker credential helper or use Windows helper via WSL interop'
      });
    }

    // High: Docker daemon not running
    if (!results.dockerDesktop.dockerDaemonInWSL) {
      issues.push({
        code: 'WSL_DOCKER_NOT_RUNNING',
        severity: 'high',
        message: 'Docker daemon not accessible from WSL',
        impact: 'Cannot execute Docker commands',
        recommendation: 'Start Docker Desktop on Windows host or install Docker Engine in WSL'
      });
    }

    // High: Docker Desktop not running on Windows
    if (!results.dockerDesktop.dockerDesktopRunning && results.dockerDesktop.dockerDesktopInstalled) {
      issues.push({
        code: 'WSL_DOCKER_DESKTOP_NOT_RUNNING',
        severity: 'high',
        message: 'Docker Desktop not running on Windows host',
        impact: 'Credential storage and registry access may not work properly',
        recommendation: 'Start Docker Desktop on Windows host'
      });
    }

    // High: Windows file system issues
    if (!results.filesystem.windowsMountAccessible) {
      issues.push({
        code: 'WSL_WINDOWS_MOUNT_INACCESSIBLE',
        severity: 'high',
        message: 'Windows mount points not accessible from WSL',
        impact: 'Cannot access Windows Docker installation and credential helper',
        recommendation: 'Check WSL configuration and Windows mount points'
      });
    }

    // Medium: WSL integration disabled
    if (results.dockerDesktop.wslIntegrationEnabled === false) {
      issues.push({
        code: 'WSL_INTEGRATION_DISABLED',
        severity: 'medium',
        message: 'WSL integration with Docker Desktop is disabled',
        impact: 'Docker commands may not work properly across WSL boundary',
        recommendation: 'Enable WSL integration in Docker Desktop settings'
      });
    }

    // Medium: Docker config issues
    if (!results.filesystem.dockerConfigValid) {
      issues.push({
        code: 'WSL_DOCKER_CONFIG_INVALID',
        severity: 'medium',
        message: 'Docker configuration file has issues',
        impact: 'Docker may not start or authenticate properly',
        recommendation: 'Fix Docker configuration file'
      });
    }

    // Low: Network connectivity issues
    if (!results.network.dockerHubAccessible) {
      issues.push({
        code: 'WSL_NETWORK_ISSUES',
        severity: 'medium',
        message: 'Network connectivity issues detected from WSL',
        impact: 'Cannot pull Docker images or access registries',
        recommendation: 'Check network configuration and proxy settings'
      });
    }

    results.issues = issues;
    results.recommendations = this.generateRecommendations(issues);
  }

  /**
   * Generate recommendations based on identified issues
   */
  generateRecommendations(issues) {
    const recommendations = [];

    for (const issue of issues) {
      switch (issue.code) {
        case 'WSL_NO_WORKING_CREDENTIAL_HELPER':
          recommendations.push({
            priority: 'critical',
            title: 'Install WSL-Aware Credential Helper',
            description: 'Docker needs a working credential helper in WSL environment',
            actions: [
              'Install docker-credential-wsl: npm install -g docker-credential-wsl',
              'Configure Docker Desktop to use WSL credential helper',
              'Use Windows credential helper via WSL interop'
            ],
            autoFixable: true
          });
          break;

        case 'WSL_DOCKER_NOT_RUNNING':
          recommendations.push({
            priority: 'high',
            title: 'Start Docker Service in WSL',
            description: 'Docker daemon needs to be accessible from WSL',
            actions: [
              'Install Docker Engine in WSL: sudo apt update && sudo apt install docker.io docker.io-compose',
              'Start Docker Desktop on Windows host',
              'Enable systemd user services: systemctl --user start docker'
            ],
            autoFixable: false
          });
          break;

        case 'WSL_DOCKER_DESKTOP_NOT_RUNNING':
          recommendations.push({
            priority: 'high',
            title: 'Start Docker Desktop on Windows',
            description: 'Docker Desktop must be running on the Windows host',
            actions: [
              'Start Docker Desktop from Windows Start Menu',
              'Use Docker Desktop tray icon to start service',
              'Check if Docker Desktop is set to start with Windows'
            ],
            autoFixable: false
          });
          break;

        case 'WSL_WINDOWS_MOUNT_INACCESSIBLE':
          recommendations.push({
            priority: 'high',
            title: 'Fix WSL Windows Mount',
            description: 'Windows file system must be accessible from WSL',
            actions: [
              'Check WSL configuration in /etc/wsl.conf',
              'Ensure Windows drives are mounted: sudo mount -t drvfs C: /mnt/c',
              'Restart WSL service: wsl --shutdown',
              'Verify mount points: ls /mnt/'
            ],
            autoFixable: false
          });
          break;

        case 'WSL_DOCKER_CONFIG_INVALID':
          recommendations.push({
            priority: 'medium',
            title: 'Fix Docker Configuration',
            description: 'Docker configuration has syntax or format issues',
            actions: [
              'Validate JSON syntax in ~/.docker/config.json',
              'Remove broken credential helper entries',
              'Ensure auths field is properly formatted'
            ],
            autoFixable: true
          });
          break;
      }
    }

    // Sort recommendations by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

module.exports = WSLDiagnostics;