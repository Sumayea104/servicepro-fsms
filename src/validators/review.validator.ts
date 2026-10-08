import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    punctuality: z.number().int().min(1).max(5),
    professionalism: z.number().int().min(1).max(5),
    quality: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  }),
});
