import morgan from 'morgan';

const format =
  process.env['NODE_ENV'] === 'production'
    ? 'combined'
    : ':method :url :status :response-time ms - :res[content-length]';

/**
 * HTTP request logging middleware using Morgan.
 * Uses 'combined' format in production and a concise format in development.
 */
export const loggingMiddleware = morgan(format);
