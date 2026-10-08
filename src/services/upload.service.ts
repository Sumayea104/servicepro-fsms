import { cloudinary } from '../config/cloudinary.js';
import { AppError } from '../errors/AppError.js';

/** Streams a multer memory buffer straight to Cloudinary — nothing touches local disk. */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string; bytes: number; format: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `servicepro/${folder}` }, (err, result) => {
      if (err || !result) return reject(AppError.badRequest(`Upload failed: ${err?.message || 'unknown error'}`));
      resolve({ url: result.secure_url, bytes: result.bytes, format: result.format });
    });
    stream.end(buffer);
  });
}
