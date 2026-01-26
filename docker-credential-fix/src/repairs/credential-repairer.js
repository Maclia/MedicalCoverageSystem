const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const DiffGenerator = require('../utils/diff-generator');
const { ProcessRunner } = require('../utils/process-runner');

/**
 * Credential Repairer
 * Automatically fixes Docker credential helper issues across platforms
 */

class CredentialRepairer {
  constructor(options = {}) {
    this.runner = new ProcessRunner({
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      logCommands: options.log || false
    });
    this.diffGenerator = new DiffGenerator({
      contextLines: 3,
      showLineNumbers: true
    });
    this.configPath = options.configPath || path.join(os.homedir(), '.docker', 'config.json');
    this.backupDir = options.backupDir || path.join(os.homedir(), '.docker', 'backups');
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.platform = os.platform();
  }

  /**
   * Analyze and repair Docker credential configuration
   */
  async analyzeAndRepair(diagnosticResults) {
    const analysis = {
      platform: this.platform,
      issues: this.identifyIssues(diagnosticResults),
      recommendations: [],
      fixes: [],
      requiresRestart: false,
      requiresReauth: false,
      riskLevel: 'low'
    };

    // Analyze issues and generate fixes
    analysis.recommendations = this.generateRecommendations(analysis.issues);
    analysis.fixes = await this.generateFixes(analysis.issues);

    // Determine overall risk level and requirements
    analysis.requiresRestart = this.requiresRestart(analysis.fixes);
    analysis.requiresReauth = this.requiresReauth(analysis.fixes);
    analysis.riskLevel = this.assessRiskLevel(analysis.fixes);

    return analysis;
  }

  /**
   * Identify issues from diagnostic results
   */
  identifyIssues(diagnosticResults) {
    const issues = [];

    // Credential helper issues
    const credentialHelper = diagnosticResults.credentialHelper || {};
    if (!credentialHelper.helperInstalled) {
      issues.push({
        type: 'missing_helper',
        severity: 'critical',
        description: 'Docker credential helper not installed',
        autoFixable: true,
        platformSpecific: true
      });
    }

    if (credentialHelper.helperInstalled && !credentialHelper.helperWorking) {
      issues.push({
        type: 'broken_helper',
        severity: 'critical',
        description: 'Docker credential helper returns exit status 1',
        autoFixable: true,
        error: credentialHelper.testResults?.[0]?.error || 'exit status 1'
      });
    }

    // Configuration issues
    const configuration = diagnosticResults.configuration || {};
    if (configuration.configExists && !configuration.configValid) {
      issues.push({
        type: 'invalid_config',
        severity: 'high',
        description: 'Docker configuration file contains invalid JSON',
        autoFixable: true,
        configPath: configuration.configPath
      });
    }

    // Check for invalid credential helper configuration
    if (configuration.configContent) {
      try {
        const config = JSON.parse(configuration.configContent);
        if (config.credsStore && !this.isCredentialHelperValid(config.credsStore)) {
          issues.push({
            type: 'invalid_credsstore',
            severity: 'critical',
            description: `Invalid credential helper configured: ${config.credsStore}`,
            autoFixable: true,
            currentValue: config.credsStore
          });
        }

        // Check for deprecated auths format
        if (config.auths && typeof config.auths === 'string') {
          issues.push({
            type: 'deprecated_auths',
            severity: 'medium',
            description: 'Docker config uses deprecated auths format',
            autoFixable: true,
            currentValue: config.auths
          });
        }
      } catch (error) {
        // JSON parsing error already handled
      }
    }

    // Platform-specific issues
    const platformIssues = this.identifyPlatformIssues(diagnosticResults);
    issues.push(...platformIssues);

    return issues;
  }

  /**
   * Identify platform-specific issues
   */
  identifyPlatformIssues(diagnosticResults) {
    const issues = [];

    switch (this.platform) {
      case 'darwin':
        issues.push(...this.identifyMacOSIssues(diagnosticResults));
        break;
      case 'linux':
        issues.push(...this.identifyLinuxIssues(diagnosticResults));
        break;
      case 'win32':
        issues.push(...this.identifyWindowsIssues(diagnosticResults));
        break;
    }

    return issues;
  }

  /**
   * Identify macOS-specific issues
   */
  identifyMacOSIssues(diagnosticResults) {
    const issues = [];
    const keychain = diagnosticResults.keychain || {};

    if (!keychain.keychainAccessible) {
      issues.push({
        type: 'keychain_inaccessible',
        severity: 'high',
        description: 'macOS keychain is not accessible',
        autoFixable: true,
        platformSpecific: true,
        requiresUserInteraction: true
      });
    }

    const homebrew = diagnosticResults.homebrew || {};
    if (!homebrew.homebrewInstalled && !keychain.keychainAccessible) {
      issues.push({
        type: 'missing_homebrew',
        severity: 'medium',
        description: 'Homebrew not available for installing credential helper',
        autoFixable: true,
        platformSpecific: true
      });
    }

    return issues;
  }

  /**
   * Identify Linux-specific issues
   */
  identifyLinuxIssues(diagnosticResults) {
    const issues = [];
    const secretService = diagnosticResults.secretService || {};

    if (!secretService.secretServiceTest) {
      issues.push({
        type: 'secret_service_unavailable',
        severity: 'critical',
        description: 'D-Bus Secret Service API not available',
        autoFixable: true,
        platformSpecific: true,
        requiresUserInteraction: true
      });
    }

    if (!secretService.dbusConnected) {
      issues.push({
        type: 'dbus_unavailable',
        severity: 'high',
        description: 'D-Bus session not available',
        autoFixable: true,
        platformSpecific: true
      });
    }

    const permissions = diagnosticResults.permissions || {};
    if (!permissions.dockerGroupMembership && permissions.sudoAccess) {
      issues.push({
        type: 'docker_group_missing',
        severity: 'high',
        description: 'User not in docker group',
        autoFixable: true,
        platformSpecific: true,
        requiresSudo: true
      });
    }

    return issues;
  }

  /**
   * Identify Windows-specific issues
   */
  identifyWindowsIssues(diagnosticResults) {
    const issues = [];
    const credentialManager = diagnosticResults.credentialManager || {};

    if (!credentialManager.credentialManagerAccessible) {
      issues.push({
        type: 'credential_manager_inaccessible',
        severity: 'high',
        description: 'Windows Credential Manager not accessible',
        autoFixable: true,
        platformSpecific: true,
        requiresUserInteraction: true
      });
    }

    const dockerDesktop = diagnosticResults.dockerDesktop || {};
    if (!dockerDesktop.dockerDesktopRunning && dockerDesktop.dockerDesktopInstalled) {
      issues.push({
        type: 'docker_desktop_not_running',
        severity: 'critical',
        description: 'Docker Desktop is installed but not running',
        autoFixable: true,
        platformSpecific: true,
        requiresUserInteraction: true
      });
    }

    const permissions = diagnosticResults.permissions || {};
    if (!permissions.isAdministrator && !permissions.dockerServiceRunning) {
      issues.push({
        type: 'admin_privileges_required',
        severity: 'high',
        description: 'Administrator privileges required for Docker operations',
        autoFixable: false,
        platformSpecific: true,
        requiresUserInteraction: true
      });
    }

    return issues;
  }

  /**
   * Check if credential helper is valid
   */
  isCredentialHelperValid(helperName) {
    const validHelpers = {
      'darwin': ['docker-credential-osxkeychain', 'docker-credential-desktop'],
      'linux': ['docker-credential-secretservice', 'docker-credential-pass'],
      'win32': ['docker-credential-wincred.exe', 'docker-credential-desktop.exe']
    };

    return validHelpers[this.platform]?.includes(helperName);
  }

  /**
   * Generate recommendations based on issues
   */
  generateRecommendations(issues) {
    const recommendations = [];

    for (const issue of issues) {
      const recommendation = this.generateRecommendation(issue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Remove duplicates and sort by priority
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);
    return uniqueRecommendations.sort((a, b) => this.comparePriority(a.priority, b.priority));
  }

  /**
   * Generate recommendation for specific issue
   */
  generateRecommendation(issue) {
    switch (issue.type) {
      case 'missing_helper':
        return {
          priority: 'critical',
          title: 'Install Docker Credential Helper',
          description: 'A Docker credential helper is required to securely store registry credentials',
          actions: this.getCredentialHelperInstallActions(),
          autoFixable: issue.autoFixable
        };

      case 'broken_helper':
        return {
          priority: 'critical',
          title: 'Fix Broken Credential Helper',
          description: `The credential helper is returning: ${issue.error}`,
          actions: this.getBrokenHelperActions(),
          autoFixable: issue.autoFixable
        };

      case 'invalid_config':
        return {
          priority: 'high',
          title: 'Fix Docker Configuration',
          description: 'Docker configuration file contains syntax errors',
          actions: this.getInvalidConfigActions(issue.configPath),
          autoFixable: issue.autoFixable
        };

      case 'invalid_credsstore':
        return {
          priority: 'critical',
          title: 'Remove Invalid Credential Helper',
          description: `Configured credential helper is invalid: ${issue.currentValue}`,
          actions: this.getInvalidCredsStoreActions(issue.currentValue),
          autoFixable: issue.autoFixable
        };

      case 'deprecated_auths':
        return {
          priority: 'medium',
          title: 'Update Docker Configuration Format',
          description: 'Docker configuration uses deprecated auths field format',
          actions: this.getDeprecatedAuthsActions(),
          autoFixable: issue.autoFixable
        };

      case 'keychain_inaccessible':
        return {
          priority: 'high',
          title: 'Fix Keychain Permissions',
          description: 'macOS keychain access is blocked for Docker',
          actions: this.getKeychainFixActions(),
          autoFixable: false,
          requiresUserInteraction: true
        };

      case 'secret_service_unavailable':
        return {
          priority: 'critical',
          title: 'Start Secret Service',
          description: 'D-Bus Secret Service is required for credential storage',
          actions: this.getSecretServiceActions(),
          autoFixable: false,
          requiresUserInteraction: true
        };

      case 'docker_group_missing':
        return {
          priority: 'high',
          title: 'Add User to Docker Group',
          description: 'User needs to be in docker group to access Docker daemon',
          actions: this.getDockerGroupActions(),
          autoFixable: issue.autoFixable,
          requiresSudo: true
        };

      default:
        return null;
    }
  }

  /**
   * Generate fixes for identified issues
   */
  async generateFixes(issues) {
    const fixes = [];

    for (const issue of issues) {
      if (!issue.autoFixable) {
        continue;
      }

      const fix = await this.generateFix(issue);
      if (fix) {
        fixes.push(fix);
      }
    }

    return fixes;
  }

  /**
   * Generate fix for specific issue
   */
  async generateFix(issue) {
    switch (issue.type) {
      case 'missing_helper':
        return this.createInstallHelperFix();
      case 'broken_helper':
        return this.createFixHelperFix();
      case 'invalid_config':
        return this.createFixConfigFix(issue.configPath);
      case 'invalid_credsstore':
        return this.createRemoveCredsStoreFix(issue.currentValue);
      case 'deprecated_auths':
        return this.createUpdateAuthsFix();
      case 'docker_group_missing':
        return this.createAddDockerGroupFix();
      default:
        return null;
    }
  }

  /**
   * Create credential helper installation fix
   */
  createInstallHelperFix() {
    const actions = this.getCredentialHelperInstallActions();
    const selectedAction = actions[0]; // First/most suitable action

    return {
      id: this.generateFixId(),
      type: 'install_helper',
      description: `Install Docker credential helper: ${selectedAction.command}`,
      actions: [selectedAction],
      requiresRestart: true,
      requiresReauth: true,
      riskLevel: 'low',
      dryRun: this.dryRun,
      execute: async () => {
        if (this.dryRun) {
          this.logVerbose(`[DRY RUN] Would execute: ${selectedAction.command}`);
          return { success: true, message: 'Dry run - helper would be installed' };
        }

        try {
          const result = await this.runner.run(selectedAction.command.split(' ')[0], selectedAction.command.split(' ').slice(1));
          return { success: true, message: 'Credential helper installed successfully', output: result.stdout };
        } catch (error) {
          return { success: false, message: `Failed to install helper: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Create fix broken helper
   */
  createFixHelperFix() {
    const actions = this.getBrokenHelperActions();
    const configFix = actions.find(a => a.type === 'config');

    return {
      id: this.generateFixId(),
      type: 'fix_helper',
      description: 'Remove broken credential helper from Docker configuration',
      actions: actions,
      requiresRestart: true,
      requiresReauth: false,
      riskLevel: 'low',
      dryRun: this.dryRun,
      execute: async () => {
        if (!configFix) {
          return { success: false, message: 'No suitable fix available' };
        }

        if (this.dryRun) {
          this.logVerbose(`[DRY RUN] Would modify: ${this.configPath}`);
          return { success: true, message: 'Dry run - configuration would be updated' };
        }

        try {
          const result = await this.applyConfigFix(configFix);
          return result;
        } catch (error) {
          return { success: false, message: `Failed to fix configuration: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Create fix invalid config
   */
  createFixConfigFix(configPath) {
    return {
      id: this.generateFixId(),
      type: 'fix_config',
      description: `Fix invalid JSON in ${configPath}`,
      actions: [
        {
          command: 'backup_config',
          description: 'Create backup before fixing',
          type: 'backup'
        },
        {
          command: 'fix_json',
          description: 'Attempt to fix JSON syntax',
          type: 'fix'
        }
      ],
      requiresRestart: true,
      requiresReauth: false,
      riskLevel: 'medium',
      dryRun: this.dryRun,
      execute: async () => {
        if (this.dryRun) {
          this.logVerbose(`[DRY RUN] Would fix JSON in: ${configPath}`);
          return { success: true, message: 'Dry run - JSON would be fixed' };
        }

        try {
          const content = await fs.readFile(configPath, 'utf8');
          const fixedContent = this.attemptJsonFix(content);
          await this.createBackup(configPath);
          await fs.writeFile(configPath, fixedContent, 'utf8');
          return { success: true, message: 'Configuration fixed successfully' };
        } catch (error) {
          return { success: false, message: `Failed to fix configuration: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Create remove credsStore fix
   */
  createRemoveCredsStoreFix(currentValue) {
    const diff = {
      current: { credsStore: currentValue },
      fixed: {}
    };

    return {
      id: this.generateFixId(),
      type: 'remove_credsstore',
      description: `Remove invalid credential helper: ${currentValue}`,
      actions: [
        {
          command: 'remove_credsstore',
          description: 'Remove broken credential helper from configuration',
          type: 'config',
          diff
        }
      ],
      requiresRestart: true,
      requiresReauth: false,
      riskLevel: 'low',
      dryRun: this.dryRun,
      execute: async () => {
        if (this.dryRun) {
          this.logVerbose(`[DRY RUN] Would remove credsStore: ${currentValue}`);
          return { success: true, message: 'Dry run - credsStore would be removed' };
        }

        try {
          const result = await this.removeCredsStore();
          return result;
        } catch (error) {
          return { success: false, message: `Failed to remove credsStore: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Create update deprecated auths fix
   */
  createUpdateAuthsFix() {
    return {
      id: this.generateFixId(),
      type: 'update_auths',
      description: 'Update deprecated auths field to object format',
      actions: [
        {
          command: 'update_auths',
          description: 'Convert auths string to object',
          type: 'config'
        }
      ],
      requiresRestart: true,
      requiresReauth: false,
      riskLevel: 'low',
      dryRun: this.dryRun,
      execute: async () => {
        if (this.dryRun) {
          this.logVerbose('[DRY RUN] Would update deprecated auths field');
          return { success: true, message: 'Dry run - auths would be updated' };
        }

        try {
          const result = await this.updateDeprecatedAuths();
          return result;
        } catch (error) {
          return { success: false, message: `Failed to update auths: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Create add to docker group fix
   */
  createAddDockerGroupFix() {
    return {
      id: this.generateFixId(),
      type: 'add_docker_group',
      description: 'Add current user to docker group',
      actions: [
        {
          command: 'sudo usermod -aG docker $USER',
          description: 'Add user to docker group (requires sudo)',
          type: 'system',
          requiresSudo: true
        }
      ],
      requiresRestart: true,
      requiresReauth: false,
      riskLevel: 'low',
      dryRun: this.dryRun,
      execute: async () => {
        if (this.dryRun) {
          this.logVerbose('[DRY RUN] Would add user to docker group');
          return { success: true, message: 'Dry run - user would be added to docker group' };
        }

        try {
          const result = await this.runner.run('sudo', ['usermod', '-aG', 'docker', process.env.USER]);
          return { success: true, message: 'User added to docker group. Please log out and log back in.', output: result.stdout };
        } catch (error) {
          return { success: false, message: `Failed to add user to docker group: ${error.message}`, error };
        }
      }
    };
  }

  /**
   * Get credential helper installation actions
   */
  getCredentialHelperInstallActions() {
    switch (this.platform) {
      case 'darwin':
        return [
          {
            command: 'brew install docker-credential-helper',
            description: 'Install via Homebrew',
            type: 'package_manager'
          }
        ];
      case 'linux':
        return [
          {
            command: 'sudo apt-get install docker-credential-helpers',
            description: 'Install via apt (Ubuntu/Debian)',
            type: 'package_manager'
          },
          {
            command: 'sudo yum install docker-credential-helpers',
            description: 'Install via yum (RHEL/CentOS)',
            type: 'package_manager'
          },
          {
            command: 'go get github.com/docker/docker-credential-helpers/secretservice',
            description: 'Build from source',
            type: 'source'
          }
        ];
      case 'win32':
        return [
          {
            command: 'Download and install Docker Desktop',
            description: 'Docker Desktop includes Windows credential helper',
            type: 'download'
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Get broken helper actions
   */
  getBrokenHelperActions() {
    return [
      {
        command: 'docker-credential-fix config --remove-credsstore',
        description: 'Remove broken credential helper from Docker configuration',
        type: 'config'
      },
      {
        command: 'docker-credential-fix helper --reinstall',
        description: 'Reinstall Docker credential helper',
        type: 'reinstall'
      }
    ];
  }

  /**
   * Get invalid config actions
   */
  getInvalidConfigActions(configPath) {
    return [
      {
        command: `docker-credential-fix config --validate --file=${configPath}`,
        description: 'Validate and fix JSON syntax',
        type: 'validate'
      }
    ];
  }

  /**
   * Get invalid credsStore actions
   */
  getInvalidCredsStoreActions(currentValue) {
    return [
      {
        command: `docker-credential-fix config --remove-field=credsStore --value="${currentValue}"`,
        description: 'Remove invalid credential helper from configuration',
        type: 'config'
      }
    ];
  }

  /**
   * Get deprecated auths actions
   */
  getDeprecatedAuthsActions() {
    return [
      {
        command: 'docker-credential-fix config --update-auths',
        description: 'Convert deprecated auths format to object',
        type: 'config'
      }
    ];
  }

  /**
   * Get keychain fix actions
   */
  getKeychainFixActions() {
    return [
      {
        command: 'System Preferences > Security & Privacy > Privacy > Keychain',
        description: 'Grant keychain access to Docker Desktop',
        type: 'manual',
        steps: [
          'Open System Preferences',
          'Go to Security & Privacy',
          'Select Privacy tab',
          'Choose Keychain from the list',
          'Add Docker Desktop to allowed applications'
        ]
      }
    ];
  }

  /**
   * Get secret service actions
   */
  getSecretServiceActions() {
    return [
      {
        command: 'gnome-keyring-daemon --start',
        description: 'Start GNOME Keyring daemon',
        type: 'daemon'
      },
      {
        command: 'export $(gnome-keyring-daemon --start)',
        description: 'Set environment variables for keyring',
        type: 'environment'
      }
    ];
  }

  /**
   * Get docker group actions
   */
  getDockerGroupActions() {
    return [
      {
        command: 'sudo usermod -aG docker $USER',
        description: 'Add current user to docker group',
        type: 'system',
        requiresSudo: true
      },
      {
        command: 'newgrp docker',
        description: 'Switch to docker group for current session',
        type: 'session'
      }
    ];
  }

  /**
   * Apply configuration fix
   */
  async applyConfigFix(fix) {
    const configPath = this.configPath;

    try {
      // Create backup
      await this.createBackup(configPath);

      // Read current config
      const currentContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(currentContent);

      // Apply fix based on type
      const fixedConfig = this.applyFixToConfig(config, fix);

      // Write fixed config
      const fixedContent = JSON.stringify(fixedConfig, null, 2);
      await fs.writeFile(configPath, fixedContent, 'utf8');

      // Generate diff
      const diff = this.diffGenerator.generateDiff(currentContent, fixedContent, {
        originalLabel: 'current',
        modifiedLabel: 'fixed'
      });

      return {
        success: true,
        message: 'Configuration fixed successfully',
        diff: diff.hunks
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to apply fix: ${error.message}`,
        error
      };
    }
  }

  /**
   * Apply fix to configuration object
   */
  applyFixToConfig(config, fix) {
    const fixedConfig = { ...config };

    switch (fix.type) {
      case 'remove_credsstore':
        delete fixedConfig.credsStore;
        break;
      case 'update_auths':
        if (typeof fixedConfig.auths === 'string') {
          fixedConfig.auths = {};
        }
        break;
      default:
        break;
    }

    return fixedConfig;
  }

  /**
   * Remove credsStore from configuration
   */
  async removeCredsStore() {
    const configPath = this.configPath;

    try {
      await this.createBackup(configPath);

      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      delete config.credsStore;

      const fixedContent = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, fixedContent, 'utf8');

      return {
        success: true,
        message: 'Invalid credential helper removed from configuration'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to remove credsStore: ${error.message}`,
        error
      };
    }
  }

  /**
   * Update deprecated auths field
   */
  async updateDeprecatedAuths() {
    const configPath = this.configPath;

    try {
      await this.createBackup(configPath);

      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      if (typeof config.auths === 'string') {
        config.auths = {};
      }

      const fixedContent = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, fixedContent, 'utf8');

      return {
        success: true,
        message: 'Deprecated auths format updated'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update auths: ${error.message}`,
        error
      };
    }
  }

  /**
   * Attempt to fix JSON syntax
   */
  attemptJsonFix(content) {
    // Common JSON fixes
    let fixed = content;

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Add missing quotes around keys
    fixed = fixed.replace(/(\w+):/g, '"$1":');

    // Fix escaped quotes
    fixed = fixed.replace(/"/g, '\\"');

    return fixed;
  }

  /**
   * Create backup of configuration file
   */
  async createBackup(configPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `config-${timestamp}.backup.json`);

    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.copyFile(configPath, backupPath);
      this.logVerbose(`Created backup: ${backupPath}`);
    } catch (error) {
      // Continue without backup if file doesn't exist
      this.logVerbose(`Backup failed (file may not exist): ${error.message}`);
    }
  }

  /**
   * Execute multiple fixes
   */
  async executeFixes(fixes, options = {}) {
    const results = [];
    const dryRun = options.dryRun !== undefined ? options.dryRun : this.dryRun;
    const stopOnFailure = options.stopOnFailure || false;
    const dryRunOnly = options.dryRunOnly || false;

    if (dryRunOnly || dryRun) {
      this.logVerbose('DRY RUN MODE - No actual changes will be made');
    }

    for (const fix of fixes) {
      this.logVerbose(`Executing fix: ${fix.description}`);

      try {
        if (fix.execute) {
          const result = await fix.execute();
          results.push({
            id: fix.id,
            type: fix.type,
            description: fix.description,
            success: result.success,
            message: result.message,
            output: result.output,
            error: result.error
          });

          if (stopOnFailure && !result.success) {
            break;
          }
        }
      } catch (error) {
        results.push({
          id: fix.id,
          type: fix.type,
          description: fix.description,
          success: false,
          message: `Fix execution failed: ${error.message}`,
          error
        });

        if (stopOnFailure) {
          break;
        }
      }
    }

    return {
      results,
      executed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => r.success === false).length,
      requiresRestart: fixes.some(f => f.requiresRestart),
      requiresReauth: fixes.some(f => f.requiresReauth)
    };
  }

  /**
   * Execute specific fix by ID
   */
  async executeFix(fixId) {
    // This would be implemented to look up and execute a specific fix
    throw new Error(`Execute fix by ID not implemented: ${fixId}`);
  }

  /**
   * Validate fix result
   */
  async validateFix(fix) {
    try {
      switch (fix.type) {
        case 'remove_credsstore':
          return await this.validateCredsStoreRemoved();
        case 'update_auths':
          return await this.validateAuthsUpdated();
        case 'install_helper':
          return await this.validateHelperInstalled();
        default:
          return { valid: true, message: 'Validation not implemented for this fix type' };
      }
    } catch (error) {
      return { valid: false, message: `Validation failed: ${error.message}`, error };
    }
  }

  /**
   * Validate credsStore was removed
   */
  async validateCredsStoreRemoved() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(content);
      return { valid: !config.credsStore, message: 'credsStore successfully removed' };
    } catch (error) {
      return { valid: false, message: `Validation failed: ${error.message}` };
    }
  }

  /**
   * Validate auths was updated
   */
  async validateAuthsUpdated() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(content);
      const isValid = typeof config.auths === 'object';
      return { valid: isValid, message: isValid ? 'auths successfully updated' : 'auths still invalid' };
    } catch (error) {
      return { valid: false, message: `Validation failed: ${error.message}` };
    }
  }

  /**
   * Validate credential helper is installed
   */
  async validateHelperInstalled() {
    const helpers = this.getPlatformCredentialHelpers();

    for (const helper of helpers) {
      try {
        await this.runner.run('which', [helper], { timeout: 3000 });
        const test = await this.runner.run(helper, ['list'], { timeout: 5000 });
        if (!test.message.includes('exit status 1')) {
          return { valid: true, message: `Credential helper working: ${helper}` };
        }
      } catch (error) {
        // Continue to next helper
      }
    }

    return { valid: false, message: 'No working credential helper found' };
  }

  /**
   * Get platform-specific credential helpers
   */
  getPlatformCredentialHelpers() {
    switch (this.platform) {
      case 'darwin':
        return ['docker-credential-osxkeychain', 'docker-credential-desktop'];
      case 'linux':
        return ['docker-credential-secretservice', 'docker-credential-pass'];
      case 'win32':
        return ['docker-credential-wincred.exe', 'docker-credential-desktop.exe'];
      default:
        return [];
    }
  }

  /**
   * Determine if fixes require restart
   */
  requiresRestart(fixes) {
    return fixes.some(fix => fix.requiresRestart);
  }

  /**
   * Determine if fixes require re-authentication
   */
  requiresReauth(fixes) {
    return fixes.some(fix => fix.requiresReauth);
  }

  /**
   * Assess overall risk level
   */
  assessRiskLevel(fixes) {
    const riskLevels = fixes.map(f => f.riskLevel || 'low');

    if (riskLevels.includes('critical')) return 'critical';
    if (riskLevels.includes('high')) return 'high';
    if (riskLevels.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Compare priority levels
   */
  comparePriority(a, b) {
    const levels = { critical: 0, high: 1, medium: 2, low: 3 };
    return levels[a] - levels[b];
  }

  /**
   * Remove duplicate recommendations
   */
  removeDuplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = rec.title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate unique fix ID
   */
  generateFixId() {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log verbose message
   */
  logVerbose(message) {
    if (this.verbose) {
      console.log(`[CredentialRepairer] ${message}`);
    }
  }
}

module.exports = CredentialRepairer;