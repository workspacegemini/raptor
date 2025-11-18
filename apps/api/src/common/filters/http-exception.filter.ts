import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = undefined;

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
        details = (exceptionResponse as any).details;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.getPrismaErrorStatus(exception.code);
      message = this.getPrismaErrorMessage(exception);
      error = 'DatabaseError';
      details = {
        code: exception.code,
        meta: exception.meta,
      };
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'ValidationError';
    }
    // Handle other errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error && {
        stack: exception.stack,
      }),
    };

    // Log the error
    const userId = (request as any).user?.id;
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
    );

    // Log security-relevant errors
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.logSecurityEvent(
        `${error}: ${message}`,
        userId,
        request.ip,
        {
          method: request.method,
          url: request.url,
          userAgent: request.get('user-agent'),
        },
      );
    }

    response.status(status).json(errorResponse);
  }

  private getPrismaErrorStatus(code: string): number {
    const errorMap: Record<string, number> = {
      P2000: HttpStatus.BAD_REQUEST, // Value too long
      P2001: HttpStatus.NOT_FOUND, // Record not found
      P2002: HttpStatus.CONFLICT, // Unique constraint
      P2003: HttpStatus.BAD_REQUEST, // Foreign key constraint
      P2025: HttpStatus.NOT_FOUND, // Record not found
    };

    return errorMap[code] || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getPrismaErrorMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    const code = exception.code;

    switch (code) {
      case 'P2000':
        return 'The provided value is too long for the field';
      case 'P2001':
        return 'The requested record was not found';
      case 'P2002':
        const target = (exception.meta?.target as string[]) || [];
        return `A record with this ${target.join(', ')} already exists`;
      case 'P2003':
        return 'Foreign key constraint failed';
      case 'P2025':
        return 'Record not found or already deleted';
      default:
        return 'A database error occurred';
    }
  }
}
