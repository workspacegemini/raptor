import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userId = request.user?.id;
    const organizationId = request.user?.organizationId;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const startTime = Date.now();

    // Log incoming request
    this.logger.debug(
      `Incoming Request: ${method} ${url}`,
      'HTTP',
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          // Log request completion
          this.logger.logRequest(method, url, statusCode, duration, userId);

          // Log slow requests (>1s)
          if (duration > 1000) {
            this.logger.warn(
              `Slow Request: ${method} ${url} took ${duration}ms`,
              'Performance',
            );
          }

          // Log business events for important actions
          if (this.isBusinessEvent(method, url)) {
            this.logger.logBusinessEvent(
              `${method} ${url}`,
              userId || 'anonymous',
              organizationId || 'none',
              {
                duration,
                statusCode,
                params,
                query,
              },
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Request Failed: ${method} ${url} - ${error.message}`,
            error.stack,
            'HTTP',
          );
        },
      }),
    );
  }

  private isBusinessEvent(method: string, url: string): boolean {
    // Log important business actions
    const businessPatterns = [
      /\/organizations\/.*\/(suspend|activate|delete)/,
      /\/users\/.*\/(suspend|activate|delete)/,
      /\/courses\/.*\/(publish|archive)/,
      /\/ai-generation\/generate-lessons/,
      /\/auth\/(register|login)/,
    ];

    return businessPatterns.some((pattern) => pattern.test(url));
  }
}
