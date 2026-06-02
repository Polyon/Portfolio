import { Router } from 'express';
import Joi from 'joi';
import { SkillService } from '../../application/SkillService';
import { SkillCategory } from '../../infrastructure/database/models/Skill';
import { buildSuccessResponse, buildListResponse, buildErrorResponse, buildPaginationMetadata } from '../../infrastructure/utils/response.builder';
import { getPaginationParams, calculateSkip } from '../../infrastructure/utils/pagination';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const skillService = new SkillService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createSkillSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category: Joi.string().valid(...Object.values(SkillCategory)).required(),
  proficiencyLevel: Joi.number().integer().min(1).max(5).required(),
  endorsementCount: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

const updateSkillSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  category: Joi.string().valid(...Object.values(SkillCategory)).optional(),
  proficiencyLevel: Joi.number().integer().min(1).max(5).optional(),
  endorsementCount: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/skills:
 *   get:
 *     summary: List skills with optional filtering and pagination
 *     tags: [Skills]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by skill category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search skills by name
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
 *         description: Skills list with pagination metadata
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { category, search, proficiency } = req.query as { category?: string; search?: string; proficiency?: string };
  const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
  const skip = calculateSkip(page, limit);
  const proficiencyLevel = proficiency ? parseInt(proficiency, 10) : undefined;

  let skills;
  if (search) {
    skills = await skillService.searchSkills(req.user!.sub, search, category);
  } else if (category) {
    skills = await skillService.listByCategory(req.user!.sub, category);
  } else {
    skills = await skillService.list(req.user!.sub);
  }

  // Apply proficiency filter after fetching (in-memory, since volume is small)
  if (proficiencyLevel && !isNaN(proficiencyLevel)) {
    skills = skills.filter((s) => s.proficiencyLevel === proficiencyLevel);
  }

  const total = skills.length;
  const paginated = skills.slice(skip, skip + limit);
  res.json(buildListResponse(paginated, buildPaginationMetadata(total, page, limit)));
});

/**
 * @swagger
 * /api/admin/skills/{id}:
 *   get:
 *     summary: Get a single skill by ID
 *     tags: [Skills]
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
 *         description: Skill retrieved successfully
 *       404:
 *         description: Skill not found
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const skill = await skillService.findById(req.user!.sub, String(req.params['id']));
  if (!skill) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Skill not found'));
    return;
  }
  res.json(buildSuccessResponse(skill));
});

/**
 * @swagger
 * /api/admin/skills:
 *   post:
 *     summary: Create a new skill
 *     tags: [Skills]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, proficiencyLevel]
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               proficiencyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Skill created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = createSkillSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const skill = await skillService.create(req.user!.sub, value as Parameters<typeof skillService.create>[1]);
  res.status(201).json(buildSuccessResponse(skill));
});

/**
 * @swagger
 * /api/admin/skills/{id}:
 *   put:
 *     summary: Update a skill
 *     tags: [Skills]
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
 *         description: Skill updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Skill not found
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = updateSkillSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const updated = await skillService.update(req.user!.sub, String(req.params['id']), value as object);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Skill not found'));
    return;
  }
  res.json(buildSuccessResponse(updated));
});

/**
 * @swagger
 * /api/admin/skills/{id}:
 *   delete:
 *     summary: Soft-delete a skill
 *     tags: [Skills]
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
 *         description: Skill deleted
 *       404:
 *         description: Skill not found
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const skill = await skillService.findById(req.user!.sub, String(req.params['id']));
  if (!skill) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Skill not found'));
    return;
  }
  await skillService.delete(req.user!.sub, String(req.params['id']));
  res.status(204).send();
});

export default router;
