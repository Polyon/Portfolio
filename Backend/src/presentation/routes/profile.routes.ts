import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import profileController from '../controllers/profile.controller';

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Admin profile management endpoints
 */
const router = Router();

// Authenticate + require ADMIN role for all profile routes
router.use(authenticate, requireRole('ADMIN'));

// Mount profile controller under /
router.use('/', profileController);

export default router;
