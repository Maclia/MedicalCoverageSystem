const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

/**
 * Docker Credential Fix Web Server
 * Real-time dashboard for Docker credential diagnostics and repairs
 */

class WebDashboard {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.enableAuth = options.enableAuth || false;
    this.username = options.username || 'admin';
    this.password = options.password || 'admin';
    this.verbose = options.verbose || false;
    this.noOpen = options.noOpen || false;
    this.staticDir = options.staticDir || path.join(__dirname, 'public');
    this.realtimeUpdates = options.realtimeUpdates !== false;
    this.sessionId = this.generateSessionId();
    this.clients = new Set();
    this.diagnosticsHistory = [];
    this.currentDiagnosing = null;
    this.backupManager = null;
    this.logger = null;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the web server
   */
  async start() {
    console.log(`🌐 Starting Docker Credential Fix Dashboard`);
    console.log(`📊 Server: http://${this.host}:${this.port}`);

    if (this.enableAuth) {
      console.log(`🔐 Authentication enabled (admin/admin)`);
    }

    if (!this.noOpen) {
      this.openBrowser();
    }

    const server = http.createServer(this.handleRequest.bind(this));

    // Set up WebSocket server for real-time updates
    const wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', this.handleWebSocketConnection.bind(this));

    server.on('upgrade', (request, socket, head) => {
      if (request.headers['upgrade'] === 'websocket') {
        wss.handleUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown(server));
    process.on('SIGINT', () => this.shutdown(server));

    return new Promise((resolve, reject) => {
      server.on('error', reject);
      server.listen(this.port, this.host, () => {
        console.log(`✅ Docker Credential Fix Dashboard started successfully`);
        console.log(`🔍 Access URL: http://${this.host}:${this.port}`);
        resolve({ server, wss, port: this.port });
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const startTime = Date.now();

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Parse URL
    const parsedUrl = require('url').parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      // Authentication middleware
      if (this.enableAuth && !this.authenticate(req, res)) {
        return;
      }

      // Route the request
      switch (pathname) {
        case '/':
          await this.handleIndex(req, res);
          break;
        case '/api/status':
          await this.handleStatus(req, res);
          break;
        case '/api/scan':
          await this.handleScan(req, res);
          break;
        case '/api/issues':
          await this.handleIssues(req, res);
          break;
        case '/api/fix':
          await this.handleFix(req, res);
          break;
        case '/api/backups':
          await this.handleBackups(req, res);
          break;
        case '/api/restore':
          await this.handleRestore(req, res);
          break;
        case '/api/backup':
          await this.handleCreateBackup(req, res);
          break;
        case '/api/delete-backup':
          await this.handleDeleteBackup(req, res);
          break;
        default:
          await this.handleStatic(req, res, parsedUrl.pathname);
          break;
      }

      // Log request completion
      const duration = Date.now() - startTime;
      if (this.verbose) {
        console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
      }

    } catch (error) {
      console.error(`Error handling request ${req.url}:`, error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle index page
   */
  async handleIndex(req, res) {
    try {
      const indexContent = await fs.readFile(path.join(this.staticDir, 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(indexContent);
    } catch (error) {
      console.error('Error serving index page:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle status endpoint
   */
  async handleStatus(req, res) {
    try {
      const status = await this.getCurrentStatus();
      this.sendJsonResponse(res, 200, status);
    } catch (error) {
      console.error('Error getting status:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle scan endpoint
   */
  async handleScan(req, res) {
    try {
      if (req.method !== 'POST') {
        this.sendError(res, 405, 'Method not allowed');
        return;
      }

      const body = await this.parseRequestBody(req);
      const options = this.parseScanOptions(body);

      this.currentDiagnosing = {
        id: this.generateSessionId(),
        timestamp: new Date().toISOString(),
        status: 'scanning',
        progress: 0,
        options
      };

      this.broadcastUpdate('scan', {
        type: 'scan_started',
        sessionId: this.currentDiagnosing.id,
        timestamp: this.currentDiagnosing.timestamp,
        progress: 0,
        message: 'Starting Docker credential diagnostic scan...'
      });

      // Start diagnostic scan
      const diagnosticResult = await this.runDiagnosticScan(options);

      this.currentDiagnosing.status = 'completed';
      this.currentDiagnosing.progress = 100;
      this.currentDiagnosing.result = diagnosticResult;

      this.broadcastUpdate('scan', {
        type: 'scan_completed',
        sessionId: this.currentDiagnosing.id,
        timestamp: new Date().toISOString(),
        progress: 100,
        result: diagnosticResult
      });

      this.sendJsonResponse(res, 200, {
        success: true,
        sessionId: this.currentDiagnosing.id,
        result: diagnosticResult
      });

    } catch (error) {
      console.error('Error during scan:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle issues endpoint
   */
  async handleIssues(req, res) {
    try {
      const status = await this.getCurrentStatus();
      this.sendJsonResponse(res, 200, status.issues || []);
    } catch (error) {
      console.error('Error getting issues:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle fix endpoint
   */
  async handleFix(req, res) {
    try {
      if (req.method !== 'POST') {
        this.sendError(res, 405, 'Method not allowed');
        return;
      }

      const body = await this.parseRequestBody(req);
      const { sessionId, fixId } = body;

      if (!sessionId || !fixId) {
        this.sendError(res, 400, 'Session ID and fix ID required');
        return;
      }

      const fix = this.findFixById(sessionId, fixId);
      if (!fix) {
        this.sendError(res, 404, 'Fix not found');
        return;
      }

      this.broadcastUpdate('fix', {
        type: 'fix_started',
        sessionId,
        fixId,
        timestamp: new Date().toISOString(),
        progress: 0,
        message: `Applying fix: ${fix.title}`
      });

      // Execute the fix
      const result = await this.executeFix(fix);

      this.broadcastUpdate('fix', {
        type: 'fix_completed',
        sessionId,
        fixId,
        timestamp: new Date().toISOString(),
        progress: 100,
        result
      });

      this.sendJsonResponse(res, 200, result);

    } catch (error) {
      console.error('Error applying fix:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle backups endpoint
   */
  async handleBackups(req, res) {
    try {
      if (!this.backupManager) {
        this.sendError(res, 503, 'Backup manager not available');
        return;
      }

      const backups = await this.backupManager.listBackups();
      this.sendJsonResponse(res, 200, backups);
    } catch (error) {
      console.error('Error listing backups:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle restore endpoint
   */
  async handleRestore(req, res) {
    try {
      if (req.method !== 'POST') {
        this.sendError(res, 405, 'Method not allowed');
        return;
      }

      const body = await this.parseRequestBody(req);
      const { backupId } = body;

      if (!backupId) {
        this.sendError(res, 400, 'Backup ID required');
        return;
      }

      if (!this.backupManager) {
        this.sendError(res, 503, 'Backup manager not available');
        return;
      }

      this.broadcastUpdate('restore', {
        type: 'restore_started',
        backupId,
        timestamp: new Date().toISOString(),
        progress: 0,
        message: 'Starting backup restore...'
      });

      const result = await this.backupManager.restoreBackup(backupId);

      this.broadcastUpdate('restore', {
        type: 'restore_completed',
        backupId,
        timestamp: new Date().toISOString(),
        progress: 100,
        result
      });

      this.sendJsonResponse(res, 200, result);

    } catch (error) {
      console.error('Error restoring backup:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle create backup endpoint
   */
  async handleCreateBackup(req, res) {
    try {
      if (req.method !== 'POST') {
        this.sendError(res, 405, 'Method not allowed');
        return;
      }

      if (!this.backupManager) {
        this.sendError(res, 503, 'Backup manager not available');
        return;
      }

      const body = await this.parseRequestBody(req);
      const backup = await this.backupManager.createComprehensiveBackup();

      this.broadcastUpdate('backup', {
        type: 'backup_created',
        backupId: backup.id,
        timestamp: new Date().toISOString(),
        progress: 100,
        message: 'Backup created successfully',
        backup
      });

      this.sendJsonResponse(res, 200, backup);

    } catch (error) {
      console.error('Error creating backup:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Handle delete backup endpoint
   */
  async handleDeleteBackup(req, res) {
    try {
      if (req.method !== 'DELETE') {
        this.sendError(res, 405, 'Method not allowed');
        return;
      }

      if (!this.backupManager) {
        this.sendError(res, 503, 'Backup manager not available');
        return;
      }

      const url = require('url').parse(req.url, true);
      const backupId = url.query.id;

      if (!backupId) {
        this.sendError(res, 400, 'Backup ID required');
        return;
      }

      this.broadcastUpdate('backup', {
        type: 'backup_deletion_started',
        backupId,
        timestamp: new Date().toISOString(),
        progress: 0,
        message: 'Starting backup deletion...'
      });

      const result = await this.backupManager.deleteBackup(backupId);

      this.broadcastUpdate('backup', {
        type: 'backup_deletion_completed',
        backupId,
        timestamp: new Date().toISOString(),
        progress: 100,
        result
      });

      this.sendJsonResponse(res, 200, result);

    } catch (error) {
      console.error('Error deleting backup:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Parse request body
   */
  async parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve({});
        }
      });
      });
    }
  }

  /**
   * Parse scan options
   */
  parseScanOptions(body) {
    return {
      quick: body.quick !== false,
      format: body.format || 'text',
      includeStats: body.includeStats !== false,
      exclude: body.exclude ? (Array.isArray(body.exclude) ? body.exclude : []) : [],
      maxIssues: body.maxIssues ? parseInt(body.maxIssues) : 50
    };
  }

  /**
   * Get current diagnostic status
   */
  async getCurrentStatus() {
    const platformInfo = await this.getPlatformInfo();
    const dockerStatus = await this.getDockerStatus();
    const issues = await this.getCurrentIssues();

    return {
      sessionId: this.currentDiagnosing?.id,
      timestamp: new Date().toISOString(),
      platform: platformInfo,
      docker: dockerStatus,
      issues,
      backups: this.backupManager ? await this.backupManager.listBackups() : [],
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      clients: this.clients.size,
      capabilities: this.getServerCapabilities()
    };
  }

  /**
   * Get platform information
   */
  async getPlatformInfo() {
    return {
      os: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      homedir: os.homedir(),
      release: os.release(),
      cpus: os.cpus().length,
      nodeVersion: process.version,
      uptime: os.uptime()
    };
  }

  /**
   * Get Docker status
   */
  async getDockerStatus() {
    try {
      const { spawn } = require('child_process');

      // Check if Docker is installed and running
      const dockerVersion = await this.executeCommand('docker', ['--version'], { timeout: 5000 });
      const dockerInfo = await this.executeCommand('docker', ['info', '--format', '{{json .}}'], { timeout: 10000 });

      return {
        running: !!dockerVersion,
        version: dockerVersion || null,
        info: dockerInfo ? JSON.parse(dockerInfo) : null,
        installed: !!dockerVersion
      };
    } catch (error) {
      return {
        running: false,
        version: null,
        info: null,
        installed: false,
        error: error.message
      };
    }
  }

  /**
   * Get current issues
   */
  async getCurrentIssues() {
    // This would integrate with the actual diagnostic framework
    // For now, return empty issues - would be populated during diagnostic scans
    return {
      critical: [],
      high: [],
      medium: [],
      low: [],
      total: 0,
      lastScan: this.currentDiagnosing?.timestamp || null,
      scanTime: this.currentDiagnosing?.progress || 0
    };
  }

  /**
   * Run diagnostic scan
   */
  async runDiagnosticScan(options) {
    try {
      // Simulate diagnostic scan based on options
      const startTime = Date.now();

      // Mock diagnostic process with progress updates
      for (let i = 0; i < 100; i++) {
        await this.sleep(20); // 2 seconds total

        if (this.realtimeUpdates) {
          this.broadcastUpdate('scan', {
            type: 'scan_progress',
            sessionId: this.currentDiagnosing.id,
            timestamp: new Date().toISOString(),
            progress: i,
            message: `Scanning... ${i}%`
          });
        }
      }

      // Generate mock diagnostic results
      const mockResults = this.generateMockResults(options);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        results: mockResults,
        summary: {
          issuesFound: mockResults.issues.length,
          criticalIssues: mockResults.issues.filter(i => i.severity === 'critical').length,
          highIssues: mockResults.issues.filter(i => i.severity === 'high').length,
          mediumIssues: mockResults.issues.filter(i => i.severity === 'medium').length,
          lowIssues: mockResults.issues.filter(i => i.severity === 'low').length,
          scanTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate mock diagnostic results
   */
  generateMockResults(options) {
    const mockIssues = [];

    // Generate different types of issues based on options
    if (!options.quick) {
      // Add some credential helper issues
      if (Math.random() > 0.3) {
        mockIssues.push({
          id: `issue_${Date.now()}_1`,
          type: 'credential_helper',
          severity: 'critical',
          title: 'Docker Credential Helper Failure',
          description: 'Docker cannot access system credential store',
          autoFixable: true,
          recommendation: 'Install appropriate Docker credential helper',
          impact: 'Cannot authenticate to Docker registries',
          error: 'exit status 1'
        });
      }

      // Add some configuration issues
      if (Math.random() > 0.5) {
        mockIssues.push({
          id: `issue_${Date.now()}_2`,
          type: 'configuration',
          severity: 'high',
          title: 'Docker Configuration Error',
          description: 'Docker configuration file has syntax errors',
          autoFixable: true,
          recommendation: 'Fix JSON syntax in Docker config file',
          impact: 'Docker daemon may not start properly',
          file: '~/.docker/config.json',
          error: 'Invalid JSON format'
        });
      }

      // Add some permission issues
      if (Math.random() > 0.2) {
        mockIssues.push({
          id: `issue_${Date.now()}_3`,
          type: 'permissions',
          severity: 'medium',
          title: 'Docker Socket Permission Error',
          description: 'User lacks access to Docker daemon socket',
          autoFixable: true,
          recommendation: 'Add user to docker group',
          impact: 'Cannot execute Docker commands without sudo',
          file: '/var/run/docker.sock',
          error: 'Permission denied'
        });
      }
    }

    // Add some network issues
    if (Math.random() > 0.4) {
      mockIssues.push({
        id: `issue_${Date.now()}_4`,
        type: 'network',
        severity: 'low',
        title: 'Docker Registry Connection Warning',
        description: 'Docker cannot connect to default registry',
        autoFixable: true,
        recommendation: 'Check network configuration and proxy settings',
        impact: 'May affect Docker image pulls',
          error: 'Connection timeout'
        });
      }
    }

    // Limit issues based on maxIssues
    return {
      issues: mockIssues.slice(0, options.maxIssues || 50),
      timestamp: new Date().toISOString(),
      platform: process.platform,
      docker: {
        version: 'Unknown', // Would be detected in real implementation
        running: false
      }
    };
  }

  /**
   * Find fix by ID
   */
  findFixById(sessionId, fixId) {
    // This would integrate with actual diagnostic results
    // Mock implementation for demonstration
    const mockFixes = {
      [sessionId]: [
        {
          id: `${sessionId}_fix_1`,
          type: 'credential_helper',
          severity: 'critical',
          title: 'Install Docker Credential Helper',
          description: 'Install the appropriate Docker credential helper for your platform',
          recommendation: 'This will enable secure credential storage for Docker registries',
          autoFixable: true,
          action: {
            command: this.getInstallCommand(),
            description: 'Run command to install credential helper',
            requiresRestart: true,
            requiresAuth: false,
            estimatedTime: '2-5 minutes'
          }
        },
        {
          id: `${sessionId}_fix_2`,
          type: 'configuration',
          severity: 'high',
          title: 'Fix Docker Configuration',
          description: 'Fix syntax and format issues in Docker configuration file',
          recommendation: 'Update Docker config to proper format and remove invalid entries',
          autoFixable: true,
          action: {
            command: 'docker-credential-fix config --format json --output ~/.docker/config.json',
            description: 'Update Docker configuration file',
            requiresRestart: false,
            requiresAuth: false,
            estimatedTime: '1-2 minutes'
          }
        }
      ]
    };

    return mockFixes[sessionId]?.find(fix => fix.id === fixId);
  }

  /**
   * Get install command for current platform
   */
  getInstallCommand() {
    switch (process.platform) {
      case 'darwin':
        return 'brew install docker-credential-helper';
      case 'linux':
        return 'sudo apt-get install docker-credential-helpers';
      case 'win32':
        return 'Download and install Docker Desktop from https://www.docker.com/products/docker-desktop/';
      default:
        return 'Follow platform-specific installation instructions';
    }
  }

  /**
   * Execute a fix
   */
  async executeFix(fix) {
    try {
      // Update progress
      this.broadcastUpdate('fix', {
        type: 'fix_progress',
        sessionId: this.currentDiagnosing.id,
        fixId: fix.id,
        timestamp: new Date().toISOString(),
        progress: 25,
        message: `Executing: ${fix.title}`
      });

      // Simulate fix execution
      await this.sleep(2000); // 2 seconds

      // Complete fix
      this.broadcastUpdate('fix', {
        type: 'fix_progress',
        sessionId: this.currentDiagnosing.id,
        fixId: fix.id,
        timestamp: new Date().toISOString(),
        progress: 100,
        message: `Completed: ${fix.title}`
      });

      return {
        success: true,
        fixId: fix.id,
        title: fix.title,
        action: fix.action,
        timestamp: new Date().toISOString(),
        duration: 2000,
        message: `Successfully applied fix: ${fix.title}`
      };

    } catch (error) {
      return {
        success: false,
        fixId: fix.id,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(ws) {
    const clientId = this.generateClientId();
    this.clients.add(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send current status to new client
    this.sendClientUpdate(ws, {
      type: 'connection',
      clientId,
      timestamp: new Date().toISOString(),
      data: await this.getCurrentStatus()
    });

    if (this.verbose) {
      console.log(`Client connected: ${clientId}`);
    }
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Broadcast update to all connected clients
   */
  broadcastUpdate(type, data) {
    if (!this.realtimeUpdates) return;

    const message = {
      type,
      sessionId: this.currentDiagnosing?.id,
      timestamp: new Date().toISOString(),
      data
    };

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });

    if (this.verbose) {
      console.log(`Broadcast: ${type}`, message);
    }
  }

  /**
   * Send update to specific client
   */
  sendClientUpdate(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities() {
    return {
      diagnostics: true,
      repairs: true,
      backups: true,
      realTimeUpdates: this.realtimeUpdates,
      authentication: this.enableAuth,
      maxClients: 100,
      supportedFormats: ['text', 'json', 'markdown', 'html'],
      supportedCommands: ['doctor', 'diagnose', 'fix', 'backup', 'restore'],
      version: '1.0.0'
    };
  }

  /**
   * Send JSON response
   */
  sendJsonResponse(res, statusCode, data) {
    const json = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(json));
    res.writeHead(statusCode);
    res.end(json);
  }

  /**
   * Send error response
   */
  sendError(res, statusCode, message) {
    this.sendJsonResponse(res, statusCode, {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Open browser
   */
  openBrowser() {
    const url = `http://${this.host}:${this.port}`;
    const command = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open';

    spawn(command, [url], { detached: true });

    if (this.verbose) {
      console.log(`Opening browser at ${url}`);
    }
  }

  /**
   * Execute system command
   */
  async executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 5000
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
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
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown(server) {
    console.log('🛑 Shutting down web server...');

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'shutdown',
          timestamp: new Date().toISOString(),
          message: 'Server shutting down'
        }));
      }
    });

    server.close(() => {
      console.log('✅ Web server stopped');
      process.exit(0);
    });
  }
}

module.exports = WebDashboard;