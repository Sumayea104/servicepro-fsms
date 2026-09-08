import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

// Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Cloudinary credentials are not set. File upload will not work.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

// Upload options types
export interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: any;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  tags?: string[];
  metadata?: Record<string, string>;
}

// Helper functions for file upload
export const cloudinaryHelpers = {
  // Upload from buffer
  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'servicepro-uploads',
          resource_type: options.resource_type || 'auto',
          public_id: options.public_id,
          transformation: options.transformation,
          tags: options.tags,
          metadata: options.metadata,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve(result!);
          }
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  },

  // Upload from URL
  async uploadFromUrl(url: string, options: UploadOptions = {}): Promise<UploadApiResponse> {
    try {
      const result = await cloudinary.uploader.upload(url, {
        folder: options.folder || 'servicepro-uploads',
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        transformation: options.transformation,
        tags: options.tags,
      });
      return result;
    } catch (error) {
      console.error('Cloudinary uploadFromUrl error:', error);
      throw error;
    }
  },

  // Upload from file path
  async uploadFromPath(filePath: string, options: UploadOptions = {}): Promise<UploadApiResponse> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder || 'servicepro-uploads',
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        transformation: options.transformation,
        tags: options.tags,
      });
      return result;
    } catch (error) {
      console.error('Cloudinary uploadFromPath error:', error);
      throw error;
    }
  },

  // Delete file
  async deleteFile(publicId: string, resourceType: string = 'image'): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary deleteFile error:', error);
      return false;
    }
  },

  // Get file URL with transformations
  getTransformedUrl(publicId: string, transformation: any = {}): string {
    return cloudinary.url(publicId, transformation);
  },

  // Create signed upload URL (for client-side uploads)
  createSignedUploadUrl(options: UploadOptions = {}): { signature: string; timestamp: number } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        ...options,
      },
      process.env.CLOUDINARY_API_SECRET || ''
    );
    return { signature, timestamp };
  },

  // Generate public ID
  generatePublicId(prefix: string = 'servicepro'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },
};

// Folder constants
export const CLOUDINARY_FOLDERS = {
  SERVICE_ATTACHMENTS: 'servicepro/service-attachments',
  WORK_ORDER_ATTACHMENTS: 'servicepro/work-order-attachments',
  USER_AVATARS: 'servicepro/user-avatars',
  TECHNICIAN_DOCUMENTS: 'servicepro/technician-documents',
  REPORTS: 'servicepro/reports',
};

// File type validators
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALL: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Max file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Type exports
export type CloudinaryUploadResult = UploadApiResponse;
export type CloudinaryError = UploadApiErrorResponse;

export default cloudinary;