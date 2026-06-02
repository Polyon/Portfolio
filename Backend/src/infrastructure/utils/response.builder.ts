import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { FieldError, PaginationMetadata, SuccessResponse, ListResponse, ErrorResponse } from '../../application/dtos/common.dtos';

/**
 * Build a standard single-entity success response.
 */
export function buildSuccessResponse<T>(data: T, timestamp?: string): SuccessResponse<T> {
  return {
    data,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

/**
 * Build a standard paginated list response.
 */
export function buildListResponse<T>(
  data: T[],
  pagination: PaginationMetadata,
  timestamp?: string,
): ListResponse<T> {
  return {
    data,
    pagination,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

/**
 * Build a standard error response.
 */
export function buildErrorResponse(
  errorCode: ErrorCode,
  message: string,
  fieldErrors?: FieldError[],
): ErrorResponse {
  const response: ErrorResponse = {
    error: message,
    errorCode,
    timestamp: new Date().toISOString(),
  };
  if (fieldErrors && fieldErrors.length > 0) {
    response.errors = fieldErrors;
  }
  return response;
}

/**
 * Build pagination metadata from totals and page params.
 */
export function buildPaginationMetadata(
  total: number,
  page: number,
  limit: number,
): PaginationMetadata {
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}
