import { Router } from 'express';
import { ContactService } from '../../application/ContactService';
import { ContactMessageAdminService } from '../../application/ContactMessageAdminService';
import { authenticate } from '../middleware/auth.middleware';
import { buildSuccessResponse, buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import { QueryType } from '../../domain/enums/query-type.enum';
import { NotFoundError } from '../../domain/errors/AppError';
import type { Response, Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const contactService = new ContactService();
const adminMessageService = new ContactMessageAdminService();

/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: Get contact information for the authenticated user
 *     tags: [Contact]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Contact information document
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const contact = await contactService.getByUserId(req.user!.sub);
  if (!contact) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Contact not found'));
    return;
  }
  res.json(buildSuccessResponse(contact));
});

/**
 * @swagger
 * /api/contact:
 *   put:
 *     summary: Update contact information for the authenticated user
 *     tags: [Contact]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               emailPublic:
 *                 type: boolean
 *               phone:
 *                 type: string
 *               phonePublic:
 *                 type: boolean
 *               linkedinUrl:
 *                 type: string
 *                 format: uri
 *               linkedinPublic:
 *                 type: boolean
 *               githubUrl:
 *                 type: string
 *                 format: uri
 *               githubPublic:
 *                 type: boolean
 *               twitterUrl:
 *                 type: string
 *                 format: uri
 *               twitterPublic:
 *                 type: boolean
 *               websiteUrl:
 *                 type: string
 *                 format: uri
 *               websitePublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated contact document
 *       401:
 *         description: Unauthorized
 * @auth Bearer - Requires valid JWT token with ADMIN role
 */
router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const updated = await contactService.upsert(req.user!.sub, req.body as object, req.user!.sub);
  res.json(buildSuccessResponse(updated));
});

// ─── Admin contact message inbox (/messages sub-router) ───────────────────────
// NOTE: /messages/stats is registered before /messages/:id to prevent Express
//       from matching the literal "stats" as an :id parameter.

/**
 * @swagger
 * /api/admin/contact/messages:
 *   get:
 *     summary: List contact messages with optional filters and pagination
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: queryType
 *         schema: { type: string, enum: [SERVICE, GENERAL] }
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of contact message summaries
 *       401:
 *         description: Unauthorized
 */
router.get('/messages', async (req: Request, res: Response) => {
  const page      = parseInt(String(req.query['page']  ?? '1'),  10);
  const limit     = parseInt(String(req.query['limit'] ?? '20'), 10);
  const rawIsRead = req.query['isRead'];

  let isRead: boolean | undefined;
  if (rawIsRead === 'true')  { isRead = true; }
  if (rawIsRead === 'false') { isRead = false; }

  const rawQueryType = req.query['queryType'];
  const queryType = Object.values(QueryType).includes(rawQueryType as QueryType)
    ? (rawQueryType as QueryType)
    : undefined;

  const result = await adminMessageService.list({
    page:  isNaN(page)  ? 1  : page,
    limit: isNaN(limit) ? 20 : limit,
    queryType,
    isRead,
  });

  res.json({ success: true, data: result.data, pagination: result.pagination });
});

/**
 * @swagger
 * /api/admin/contact/messages/stats:
 *   get:
 *     summary: Get aggregate counts for contact messages
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate stats object
 *       401:
 *         description: Unauthorized
 */
router.get('/messages/stats', async (_req: Request, res: Response) => {
  const stats = await adminMessageService.stats();
  res.json({ success: true, data: stats });
});

/**
 * @swagger
 * /api/admin/contact/messages/{id}:
 *   get:
 *     summary: Get full detail of a contact message including replies
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full contact message detail
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.get('/messages/:id', async (req: Request, res: Response) => {
  const doc = await adminMessageService.getById(req.params['id'] as string);
  if (!doc) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Contact message not found'));
    return;
  }
  const obj = doc.toObject() as unknown as Record<string, unknown>;
  res.json({ success: true, data: { ...obj, id: String(obj['_id']) } });
});

/**
 * @swagger
 * /api/admin/contact/messages/{id}/read:
 *   patch:
 *     summary: Update the isRead flag on a contact message
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isRead]
 *             properties:
 *               isRead: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated contact message
 *       400:
 *         description: isRead must be a boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.patch('/messages/:id/read', async (req: Request, res: Response) => {
  const { isRead } = req.body as { isRead?: unknown };
  if (typeof isRead !== 'boolean') {
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'isRead must be a boolean'));
    return;
  }
  const updated = await adminMessageService.markRead(req.params['id'] as string, isRead);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Contact message not found'));
    return;
  }
  const obj = updated.toObject() as unknown as Record<string, unknown>;
  res.json({ success: true, data: { ...obj, id: String(obj['_id']) } });
});

/**
 * @swagger
 * /api/admin/contact/messages/{id}:
 *   delete:
 *     summary: Delete a contact message permanently
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.delete('/messages/:id', async (req: Request, res: Response) => {
  const deleted = await adminMessageService.delete(req.params['id'] as string);
  if (!deleted) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Contact message not found'));
    return;
  }
  res.json({ success: true, data: null });
});

/**
 * @swagger
 * /api/admin/contact/messages/{id}/reply:
 *   post:
 *     summary: Send a reply email to the original visitor and persist it
 *     description: >
 *       Atomically sends the reply email and persists it to the message's replies array.
 *       If the email send fails after all retries, the reply is NOT persisted and a 502 is returned.
 *     tags: [Admin - Contact Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               subject: { type: string, description: "Optional subject override; defaults to Re: {original subject}" }
 *               body:    { type: string, description: "Reply body text (required, non-empty)" }
 *     responses:
 *       200:
 *         description: Reply sent and persisted successfully
 *       400:
 *         description: body is missing or empty
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact message not found
 *       502:
 *         description: Email send failed — reply NOT persisted
 */
router.post('/messages/:id/reply', async (req: Request, res: Response) => {
  const { body: replyBody, subject } = req.body as { body?: unknown; subject?: unknown };

  if (!replyBody || typeof replyBody !== 'string' || replyBody.trim().length === 0) {
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'body is required and must be non-empty'));
    return;
  }

  const adminId = (req as AuthenticatedRequest).user?.sub ?? 'unknown';

  try {
    const reply = await adminMessageService.sendReply(
      req.params['id'] as string,
      {
        body:    replyBody,
        subject: typeof subject === 'string' && subject.trim().length > 0 ? subject : undefined,
      },
      adminId,
    );
    res.json({ success: true, message: 'Reply sent successfully', data: reply });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, (err as NotFoundError).message));
      return;
    }
    // SMTP failure or unexpected error → 502
    res.status(502).json({ success: false, message: 'Failed to send reply email. Please try again.' });
  }
});

export default router;
