import { Router } from 'express';
import Joi from 'joi';
import { ProfileService } from '../../application/ProfileService';
import { buildSuccessResponse, buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import { createUploader } from '../../infrastructure/middleware/upload.middleware';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const profileService = new ProfileService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  tagline: Joi.string().max(200).allow('').optional(),
  bio: Joi.string().max(5000).allow('').optional(),
  location: Joi.object({
    city: Joi.string().max(100).allow('').optional(),
    state: Joi.string().max(100).allow('').optional(),
    country: Joi.string().max(100).allow('').optional(),
  }).optional(),
  profileImageUrl: Joi.string().uri().allow('').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().max(30).allow('').optional(),
  linkedinUrl: Joi.string().uri().allow('').optional(),
  githubUrl: Joi.string().uri().allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

const publishSchema = Joi.object({
  isPublished: Joi.boolean().required(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const profile = await profileService.getByUserId(req.user!.sub);
  if (!profile) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Profile not found'));
    return;
  }
  res.json(buildSuccessResponse(profile));
});

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     summary: Update admin profile
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Profile not found
 */
router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const updated = await profileService.update(req.user!.sub, value as object, req.user!.sub);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Profile not found'));
    return;
  }
  res.json(buildSuccessResponse(updated));
});

/**
 * @swagger
 * /api/admin/profile/publish:
 *   put:
 *     summary: Toggle profile publication status
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isPublished]
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Publication status updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Profile not found
 */
router.put('/publish', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = publishSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { isPublished } = value as { isPublished: boolean };
  const updated = await profileService.update(req.user!.sub, { isPublished }, req.user!.sub);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Profile not found'));
    return;
  }
  res.json(buildSuccessResponse(updated));
});

/**
 * @swagger
 * /api/admin/profile/image:
 *   post:
 *     summary: Upload a profile image
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
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
 *         description: Image uploaded and profile updated
 *       400:
 *         description: No file provided or unsupported type
 *       404:
 *         description: Profile not found
 */
const profileUploader = createUploader('profile');

router.post('/image', (req: AuthenticatedRequest, res: Response) => {
  profileUploader.single('image')(req as any, res as any, async (err) => {
    if (err) {
      const message = err.message?.includes('File too large')
        ? 'File exceeds the 5 MB size limit'
        : err.message ?? 'File upload failed';
      res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, message));
      return;
    }

    if (!req.file) {
      res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'No file was provided'));
      return;
    }

    const file = req.file as Express.Multer.File & { path: string; filename: string };

    const updated = await profileService.update(
      req.user!.sub,
      { profileImageUrl: file.path },
      req.user!.sub,
    );

    if (!updated) {
      res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Profile not found'));
      return;
    }

    res.json(
      buildSuccessResponse({
        profileImageUrl: file.path,
        publicId: file.filename,
        profile: updated,
      }),
    );
  });
});

export default router;
