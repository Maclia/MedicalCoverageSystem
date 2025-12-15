const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const crypto = require('crypto');

/**
 * Process Runner Utility
 * Safe child process execution with timeouts, retry logic, and proper error handling
 */

class ProcessRunner {
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.shell = options.shell || false;
    this.encoding = options.encoding || 'utf8';
    this.stripNewlines = options.stripNewlines !== false;
    this.logCommands = options.logCommands || false;
    this.sanitizeOutput = options.sanitizeOutput !== false;
  }

  /**
   * Execute a command with options
   */
  async run(command, args = [], options = {}) {
    const config = {
      timeout: options.timeout || this.defaultTimeout,
      retries: options.retries || this.maxRetries,
      shell: options.shell !== undefined ? options.shell : this.shell,
      encoding: options.encoding || this.encoding,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      input: options.input || null,
      captureOutput: options.captureOutput !== false,
      stripOutput: options.stripOutput !== undefined ? options.stripOutput : this.stripNewlines,
      sanitizeOutput: options.sanitizeOutput !== undefined ? options.sanitizeOutput : this.sanitizeOutput,
      log: options.log !== undefined ? options.log : this.logCommands
    };

    if (config.log) {
      console.log(`[ProcessRunner] Running: ${command} ${args.join(' ')}`);
    }

    let lastError = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.retryDelay * attempt);
        }

        const result = await this.executeCommand(command, args, config);

        if (config.log) {
          console.log(`[ProcessRunner] Success (attempt ${attempt + 1}): ${result.code}`);
        }

        return result;

      } catch (error) {
        lastError = error;

        if (config.log) {
          console.log(`[ProcessRunner] Failed (attempt ${attempt + 1}): ${error.message}`);
        }

        // Don't retry on certain error types
        if (!this.shouldRetry(error, attempt, config.retries)) {
          break;
        }
      }
    }

    throw this.enhanceError(lastError, command, args, config);
  }

  /**
   * Execute a single command attempt
   */
  async executeCommand(command, args, config) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        stdio: config.captureOutput ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'],
        shell: config.shell,
        cwd: config.cwd,
        env: config.env,
        timeout: config.timeout,
        encoding: config.encoding
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set up timeout handling
      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          killed = true;
          child.kill('SIGKILL');
        }
      }, config.timeout);

      // Capture stdout
      if (config.captureOutput) {
        child.stdout.on('data', (data) => {
          stdout += data.toString(config.encoding);
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString(config.encoding);
        });
      }

      // Handle process completion
      child.on('close', (code, signal) => {
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const result = {
          code: signal ? null : code,
          signal: signal || null,
          stdout: config.sanitizeOutput ? this.sanitizeOutput(stdout) : stdout,
          stderr: config.sanitizeOutput ? this.sanitizeOutput(stderr) : stderr,
          duration,
          killed,
          command,
          args,
          success: signal === null && code === 0
        };

        if (config.stripOutput) {
          result.stdout = result.stdout.replace(/\r?\n$/, '');
          result.stderr = result.stderr.replace(/\r?\n$/, '');
        }

        if (result.success) {
          resolve(result);
        } else {
          const error = new ProcessError(
            `Command failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}`,
            result
          );
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const result = {
          code: null,
          signal: null,
          stdout: '',
          stderr: error.message,
          duration,
          killed: false,
          command,
          args,
          success: false,
          systemError: true
        };

        reject(new ProcessError(
          `Process error: ${error.message}`,
          result
        ));
      });

      // Send input if provided
      if (config.input) {
        child.stdin.write(config.input);
        child.stdin.end();
      }
    });
  }

  /**
   * Run command with shell string
   */
  async runShell(commandString, options = {}) {
    const shell = options.shell || process.platform === 'win32' ? 'cmd.exe' : 'bin/sh';
    const shellArgs = process.platform === 'win32' ? ['/c', commandString] : ['-c', commandString];

    return this.run(shell, shellArgs, {
      ...options,
      shell: true
    });
  }

  /**
   * Run multiple commands in parallel
   */
  async runParallel(commands, options = {}) {
    const maxConcurrency = options.maxConcurrency || 5;
    const failFast = options.failFast !== false;

    const results = [];
    const errors = [];
    let cancelled = false;

    // Process commands in batches
    for (let i = 0; i < commands.length; i += maxConcurrency) {
      if (cancelled) break;

      const batch = commands.slice(i, i + maxConcurrency);
      const promises = batch.map(async (cmd, index) => {
        const globalIndex = i + index;
        try {
          const result = await this.run(cmd.command, cmd.args || [], {
            ...options,
            log: cmd.log !== undefined ? cmd.log : options.log
          });
          return {
            index: globalIndex,
            success: true,
            result,
            command: cmd
          };
        } catch (error) {
          if (failFast) {
            cancelled = true;
          }
          return {
            index: globalIndex,
            success: false,
            error,
            command: cmd
          };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const batchResult of batchResults) {
        if (batchResult.success) {
          results.push(batchResult);
        } else {
          errors.push(batchResult);
          if (failFast) {
            throw batchResult.error;
          }
        }
      }
    }

    return {
      results,
      errors,
      totalCommands: commands.length,
      successfulCommands: results.length,
      failedCommands: errors.length
    };
  }

  /**
   * Run commands sequentially
   */
  async runSequential(commands, options = {}) {
    const results = [];
    const errors = [];
    const failFast = options.failFast !== false;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      try {
        const result = await this.run(cmd.command, cmd.args || [], {
          ...options,
          log: cmd.log !== undefined ? cmd.log : options.log
        });

        results.push({
          index: i,
          success: true,
          result,
          command: cmd
        });

      } catch (error) {
        const errorResult = {
          index: i,
          success: false,
          error,
          command: cmd
        };

        errors.push(errorResult);

        if (failFast) {
          throw error;
        }
      }
    }

    return {
      results,
      errors,
      totalCommands: commands.length,
      successfulCommands: results.length,
      failedCommands: errors.length
    };
  }

  /**
   * Run command and capture live output
   */
  async runWithOutput(command, args = [], outputHandler, options = {}) {
    const config = {
      ...options,
      captureOutput: true
    };

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: config.shell || false,
        cwd: config.cwd || process.cwd(),
        env: config.env || process.env,
        timeout: config.timeout || this.defaultTimeout,
        encoding: config.encoding || this.encoding
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString(config.encoding);
        stdout += output;
        if (outputHandler && typeof outputHandler === 'function') {
          outputHandler('stdout', output, data);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString(config.encoding);
        stderr += output;
        if (outputHandler && typeof outputHandler === 'function') {
          outputHandler('stderr', output, data);
        }
      });

      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, config.timeout);

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const result = {
          code: signal ? null : code,
          signal: signal || null,
          stdout: config.sanitizeOutput ? this.sanitizeOutput(stdout) : stdout,
          stderr: config.sanitizeOutput ? this.sanitizeOutput(stderr) : stderr,
          duration,
          command,
          args,
          success: signal === null && code === 0
        };

        if (result.success) {
          resolve(result);
        } else {
          reject(new ProcessError(
            `Command failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}`,
            result
          ));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new ProcessError(`Process error: ${error.message}`, {
          code: null,
          signal: null,
          stdout: '',
          stderr: error.message,
          duration: Date.now() - startTime,
          command,
          args,
          success: false,
          systemError: true
        }));
      });

      if (config.input) {
        child.stdin.write(config.input);
        child.stdin.end();
      }
    });
  }

  /**
   * Check if command exists
   */
  async commandExists(command, options = {}) {
    try {
      const checkCommand = process.platform === 'win32' ? 'where' : 'which';
      await this.run(checkCommand, [command], { timeout: options.timeout || 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get command version
   */
  async getCommandVersion(command, versionFlag = '--version', options = {}) {
    try {
      const result = await this.run(command, [versionFlag], {
        timeout: options.timeout || 5000,
        captureOutput: true
      });
      return result.stdout.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;

    // Don't retry on certain error codes
    const nonRetryableErrors = [
      'ENOENT',      // Command not found
      'EACCES',      // Permission denied
      'EPERM',       // Operation not permitted
      'EINVAL',       // Invalid argument
      'EISDIR'       // Is directory
    ];

    if (error.result && error.result.systemError) {
      return false;
    }

    if (error.code && nonRetryableErrors.includes(error.code)) {
      return false;
    }

    // Retry on timeout or network errors
    if (error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNRESET')) {
      return true;
    }

    // Default to retry on process errors with non-zero exit codes
    return true;
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, command, args, config) {
    if (error instanceof ProcessError) {
      return error;
    }

    const enhancedError = new ProcessError(
      `Command execution failed: ${error.message}`,
      {
        command,
        args,
        code: error.code || null,
        signal: error.signal || null,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        duration: error.duration || 0,
        config,
        originalError: error
      }
    );

    return enhancedError;
  }

  /**
   * Sanitize output to remove sensitive information
   */
  sanitizeOutput(output) {
    if (typeof output !== 'string') return output;

    // Remove potential passwords and tokens
    let sanitized = output;

    // Remove common patterns
    const patterns = [
      /password[=:]\s*[^\s\n]+/gi,
      /token[=:]\s*[^\s\n]+/gi,
      /secret[=:]\s*[^\s\n]+/gi,
      /key[=:]\s*[^\s\n]+/gi,
      /auth[=:]\s*[^\s\n]+/gi,
      /credential[=:]\s*[^\s\n]+/gi,
      /Bearer\s+[^\s\n]+/gi,
      /[a-zA-Z0-9+/]{40,}={0,2}/g,  // Base64 strings longer than 40 chars
      /sha256:[a-f0-9]{64}/g,
      /sha1:[a-f0-9]{40}/g
    ];

    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Delay execution
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a command hash for caching
   */
  createCommandHash(command, args = [], options = {}) {
    const commandString = `${command} ${args.join(' ')} ${JSON.stringify(options)}`;
    return crypto.createHash('md5').update(commandString).digest('hex');
  }

  /**
   * Run command with simple retry logic
   */
  async retry(command, args = [], options = {}) {
    return this.run(command, args, {
      ...options,
      retries: options.retries || this.maxRetries,
      retryDelay: options.retryDelay || this.retryDelay
    });
  }

  /**
   * Run command with environment variables
   */
  async runWithEnv(command, args = [], env = {}, options = {}) {
    return this.run(command, args, {
      ...options,
      env: { ...process.env, ...env }
    });
  }

  /**
   * Check if process is still running
   */
  async isProcessRunning(pid) {
    try {
      process.kill(pid, 0); // Signal 0 doesn't kill the process
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Kill process gracefully
   */
  async killProcess(pid, options = {}) {
    const timeout = options.timeout || 5000;
    const signals = options.force ? ['SIGKILL'] : ['SIGTERM', 'SIGINT', 'SIGKILL'];

    for (const signal of signals) {
      try {
        process.kill(pid, signal);

        // Wait for process to actually terminate
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          if (!(await this.isProcessRunning(pid))) {
            return true;
          }
          await this.delay(100);
        }

      } catch (error) {
        // Process might already be dead
        if (error.code === 'ESRCH') {
          return true;
        }
      }
    }

    return false;
  }
}

/**
 * Custom ProcessError class
 */
class ProcessError extends Error {
  constructor(message, result = {}) {
    super(message);
    this.name = 'ProcessError';
    this.message = message;
    this.result = result;
    this.code = result.code || null;
    this.signal = result.signal || null;
    this.stdout = result.stdout || '';
    this.stderr = result.stderr || '';
    this.duration = result.duration || 0;
    this.command = result.command || '';
    this.args = result.args || [];
  }

  toString() {
    return `${this.name}: ${this.message} (command: ${this.command} ${this.args.join(' ')}, code: ${this.code || this.signal})`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      signal: this.signal,
      stdout: this.stdout,
      stderr: this.stderr,
      duration: this.duration,
      command: this.command,
      args: this.args,
      result: this.result
    };
  }
}

module.exports = { ProcessRunner, ProcessError };