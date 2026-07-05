import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiSuccessResponse,
  isPaginatedPayload,
} from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (isPaginatedPayload(data)) {
          return {
            success: true as const,
            data: data.items as T,
            meta: data.meta,
          };
        }

        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
