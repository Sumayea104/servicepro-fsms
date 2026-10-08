import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  const { password, ...safeUser } = user as any;
  sendSuccess(res, { user: safeUser, accessToken: tokens.accessToken }, 'Registered successfully', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginUser(req.body.email, req.body.password);
  setRefreshCookie(res, tokens.refreshToken);
  const { password, ...safeUser } = user as any;
  sendSuccess(res, { user: safeUser, accessToken: tokens.accessToken }, 'Logged in successfully');
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginWithGoogle(req.body.idToken, req.body.role);
  setRefreshCookie(res, tokens.refreshToken);
  const { password, ...safeUser } = user as any;
  sendSuccess(res, { user: safeUser, accessToken: tokens.accessToken }, 'Logged in with Google');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshTokens(token);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  await authService.logoutUser(token);
  res.clearCookie('refreshToken');
  sendSuccess(res, {}, 'Logged out successfully');
});
