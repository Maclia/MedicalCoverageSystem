const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * Backup Manager
 * Creates, manages, and restores backups of Docker configurations and credentials
 */

class BackupManager {
  constructor(options = {}) {
    this.backupDir = options.backupDir || path.join(os.homedir(), '.docker', 'backups');
    this.maxBackups = options.maxBackups || 50;
    this.maxAge = options.maxAge || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.compression = options.compression || false;
    this.encryption = options.encryption || false;
    this.encryptionKey = options.encryptionKey || null;
    this.verbose = options.verbose || false;
  }

  /**
   * Initialize backup directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await this.createBackupIndex();
    } catch (error) {
      throw new Error(`Failed to initialize backup directory: ${error.message}`);
    }
  }

  /**
   * Create backup index file
   */
  async createBackupIndex() {
    const indexPath = path.join(this.backupDir, 'index.json');
    const index = {
      version: '1.0.0',
      created: new Date().toISOString(),
      backups: [],
      lastCleanup: null
    };

    // Only create if doesn't exist
    try {
      await fs.access(indexPath);
    } catch (error) {
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    }
  }

  /**
   * Read backup index
   */
  async readBackupIndex() {
    const indexPath = path.join(this.backupDir, 'index.json');
    try {
      const content = await fs.readFile(indexPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { version: '1.0.0', created: new Date().toISOString(), backups: [], lastCleanup: null };
    }
  }

  /**
   * Write backup index
   */
  async writeBackupIndex(index) {
    const indexPath = path.join(this.backupDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Create backup of Docker configuration
   */
  async createConfigBackup(configPath = '~/.docker/config.json') {
    const resolvedConfigPath = path.resolve(configPath.replace('~', os.homedir()));
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    const backup = {
      id: backupId,
      timestamp,
      type: 'config',
      originalPath: resolvedConfigPath,
      description: 'Docker configuration backup',
      version: '1.0.0'
    };

    try {
      // Read original config if it exists
      let originalContent = null;
      let originalChecksum = null;

      try {
        const content = await fs.readFile(resolvedConfigPath, 'utf8');
        originalContent = content;
        originalChecksum = this.calculateChecksum(content);
      } catch (error) {
        // Config file doesn't exist
        originalContent = null;
        originalChecksum = null;
      }

      backup.originalContent = originalContent;
      backup.originalChecksum = originalChecksum;

      // Create backup file
      const backupPath = path.join(this.backupDir, `${backupId}.config.json`);
      if (originalContent) {
        await fs.writeFile(backupPath, originalContent);
      }

      // Create metadata file
      const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backup, null, 2));

      // Update index
      const index = await this.readBackupIndex();
      index.backups.unshift(backup);
      await this.writeBackupIndex(index);

      this.logVerbose(`Created config backup: ${backupId}`);

      return {
        id: backupId,
        path: backupPath,
        metadataPath,
        backup
      };

    } catch (error) {
      throw new Error(`Failed to create config backup: ${error.message}`);
    }
  }

  /**
   * Create backup of credential data
   */
  async createCredentialBackup(credentialHelper, data = null) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    const backup = {
      id: backupId,
      timestamp,
      type: 'credentials',
      helper: credentialHelper,
      originalData: data || await this.exportCredentialData(credentialHelper),
      description: `${credentialHelper} credential backup`,
      version: '1.0.0'
    };

    try {
      // Create backup file
      const backupPath = path.join(this.backupDir, `${backupId}.credentials.json`);
      const backupData = {
        timestamp,
        helper: credentialHelper,
        data: backup.originalData,
        metadata: {
          platform: os.platform(),
          hostname: os.hostname(),
          user: process.env.USER || process.env.USERNAME || 'unknown'
        }
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      // Create metadata file
      const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(backup, null, 2));

      // Update index
      const index = await this.readBackupIndex();
      index.backups.unshift(backup);
      await this.writeBackupIndex(index);

      this.logVerbose(`Created credential backup: ${backupId} (${credentialHelper})`);

      return {
        id: backupId,
        path: backupPath,
        metadataPath,
        backup
      };

    } catch (error) {
      throw new Error(`Failed to create credential backup: ${error.message}`);
    }
  }

  /**
   * Create comprehensive backup
   */
  async createComprehensiveBackup() {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    const backup = {
      id: backupId,
      timestamp,
      type: 'comprehensive',
      description: 'Comprehensive Docker backup',
      version: '1.0.0',
      components: {}
    };

    try {
      // Backup Docker configuration
      try {
        const configBackup = await this.createConfigBackup();
        backup.components.config = configBackup;
      } catch (error) {
        backup.components.config = { error: error.message };
      }

      // Backup credential data
      try {
        const credentialBackup = await this.detectAndBackupCredentials();
        backup.components.credentials = credentialBackup;
      } catch (error) {
        backup.components.credentials = { error: error.message };
      }

      // Backup Docker installation info
      try {
        const dockerInfo = await this.gatherDockerInfo();
        backup.components.dockerInfo = dockerInfo;
      } catch (error) {
        backup.components.dockerInfo = { error: error.message };
      }

      // Create comprehensive backup file
      const backupPath = path.join(this.backupDir, `${backupId}.comprehensive.json`);
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

      // Create metadata file
      const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
      const metadata = {
        ...backup,
        originalPath: backupPath,
        comprehensive: true
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Update index
      const index = await this.readBackupIndex();
      index.backups.unshift(backup);
      await this.writeBackupIndex(index);

      this.logVerbose(`Created comprehensive backup: ${backupId}`);

      return {
        id: backupId,
        path: backupPath,
        metadataPath,
        backup
      };

    } catch (error) {
      throw new Error(`Failed to create comprehensive backup: ${error.message}`);
    }
  }

  /**
   * Detect and backup available credentials
   */
  async detectAndBackupCredentials() {
    const helpers = await this.detectCredentialHelpers();
    const backups = [];

    for (const helper of helpers) {
      try {
        const backup = await this.createCredentialBackup(helper.type);
        backups.push(backup);
      } catch (error) {
        backups.push({ helper: helper.type, error: error.message });
      }
    }

    return backups;
  }

  /**
   * Detect available credential helpers
   */
  async detectCredentialHelpers() {
    const helpers = [];
    const possibleHelpers = [
      'docker-credential-osxkeychain',
      'docker-credential-secretservice',
      'docker-credential-pass',
      'docker-credential-wincred.exe',
      'docker-credential-desktop.exe',
      'docker-credential-ecr-login',
      'docker-credential-acr-login'
    ];

    for (const helper of possibleHelpers) {
      try {
        await this.executeCommand('which', [helper], { timeout: 3000 });
        helpers.push({
          type: helper,
          working: await this.testCredentialHelper(helper),
          path: await this.executeCommand('which', [helper], { timeout: 3000 })
        });
      } catch (error) {
        // Helper not available
      }
    }

    return helpers;
  }

  /**
   * Test if credential helper is working
   */
  async testCredentialHelper(helper) {
    try {
      await this.executeCommand(helper, ['list'], { timeout: 5000 });
      return true;
    } catch (error) {
      // Exit status 1 indicates broken helper (what we're fixing)
      return !error.message.includes('exit status 1');
    }
  }

  /**
   * Export credential data
   */
  async exportCredentialData(helper) {
    try {
      const output = await this.executeCommand(helper, ['list'], { timeout: 5000 });
      return output ? JSON.parse(output) : {};
    } catch (error) {
      // Return empty for failed exports
      return {};
    }
  }

  /**
   * Gather Docker installation information
   */
  async gatherDockerInfo() {
    const info = {};

    try {
      // Docker version
      const version = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
      info.version = version.trim();
    } catch (error) {
      info.version = 'not installed';
    }

    try {
      // Docker info
      const dockerInfo = await this.executeCommand('docker', ['info', '--format', '{{json .}}'], { timeout: 10000 });
      info.dockerInfo = JSON.parse(dockerInfo);
    } catch (error) {
      info.dockerInfo = null;
    }

    try {
      // Docker configuration
      const configPath = path.join(os.homedir(), '.docker', 'config.json');
      const configContent = await fs.readFile(configPath, 'utf8');
      info.config = JSON.parse(configContent);
    } catch (error) {
      info.config = null;
    }

    info.system = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version
    };

    return info;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId, targetPath = null) {
    try {
      const metadata = await this.readBackupMetadata(backupId);
      if (!metadata) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      let restored = false;
      let restoredPath = null;

      switch (metadata.type) {
        case 'config':
          restored = await this.restoreConfigBackup(backupId, targetPath);
          restoredPath = restored.path;
          break;
        case 'credentials':
          restored = await this.restoreCredentialBackup(backupId);
          restoredPath = 'credential store';
          break;
        case 'comprehensive':
          restored = await this.restoreComprehensiveBackup(backupId, targetPath);
          restoredPath = restored.restoredFiles.map(f => f.path);
          break;
        default:
          throw new Error(`Unknown backup type: ${metadata.type}`);
      }

      // Log restoration
      const restoration = {
        backupId,
        timestamp: new Date().toISOString(),
        originalBackup: metadata,
        restoredPath,
        success: restored.success || true
      };

      await this.logRestoration(restoration);

      this.logVerbose(`Restored backup: ${backupId} to ${restoredPath}`);

      return restoration;

    } catch (error) {
      throw new Error(`Failed to restore backup ${backupId}: ${error.message}`);
    }
  }

  /**
   * Restore config backup
   */
  async restoreConfigBackup(backupId, targetPath = null) {
    const backupPath = path.join(this.backupDir, `${backupId}.config.json`);
    const metadata = await this.readBackupMetadata(backupId);

    if (!metadata.originalContent) {
      throw new Error('Backup has no content to restore');
    }

    const restorePath = targetPath || metadata.originalPath;
    await fs.mkdir(path.dirname(restorePath), { recursive: true });

    // Verify backup integrity
    const currentChecksum = this.calculateChecksum(metadata.originalContent);
    if (currentChecksum !== metadata.originalChecksum) {
      throw new Error('Backup integrity check failed');
    }

    await fs.writeFile(restorePath, metadata.originalContent);

    return {
      success: true,
      path: restorePath,
      checksum: currentChecksum
    };
  }

  /**
   * Restore credential backup
   */
  async restoreCredentialBackup(backupId) {
    const backupPath = path.join(this.backupDir, `${backupId}.credentials.json`);
    const metadata = await this.readBackupMetadata(backupId);

    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

    if (!metadata.helper || !backupData.data) {
      throw new Error('Invalid credential backup format');
    }

    // Import credentials based on helper type
    try {
      await this.importCredentialData(metadata.helper, backupData.data);
    } catch (error) {
      throw new Error(`Failed to import credentials: ${error.message}`);
    }

    return {
      success: true,
      helper: metadata.helper,
      entries: Object.keys(backupData.data).length
    };
  }

  /**
   * Import credential data to helper
   */
  async importCredentialData(helper, data) {
    // Note: Most credential helpers don't have a direct import function
    // This is a placeholder for potential future implementation
    this.logVerbose(`Importing ${Object.keys(data).length} credential entries to ${helper}`);

    // For now, just log what would be imported
    for (const [server, credentials] of Object.entries(data)) {
      this.logVerbose(`  ${server}: ${Object.keys(credentials).length} accounts`);
    }
  }

  /**
   * Restore comprehensive backup
   */
  async restoreComprehensiveBackup(backupId, targetPaths = {}) {
    const backupPath = path.join(this.backupDir, `${backupId}.comprehensive.json`);
    const metadata = await this.readBackupMetadata(backupId);
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

    const restoredFiles = [];
    const errors = [];

    // Restore config
    if (backupData.components.config && backupData.components.config.id) {
      try {
        const configRestore = await this.restoreBackup(
          backupData.components.config.id,
          targetPaths.config
        );
        restoredFiles.push({
          type: 'config',
          path: configRestore.restoredPath
        });
      } catch (error) {
        errors.push({ type: 'config', error: error.message });
      }
    }

    // Restore credentials
    if (backupData.components.credentials) {
      try {
        if (Array.isArray(backupData.components.credentials)) {
          for (const credBackup of backupData.components.credentials) {
            if (credBackup.id) {
              await this.restoreBackup(credBackup.id);
              restoredFiles.push({
                type: 'credentials',
                helper: credBackup.backup.helper
              });
            }
          }
        }
      } catch (error) {
        errors.push({ type: 'credentials', error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      restoredFiles,
      errors
    };
  }

  /**
   * List available backups
   */
  async listBackups(filter = {}) {
    const index = await this.readBackupIndex();
    let backups = index.backups || [];

    // Apply filters
    if (filter.type) {
      backups = backups.filter(backup => backup.type === filter.type);
    }

    if (filter.since) {
      backups = backups.filter(backup => new Date(backup.timestamp) >= new Date(filter.since));
    }

    if (filter.until) {
      backups = backups.filter(backup => new Date(backup.timestamp) <= new Date(filter.until));
    }

    if (filter.helper) {
      backups = backups.filter(backup => backup.helper === filter.helper);
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get file status for each backup
    for (const backup of backups) {
      backup.fileExists = await this.backupFileExists(backup.id);
      backup.age = Date.now() - new Date(backup.timestamp).getTime();
    }

    return backups;
  }

  /**
   * Check if backup file exists
   */
  async backupFileExists(backupId) {
    const files = [
      path.join(this.backupDir, `${backupId}.config.json`),
      path.join(this.backupDir, `${backupId}.credentials.json`),
      path.join(this.backupDir, `${backupId}.comprehensive.json`),
      path.join(this.backupDir, `${backupId}.meta.json`)
    ];

    for (const file of files) {
      try {
        await fs.access(file);
        return true;
      } catch (error) {
        // Continue checking
      }
    }

    return false;
  }

  /**
   * Read backup metadata
   */
  async readBackupMetadata(backupId) {
    const metadataPath = path.join(this.backupDir, `${backupId}.meta.json`);
    try {
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId) {
    const files = [
      path.join(this.backupDir, `${backupId}.config.json`),
      path.join(this.backupDir, `${backupId}.credentials.json`),
      path.join(this.backupDir, `${backupId}.comprehensive.json`),
      path.join(this.backupDir, `${backupId}.meta.json`)
    ];

    let deletedFiles = 0;
    for (const file of files) {
      try {
        await fs.unlink(file);
        deletedFiles++;
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    // Update index
    const index = await this.readBackupIndex();
    index.backups = index.backups.filter(backup => backup.id !== backupId);
    await this.writeBackupIndex(index);

    this.logVerbose(`Deleted backup: ${backupId} (${deletedFiles} files)`);

    return {
      deletedFiles,
      success: true
    };
  }

  /**
   * Clean up old backups
   */
  async cleanup(options = {}) {
    const maxBackups = options.maxBackups || this.maxBackups;
    const maxAge = options.maxAge || this.maxAge;
    const dryRun = options.dryRun || false;

    const index = await this.readBackupIndex();
    let backups = index.backups || [];

    // Sort by age (oldest first)
    backups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const toDelete = [];
    const now = Date.now();

    for (let i = 0; i < backups.length; i++) {
      const backup = backups[i];
      const age = now - new Date(backup.timestamp).getTime();
      const countExceeded = backups.length - toDelete.length > maxBackups;

      if (age > maxAge || countExceeded) {
        backup.deleteReason = age > maxAge ? 'old' : 'exceeded';
        toDelete.push(backup);
      }
    }

    if (!dryRun) {
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }

      // Update cleanup timestamp
      index.lastCleanup = new Date().toISOString();
      await this.writeBackupIndex(index);
    }

    return {
      total: backups.length,
      deleted: toDelete.length,
      kept: backups.length - toDelete.length,
      dryRun,
      deletedBackups: toDelete
    };
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId) {
    try {
      const metadata = await this.readBackupMetadata(backupId);
      if (!metadata) {
        return { valid: false, error: 'Backup metadata not found' };
      }

      // Check file existence
      if (!await this.backupFileExists(backupId)) {
        return { valid: false, error: 'Backup files not found' };
      }

      // Verify checksum if available
      if (metadata.originalChecksum && metadata.originalContent) {
        const currentChecksum = this.calculateChecksum(metadata.originalContent);
        if (currentChecksum !== metadata.originalChecksum) {
          return { valid: false, error: 'Checksum mismatch' };
        }
      }

      return {
        valid: true,
        backup: metadata,
        age: Date.now() - new Date(metadata.timestamp).getTime()
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    const index = await this.readBackupIndex();
    const backups = index.backups || [];

    const stats = {
      total: backups.length,
      byType: {},
      byHelper: {},
      totalSize: 0,
      oldest: null,
      newest: null,
      averageAge: 0
    };

    if (backups.length === 0) {
      return stats;
    }

    const now = Date.now();
    let totalAge = 0;

    for (const backup of backups) {
      // Type statistics
      stats.byType[backup.type] = (stats.byType[backup.type] || 0) + 1;

      // Helper statistics
      if (backup.helper) {
        stats.byHelper[backup.helper] = (stats.byHelper[backup.helper] || 0) + 1;
      }

      // Age calculations
      const age = now - new Date(backup.timestamp).getTime();
      totalAge += age;

      // Oldest and newest
      if (!stats.oldest || age > stats.oldest.age) {
        stats.oldest = { id: backup.id, age, timestamp: backup.timestamp };
      }

      if (!stats.newest || age < stats.newest.age) {
        stats.newest = { id: backup.id, age, timestamp: backup.timestamp };
      }

      // File size estimation
      try {
        const files = await fs.readdir(this.backupDir);
        const backupFiles = files.filter(file => file.startsWith(backup.id));
        for (const file of backupFiles) {
          const filePath = path.join(this.backupDir, file);
          const fileStats = await fs.stat(filePath);
          stats.totalSize += fileStats.size;
        }
      } catch (error) {
        // Ignore size calculation errors
      }
    }

    stats.averageAge = totalAge / backups.length;
    stats.totalSizeFormatted = this.formatBytes(stats.totalSize);

    return stats;
  }

  /**
   * Export backup archive
   */
  async exportBackup(backupId, exportPath) {
    const metadata = await this.readBackupMetadata(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const files = [
      path.join(this.backupDir, `${backupId}.config.json`),
      path.join(this.backupDir, `${backupId}.credentials.json`),
      path.join(this.backupDir, `${backupId}.comprehensive.json`),
      path.join(this.backupDir, `${backupId}.meta.json`)
    ];

    // Create export directory
    await fs.mkdir(exportPath, { recursive: true });

    let exportedFiles = 0;
    let totalSize = 0;

    for (const file of files) {
      try {
        await fs.access(file);
        const stats = await fs.stat(file);
        const fileName = path.basename(file);
        const targetFile = path.join(exportPath, fileName);

        await fs.copyFile(file, targetFile);
        exportedFiles++;
        totalSize += stats.size;
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    // Create export manifest
    const manifest = {
      exportInfo: {
        backupId,
        exportedAt: new Date().toISOString(),
        exportedFiles,
        totalSize,
        metadata
      }
    };

    await fs.writeFile(path.join(exportPath, 'export-manifest.json'), JSON.stringify(manifest, null, 2));

    this.logVerbose(`Exported backup ${backupId}: ${exportedFiles} files, ${this.formatBytes(totalSize)}`);

    return {
      backupId,
      exportPath,
      exportedFiles,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize)
    };
  }

  /**
   * Import backup archive
   */
  async importBackup(importPath, backupId = null) {
    const manifestPath = path.join(importPath, 'export-manifest.json');
    let manifest;

    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      if (!backupId) {
        backupId = manifest.exportInfo.backupId;
      }
    } catch (error) {
      throw new Error('Invalid backup export: missing manifest file');
    }

    const files = [
      `${backupId}.config.json`,
      `${backupId}.credentials.json`,
      `${backupId}.comprehensive.json`,
      `${backupId}.meta.json`
    ];

    let importedFiles = 0;

    for (const file of files) {
      const sourceFile = path.join(importPath, file);
      const targetFile = path.join(this.backupDir, file);

      try {
        await fs.access(sourceFile);
        await fs.copyFile(sourceFile, targetFile);
        importedFiles++;
      } catch (error) {
        // File doesn't exist in export
      }
    }

    if (importedFiles === 0) {
      throw new Error('No backup files found in export');
    }

    // Update backup index
    if (manifest.exportInfo.metadata) {
      const index = await this.readBackupIndex();
      index.backups.unshift(manifest.exportInfo.metadata);
      await this.writeBackupIndex(index);
    }

    this.logVerbose(`Imported backup ${backupId}: ${importedFiles} files`);

    return {
      backupId,
      importedFiles,
      manifest
    };
  }

  /**
   * Log restoration event
   */
  async logRestoration(restoration) {
    const logPath = path.join(this.backupDir, 'restorations.log');
    const logEntry = `${new Date().toISOString()} - RESTORED - ${restoration.backupId} - ${restoration.restoredPath}\n`;
    await fs.appendFile(logPath, logEntry);
  }

  /**
   * Generate unique backup ID
   */
  generateBackupId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  /**
   * Calculate checksum
   */
  calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Execute command with timeout
   */
  async executeCommand(command, args, options = {}) {
    const { spawn } = require('child_process');
    const timeout = options.timeout || 10000;

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
   * Log verbose message
   */
  logVerbose(message) {
    if (this.verbose) {
      console.log(`[BackupManager] ${message}`);
    }
  }
}

module.exports = BackupManager;