const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

/**
 * Docker Daemon Checker
 * Performs comprehensive checks on Docker daemon accessibility and configuration
 */

class DockerChecker {
  constructor() {
    this.timeout = 10000; // Default timeout for Docker commands
  }

  /**
   * Run comprehensive Docker diagnostics
   */
  async runDockerChecks() {
    const results = {
      daemon: await this.checkDaemonStatus(),
      configuration: await this.checkDockerConfiguration(),
      registry: await this.checkRegistryConnectivity(),
      system: await this.checkSystemResources(),
      permissions: await this.checkPermissions(),
      version: null
    };

    try {
      results.version = await this.getDockerVersion();
    } catch (error) {
      // Version check failed - likely Docker not running
      results.version = null;
    }

    return results;
  }

  /**
   * Check Docker daemon status
   */
  async checkDaemonStatus() {
    const checks = {
      running: false,
      version: null,
      apiVersion: null,
      os: null,
      arch: null,
      errors: []
    };

    try {
      // Check if Docker daemon is running
      const versionOutput = await this.executeCommand('docker', ['--version'], {
        timeout: 5000
      });

      checks.running = true;
      checks.version = this.parseDockerVersion(versionOutput);

      // Get detailed Docker info
      const infoOutput = await this.executeCommand('docker', ['info', '--format', '{{json .}}']);
      const info = JSON.parse(infoOutput);

      checks.apiVersion = info.ServerVersion;
      checks.os = info.OperatingSystem;
      checks.arch = info.Architecture;

    } catch (error) {
      checks.running = false;
      checks.errors.push({
        code: 'DAEMON_NOT_RUNNING',
        message: error.message,
        suggestion: this.getDaemonStartSuggestion()
      });
    }

    return checks;
  }

  /**
   * Check Docker configuration
   */
  async checkDockerConfiguration() {
    const checks = {
      configExists: false,
      configValid: false,
      configPath: this.getDockerConfigPath(),
      configContent: null,
      errors: [],
      warnings: []
    };

    try {
      // Check if config file exists
      await fs.access(checks.configPath);
      checks.configExists = true;

      // Read and validate config
      const configContent = await fs.readFile(checks.configPath, 'utf8');
      checks.configContent = configContent;

      try {
        const config = JSON.parse(configContent);
        checks.configValid = true;

        // Validate configuration structure
        const validation = await this.validateConfig(config);
        checks.errors.push(...validation.errors);
        checks.warnings.push(...validation.warnings);

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
   * Check registry connectivity
   */
  async checkRegistryConnectivity() {
    const checks = {
      dockerHub: false,
      proxyConfigured: false,
      timeout: false,
      authentication: false,
      errors: []
    };

    try {
      // Test connection to Docker Hub
      await this.executeCommand('docker', ['pull', 'hello-world'], {
        timeout: 30000
      });
      checks.dockerHub = true;
      checks.authentication = true;

    } catch (error) {
      if (error.message.includes('timeout')) {
        checks.timeout = true;
        checks.errors.push({
          code: 'REGISTRY_TIMEOUT',
          message: 'Timeout connecting to Docker Hub',
          suggestion: 'Check network connectivity and proxy settings'
        });
      } else if (error.message.includes('unauthorized')) {
        checks.authentication = false;
        checks.errors.push({
          code: 'AUTH_ERROR',
          message: 'Authentication failed for Docker Hub',
          suggestion: 'Run "docker login" to authenticate'
        });
      } else {
        checks.dockerHub = false;
        checks.errors.push({
          code: 'REGISTRY_ERROR',
          message: `Registry connection failed: ${error.message}`,
          suggestion: 'Check network connectivity and proxy configuration'
        });
      }
    }

    // Check for proxy configuration
    checks.proxyConfigured = await this.checkProxyConfiguration();

    return checks;
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    const checks = {
      memory: await this.checkMemoryUsage(),
      disk: await this.checkDiskSpace(),
      cpu: await this.checkCPUUsage(),
      dockerStorage: await this.checkDockerStorage(),
      warnings: []
    };

    // Check for resource warnings
    if (checks.memory.usagePercent > 90) {
      checks.warnings.push({
        code: 'HIGH_MEMORY_USAGE',
        message: `High memory usage: ${checks.memory.usagePercent}%`,
        suggestion: 'Consider closing other applications or increasing memory'
      });
    }

    if (checks.disk.freePercent < 10) {
      checks.warnings.push({
        code: 'LOW_DISK_SPACE',
        message: `Low disk space: ${checks.disk.freePercent}% free`,
        suggestion: 'Free up disk space or move Docker data directory'
      });
    }

    if (checks.dockerStorage.usagePercent > 85) {
      checks.warnings.push({
        code: 'HIGH_DOCKER_STORAGE',
        message: `Docker storage usage high: ${checks.dockerStorage.usagePercent}%`,
        suggestion: 'Run "docker system prune" to clean up unused Docker resources'
      });
    }

    return checks;
  }

  /**
   * Check Docker and system permissions
   */
  async checkPermissions() {
    const checks = {
      dockerGroup: false,
      socketAccess: false,
      dockerHomeAccess: false,
      adminPrivileges: false,
      errors: []
    };

    try {
      // Check if user can access Docker socket
      if (process.platform !== 'win32') {
        await fs.access('/var/run/docker.sock', fs.constants.R_OK | fs.constants.W_OK);
        checks.socketAccess = true;
      } else {
        // On Windows, check if running as admin or Docker Desktop is running
        checks.socketAccess = await this.checkWindowsDockerAccess();
      }

      // Check access to Docker home directory
      const dockerHome = path.join(os.homedir(), '.docker');
      await fs.access(dockerHome, fs.constants.R_OK | fs.constants.W_OK);
      checks.dockerHomeAccess = true;

    } catch (error) {
      checks.errors.push({
        code: 'PERMISSION_ERROR',
        message: `Permission denied: ${error.message}`,
        suggestion: process.platform !== 'win32'
          ? 'Add user to docker group or run with sudo'
          : 'Run Docker Desktop or run as administrator'
      });
    }

    // Check if running with admin/root privileges
    if (process.platform === 'win32') {
      checks.adminPrivileges = await this.checkWindowsAdmin();
    } else {
      checks.adminPrivileges = process.getuid && process.getuid() === 0;
    }

    return checks;
  }

  /**
   * Get Docker version information
   */
  async getDockerVersion() {
    try {
      const output = await this.executeCommand('docker', ['version', '--format', '{{json .}}']);
      return JSON.parse(output);
    } catch (error) {
      throw new Error(`Failed to get Docker version: ${error.message}`);
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
   * Get Docker configuration path
   */
  getDockerConfigPath() {
    const dockerConfig = process.env.DOCKER_CONFIG;
    if (dockerConfig) {
      return path.join(dockerConfig, 'config.json');
    }
    return path.join(os.homedir(), '.docker', 'config.json');
  }

  /**
   * Validate Docker configuration
   */
  async validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Check for invalid credential helper configuration
    if (config.credsStore) {
      const isValid = await this.validateCredentialHelper(config.credsStore);
      if (!isValid) {
        errors.push({
          code: 'INVALID_CREDENTIALS_HELPER',
          message: `Invalid credential helper: ${config.credsStore}`,
          suggestion: 'Install the appropriate Docker credential helper'
        });
      }
    }

    // Check for deprecated configuration options
    if (config.auths && typeof config.auths === 'string') {
      errors.push({
        code: 'DEPRECATED_AUTHS_FORMAT',
        message: 'auths field should be an object, not a string',
        suggestion: 'Update auths field to object format'
      });
    }

    // Check for missing fields
    if (!config.auths) {
      warnings.push({
        code: 'MISSING_AUTHS_FIELD',
        message: 'auths field missing from configuration',
        suggestion: 'Add "auths": {} to Docker configuration'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate credential helper
   */
  async validateCredentialHelper(helperName) {
    try {
      await this.executeCommand(helperName, ['list'], { timeout: 3000 });
      return true;
    } catch (error) {
      // Exit status 1 is the specific error we're detecting
      if (error.message.includes('exit status 1')) {
        return false; // This is the broken credential helper we need to fix
      }
      return false;
    }
  }

  /**
   * Check proxy configuration
   */
  async checkProxyConfiguration() {
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'FTP_PROXY', 'NO_PROXY'];
    return proxyVars.some(varName => process.env[varName]);
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = Math.round((used / total) * 100);

    return {
      total: this.formatBytes(total),
      free: this.formatBytes(free),
      used: this.formatBytes(used),
      usagePercent
    };
  }

  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const output = await this.executeCommand('df', ['-h', os.homedir()]);
      const lines = output.split('\n');
      const dataLine = lines[1] || lines[0];
      const parts = dataLine.split(/\s+/);

      const size = parts[1];
      const used = parts[2];
      const avail = parts[3];
      const usePercent = parseInt(parts[4]) || 0;
      const freePercent = 100 - usePercent;

      return {
        total: size,
        used: used,
        free: avail,
        freePercent
      };
    } catch (error) {
      return {
        total: 'unknown',
        used: 'unknown',
        free: 'unknown',
        freePercent: 50
      };
    }
  }

  /**
   * Check CPU usage
   */
  async checkCPUUsage() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      count: cpus.length,
      model: cpus[0]?.model || 'unknown',
      loadAverage: loadAvg[0].toFixed(2),
      loadPercent: Math.round((loadAvg[0] / cpus.length) * 100)
    };
  }

  /**
   * Check Docker storage usage
   */
  async checkDockerStorage() {
    try {
      const output = await this.executeCommand('docker', ['system', 'df']);
      const lines = output.split('\n');

      let totalSize = 0;
      let activeSize = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);
        if (parts.length >= 3 && parts[1] !== '0B') {
          totalSize += this.parseBytes(parts[1]);
          activeSize += this.parseBytes(parts[2]);
        }
      }

      const usagePercent = totalSize > 0 ? Math.round((activeSize / totalSize) * 100) : 0;

      return {
        total: this.formatBytes(totalSize),
        active: this.formatBytes(activeSize),
        reclaimable: this.formatBytes(totalSize - activeSize),
        usagePercent
      };
    } catch (error) {
      return {
        total: 'unknown',
        active: 'unknown',
        reclaimable: 'unknown',
        usagePercent: 0
      };
    }
  }

  /**
   * Check Windows Docker access
   */
  async checkWindowsDockerAccess() {
    try {
      await this.executeCommand('docker', ['ps'], { timeout: 3000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Windows admin privileges
   */
  async checkWindowsAdmin() {
    try {
      await this.executeCommand('net', ['session'], { timeout: 2000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get suggestion for starting Docker daemon
   */
  getDaemonStartSuggestion() {
    switch (process.platform) {
      case 'darwin':
        return 'Start Docker Desktop from Applications folder';
      case 'win32':
        return 'Start Docker Desktop or run Docker service';
      case 'linux':
        return 'Run "sudo systemctl start docker" or "sudo service docker start"';
      default:
        return 'Start Docker daemon/service';
    }
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
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
  }

  /**
   * Parse bytes from human readable format
   */
  parseBytes(str) {
    const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    const match = str.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;
    return parseFloat(match[1]) * (units[match[2].toUpperCase()] || 1);
  }
}

module.exports = DockerChecker;