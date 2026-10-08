import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as userService from '../services/user.service.js';
import * as uploadService from '../services/upload.service.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user!.id);
  sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateMe(req.user!.id, req.body);
  sendSuccess(res, user, 'Profile updated');
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('No file uploaded');
  const result = await uploadService.uploadBuffer(req.file.buffer, 'avatars');
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl: result.url } });
  sendSuccess(res, { avatarUrl: user.avatarUrl }, 'Avatar updated');
});
