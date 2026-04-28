/**
 * Standard Winston logger implementation
 * Follows the same pattern across all microservices
 */
import winston from 'winston';
import { config } from '../config/index.js';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const loggerInstance = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'premium-calculation-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export const createLogger = (module: string) => {
  return loggerInstance.child({ module });
};

export default loggerInstance;