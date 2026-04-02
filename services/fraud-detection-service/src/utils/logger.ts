import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  // Console transport
  new winston.transports.Console(),
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // Combined log file
  new winston.transports.File({
    filename: 'logs/all.log',
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
});

export function createLogger() {
  return {
    error: (message: string, meta?: Record<string, any>) =>
      logger.error(message, meta),
    warn: (message: string, meta?: Record<string, any>) =>
      logger.warn(message, meta),
    info: (message: string, meta?: Record<string, any>) =>
      logger.info(message, meta),
    http: (message: string, meta?: Record<string, any>) =>
      logger.http(message, meta),
    debug: (message: string, meta?: Record<string, any>) =>
      logger.debug(message, meta),
  };
}

export default logger;
