import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(['CUSTOMER', 'TECHNICIAN', 'ADMIN']),
  }),
});

export const verifyTechnicianSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVE', 'REJECT']),
    rejectionReason: z.string().optional(),
  }),
});

export const upsertSystemSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1),
    value: z.any(),
    description: z.string().optional(),
  }),
});
