import { v2 as cloudinary } from 'cloudinary';

/**
 * Initialise Cloudinary from environment variables.
 * Call once during application bootstrap.
 */
export function initCloudinary(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
