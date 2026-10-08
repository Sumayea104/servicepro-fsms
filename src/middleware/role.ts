import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(`This action requires one of these roles: ${roles.join(', ')}`));
    }
    next();
  };
}
