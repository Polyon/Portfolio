import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import experienceController from '../controllers/experience.controller';

/**
 * @swagger
 * tags:
 *   name: Experience
 *   description: Admin experience management endpoints
 */
const router = Router();

// Authenticate + require ADMIN role for all experience routes
router.use(authenticate, requireRole('ADMIN'));

// Mount experience controller under /
router.use('/', experienceController);

export default router;
