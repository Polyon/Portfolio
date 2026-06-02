/**
 * Standardised error codes for all API error responses.
 * Maps to HTTP status codes for client-side handling.
 */
export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',           // 400 – Validation failed
  UNAUTHORIZED = 'UNAUTHORIZED',             // 401 – Missing/invalid JWT
  FORBIDDEN = 'FORBIDDEN',                   // 403 – Insufficient permissions
  NOT_FOUND = 'NOT_FOUND',                   // 404 – Resource does not exist
  CONFLICT = 'CONFLICT',                     // 409 – Duplicate/constraint violation
  RATE_LIMITED = 'RATE_LIMITED',             // 429 – Too many requests
  INTERNAL_ERROR = 'INTERNAL_ERROR',         // 500 – Unhandled server error
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 503 – Dependency unavailable
}

/** Map ErrorCode → HTTP status integer */
export const ErrorCodeStatus: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};
