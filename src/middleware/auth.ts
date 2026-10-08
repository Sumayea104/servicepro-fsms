import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../config/prisma.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const cookieToken = (req as any).cookies?.accessToken;
    const token = cookieToken || (header && header.startsWith('Bearer ') ? header.split(' ')[1] : null);
    if (!token) throw AppError.unauthorized('Authentication token missing');

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: { id: true, role: true },
    });
    if (!user) throw AppError.unauthorized('User no longer exists or is inactive');

    req.user = { id: user.id, role: user.role as any };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
