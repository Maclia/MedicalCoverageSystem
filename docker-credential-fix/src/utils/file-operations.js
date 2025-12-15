const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/**
 * File Operations Utility
 * Safe file I/O operations with validation, backup, and error handling
 */

class FileOperations {
  constructor(options = {}) {
    this.encoding = options.encoding || 'utf8';
    this.createBackup = options.createBackup !== false;
    this.validatePaths = options.validatePaths !== false;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Safely read a file with validation
   */
  async safeRead(filePath, options = {}) {
    const resolvedPath = path.resolve(filePath);
    const encoding = options.encoding || this.encoding;

    if (this.validatePaths) {
      this.validatePath(resolvedPath);
    }

    try {
      const stats = await fs.stat(resolvedPath);

      // Check file size to prevent reading extremely large files
      const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      const content = await fs.readFile(resolvedPath, encoding);

      return {
        content,
        stats,
        path: resolvedPath,
        size: stats.size,
        checksum: this.calculateChecksum(content)
      };

    } catch (error) {
      throw new Error(`Failed to read file ${resolvedPath}: ${error.message}`);
    }
  }

  /**
   * Safely write a file with backup
   */
  async safeWrite(filePath, content, options = {}) {
    const resolvedPath = path.resolve(filePath);
    const encoding = options.encoding || this.encoding;
    const atomic = options.atomic !== false;
    const createBackup = options.createBackup !== undefined ? options.createBackup : this.createBackup;

    if (this.validatePaths) {
      this.validatePath(resolvedPath);
    }

    // Ensure directory exists
    await this.ensureDirectory(path.dirname(resolvedPath));

    // Create backup if file exists and backup is enabled
    let backupPath = null;
    if (createBackup) {
      try {
        const stats = await fs.stat(resolvedPath);
        backupPath = await this.createBackupFile(resolvedPath, stats);
      } catch (error) {
        // File doesn't exist, no backup needed
      }
    }

    const originalContent = content;
    let finalContent = content;

    // Validate content if validator provided
    if (options.validator && typeof options.validator === 'function') {
      const validationResult = options.validator(finalContent);
      if (validationResult !== true) {
        throw new Error(`Content validation failed: ${validationResult}`);
      }
    }

    // Convert to string if needed
    if (typeof finalContent !== 'string') {
      finalContent = JSON.stringify(finalContent, null, 2);
    }

    // Create temporary file for atomic write
    if (atomic) {
      const tempPath = `${resolvedPath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

      try {
        await fs.writeFile(tempPath, finalContent, encoding);
        await fs.rename(tempPath, resolvedPath);
      } catch (error) {
        // Clean up temporary file on error
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error;
      }
    } else {
      await fs.writeFile(resolvedPath, finalContent, encoding);
    }

    // Verify write was successful
    if (options.verify) {
      const verification = await this.safeRead(resolvedPath, { encoding });
      if (verification.content !== finalContent) {
        throw new Error('File verification failed after write');
      }
    }

    const finalStats = await fs.stat(resolvedPath);

    return {
      path: resolvedPath,
      backupPath,
      size: finalStats.size,
      checksum: this.calculateChecksum(finalContent),
      originalSize: Buffer.byteLength(originalContent, encoding)
    };
  }

  /**
   * Create a backup file with timestamp
   */
  async createBackupFile(filePath, stats = null) {
    const backupDir = path.join(path.dirname(filePath), '.docker-backups');
    await this.ensureDirectory(backupDir);

    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}.${timestamp}.backup`;
    const backupPath = path.join(backupDir, backupFileName);

    // Copy original file to backup location
    await fs.copyFile(filePath, backupPath);

    // Create metadata file
    const metadata = {
      originalPath: filePath,
      backupPath,
      timestamp: new Date().toISOString(),
      originalStats: stats || await fs.stat(filePath),
      checksum: await this.getFileChecksum(filePath)
    };

    const metadataPath = backupPath + '.meta';
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return backupPath;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath, originalPath = null) {
    const metadataPath = backupPath + '.meta';

    try {
      await fs.access(backupPath);
      await fs.access(metadataPath);
    } catch (error) {
      throw new Error(`Backup files not found: ${error.message}`);
    }

    // Read metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);

    const targetPath = originalPath || metadata.originalPath;

    // Verify backup integrity
    const currentChecksum = await this.getFileChecksum(backupPath);
    if (currentChecksum !== metadata.checksum) {
      throw new Error('Backup file checksum mismatch - backup may be corrupted');
    }

    // Ensure target directory exists
    await this.ensureDirectory(path.dirname(targetPath));

    // Restore file
    await fs.copyFile(backupPath, targetPath);

    return {
      originalPath: targetPath,
      backupPath,
      metadata,
      restored: true
    };
  }

  /**
   * List available backups for a file
   */
  async listBackups(filePath) {
    const backupDir = path.join(path.dirname(filePath), '.docker-backups');
    const fileName = path.basename(filePath);

    try {
      await fs.access(backupDir);
      const files = await fs.readdir(backupDir);

      const backups = [];
      for (const file of files) {
        if (file.startsWith(fileName) && file.endsWith('.backup')) {
          const backupPath = path.join(backupDir, file);
          const metadataPath = backupPath + '.meta';

          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            backups.push({
              path: backupPath,
              metadata,
              timestamp: new Date(metadata.timestamp),
              age: Date.now() - new Date(metadata.timestamp).getTime()
            });
          } catch (error) {
            // Skip corrupted backup metadata
          }
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => b.timestamp - a.timestamp);
      return backups;

    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(filePath, options = {}) {
    const maxAge = options.maxAge || 30 * 24 * 60 * 60 * 1000; // 30 days default
    const maxCount = options.maxCount || 10;

    const backups = await this.listBackups(filePath);
    const now = Date.now();

    const toDelete = [];
    const toKeep = [];

    for (const backup of backups) {
      if (backup.age > maxAge) {
        toDelete.push(backup);
      } else if (toKeep.length < maxCount) {
        toKeep.push(backup);
      } else {
        toDelete.push(backup);
      }
    }

    // Delete old backups
    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.path);
        await fs.unlink(backup.path + '.meta');
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return {
      deleted: toDelete.length,
      kept: toKeep.length,
      total: backups.length
    };
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
      }
    }
  }

  /**
   * Validate file path for security
   */
  validatePath(filePath) {
    const resolvedPath = path.resolve(filePath);

    // Prevent directory traversal
    if (filePath.includes('..')) {
      throw new Error(`Path traversal not allowed: ${filePath}`);
    }

    // Check for dangerous paths
    const dangerousPaths = [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/hosts',
      '/proc',
      '/sys',
      '/dev'
    ];

    for (const dangerous of dangerousPaths) {
      if (resolvedPath.startsWith(dangerous)) {
        throw new Error(`Access to dangerous path not allowed: ${resolvedPath}`);
      }
    }

    return resolvedPath;
  }

  /**
   * Calculate checksum for content
   */
  calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get file checksum
   */
  async getFileChecksum(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if file exists
   */
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create JSON file with validation
   */
  async writeJsonFile(filePath, data, options = {}) {
    const content = JSON.stringify(data, null, options.indent || 2);

    return this.safeWrite(filePath, content, {
      ...options,
      validator: (content) => {
        try {
          JSON.parse(content);
          return true;
        } catch (error) {
          return `Invalid JSON: ${error.message}`;
        }
      }
    });
  }

  /**
   * Read and parse JSON file
   */
  async readJsonFile(filePath, options = {}) {
    const result = await this.safeRead(filePath, options);

    try {
      const data = JSON.parse(result.content);
      return {
        data,
        ...result
      };
    } catch (error) {
      throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Append to file safely
   */
  async appendFile(filePath, content, options = {}) {
    const resolvedPath = path.resolve(filePath);
    const encoding = options.encoding || this.encoding;

    if (this.validatePaths) {
      this.validatePath(resolvedPath);
    }

    await this.ensureDirectory(path.dirname(resolvedPath));

    return fs.appendFile(resolvedPath, content, encoding);
  }

  /**
   * Copy file with progress tracking
   */
  async copyFileWithProgress(sourcePath, targetPath, options = {}) {
    const resolvedSource = path.resolve(sourcePath);
    const resolvedTarget = path.resolve(targetPath);

    if (this.validatePaths) {
      this.validatePath(resolvedSource);
      this.validatePath(resolvedTarget);
    }

    await this.ensureDirectory(path.dirname(resolvedTarget));

    const sourceStats = await fs.stat(resolvedSource);
    const totalBytes = sourceStats.size;

    if (totalBytes === 0) {
      await fs.copyFile(resolvedSource, resolvedTarget);
      return { totalBytes, copiedBytes: 0, progress: 100 };
    }

    return new Promise((resolve, reject) => {
      const readStream = require('fs').createReadStream(resolvedSource);
      const writeStream = require('fs').createWriteStream(resolvedTarget);

      let copiedBytes = 0;

      readStream.on('data', (chunk) => {
        copiedBytes += chunk.length;
        const progress = Math.round((copiedBytes / totalBytes) * 100);

        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(copiedBytes, totalBytes, progress);
        }
      });

      readStream.on('error', reject);
      writeStream.on('error', reject);

      writeStream.on('finish', () => {
        resolve({
          totalBytes,
          copiedBytes,
          progress: 100
        });
      });

      readStream.pipe(writeStream);
    });
  }

  /**
   * Find files matching pattern
   */
  async findFiles(baseDir, pattern, options = {}) {
    const resolvedBaseDir = path.resolve(baseDir);
    const maxDepth = options.maxDepth || 10;
    const files = [];

    if (this.validatePaths) {
      this.validatePath(resolvedBaseDir);
    }

    const regex = new RegExp(pattern);

    async function scanDirectory(dir, depth = 0) {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir);

        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory()) {
            if (!options.excludeDirs || !regex.test(entry)) {
              await scanDirectory(entryPath, depth + 1);
            }
          } else if (stats.isFile() && regex.test(entry)) {
            files.push({
              path: entryPath,
              relativePath: path.relative(resolvedBaseDir, entryPath),
              name: entry,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }

    await scanDirectory(resolvedBaseDir);

    // Sort files if needed
    if (options.sort) {
      const sortKey = options.sort === 'name' ? 'name' :
                     options.sort === 'size' ? 'size' :
                     options.sort === 'modified' ? 'modified' : 'name';
      files.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1;
        if (a[sortKey] > b[sortKey]) return 1;
        return 0;
      });
    }

    return files;
  }

  /**
   * Get temporary file path
   */
  getTempFilePath(prefix = 'docker-credential-fix', suffix = 'tmp') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const fileName = `${prefix}.${timestamp}.${random}.${suffix}`;

    return path.join(require('os').tmpdir(), fileName);
  }
}

module.exports = FileOperations;