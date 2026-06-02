import { Router } from 'express';
import Joi from 'joi';
import { ExperienceService } from '../../application/ExperienceService';
import { EmploymentType } from '../../infrastructure/database/models/Experience';
import { ExperienceSkill } from '../../infrastructure/database/models/ExperienceSkill';
import { buildSuccessResponse, buildListResponse, buildErrorResponse, buildPaginationMetadata } from '../../infrastructure/utils/response.builder';
import { getPaginationParams, calculateSkip } from '../../infrastructure/utils/pagination';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const expService = new ExperienceService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createExpSchema = Joi.object({
  company: Joi.string().min(1).max(200).required(),
  jobTitle: Joi.string().min(1).max(200).required(),
  employmentType: Joi.string().valid(...Object.values(EmploymentType)).required(),
  location: Joi.string().max(200).allow('').optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().optional(),
  isCurrentPosition: Joi.boolean().optional(),
  description: Joi.string().max(5000).allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

const updateExpSchema = Joi.object({
  company: Joi.string().min(1).max(200).optional(),
  jobTitle: Joi.string().min(1).max(200).optional(),
  employmentType: Joi.string().valid(...Object.values(EmploymentType)).optional(),
  location: Joi.string().max(200).allow('').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  isCurrentPosition: Joi.boolean().optional(),
  description: Joi.string().max(5000).allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

const setSkillsSchema = Joi.object({
  skillIds: Joi.array().items(Joi.string()).required(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/experiences:
 *   get:
 *     summary: List experiences sorted by start date (descending)
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Experiences list with pagination
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
  const skip = calculateSkip(page, limit);
  const { search, employmentType } = req.query as { search?: string; employmentType?: string };

  let experiences = await expService.list(req.user!.sub);

  if (search) {
    const term = search.toLowerCase();
    experiences = experiences.filter(
      (e) =>
        e.company.toLowerCase().includes(term) ||
        e.jobTitle.toLowerCase().includes(term),
    );
  }

  if (employmentType) {
    experiences = experiences.filter((e) => e.employmentType === employmentType);
  }

  const total = experiences.length;
  const paginated = experiences.slice(skip, skip + limit);

  // Attach populated skills to each paginated experience
  const expIds = paginated.map((e) => e._id);
  const skillLinks = await ExperienceSkill.find({ experienceId: { $in: expIds } }).populate('skillId');
  const skillMap = new Map<string, object[]>();
  for (const link of skillLinks) {
    const key = link.experienceId.toString();
    if (!skillMap.has(key)) skillMap.set(key, []);
    skillMap.get(key)!.push(link.skillId);
  }

  const data = paginated.map((e) => {
    const expJson = e.toJSON() as Record<string, unknown>;
    expJson['skills'] = (skillMap.get(e._id.toString()) ?? []).map((s) =>
      typeof (s as { toJSON?: () => unknown }).toJSON === 'function'
        ? (s as { toJSON: () => unknown }).toJSON()
        : s
    );
    return expJson;
  });
  res.json(buildListResponse(data, buildPaginationMetadata(total, page, limit)));
});

/**
 * @swagger
 * /api/admin/experiences/{id}:
 *   get:
 *     summary: Get a single experience by ID
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experience retrieved successfully
 *       404:
 *         description: Experience not found
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const exp = await expService.findById(req.user!.sub, String(req.params['id']));
  if (!exp) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Experience not found'));
    return;
  }
  const skillIds = await expService.getSkills(String(req.params['id']));
  res.json(buildSuccessResponse({ ...exp.toObject(), skillIds }));
});

/**
 * @swagger
 * /api/admin/experiences:
 *   post:
 *     summary: Create a new experience entry
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company, jobTitle, employmentType, startDate]
 *     responses:
 *       201:
 *         description: Experience created
 *       400:
 *         description: Validation error
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = createExpSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const exp = await expService.create(req.user!.sub, value as Parameters<typeof expService.create>[1]);
  res.status(201).json(buildSuccessResponse(exp));
});

/**
 * @swagger
 * /api/admin/experiences/{id}:
 *   put:
 *     summary: Update an experience entry
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experience updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Experience not found
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = updateExpSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const updated = await expService.update(req.user!.sub, String(req.params['id']), value as object);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Experience not found'));
    return;
  }
  res.json(buildSuccessResponse(updated));
});

/**
 * @swagger
 * /api/admin/experiences/{id}:
 *   delete:
 *     summary: Soft-delete an experience entry
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Experience deleted
 *       404:
 *         description: Experience not found
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const exp = await expService.findById(req.user!.sub, String(req.params['id']));
  if (!exp) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Experience not found'));
    return;
  }
  await expService.delete(req.user!.sub, String(req.params['id']));
  res.status(204).send();
});

/**
 * @swagger
 * /api/admin/experiences/{id}/skills:
 *   post:
 *     summary: Set skills associated with an experience
 *     tags: [Experience]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skillIds]
 *             properties:
 *               skillIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Skills updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Experience not found
 */
router.post('/:id/skills', async (req: AuthenticatedRequest, res: Response) => {
  // Strip any null/undefined items sent by clients before validation
  if (Array.isArray(req.body.skillIds)) {
    req.body.skillIds = req.body.skillIds.filter((id: unknown) => id != null && id !== '');
  }
  const { error, value } = setSkillsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  try {
    await expService.setSkills(req.user!.sub, String(req.params['id']), (value as { skillIds: string[] }).skillIds);
    res.json(buildSuccessResponse({ message: 'Skills updated' }));
  } catch {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Experience not found'));
  }
});

export default router;
