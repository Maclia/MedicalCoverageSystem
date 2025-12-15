#!/usr/bin/env node

/**
 * Docker Credential Fix - Main Module
 * Comprehensive Docker credential helper diagnostic and repair tool
 */

const path = require('path');
const os = require('os');

// Import command modules
const DoctorCommand = require('./cli/commands/doctor');
const DiagnoseCommand = require('./cli/commands/diagnose');
const FixCommand = require('./cli/commands/fix');
const ServeCommand = require('./cli/commands/serve');

/**
 * Main CLI Application
 */
class DockerCredentialFix {
  constructor() {
    this.version = '1.0.0';
    this.name = 'docker-credential-fix';
    this.description = 'Automated Docker credential helper diagnostic and repair tool';

    // Default options
    this.defaultOptions = {
      verbose: false,
      dryRun: false,
      autoApprove: false,
      noColor: false,
      timeout: 60000,
      format: 'text',
      output: null,
      backupDir: null,
      configPath: path.join(os.homedir(), '.docker', 'config.json')
    };

    // Parsed command line options
    this.options = { ...this.defaultOptions };

    // Available commands
    this.commands = {
      doctor: {
        description: 'Interactive diagnostic and repair session',
        handler: DoctorCommand
      },
      diagnose: {
        description: 'One-shot analysis with detailed report',
        handler: DiagnoseCommand
      },
      fix: {
        description: 'Direct repair for known issues',
        handler: FixCommand
      },
      serve: {
        description: 'Start web dashboard for detailed analysis',
        handler: ServeCommand
      },
      version: {
        description: 'Show version information',
        handler: this.showVersion.bind(this)
      },
      help: {
        description: 'Show help information',
        handler: this.showHelp.bind(this)
      }
    };
  }

  /**
   * Run the CLI application
   */
  async run(args = process.argv.slice(2)) {
    try {
      // Parse command line arguments
      this.parseArgs(args);

      // Show help if no command provided
      if (!this.command) {
        this.showHelp();
        return 0;
      }

      // Show version if requested
      if (this.command === 'version') {
        this.showVersion();
        return 0;
      }

      // Validate global options
      this.validateOptions();

      // Execute command
      const commandHandler = new this.commands[this.command].handler(this.options);
      const exitCode = await commandHandler.execute();

      // Ensure clean exit
      await this.cleanup();

      return exitCode;

    } catch (error) {
      this.handleError(error);
      return 1;
    }
  }

  /**
   * Parse command line arguments
   */
  parseArgs(args) {
    let remainingArgs = [...args];

    // Parse global options (before command)
    while (remainingArgs.length > 0 && remainingArgs[0].startsWith('-')) {
      const arg = remainingArgs.shift();
      this.parseGlobalOption(arg);
    }

    // Parse command
    if (remainingArgs.length > 0) {
      this.command = remainingArgs.shift().toLowerCase();

      // Validate command
      if (!this.commands[this.command]) {
        throw new Error(`Unknown command: ${this.command}`);
      }

      // Parse command-specific options
      this.parseCommandOptions(remainingArgs);
    } else {
      this.command = null;
    }
  }

  /**
   * Parse global option
   */
  parseGlobalOption(arg) {
    switch (arg) {
      case '--verbose':
      case '-v':
        this.options.verbose = true;
        break;
      case '--dry-run':
        this.options.dryRun = true;
        break;
      case '--auto-approve':
      case '-a':
        this.options.autoApprove = true;
        break;
      case '--no-color':
        this.options.noColor = true;
        break;
      case '--no-interactive':
        this.options.noInteractive = true;
        break;
      case '--timeout':
      case '-t':
        const nextArg = remainingArgs.shift();
        if (!nextArg || isNaN(parseInt(nextArg))) {
          throw new Error('Timeout requires a number in milliseconds');
        }
        this.options.timeout = parseInt(nextArg);
        break;
      case '--format':
      case '-f':
        const formatArg = remainingArgs.shift();
        if (!formatArg || !['text', 'json', 'markdown', 'html'].includes(formatArg)) {
          throw new Error('Format must be one of: text, json, markdown, html');
        }
        this.options.format = formatArg;
        break;
      case '--output':
      case '-o':
        const outputArg = remainingArgs.shift();
        if (!outputArg) {
          throw new Error('Output requires a file path');
        }
        this.options.output = path.resolve(outputArg);
        break;
      case '--backup-dir':
      case '-b':
        const backupArg = remainingArgs.shift();
        if (!backupArg) {
          throw new Error('Backup directory requires a path');
        }
        this.options.backupDir = path.resolve(backupArg);
        break;
      case '--config':
      case '-c':
        const configArg = remainingArgs.shift();
        if (!configArg) {
          throw new Error('Config requires a file path');
        }
        this.options.configPath = path.resolve(configArg);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  /**
   * Parse command-specific options
   */
  parseCommandOptions(args) {
    // Command-specific options would be handled by individual command handlers
    this.commandArgs = args;
  }

  /**
   * Validate global options
   */
  validateOptions() {
    // Validate paths
    if (this.options.output) {
      const outputDir = path.dirname(this.options.output);
      if (!fs.existsSync(outputDir)) {
        try {
          fs.mkdirSync(outputDir, { recursive: true });
        } catch (error) {
          throw new Error(`Cannot create output directory: ${outputDir}`);
        }
      }
    }

    if (this.options.backupDir) {
      if (!fs.existsSync(this.options.backupDir)) {
        try {
          fs.mkdirSync(this.options.backupDir, { recursive: true });
        } catch (error) {
          throw new Error(`Cannot create backup directory: ${this.options.backupDir}`);
        }
      }
    }

    // Validate timeout
    if (this.options.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms (1 second)');
    }

    // Validate config path
    if (this.options.configPath && !fs.existsSync(this.options.configPath)) {
      const configDir = path.dirname(this.options.configPath);
      if (!fs.existsSync(configDir)) {
        try {
          fs.mkdirSync(configDir, { recursive: true });
        } catch (error) {
          throw new Error(`Cannot create config directory: ${configDir}`);
        }
      }
    }
  }

  /**
   * Show version information
   */
  showVersion() {
    console.log(`${this.name} version ${this.version}`);
    console.log('Node.js Docker Credential Helper Diagnostic Tool');
    console.log('License: MIT');
    console.log('Repository: https://github.com/docker-credential-fix/docker-credential-fix');
  }

  /**
   * Show help information
   */
  showHelp(commandName = null) {
    console.log();
    console.log('🔧 Docker Credential Fix - Comprehensive Docker credential helper diagnostic and repair tool');
    console.log();
    console.log('USAGE:');
    console.log('  docker-credential-fix [OPTIONS] <COMMAND>');
    console.log();
    console.log('GLOBAL OPTIONS:');
    console.log('  -v, --verbose        Enable verbose output');
    console.log('  --dry-run           Show what would be changed without making changes');
    console.log('  -a, --auto-approve  Auto-approve low-risk changes');
    console.log('  --no-color          Disable colored output');
    console.log('  --no-interactive   Run in non-interactive mode');
    console.log('  -t, --timeout N     Command timeout in milliseconds (default: 60000)');
    console.log('  -f, --format FORMAT Output format (text, json, markdown, html)');
    console.log('  -o, --output FILE    Write output to file');
    console.log('  -b, --backup-dir DIR Backup directory location');
    console.log('  -c, --config FILE    Docker config file path');
    console.log();
    console.log('COMMANDS:');

    if (commandName) {
      // Show detailed help for specific command
      if (this.commands[commandName]) {
        this.showCommandHelp(commandName);
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
    } else {
      // Show general help with all commands
      for (const [cmd, info] of Object.entries(this.commands)) {
        console.log(`  ${cmd.padEnd(12)} ${info.description}`);
      }
    }

    console.log();
    console.log('EXAMPLES:');
    console.log('  docker-credential-fix doctor                    # Interactive diagnosis and repair');
    console.log('  docker-credential-fix diagnose --format json     # JSON diagnostic report');
    console.log('  docker-credential-fix fix --issue helper       # Fix credential helper');
    console.log('  docker-credential-fix serve --port 3000        # Start web dashboard');
    console.log();
    console.log('For more information about a specific command, run:');
    console.log('  docker-credential-fix help <COMMAND>');
  }

  /**
   * Show detailed help for specific command
   */
  showCommandHelp(commandName) {
    const command = this.commands[commandName];

    console.log(`COMMAND: ${commandName}`);
    console.log(`DESCRIPTION: ${command.description}`);
    console.log();

    // Show command-specific help
    if (typeof command.handler.showHelp === 'function') {
      command.handler.showHelp();
    } else {
      console.log('No detailed help available for this command.');
    }
  }

  /**
   * Handle application errors
   */
  handleError(error) {
    console.error();

    if (this.options.verbose) {
      console.error('🔴 Full error details:');
      console.error('Stack trace:');
      console.error(error.stack);
      console.error();
    }

    // User-friendly error messages
    if (error.code === 'EACCES') {
      console.error('❌ Permission denied. Try running with sudo or check file permissions.');
    } else if (error.code === 'ENOENT') {
      console.error('❌ File or command not found. Please check the path and try again.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ Operation timed out. Try increasing timeout with --timeout option.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused. Docker daemon may not be running.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🔍 Service not found. Docker may not be properly installed.');
    } else if (error.message.includes('exit status 1')) {
      console.error('🔐 Docker credential helper failure detected. This is the issue we are here to fix!');
      console.error('💡 Run "docker-credential-fix doctor" to diagnose and fix this automatically.');
    } else if (error.message.includes('Docker not')) {
      console.error('🐳 Docker is not available or not running.');
      console.error('💡 Please install Docker or start Docker daemon.');
    } else {
      console.error('❌ An error occurred:');
      console.error(error.message);
    }

    // Provide helpful next steps
    console.error();
    console.error('🔧 Common solutions:');
    console.error('  • Run "docker-credential-fix doctor" for guided help');
    console.error('  • Check if Docker daemon is running: docker version');
    console.error('  • Verify Docker installation: docker info');
    console.error('  • Check Docker logs: docker logs');
    console.error('  • Use --verbose for detailed error information');

    console.error();
    console.error('📚 For more help:');
    console.error('  • docker-credential-fix help <command>');
    console.error('  • https://github.com/docker-credential-fix/docker-credential-fix/issues');
  }

  /**
   * Clean up resources before exit
   */
  async cleanup() {
    try {
      // Cleanup any temporary files
      // Close any open file handles
      // Cancel any pending operations

      if (this.options.verbose) {
        console.log('🧹 Cleanup completed');
      }
    } catch (error) {
      // Log cleanup errors but don't fail the process
      console.error('⚠️ Cleanup warning:', error.message);
    }
  }

  /**
   * Check system requirements
   */
  async checkSystemRequirements() {
    const requirements = {
      nodeVersion: '>=14.0.0',
      platform: ['darwin', 'linux', 'win32'],
      dockerRequired: false // Not all commands require Docker
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const nodeVersionNum = nodeVersion.replace('v', '');
    if (this.compareVersions(nodeVersionNum, requirements.nodeVersion) < 0) {
      throw new Error(`Node.js ${requirements.nodeVersion} required, found ${nodeVersion}`);
    }

    // Check platform support
    if (!requirements.platform.includes(process.platform)) {
      throw new Error(`Platform ${process.platform} is not supported`);
    }

    // Check for required Node.js features
    if (!fs.promises) {
      throw new Error('Node.js fs.promises is required. Please use Node.js 10+');
    }

    return requirements;
  }

  /**
   * Compare version strings
   */
  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }

    return 0;
  }

  /**
   * Get application metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      home: os.homedir(),
      pid: process.pid,
      options: this.options,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create child logger for specific command
   */
  createLogger(name) {
    const { Logger } = require('./utils/logger');

    return Logger.createLogger(name, {
      level: this.options.verbose ? 'debug' : 'info',
      format: this.options.format,
      colors: !this.options.noColor && process.stdout.isTTY,
      enableConsole: true,
      enableFile: this.options.output ? true : false,
      file: this.options.output
    });
  }

  /**
   * Get current system information
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
      nodeVersion: process.version,
      pid: process.pid,
      env: {
        docker: process.env.DOCKER_CONFIG,
        user: process.env.USER || process.env.USERNAME,
        shell: process.env.SHELL
      }
    };
  }

  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    const cleanup = async () => {
      console.log('\n🛑 Interrupted by user');
      await this.cleanup();
      process.exit(130); // SIGINT
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    if (process.platform === 'win32') {
      process.on('SIGBREAK', cleanup);
    }

    process.on('uncaughtException', async (error) => {
      console.error('\n💥 Uncaught Exception:');
      console.error(error);
      await this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('\n💥 Unhandled Rejection at:');
      console.error(promise);
      console.error('Reason:', reason);
      await this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Main entry point
   */
  async main() {
    try {
      // Setup signal handlers first
      this.setupSignalHandlers();

      // Check system requirements
      await this.checkSystemRequirements();

      // Run the application
      const exitCode = await this.run();

      process.exit(exitCode);

    } catch (error) {
      this.handleError(error);
      process.exit(1);
    }
  }
}

// Export for use by other modules
module.exports = DockerCredentialFix;

// Run if this is the main module
if (require.main === module) {
  const app = new DockerCredentialFix();
  app.main();
}