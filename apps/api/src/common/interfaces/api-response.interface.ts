export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedPayload<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function isPaginatedPayload<T>(
  value: unknown,
): value is PaginatedPayload<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as PaginatedPayload<T>;
  return Array.isArray(candidate.items) && typeof candidate.meta === 'object';
}
