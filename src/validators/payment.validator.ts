import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  body: z.object({
    jobId: z.string().uuid(),
    method: z.enum(['STRIPE', 'BKASH']),
  }),
});
