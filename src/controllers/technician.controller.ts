import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as technicianService from '../services/technician.service.js';
import { PAGINATION_DEFAULTS } from '../constants.js';

export const listTechnicians = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await technicianService.listTechnicians({ skill: req.query.skill as string, available: req.query.available as string, verified: req.query.verified as string, page, limit });
  sendSuccess(res, result);
});

export const getTechnician = asyncHandler(async (req: Request, res: Response) => {
  const technician = await technicianService.getTechnicianById(req.params.id as string);
  sendSuccess(res, technician);
});

export const suggestTechnicians = asyncHandler(async (req: Request, res: Response) => {
  const suggestions = await technicianService.suggestTechnicians(req.query.jobId as string);
  sendSuccess(res, suggestions);
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const updated = await technicianService.updateAvailability(req.user!.id, req.body.isAvailable);
  sendSuccess(res, updated, 'Availability updated');
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const updated = await technicianService.updateLocation(req.user!.id, req.body.currentLat, req.body.currentLng);
  sendSuccess(res, updated, 'Location updated');
});

export const updateSkills = asyncHandler(async (req: Request, res: Response) => {
  const updated = await technicianService.updateSkills(req.user!.id, req.body.skills, req.body.serviceAreas);
  sendSuccess(res, updated, 'Skills updated');
});

export const setWeeklyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const slots = await technicianService.setWeeklyAvailability(req.user!.id, req.body.slots);
  sendSuccess(res, slots, 'Weekly availability updated');
});