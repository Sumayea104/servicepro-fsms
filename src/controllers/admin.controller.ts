import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as adminService from '../services/admin.service.js';
import { PAGINATION_DEFAULTS } from '../constants.js';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await adminService.listUsers({ role: req.query.role as string, page, limit });
  sendSuccess(res, result);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.updateUserRole(req.user!.id, req.params.id as string, req.body.role);
  sendSuccess(res, user, 'User role updated');
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.deactivateUser(req.user!.id, req.params.id as string);
  sendSuccess(res, user, 'User deactivated');
});

export const listPendingTechnicians = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await adminService.listPendingTechnicians(page, limit);
  sendSuccess(res, result);
});

export const verifyTechnician = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.verifyTechnician(req.user!.id, req.params.id as string, req.body.decision, req.body.rejectionReason);
  sendSuccess(res, result, `Technician ${req.body.decision === 'APPROVE' ? 'verified' : 'rejected'}`);
});

export const dashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await adminService.dashboardStats();
  sendSuccess(res, stats);
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await adminService.listAuditLogs({ entity: req.query.entity as string, page, limit });
  sendSuccess(res, result);
});

export const upsertSystemSetting = asyncHandler(async (req: Request, res: Response) => {
  const setting = await adminService.upsertSystemSetting(req.user!.id, req.body.key, req.body.value, req.body.description);
  sendSuccess(res, setting, 'System setting saved');
});
