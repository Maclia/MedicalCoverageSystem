const { PlatformDetector } = require('../../diagnostics/platform-detector');

describe('Platform Detector', () => {
  it('should detect operating system', async () => {
    const detector = new PlatformDetector();

    // Test macOS detection
    const macInfo = await detector.getPlatformInfo();
    expect(macInfo.os).to.equal('darwin');
    expect(macInfo.arch).to.match(/arm64|aarch64/));
  });

  it('should detect Docker availability', async () => {
    const detector = new PlatformDetector();

    const dockerInfo = await detector.getDockerInfo();
    expect(dockerInfo.daemon).toBeDefined();
    expect(dockerInfo.daemon.running).to.be(true);
  });

  it('should validate file paths for security', async () => {
    const detector = new PlatformDetector();

    // Test malicious path detection
    const maliciousPaths = [
      '/etc/passwd',
      '/etc/shadow',
      '/root/.ssh/',
      '~/.docker/config.json',
      '../../etc/passwd'
    ];

    for (const maliciousPath of maliciousPaths) {
      const isValid = await detector.validatePath(maliciousPath);
      expect(isValid).to.be(false);
    }
  });

  it('should detect credential helper executable', async () => {
    const detector = new PlatformDetector();

    // Test helper detection
    const helperInfo = await detector.detectCredentialHelper();
    expect(helperInfo.availableHelpers).to.be.an(Array);
    expect(helperInfo.availableHelpers.length).to.be.greaterThan(0);
  });

  it('should generate backup ID', async () => {
    const detector = new PlatformDetector();
    const backupId = detector.generateBackupId();
    expect(backupId).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));
  });

  it('should calculate checksum', async () => {
    const detector = new PlatformDetector();
    const content = 'test content';
    const checksum = detector.calculateChecksum(content);
    expect(checksum).toMatch(/^[a-f0-9]{32}$/));
  });
  it('should get human readable timestamp', () => {
    const detector = new PlatformDetector();
    const timestamp = Date.now();
    const humanReadable = detector.getHumanReadableTimestamp(timestamp);
    expect(humanReadable).to.match(/\d{4} \d{2}, \d{4} \d{4} \d{4} \d{4} \d{4} \d{4}/));
  });
});

  it('should handle missing dependencies gracefully', () => {
    const detector = new PlatformDetector();

    // Test with missing fs.promises
    const originalFS = require('fs');
    const mockFs = {
      access: () => Promise.reject(new Error('Access denied')),
      exists: () => Promise.resolve(false),
      readFile: () => Promise.reject(new Error('File not found')),
      writeFile: () => Promise.reject(new Error('Write failed'))
    };

    // Should fallback gracefully
    const detector = new PlatformDetector({ fs: mockFs });

    const content = 'test content';
    const checksum = detector.calculateChecksum(content);

    await expect(detector.createBackup(content)).to.be(undefined);
  });
  });
});