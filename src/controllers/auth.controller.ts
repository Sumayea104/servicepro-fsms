import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

// Whitelist-by-omission: strip every secret/internal column before a user object leaves the API.
function publicUser(user: Record<string, unknown>) {
  const { password, emailVerifyToken, emailVerifyExpires, passwordResetToken, passwordResetExpiry, ...safe } = user;
  void password; void emailVerifyToken; void emailVerifyExpires; void passwordResetToken; void passwordResetExpiry;
  return safe;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { user: publicUser(user as Record<string, unknown>), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Registered successfully', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginUser(req.body.email, req.body.password);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { user: publicUser(user as Record<string, unknown>), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Logged in successfully');
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginWithGoogle(req.body.idToken, req.body.role);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { user: publicUser(user as Record<string, unknown>), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Logged in with Google');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshTokens(token);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  await authService.logoutUser(token);
  res.clearCookie('refreshToken');
  sendSuccess(res, {}, 'Logged out successfully');
});
