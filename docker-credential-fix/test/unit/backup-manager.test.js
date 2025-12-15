const { BackupManager } = require('../../repairs/backup-manager');

describe('Backup Manager', () => {
  it('should create backup directory if it does not exist', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    // Check if directory was created
    const fs = require('fs');
    expect(await fs.access('/tmp/test-backups')).to.notThrow();

    // Test backup creation
    const content = '{"test": "data", "version": "1.0"}';
    const result = await manager.createConfigBackup('/tmp/test-config.json', content);

    expect(result.success).to.be(true);
    expect(result.backupId).to.match(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));
  });

  it('should restore backup with verification', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    // Create backup first
    const content = '{"test": "data", "version": "1.0"}';
    const result = await manager.createConfigBackup('/tmp/test-config.json', content);

    // Verify backup exists
    expect(await fs.access(`/tmp/test-backups/${result.backupId}.config.json`)).to.notThrow();
    expect(result.success).to.be(true);
    expect(result.checksum).to.be(manager.calculateChecksum(content));

    // Modify original file
    const modifiedContent = '{"test": "modified", "version": "1.0"}';
    await fs.writeFile('/tmp/test-config.json', modifiedContent);

    // Restore backup
    const restoreResult = await manager.restoreBackup(result.backupId, '/tmp/test-config.json');

    expect(restoreResult.success).to.be(true);
    expect(restoreResult.restoredContent).to.be(content);
  });

  it('should handle backup cleanup', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    // Create and delete backup
    const content = '{"test": "cleanup", "version": "1.0"}';
    const result = await manager.createConfigBackup('/tmp/test-config.json', content);

    // Verify backup exists
    expect(await fs.access(`/tmp/test-backups/${result.backupId}.config.json`)).to.notThrow();

    // Delete backup
    const deleteResult = await manager.deleteBackup(result.backupId);

    expect(deleteResult.success).to.be(true);

    // Verify backup is deleted
    await expect(fs.access(`/tmp/test-backups/${result.backupId}.config.json`)).rejects.toThrow();
  });

  it('should list available backups', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    const backups = await manager.listBackups();
    expect(backups).to.be.an(Array);
    expect(backups.length).to.be.greaterThan(0);
  });

  it('should calculate storage statistics', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    // Create multiple backups for testing
    const backups = [];
    for (let i = 0; i < 5; i++) {
      const content = `{"test": "backup${i}", "data": "content-${i}"}`;
      const result = await manager.createConfigBackup(`/tmp/test-config.json`, content);
      backups.push(result);
    }

    const stats = await manager.getBackupStats();

    expect(stats.totalBackups).to.be(5);
    expect(stats.totalSize).to.be.greaterThan(0);
    expect(stats.totalSizeFormatted).to.match(/\d+ bytes/));
  });

  it('should cleanup old backups', async () => {
    const manager = new BackupManager({
      backupDir: '/tmp/test-backups',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      maxBackups: 3
    });

    await manager.cleanup();

    const finalStats = await manager.getBackupStats();
    expect(finalStats.totalBackups).to.be(3); // max 3 kept
  });

  it('should verify backup integrity', async () => {
    const manager = new BackupManager({ backupDir: '/tmp/test-backups' });

    await manager.initialize();

    const remainingBackups = await manager.listBackups();

    for (const backup of remainingBackups) {
      const integrityResult = await manager.verifyBackup(backup.id);
      expect(integrityResult.valid).to.be(true);
    }
    }
  });
});