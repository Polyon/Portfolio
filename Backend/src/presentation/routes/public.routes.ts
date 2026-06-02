import { Router } from 'express';
import publicController from '../controllers/public.controller';

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Public portfolio endpoints – no authentication required
 */
const router = Router();

// No auth middleware – all public endpoints are unauthenticated
router.use('/', publicController);

export default router;
