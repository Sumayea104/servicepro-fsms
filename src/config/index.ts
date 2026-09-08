// Centralized config exports
import { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth } from './database';
import redisClient, { cache, cacheKeys, rateLimit as redisRateLimit } from './redis';
import stripe, { stripeHelpers, STRIPE_CONSTANTS } from './stripe';
import cloudinary, { cloudinaryHelpers, CLOUDINARY_FOLDERS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './cloudinary';

// Environment configuration
export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  apiVersion: 'v1',
  
  // JWT config
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Rate limiting config
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Email config
  email: {
    from: process.env.EMAIL_FROM || 'noreply@servicepro.com',
    apiKey: process.env.RESEND_API_KEY || '',
  },
};

// Export everything
export {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  redisClient,
  cache,
  cacheKeys,
  redisRateLimit,
  stripe,
  stripeHelpers,
  STRIPE_CONSTANTS,
  cloudinary,
  cloudinaryHelpers,
  CLOUDINARY_FOLDERS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
};

export default config;