import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/AuthService';
import { jwtMiddleware } from '../../infrastructure/middleware/jwt.middleware';
import type { AuthenticatedRequest } from '../../infrastructure/middleware/jwt.middleware';
import { buildSuccessResponse, buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode, ErrorCodeStatus } from '../../domain/enums/error-codes.enum';
import Joi from 'joi';
import { emailSchema, passwordSchema } from '../../infrastructure/utils/validation';

const router = Router();
const authService = new AuthService();

// ─── Validation schemas ───────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().min(1).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ─── Route helpers ────────────────────────────────────────────────────────────

function validationError(res: Response, message: string): void {
  res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, message));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Login successful, returns JWT tokens
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const fieldErrors = error.details.map((d) => ({
      field: (d.path.join('.') || d.context?.key) ?? 'field',
      message: d.message,
    }));
    res
      .status(400)
      .json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Request validation failed', fieldErrors));
    return;
  }

  try {
    const result = await authService.login(
      value as { email: string; password: string },
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );
    res.status(200).json(buildSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { error, value } = refreshSchema.validate(req.body, { abortEarly: false });
  if (error) {
    validationError(res, 'refreshToken is required');
    return;
  }

  try {
    const result = await authService.refreshToken((value as { refreshToken: string }).refreshToken);
    res.status(200).json(buildSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', jwtMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.logout(
      req.user!.sub,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );
    res.status(200).json(buildSuccessResponse(result));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
router.get('/me', jwtMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getCurrentUser(req.user!.sub);
    if (!user) {
      res
        .status(ErrorCodeStatus[ErrorCode.NOT_FOUND])
        .json(buildErrorResponse(ErrorCode.NOT_FOUND, 'User not found'));
      return;
    }
    res.status(200).json(buildSuccessResponse(user));
  } catch (err) {
    next(err);
  }
});

export default router;

