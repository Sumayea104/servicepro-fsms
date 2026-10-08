import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { prisma } from '../config/prisma.js';
import { PAGINATION_DEFAULTS } from '../constants.js';

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const where = { userId: req.user!.id };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);
  sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await prisma.notification.updateMany({
  where: { id: req.params.id as string, userId: req.user!.id },
  data: { isRead: true }
});
  sendSuccess(res, notification, 'Marked as read');
});
