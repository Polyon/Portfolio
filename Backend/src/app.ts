import express from 'express';
import type { Application } from 'express';

import { initCloudinary } from './infrastructure/cloudinary/cloudinary.config';
import { corsMiddleware } from './infrastructure/middleware/cors.middleware';
import { securityMiddleware } from './infrastructure/middleware/security.middleware';
import { loggingMiddleware } from './infrastructure/middleware/logging.middleware';
import { errorHandler } from './infrastructure/middleware/error-handler.middleware';
import { createSwaggerRouter } from './infrastructure/swagger/swagger-generator';

import healthRoutes from './presentation/routes/health.routes';
import v1Router from './presentation/routes/v1/index';

import authRoutes from './presentation/routes/auth.routes';
import profileRoutes from './presentation/routes/profile.routes';
import skillsRoutes from './presentation/routes/skills.routes';
import experienceRoutes from './presentation/routes/experience.routes';
import projectRoutes from './presentation/routes/project.routes';
import serviceController from './presentation/controllers/service.controller';
import contactController from './presentation/controllers/contact.controller';
import emailTemplateController from './presentation/controllers/email-template.controller';
import publicRoutes from './presentation/routes/public.routes';
import seoRoutes from './presentation/routes/seo.routes';
import uploadRoutes from './presentation/routes/upload.routes';
import { authenticate } from './presentation/middleware/auth.middleware';
import { requireRole } from './infrastructure/middleware/authorization.middleware';

/**
 * Initialise and configure the Express application.
 * Returns the configured app instance — does NOT call app.listen().
 */
export function createApp(): Application {
  const app = express();

  // ─── External Services ────────────────────────────────────────────────────
  initCloudinary();

  // ─── Security & Cross-Origin ─────────────────────────────────────────────
  app.use(securityMiddleware);
  app.use(corsMiddleware);

  // ─── Request Parsing ─────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Logging ─────────────────────────────────────────────────────────────
  app.use(loggingMiddleware);

  // ─── Health & API Version Routes ─────────────────────────────────────────
  app.use('/api', healthRoutes);
  app.use('/api/v1', v1Router);

  // ─── Swagger Docs ─────────────────────────────────────────────────────────
  app.use('/api-docs', createSwaggerRouter());

  // ─── Public Routes (no auth required) ────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api', seoRoutes);  // handles /api/public/seo, /api/public/sitemap.xml, /api/public/robots.txt, /api/admin/seo, /api/admin/publication

  // ─── Admin Routes (JWT + ADMIN role required) ────────────────────────────
  app.use('/api/admin/profile', profileRoutes);
  app.use('/api/admin/skills', skillsRoutes);
  app.use('/api/admin/experiences', experienceRoutes);
  app.use('/api/admin/projects', projectRoutes);
  app.use('/api/admin/upload', uploadRoutes);
  app.use('/api/admin/services', authenticate, requireRole('ADMIN'), serviceController);
  app.use('/api/admin/contact', authenticate, requireRole('ADMIN'), contactController);
  app.use('/api/admin/email-templates', authenticate, requireRole('ADMIN'), emailTemplateController);

  // ─── Global Error Handler (must be last) ─────────────────────────────────
  app.use(errorHandler);

  return app;
}
