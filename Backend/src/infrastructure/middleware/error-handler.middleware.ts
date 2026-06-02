import type { Request, Response, NextFunction } from 'express';
import { ErrorCode, ErrorCodeStatus } from '../../domain/enums/error-codes.enum';
import { AppError } from '../../domain/errors/AppError';
import { buildErrorResponse } from '../utils/response.builder';
import type { FieldError } from '../../application/dtos/common.dtos';

/**
 * Global Express error-handler middleware.
 *
 * Priority order:
 *   1. AppError subclasses (typed domain errors – NotFoundError, ConflictError, etc.)
 *   2. Joi / schema validation errors → 400 INVALID_INPUT
 *   3. JWT library errors → 401 UNAUTHORIZED
 *   4. Errors with an explicit HTTP status code (err.status / err.statusCode)
 *   5. All other unhandled errors → 500 INTERNAL_ERROR
 *
 * Internal error details are NEVER exposed to the client.
 * Must be registered as the LAST middleware in the Express stack.
 */
export function errorHandler(
  err: Error & {
    status?: number;
    statusCode?: number;
    isJoi?: boolean;
    details?: { message: string; path: (string | number)[] }[];
  },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log full error server-side for debugging (stack trace in non-production)
  const stack = process.env.NODE_ENV !== 'production' ? `\n${err.stack ?? ''}` : '';
  console.error(`[ErrorHandler] ${req.method} ${req.path} — ${err.name}: ${err.message}${stack}`);

  // ── 1. Typed AppError subclasses ─────────────────────────────────────────
  // NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, etc.
  if (err instanceof AppError) {
    res
      .status(err.httpStatus)
      .json(buildErrorResponse(err.errorCode, err.message));
    return;
  }

  // ── 1b. MongoDB CastError (invalid ObjectId) → 400 INVALID_INPUT ─────────
  if (err.name === 'CastError') {
    res
      .status(ErrorCodeStatus[ErrorCode.INVALID_INPUT])
      .json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Invalid ID format'));
    return;
  }

  // ── 1c. MongoDB duplicate key error → 409 CONFLICT ───────────────────────
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {}).join(', ') || 'field';
    res
      .status(ErrorCodeStatus[ErrorCode.CONFLICT])
      .json(buildErrorResponse(ErrorCode.CONFLICT, `Duplicate value for ${field}`));
    return;
  }

  // ── 2. Joi / schema validation errors → 400 INVALID_INPUT ────────────────
  if (err.isJoi || err.name === 'ValidationError') {
    const fieldErrors: FieldError[] = (err.details ?? []).map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    res
      .status(ErrorCodeStatus[ErrorCode.INVALID_INPUT])
      .json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Request validation failed', fieldErrors));
    return;
  }

  // ── 3. JWT library errors → 401 UNAUTHORIZED ─────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    res
      .status(ErrorCodeStatus[ErrorCode.UNAUTHORIZED])
      .json(buildErrorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired token'));
    return;
  }

  // ── 4. Errors with an explicit HTTP status code ───────────────────────────
  const httpStatus = err.status ?? err.statusCode;
  if (httpStatus) {
    const code = httpStatusToErrorCode(httpStatus);
    const isClientError = httpStatus >= 400 && httpStatus < 500;
    res
      .status(httpStatus)
      .json(buildErrorResponse(code, isClientError ? err.message : 'An unexpected error occurred'));
    return;
  }

  // ── 5. Unhandled / unknown errors → 500 INTERNAL_ERROR ───────────────────
  res
    .status(ErrorCodeStatus[ErrorCode.INTERNAL_ERROR])
    .json(buildErrorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred'));
}

function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400: return ErrorCode.INVALID_INPUT;
    case 401: return ErrorCode.UNAUTHORIZED;
    case 403: return ErrorCode.FORBIDDEN;
    case 404: return ErrorCode.NOT_FOUND;
    case 409: return ErrorCode.CONFLICT;
    case 429: return ErrorCode.RATE_LIMITED;
    case 503: return ErrorCode.SERVICE_UNAVAILABLE;
    default:  return ErrorCode.INTERNAL_ERROR;
  }
}
