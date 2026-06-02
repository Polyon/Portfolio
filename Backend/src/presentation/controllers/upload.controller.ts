import { Router } from 'express';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createUploader, type UploadFolder } from '../../infrastructure/middleware/upload.middleware';
import { buildSuccessResponse, buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import { cloudinary } from '../../infrastructure/cloudinary/cloudinary.config';

const router = Router();

const VALID_FOLDERS: UploadFolder[] = ['profile', 'projects', 'skills', 'services', 'general'];

function isValidFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && VALID_FOLDERS.includes(value as UploadFolder);
}

// ─── POST /api/admin/upload ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/upload:
 *   post:
 *     summary: Upload a single image to Cloudinary
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           enum: [profile, projects, skills, services, general]
 *         description: Destination folder in Cloudinary (defaults to "general")
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Validation error (unsupported type, too large, missing file)
 *       500:
 *         description: Upload failed
 */
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const folder = isValidFolder(req.query.folder) ? req.query.folder : 'general';
  const uploader = createUploader(folder);

  uploader.single('file')(req as any, res as any, (err) => {
    if (err) {
      const message =
        err.message?.includes('File too large')
          ? 'File exceeds the 5 MB size limit'
          : err.message ?? 'File upload failed';
      res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, message));
      return;
    }

    if (!req.file) {
      res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'No file was provided'));
      return;
    }

    const file = req.file as Express.Multer.File & {
      path: string;
      filename: string;
      fieldname: string;
    };

    res.json(
      buildSuccessResponse({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        folder,
      }),
    );
  });
});

// ─── DELETE /api/admin/upload ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/upload:
 *   delete:
 *     summary: Delete an image from Cloudinary by public ID
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicId]
 *             properties:
 *               publicId:
 *                 type: string
 *                 description: Cloudinary public_id of the asset to remove
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: publicId missing
 *       500:
 *         description: Deletion failed
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  const { publicId } = req.body as { publicId?: string };

  if (!publicId || typeof publicId !== 'string' || publicId.trim() === '') {
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'publicId is required'));
    return;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId.trim());
    if (result.result !== 'ok' && result.result !== 'not found') {
      res.status(500).json(buildErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete file from Cloudinary'));
      return;
    }
    res.json(buildSuccessResponse({ deleted: publicId.trim(), result: result.result }));
  } catch {
    res.status(500).json(buildErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete file from Cloudinary'));
  }
});

export default router;
