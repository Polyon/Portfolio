import { ErrorCode } from '../enums/error-codes.enum';

/**
 * Base application error class.
 * Carries an `errorCode` for use by the global error-handler middleware.
 */
export class AppError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly httpStatus: number;

  constructor(errorCode: ErrorCode, httpStatus: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 – Caller supplied invalid or incomplete data. */
export class ValidationAppError extends AppError {
  constructor(message = 'Request validation failed') {
    super(ErrorCode.INVALID_INPUT, 400, message);
    this.name = 'ValidationAppError';
  }
}

/** 401 – Missing, expired, or invalid authentication credentials. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, 401, message);
    this.name = 'UnauthorizedError';
  }
}

/** 403 – Caller is authenticated but lacks the required permission. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, 403, message);
    this.name = 'ForbiddenError';
  }
}

/** 404 – The requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, 404, message);
    this.name = 'NotFoundError';
  }
}

/** 409 – Duplicate entry or constraint violation. */
export class ConflictError extends AppError {
  constructor(message = 'Conflict: resource already exists') {
    super(ErrorCode.CONFLICT, 409, message);
    this.name = 'ConflictError';
  }
}

/** 503 – A required downstream service is unavailable. */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(ErrorCode.SERVICE_UNAVAILABLE, 503, message);
    this.name = 'ServiceUnavailableError';
  }
}
