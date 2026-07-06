import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { runWithCorrelation } from './correlation.context';

export const CORRELATION_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const correlationId =
      (request.headers[CORRELATION_HEADER] as string | undefined) ??
      randomUUID();
    const requestId = randomUUID();

    request.headers[CORRELATION_HEADER] = correlationId;
    response.setHeader(CORRELATION_HEADER, correlationId);
    response.setHeader(REQUEST_ID_HEADER, requestId);

    runWithCorrelation({ correlationId, requestId }, () => next());
  }
}
