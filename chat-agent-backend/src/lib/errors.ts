import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (
    err instanceof SyntaxError &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Invalid JSON in request body.' });
    return;
  }

  console.error('[error] Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
}
