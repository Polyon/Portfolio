import type { Request, Response, NextFunction } from 'express';
import type Joi from 'joi';
import { buildErrorResponse } from '../utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { FieldError } from '../../application/dtos/common.dtos';

/**
 * Middleware factory that validates `req.body` against a Joi schema.
 *
 * On failure, returns a 400 JSON response with field-level errors.
 * On success, calls `next()` to proceed to the route handler.
 *
 * @param schema - Joi schema to validate the request body against
 *
 * @example
 * router.post('/skills', validate(createSkillSchema), skillsController.create);
 */
export function validate(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const fieldErrors: FieldError[] = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      res
        .status(400)
        .json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Request validation failed', fieldErrors));
      return;
    }

    // Replace body with the sanitized/coerced value from Joi
    req.body = value as unknown;
    next();
  };
}

/**
 * Middleware factory that validates `req.query` against a Joi schema.
 * Useful for list endpoints with query parameters.
 */
export function validateQuery(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      const fieldErrors: FieldError[] = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      res
        .status(400)
        .json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Invalid query parameters', fieldErrors));
      return;
    }

    req.query = value as Record<string, string>;
    next();
  };
}
