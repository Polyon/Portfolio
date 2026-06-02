import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import skillController from '../controllers/skill.controller';

/**
 * @swagger
 * tags:
 *   name: Skills
 *   description: Admin skills management endpoints
 */
const router = Router();

// Authenticate + require ADMIN role for all skills routes
router.use(authenticate, requireRole('ADMIN'));

// Mount skills controller under /
router.use('/', skillController);

export default router;
