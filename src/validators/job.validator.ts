import { z } from 'zod';

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(10),
    category: z.enum(['ELECTRICAL', 'PLUMBING', 'AC_REPAIR', 'APPLIANCE_REPAIR', 'CARPENTRY', 'PAINTING', 'CLEANING', 'OTHER']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    address: z.string().min(5),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    tags: z.array(z.string()).optional(),
    estimatedCost: z.number().positive().optional(),
  }),
});

export const reviewJobSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVE', 'REJECT']),
    cancellationReason: z.string().optional(),
  }),
});

export const assignJobSchema = z.object({
  body: z.object({
    technicianId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
  }),
});

export const rescheduleJobSchema = z.object({
  body: z.object({
    scheduledAt: z.string().datetime(),
  }),
});

export const updateJobStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    cancellationReason: z.string().optional(),
    finalCost: z.number().positive().optional(),
  }),
});

export const submitServiceReportSchema = z.object({
  body: z.object({
    summary: z.string().min(5),
    findings: z.string().optional(),
    recommendations: z.string().optional(),
    laborHours: z.number().positive().optional(),
    partsUsed: z.array(z.string()).optional(),
  }),
});
