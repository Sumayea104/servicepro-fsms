import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from '../errors/AppError.js';

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed: any = schema.parse({ body: req.body, query: req.query, params: req.params });
      if (parsed.body) req.body = parsed.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((e) => ({ field: e.path.join('.'), message: e.message }));
        return next(AppError.badRequest('Validation failed', errors));
      }
      next(err);
    }
  };
}
