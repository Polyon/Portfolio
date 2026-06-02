import { Router } from 'express';
import Joi from 'joi';
import { ProjectService } from '../../application/ProjectService';
import { ProjectStatus } from '../../infrastructure/database/models/Project';
import { ProjectSkill } from '../../infrastructure/database/models/ProjectSkill';
import { buildSuccessResponse, buildListResponse, buildErrorResponse, buildPaginationMetadata } from '../../infrastructure/utils/response.builder';
import { getPaginationParams, calculateSkip } from '../../infrastructure/utils/pagination';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const projectService = new ProjectService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(10000).allow('').optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid(...Object.values(ProjectStatus)).optional(),
  startDate: Joi.date().iso().optional(),
  completionDate: Joi.date().iso().optional(),
  liveUrl: Joi.string().uri().allow('').optional(),
  repositoryUrl: Joi.string().uri().allow('').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isFeatured: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
  skillIds: Joi.array().items(Joi.string()).optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(10000).allow('').optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid(...Object.values(ProjectStatus)).optional(),
  startDate: Joi.date().iso().optional(),
  completionDate: Joi.date().iso().optional(),
  liveUrl: Joi.string().uri().allow('').optional(),
  repositoryUrl: Joi.string().uri().allow('').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isFeatured: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
  skillIds: Joi.array().items(Joi.string()).optional(),
});

const setSkillsSchema = Joi.object({
  skillIds: Joi.array().items(Joi.string()).required(),
});

const setFeaturedSchema = Joi.object({
  isFeatured: Joi.boolean().required(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/projects:
 *   get:
 *     summary: List projects with optional status filter and pagination
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by project status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured flag
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
 *         description: Projects list with pagination
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { status, featured } = req.query as { status?: string; featured?: string };
  const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
  const skip = calculateSkip(page, limit);

  let projects;
  if (featured === 'true') {
    projects = await projectService.listFeatured(req.user!.sub);
  } else if (status) {
    projects = await projectService.listByStatus(req.user!.sub, status as ProjectStatus);
  } else {
    projects = await projectService.list(req.user!.sub);
  }

  const total = projects.length;
  const paginated = projects.slice(skip, skip + limit);

  // Populate skills for each project
  const projIds = paginated.map((p) => p._id.toString());
  const skillLinks = await ProjectSkill.find({ projectId: { $in: projIds } }).populate('skillId');
  const skillMap = new Map<string, object[]>();
  for (const link of skillLinks) {
    const key = link.projectId.toString();
    if (!skillMap.has(key)) skillMap.set(key, []);
    skillMap.get(key)!.push(link.skillId);
  }

  const data = paginated.map((p) => {
    const obj = p.toJSON() as Record<string, unknown>;
    obj['skills'] = (skillMap.get(p._id.toString()) ?? []).map((s) =>
      typeof (s as { toJSON?: () => unknown }).toJSON === 'function'
        ? (s as { toJSON: () => unknown }).toJSON()
        : s
    );
    return obj;
  });
  res.json(buildListResponse(data, buildPaginationMetadata(total, page, limit)));
});

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   get:
 *     summary: Get a single project by ID
 *     tags: [Projects]
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
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const project = await projectService.findById(req.user!.sub, String(req.params['id']));
  if (!project) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Project not found'));
    return;
  }
  const skillLinks = await ProjectSkill.find({ projectId: String(req.params['id']) }).populate('skillId');
  const obj = project.toJSON() as Record<string, unknown>;
  obj['skills'] = skillLinks.map((l) =>
    typeof (l.skillId as { toJSON?: () => unknown }).toJSON === 'function'
      ? (l.skillId as { toJSON: () => unknown }).toJSON()
      : l.skillId
  );
  res.json(buildSuccessResponse(obj));
});

/**
 * @swagger
 * /api/admin/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *     responses:
 *       201:
 *         description: Project created
 *       400:
 *         description: Validation error
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = createProjectSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { skillIds, ...projectData } = value as { skillIds?: string[] } & Parameters<typeof projectService.create>[1];
  const project = await projectService.create(req.user!.sub, projectData);
  if (skillIds && skillIds.length > 0) {
    await projectService.setSkills(req.user!.sub, project._id.toString(), skillIds);
  }
  const obj = project.toJSON() as Record<string, unknown>;
  obj['id'] = project._id.toString();
  res.status(201).json(buildSuccessResponse(obj));
});

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
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
 *         description: Project updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = updateProjectSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { skillIds, ...projectData } = value as { skillIds?: string[] } & object;
  const projectId = String(req.params['id']);
  const updated = await projectService.update(req.user!.sub, projectId, projectData);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Project not found'));
    return;
  }
  if (skillIds !== undefined) {
    await projectService.setSkills(req.user!.sub, projectId, skillIds);
  }
  const obj = updated.toJSON() as Record<string, unknown>;
  obj['id'] = updated._id.toString();
  res.json(buildSuccessResponse(obj));
});

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   delete:
 *     summary: Soft-delete a project
 *     tags: [Projects]
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
 *         description: Project deleted
 *       404:
 *         description: Project not found
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const project = await projectService.findById(req.user!.sub, String(req.params['id']));
  if (!project) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Project not found'));
    return;
  }
  await projectService.delete(req.user!.sub, String(req.params['id']));
  res.status(204).send();
});

/**
 * @swagger
 * /api/admin/projects/{id}/skills:
 *   post:
 *     summary: Set skills associated with a project
 *     tags: [Projects]
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
 *         description: Project not found
 */
router.post('/:id/skills', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = setSkillsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  try {
    await projectService.setSkills(req.user!.sub, String(req.params['id']), (value as { skillIds: string[] }).skillIds);
    res.json(buildSuccessResponse({ message: 'Skills updated' }));
  } catch {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Project not found'));
  }
});

/**
 * @swagger
 * /api/admin/projects/{id}/featured:
 *   put:
 *     summary: Toggle featured status of a project
 *     tags: [Projects]
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
 *             required: [isFeatured]
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Featured status updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.put('/:id/featured', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = setFeaturedSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { isFeatured } = value as { isFeatured: boolean };
  const updated = await projectService.setFeatured(req.user!.sub, String(req.params['id']), isFeatured);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Project not found'));
    return;
  }
  res.json(buildSuccessResponse(updated));
});

export default router;
