import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
// @ts-ignore
import CloudinaryStorageModule from 'multer-storage-cloudinary';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CloudinaryStorage: any = CloudinaryStorageModule.CloudinaryStorage ?? CloudinaryStorageModule;

/**
 * Allowed MIME types for image uploads.
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Maximum file size: 5 MB.
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Valid upload folder keys that map to Cloudinary sub-folders.
 */
export type UploadFolder = 'profile' | 'projects' | 'skills' | 'services' | 'general';

const FOLDER_MAP: Record<UploadFolder, string> = {
  profile: 'portfolio/profile',
  projects: 'portfolio/projects',
  skills: 'portfolio/skills',
  services: 'portfolio/services',
  general: 'portfolio/general',
};

/**
 * Build a multer instance that streams uploads directly to Cloudinary.
 *
 * @param folder - Destination sub-folder within Cloudinary.
 */
export function createUploader(folder: UploadFolder = 'general') {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: FOLDER_MAP[folder],
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    } as object,
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp, gif`));
      }
    },
  });
}
