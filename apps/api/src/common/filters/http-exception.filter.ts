import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolveException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    body: ApiErrorResponse;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          status,
          body: {
            success: false,
            error: {
              code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
              message: exceptionResponse,
            },
          },
        };
      }

      const responseObject = exceptionResponse as Record<string, unknown>;
      const message = this.extractMessage(responseObject);

      return {
        status,
        body: {
          success: false,
          error: {
            code:
              (responseObject.error as string) ??
              HttpStatus[status] ??
              'HTTP_EXCEPTION',
            message,
            details: responseObject.message,
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        },
      },
    };
  }

  private extractMessage(responseObject: Record<string, unknown>): string {
    const message = responseObject.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return 'Request failed.';
  }
}
