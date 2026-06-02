import cors from 'cors';

const allowedOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:4200,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

/**
 * CORS middleware configured to allow requests from the Angular frontend.
 * Origin is configurable via the CORS_ORIGIN environment variable.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server / health checks with no origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
