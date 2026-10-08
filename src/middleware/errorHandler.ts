import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') logger.error(err);

  if (err instanceof AppError) return sendError(res, err.message, err.statusCode, err.errors);

  if (err?.code === 'P2002') {
    return sendError(res, 'A record with this value already exists', 409, [{ field: err?.meta?.target, message: 'Must be unique' }]);
  }
  if (err?.code === 'P2025') return sendError(res, 'Record not found', 404);

  return sendError(res, err?.message || 'Internal server error', 500);
}
