import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        const contextStr = context ? `[${context}]` : '';
        return `${timestamp} ${level} ${contextStr} ${message}${trace ? `\n${trace}` : ''}`;
      }),
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        // Console output
        new winston.transports.Console({
          format: consoleFormat,
        }),

        // Error logs
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
        }),

        // Combined logs
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
        }),

        // Access logs (for request tracking)
        new DailyRotateFile({
          filename: 'logs/access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          level: 'http',
          format: logFormat,
        }),
      ],
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    );

    // Handle unhandled rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    );
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Additional methods for structured logging
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
    this.logger.http('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  logDatabaseQuery(query: string, duration: number, params?: any) {
    this.logger.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      params,
    });
  }

  logSecurityEvent(event: string, userId?: string, ip?: string, details?: any) {
    this.logger.warn('Security Event', {
      event,
      userId,
      ip,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessEvent(event: string, userId: string, organizationId: string, details: any) {
    this.logger.info('Business Event', {
      event,
      userId,
      organizationId,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
