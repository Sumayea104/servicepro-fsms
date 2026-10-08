import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || '*',

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET', 'dev_access_secret'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  BKASH_BASE_URL: process.env.BKASH_BASE_URL || '',
  BKASH_USERNAME: process.env.BKASH_USERNAME || '',
  BKASH_PASSWORD: process.env.BKASH_PASSWORD || '',
  BKASH_APP_KEY: process.env.BKASH_APP_KEY || '',
  BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || '',
  BKASH_CALLBACK_URL: process.env.BKASH_CALLBACK_URL || '',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  REDIS_URL: process.env.REDIS_URL || '',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@servicepro.local',

  WS_URL: process.env.WS_URL || '',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@servicepro.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123!',
};
