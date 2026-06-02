import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import uploadController from '../controllers/upload.controller';

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload endpoints (Cloudinary)
 */
const router = Router();

// All upload routes require JWT authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));
router.use('/', uploadController);

export default router;
