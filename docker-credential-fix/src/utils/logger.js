const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Structured Logger Utility
 * Multi-level logging with rotation, filtering, and structured output
 */

class Logger {
  constructor(options = {}) {
    this.name = options.name || 'docker-credential-fix';
    this.level = options.level || 'info';
    this.format = options.format || 'simple'; // simple, json, pretty
    this.file = options.file || null;
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    this.timestamp = options.timestamp !== false;
    this.colors = options.colors !== false;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.jsonIndent = options.jsonIndent || 2;
    this.sessionId = this.generateSessionId();

    // Log levels
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };

    // Colors for console output
    this.colorsMap = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
      reset: '\x1b[0m'
    };

    // Initialize file logging if enabled
    if (this.enableFile && this.file) {
      this.initializeFileLogging();
    }

    // Track performance metrics
    this.metrics = {
      logCounts: {},
      errorCounts: {},
      sessionStart: Date.now(),
      lastLog: null
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Initialize file logging
   */
  initializeFileLogging() {
    try {
      const logDir = path.dirname(this.file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Rotate if file is too large
      this.rotateLogFile();
    } catch (error) {
      // Fallback to console only if file setup fails
      this.enableFile = false;
    }
  }

  /**
   * Rotate log file
   */
  rotateLogFile() {
    if (!this.file || !fs.existsSync(this.file)) {
      return;
    }

    try {
      const stats = fs.statSync(this.file);
      if (stats.size < this.maxFileSize) {
        return;
      }

      // Create backup files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.file}.${i}`;
        const newFile = `${this.file}.${i + 1}`;

        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      // Move current file to .1
      fs.renameSync(this.file, `${this.file}.1`);
    } catch (error) {
      // Rotation failed, but continue logging
    }
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    if (!this.timestamp) {
      return '';
    }

    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const entry = {
      level: level.toUpperCase(),
      message,
      timestamp: this.getTimestamp(),
      session: this.sessionId,
      logger: this.name,
      ...meta
    };

    // Track metrics
    this.updateMetrics(entry);

    switch (this.format) {
      case 'json':
        return JSON.stringify(entry, null, this.jsonIndent);
      case 'pretty':
        return this.prettyFormat(entry);
      case 'simple':
      default:
        return this.simpleFormat(entry);
    }
  }

  /**
   * Simple format: [TIMESTAMP] LEVEL: message
   */
  simpleFormat(entry) {
    const parts = [];
    if (entry.timestamp) {
      parts.push(`[${entry.timestamp}]`);
    }
    parts.push(`${entry.level}:`);
    parts.push(entry.message);

    let formatted = parts.join(' ');

    // Add context if provided
    if (entry.context || entry.error || entry.stack) {
      formatted += '\n' + this.formatContext(entry);
    }

    return formatted;
  }

  /**
   * Pretty format with colors and structure
   */
  prettyFormat(entry) {
    const color = this.colorsMap[entry.level.toLowerCase()];
    const reset = this.colorsMap.reset;

    let formatted = '';

    if (this.colors && this.enableConsole) {
      formatted += `${color}`;
    }

    if (entry.timestamp) {
      formatted += `[${entry.timestamp}] `;
    }

    formatted += `${entry.level}: ${entry.message}`;

    if (this.colors && this.enableConsole) {
      formatted += `${reset}`;
    }

    // Add additional context
    if (Object.keys(entry).length > 4) { // level, message, timestamp, session
      formatted += '\n' + this.formatContext(entry);
    }

    return formatted;
  }

  /**
   * Format additional context
   */
  formatContext(entry) {
    const context = {};

    // Extract relevant fields
    for (const [key, value] of Object.entries(entry)) {
      if (!['level', 'message', 'timestamp', 'session', 'logger'].includes(key)) {
        context[key] = value;
      }
    }

    if (Object.keys(context).length === 0) {
      return '';
    }

    let formatted = '';
    for (const [key, value] of Object.entries(context)) {
      formatted += `  ${key}: ${this.formatValue(value)}\n`;
    }

    return formatted.trim();
  }

  /**
   * Format a value for logging
   */
  formatValue(value) {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        return `[Object: ${value.constructor.name}]`;
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    const numericLevel = this.levels[level.toLowerCase()];
    const currentLevel = this.levels[this.level.toLowerCase()];

    return numericLevel >= currentLevel;
  }

  /**
   * Update logging metrics
   */
  updateMetrics(entry) {
    const level = entry.level.toLowerCase();
    this.metrics.logCounts[level] = (this.metrics.logCounts[level] || 0) + 1;
    this.metrics.lastLog = entry.timestamp;
  }

  /**
   * Write log entry
   */
  writeLog(formatted) {
    // Console output
    if (this.enableConsole) {
      console.log(formatted);
    }

    // File output
    if (this.enableFile && this.file) {
      try {
        fs.appendFileSync(this.file, formatted + '\n');
        this.rotateLogFile();
      } catch (error) {
        // Silently fail file logging to avoid infinite recursion
        if (this.enableConsole) {
          console.error(`Failed to write to log file: ${error.message}`);
        }
      }
    }
  }

  /**
   * Log at debug level
   */
  debug(message, meta = {}) {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', message, meta);
    this.writeLog(formatted);
  }

  /**
   * Log at info level
   */
  info(message, meta = {}) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', message, meta);
    this.writeLog(formatted);
  }

  /**
   * Log at warn level
   */
  warn(message, meta = {}) {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', message, meta);
    this.writeLog(formatted);
  }

  /**
   * Log at error level
   */
  error(message, meta = {}) {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', message, meta);
    this.writeLog(formatted);

    // Track error metrics
    this.metrics.errorCounts[message] = (this.metrics.errorCounts[message] || 0) + 1;
  }

  /**
   * Log at fatal level
   */
  fatal(message, meta = {}) {
    if (!this.shouldLog('fatal')) return;
    const formatted = this.formatMessage('fatal', message, meta);
    this.writeLog(formatted);

    // Track error metrics
    this.metrics.errorCounts[message] = (this.metrics.errorCounts[message] || 0) + 1;
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, meta = {}) {
    const message = `Performance: ${operation} completed in ${duration}ms`;
    this.debug(message, {
      ...meta,
      operation,
      duration: Number(duration),
      type: 'performance'
    });
  }

  /**
   * Log structured event
   */
  event(eventType, message, data = {}) {
    this.info(message, {
      eventType,
      data,
      type: 'event'
    });
  }

  /**
   * Log with custom level
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    const formatted = this.formatMessage(level, message, meta);
    this.writeLog(formatted);
  }

  /**
   * Create a child logger with additional context
   */
  child(name, context = {}) {
    return new ChildLogger(this, name, context);
  }

  /**
   * Measure execution time for async operations
   */
  async time(label, fn) {
    const start = Date.now();
    this.debug(`Starting: ${label}`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performance(label, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${label}`, {
        error: error.message,
        stack: error.stack,
        duration
      });
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const sessionDuration = Date.now() - this.metrics.sessionStart;
    const totalLogs = Object.values(this.metrics.logCounts).reduce((sum, count) => sum + count, 0);
    const totalErrors = Object.values(this.metrics.errorCounts).reduce((sum, count) => sum + count, 0);

    return {
      sessionId: this.sessionId,
      sessionDuration,
      totalLogs,
      totalErrors,
      logCounts: this.metrics.logCounts,
      errorCounts: this.metrics.errorCounts,
      lastLog: this.metrics.lastLog,
      loggerName: this.name,
      level: this.level,
      format: this.format
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      logCounts: {},
      errorCounts: {},
      sessionStart: Date.now(),
      lastLog: null
    };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Create performance timer
   */
  timer(label) {
    return new PerformanceTimer(this, label);
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
      this.debug(`Log level set to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled) {
    this.enableConsole = enabled;
    this.debug(`Console logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable file logging
   */
  setFileLogging(enabled) {
    this.enableFile = enabled;
    this.debug(`File logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set log format
   */
  setFormat(format) {
    if (['simple', 'json', 'pretty'].includes(format)) {
      this.format = format;
      this.debug(`Log format set to: ${format}`);
    } else {
      this.warn(`Invalid log format: ${format}`);
    }
  }

  /**
   * Flush any buffered logs
   */
  flush() {
    // For synchronous file logging, this is a no-op
    // Could be enhanced for async logging
    this.debug('Logs flushed');
  }

  /**
   * Close logger and clean up resources
   */
  close() {
    this.flush();
    this.info('Logger closed', this.getMetrics());
  }

  /**
   * Create a log file path with date
   */
  static createLogFilePath(name, directory = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${name}-${timestamp}.log`;
    const logDir = directory || path.join(os.tmpdir(), 'docker-credential-fix-logs');

    return path.join(logDir, filename);
  }

  /**
   * Create logger with automatic log file
   */
  static createLogger(name, options = {}) {
    if (!options.file) {
      options.file = Logger.createLogFilePath(name, options.directory);
    }

    return new Logger(options);
  }
}

/**
 * Child Logger with inherited context
 */
class ChildLogger {
  constructor(parent, name, context = {}) {
    this.parent = parent;
    this.name = name;
    this.context = context;
    this.levels = parent.levels;
  }

  debug(message, meta = {}) {
    this.parent.debug(message, { ...this.context, ...meta });
  }

  info(message, meta = {}) {
    this.parent.info(message, { ...this.context, ...meta });
  }

  warn(message, meta = {}) {
    this.parent.warn(message, { ...this.context, ...meta });
  }

  error(message, meta = {}) {
    this.parent.error(message, { ...this.context, ...meta });
  }

  fatal(message, meta = {}) {
    this.parent.fatal(message, { ...this.context, ...meta });
  }

  performance(operation, duration, meta = {}) {
    this.parent.performance(operation, duration, { ...this.context, ...meta });
  }

  event(eventType, message, data = {}) {
    this.parent.event(eventType, message, { ...this.context, ...data });
  }

  log(level, message, meta = {}) {
    this.parent.log(level, message, { ...this.context, ...meta });
  }

  child(name, context = {}) {
    return new ChildLogger(this.parent, name, { ...this.context, ...context });
  }

  time(label, fn) {
    return this.parent.time(label, fn);
  }

  timer(label) {
    return new PerformanceTimer(this.parent, label);
  }

  getMetrics() {
    return this.parent.getMetrics();
  }

  setLevel(level) {
    this.parent.setLevel(level);
  }

  setConsoleLogging(enabled) {
    this.parent.setConsoleLogging(enabled);
  }

  setFileLogging(enabled) {
    this.parent.setFileLogging(enabled);
  }

  setFormat(format) {
    this.parent.setFormat(format);
  }

  flush() {
    this.parent.flush();
  }

  close() {
    this.parent.close();
  }
}

/**
 * Performance Timer for measuring execution time
 */
class PerformanceTimer {
  constructor(logger, label) {
    this.logger = logger;
    this.label = label;
    this.startTime = Date.now();
    this.endTime = null;
    this.duration = null;
  }

  end() {
    if (this.endTime) {
      return this.duration; // Already ended
    }

    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    this.logger.performance(this.label, this.duration);
    return this.duration;
  }

  /**
   * Get current duration without ending timer
   */
  elapsed() {
    return Date.now() - this.startTime;
  }
}

/**
 * Logger factory for easy creation
 */
class LoggerFactory {
  static loggers = new Map();

  static create(name, options = {}) {
    if (!options.name) {
      options.name = name;
    }

    const logger = new Logger(options);
    this.loggers.set(name, logger);
    return logger;
  }

  static get(name) {
    return this.loggers.get(name);
  }

  static closeAll() {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
    this.loggers.clear();
  }

  static setGlobalLevel(level) {
    for (const logger of this.loggers.values()) {
      logger.setLevel(level);
    }
  }

  static setGlobalFormat(format) {
    for (const logger of this.loggers.values()) {
      logger.setFormat(format);
    }
  }
}

module.exports = {
  Logger,
  ChildLogger,
  PerformanceTimer,
  LoggerFactory
};