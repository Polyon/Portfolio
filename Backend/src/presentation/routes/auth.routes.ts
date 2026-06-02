import { Router } from 'express';
import { authRateLimiter } from '../../infrastructure/middleware/rate-limiter';
import authController from '../controllers/auth.controller';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Admin authentication endpoints
 *
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const router = Router();

// Apply auth rate limiter to all auth routes
router.use(authRateLimiter);

// Mount auth controller routes under /
router.use('/', authController);

export default router;
