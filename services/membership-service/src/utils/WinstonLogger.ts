import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export class WinstonLogger {
  private logger: winston.Logger;

  constructor(serviceName: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: serviceName,
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown'
      },
      transports: [
        // Console transport for development
        ...(process.env.NODE_ENV !== 'production' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
              winston.format.timestamp(),
              winston.format.printf(
                `${winston.format.colorize()}[${winston.format.timestamp()}] [${serviceName}] %s %s`,
                winston.format.level(),
                winston.format.unlabelize(),
                winston.format.printf(`${winston.format.message()}`)
              )
            )
          })
        ] : []),

        // File transport with daily rotation
        new DailyRotateFile({
          filename: `logs/${serviceName.toLowerCase()}-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true
        }),

        // Error file transport
        new DailyRotateFile({
          level: 'error',
          filename: `logs/${serviceName.toLowerCase()}-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Method to close logger
  close(): void {
    this.logger.close();
  }
}