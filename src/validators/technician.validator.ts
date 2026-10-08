import { z } from 'zod';

export const updateAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

export const updateSkillsSchema = z.object({
  body: z.object({
    skills: z.array(z.string().min(1)).min(1),
    serviceAreas: z.array(z.string().min(1)).optional(),
  }),
});

export const updateLocationSchema = z.object({
  body: z.object({
    currentLat: z.number(),
    currentLng: z.number(),
  }),
});

export const setWeeklyAvailabilitySchema = z.object({
  body: z.object({
    slots: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .min(1),
  }),
});

export const suggestQuerySchema = z.object({
  query: z.object({
    jobId: z.string().uuid(),
  }),
});
