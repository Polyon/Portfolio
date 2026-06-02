import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Polyon Portfolio API',
      version: '1.0.0',
      description:
        'RESTful API for the Polyon Portfolio Platform. Exposes 60+ endpoints for admin content management and public data retrieval.',
      contact: {
        name: 'Polyon Mondal',
      },
    },
    servers: [
      {
        url: process.env['API_BASE_URL'] ?? 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        PaginationMetadata: {
          type: 'object',
          properties: {
            total:    { type: 'integer', example: 100 },
            page:     { type: 'integer', example: 1 },
            limit:    { type: 'integer', example: 10 },
            pages:    { type: 'integer', example: 10 },
            hasNext:  { type: 'boolean', example: true },
            hasPrev:  { type: 'boolean', example: false },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error', 'errorCode', 'timestamp'],
          properties: {
            error:     { type: 'string', example: 'Resource not found' },
            errorCode: {
              type: 'string',
              enum: [
                'INVALID_INPUT',
                'UNAUTHORIZED',
                'FORBIDDEN',
                'NOT_FOUND',
                'CONFLICT',
                'RATE_LIMITED',
                'INTERNAL_ERROR',
                'SERVICE_UNAVAILABLE',
              ],
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Email is required' },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Scan all controller files for @swagger JSDoc comments
  apis: [
    path.join(__dirname, '../../presentation/controllers/**/*.ts'),
    path.join(__dirname, '../../presentation/routes/**/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
