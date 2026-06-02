import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../../infrastructure/middleware/authorization.middleware';
import seoController from '../controllers/seo.controller';

/**
 * @swagger
 * tags:
 *   - name: SEO
 *     description: Admin SEO metadata management endpoints
 *   - name: Publication
 *     description: Admin content publication workflow endpoints
 */
const router = Router();

// Admin SEO & Publication routes (JWT + ADMIN role)
router.use('/admin/seo', authenticate, requireRole('ADMIN'));
router.use('/admin/publication', authenticate, requireRole('ADMIN'));

// Mount the SEO controller which handles both admin and public sub-routes
router.use('/', seoController);

export default router;
