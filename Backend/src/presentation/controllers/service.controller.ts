import { Router } from 'express';
import { ServiceService, ListServicesDTO } from '../../application/ServiceService';
import { ServiceCategory } from '../../infrastructure/database/models/Service';
import { authenticate } from '../middleware/auth.middleware';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const svcService = new ServiceService();

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: List all services for the authenticated user
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of service documents
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, search, category, isPublished, sort, order } = req.query as Record<string, string>;
  const filters: ListServicesDTO = {
    page:        page        ? parseInt(page, 10)        : undefined,
    limit:       limit       ? parseInt(limit, 10)       : undefined,
    search:      search      || undefined,
    category:    category    ? (category as ServiceCategory) : undefined,
    isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
    sort:        sort        || undefined,
    order:       (order === 'desc' ? 'desc' : order === 'asc' ? 'asc' : undefined),
  };
  const result = await svcService.list(req.user!.sub, filters);
  const data = result.data.map((s) => ({ ...s.toObject(), id: String(s._id) }));
  res.json({ data, pagination: result.pagination });
});

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service offering
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, category]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [Development, Design, Consulting, Training, Other]
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Created service document
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const svc = await svcService.create(req.user!.sub, req.body as Parameters<typeof svcService.create>[1]);
  const data = { ...svc.toObject(), id: String(svc._id) };
  res.status(201).json({ success: true, data });
});

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update an existing service offering
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated service document
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const updated = await svcService.update(req.user!.sub, String(req.params['id']), req.body as object);
  if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
  const data = { ...updated.toObject(), id: String(updated._id) };
  res.json({ success: true, data });
});

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Soft-delete a service offering
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the service
 *     responses:
 *       204:
 *         description: Service deleted successfully
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await svcService.delete(req.user!.sub, String(req.params['id']));
  res.status(204).send();
});

/**
 * @swagger
 * /api/services/reorder:
 *   patch:
 *     summary: Bulk-update display order for services
 *     tags: [Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Display order updated
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.patch('/reorder', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { orderedIds } = req.body as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ message: 'orderedIds must be an array' });
    return;
  }
  await svcService.updateDisplayOrder(req.user!.sub, orderedIds);
  res.json({ success: true });
});

export default router;
