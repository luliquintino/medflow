import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const userId = (request as any).user?.id || 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        const statusCode = response.statusCode;

        if (process.env.NODE_ENV === 'production') {
          this.logger.log(
            JSON.stringify({
              method,
              url,
              statusCode,
              durationMs: duration,
              userId,
            }),
          );
        } else {
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms [${userId}]`,
          );
        }
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        const statusCode = err?.status || err?.getStatus?.() || 500;

        if (process.env.NODE_ENV === 'production') {
          this.logger.warn(
            JSON.stringify({
              method,
              url,
              statusCode,
              durationMs: duration,
              userId,
              error: err?.message || 'Unknown error',
            }),
          );
        } else {
          this.logger.warn(
            `${method} ${url} ${statusCode} ${duration}ms [${userId}] ${err?.message}`,
          );
        }

        return throwError(() => err);
      }),
    );
  }
}
