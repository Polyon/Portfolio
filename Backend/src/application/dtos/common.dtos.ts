import { ErrorCode } from '../../domain/enums/error-codes.enum';

/** Field-level validation error returned in 400 responses. */
export interface FieldError {
  field: string;
  message: string;
}

/** Pagination metadata included in all list responses. */
export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Standard envelope for single-entity and action responses. */
export interface SuccessResponse<T> {
  data: T;
  timestamp: string;
}

/** Standard envelope for paginated list responses. */
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
  timestamp: string;
}

/** Standard error envelope returned on all 4xx/5xx responses. */
export interface ErrorResponse {
  error: string;
  errorCode: ErrorCode;
  errors?: FieldError[];
  timestamp: string;
}
