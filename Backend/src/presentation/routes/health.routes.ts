import { Router } from 'express';
import healthController from '../controllers/health.controller';

const router = Router();

router.use('/health', healthController);

export default router;
