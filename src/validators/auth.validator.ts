import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    phone: z.string().optional(),
    role: z.enum(['CUSTOMER', 'TECHNICIAN']).default('CUSTOMER'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(10),
    role: z.enum(['CUSTOMER', 'TECHNICIAN']).default('CUSTOMER'),
  }),
});
