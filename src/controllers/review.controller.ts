import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as reviewService from '../services/review.service.js';
import { PAGINATION_DEFAULTS } from '../constants.js';

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.params.id as string, req.user!.id, req.body);
  sendSuccess(res, review, 'Review submitted', 201);
});

export const listTechnicianReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || PAGINATION_DEFAULTS.page;
  const limit = Math.min(parseInt(String(req.query.limit)) || PAGINATION_DEFAULTS.limit, PAGINATION_DEFAULTS.maxLimit);
  const result = await reviewService.listTechnicianReviews(req.params.id as string, page, limit);
  sendSuccess(res, result);
});