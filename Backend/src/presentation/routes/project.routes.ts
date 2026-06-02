import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import projectController from '../controllers/project.controller';

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Admin project management endpoints
 */
const router = Router();

// Authenticate + require ADMIN role for all project routes
router.use(authenticate, requireRole('ADMIN'));

// Mount project controller under /
router.use('/', projectController);

export default router;
