import type { Request, Response, NextFunction } from 'express';

/** Centralised JSON error handler (Express 5 compatible). */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ErrorHandler]', err.message);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({ message: err.message ?? 'Internal server error' });
}
