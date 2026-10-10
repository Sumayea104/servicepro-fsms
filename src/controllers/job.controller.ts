import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as jobService from '../services/job.service.js';
import * as uploadService from '../services/upload.service.js';
import { AppError } from '../errors/AppError.js';
import { PAGINATION_DEFAULTS } from '../constants.js';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.createJob(req.user!.id, req.body);
  sendSuccess(res, job, 'Service request created', 201);
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await jobService.listJobs(req.user!, {
    status: req.query.status as string,
    category: req.query.category as string,
    priority: req.query.priority as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
    page,
    limit,
  });
  sendSuccess(res, result);
});

export const searchJobs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await jobService.searchJobs(String(req.query.q || ''), page, limit);
  sendSuccess(res, result);
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.getJobById(req.params.id as string, req.user!);
  sendSuccess(res, job);
});

export const reviewJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.reviewJob(req.params.id as string, req.user!.id, req.body.decision, req.body.cancellationReason);
  sendSuccess(res, job, `Job ${req.body.decision === 'APPROVE' ? 'approved' : 'rejected'}`);
});

export const assignJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.assignJob(req.params.id as string, req.user!.id, req.body.technicianId, new Date(req.body.scheduledAt));
  sendSuccess(res, job, 'Technician assigned');
});

export const rescheduleJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.rescheduleJob(req.params.id as string, req.user!.id, new Date(req.body.scheduledAt));
  sendSuccess(res, job, 'Job rescheduled');
});

export const updateJobStatus = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.updateJobStatus(req.params.id as string, req.user!, req.body.status, { cancellationReason: req.body.cancellationReason, finalCost: req.body.finalCost });
  sendSuccess(res, job, `Job status updated to ${req.body.status}`);
});

export const cancelJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.cancelJob(req.params.id as string, req.user!, req.body.cancellationReason);
  sendSuccess(res, job, 'Job cancelled');
});

export const submitServiceReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await jobService.submitServiceReport(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, report, 'Service report submitted');
});

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('No file uploaded');
  const result = await uploadService.uploadBuffer(req.file.buffer, 'jobs');
  const attachment = await jobService.addAttachment(req.params.id as string, req.user!.id, {
    fileName: req.file.originalname,
    fileUrl: result.url,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    purpose: req.body.purpose,
  });
  sendSuccess(res, attachment, 'Attachment uploaded', 201);
});
export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  await jobService.softDeleteJob(req.params.id as string, req.user!.id);
  sendSuccess(res, {}, 'Job deleted');
});
