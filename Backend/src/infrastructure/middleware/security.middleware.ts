import helmet from 'helmet';

/**
 * Security middleware that applies Helmet HTTP security headers to all responses.
 * Includes CSP, HSTS, X-Frame-Options, X-Content-Type-Options and more.
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});
