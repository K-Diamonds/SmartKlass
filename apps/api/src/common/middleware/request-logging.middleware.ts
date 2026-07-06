import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { getCorrelationId, getRequestId } from '../observability/correlation.context';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    response.on('finish', () => {
      const duration = Date.now() - startedAt;
      const correlationId = getCorrelationId();
      const requestId = getRequestId();
      const status = response.statusCode;

      this.metrics.increment('http_requests_total', {
        method,
        status: String(status),
      });
      this.metrics.observe('http_request_duration_ms', duration, { method });

      this.logger.log(
        JSON.stringify({
          level: 'info',
          message: 'http_request',
          method,
          path: originalUrl,
          statusCode: status,
          durationMs: duration,
          correlationId,
          requestId,
        }),
      );
    });

    next();
  }
}
