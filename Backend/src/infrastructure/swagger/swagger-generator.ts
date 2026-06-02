import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { swaggerSpec } from './swagger.config';

/**
 * Creates an Express router that mounts:
 *  - GET /api-docs        → Swagger UI
 *  - GET /api-docs.json   → Raw OpenAPI 3.0 JSON spec
 */
export function createSwaggerRouter(): Router {
  const router = Router();

  // Swagger UI
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Polyon Portfolio API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));

  // Raw OpenAPI spec as JSON
  router.get('.json', (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  return router;
}
