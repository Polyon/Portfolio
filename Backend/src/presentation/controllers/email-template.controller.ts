/**
 * EmailTemplateController — admin endpoints for listing and previewing email templates.
 *
 * Routes (mounted at /api/admin/email-templates in app.ts):
 *  - GET  /                     → list all 6 template descriptors
 *  - POST /:templateName/preview → preview a template with supplied (or fallback) variables
 *
 * @module presentation/controllers/email-template.controller
 */

import { Router } from 'express';
import { EmailTemplateService } from '../../infrastructure/email/EmailTemplateService';
import { EmailTemplate, TemplateVariables } from '../../infrastructure/email/types';
import { QueryType } from '../../domain/enums/query-type.enum';
import { buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { Request, Response } from 'express';

const router = Router();
const emailTemplateService = new EmailTemplateService();

// ─── Template Descriptors ─────────────────────────────────────────────────────

/**
 * Static metadata for each of the six outbound email templates.
 * Used by the admin UI to display template names and descriptions.
 */
const TEMPLATE_DESCRIPTORS = [
  {
    name:          EmailTemplate.SERVICE_INQUIRY_SENDER,
    queryType:     QueryType.SERVICE,
    recipientRole: 'SENDER' as const,
    description:   'Confirmation email sent to the visitor after submitting a service inquiry.',
  },
  {
    name:          EmailTemplate.SERVICE_INQUIRY_RECEIVER,
    queryType:     QueryType.SERVICE,
    recipientRole: 'RECEIVER' as const,
    description:   'Notification email sent to the portfolio owner when a new service inquiry arrives.',
  },
  {
    name:          EmailTemplate.SERVICE_INQUIRY_REPLY,
    queryType:     QueryType.SERVICE,
    recipientRole: 'REPLY' as const,
    description:   'Reply email sent to the visitor when the admin responds to a service inquiry.',
  },
  {
    name:          EmailTemplate.GENERAL_INQUIRY_SENDER,
    queryType:     QueryType.GENERAL,
    recipientRole: 'SENDER' as const,
    description:   'Confirmation email sent to the visitor after submitting a general inquiry.',
  },
  {
    name:          EmailTemplate.GENERAL_INQUIRY_RECEIVER,
    queryType:     QueryType.GENERAL,
    recipientRole: 'RECEIVER' as const,
    description:   'Notification email sent to the portfolio owner when a new general inquiry arrives.',
  },
  {
    name:          EmailTemplate.GENERAL_INQUIRY_REPLY,
    queryType:     QueryType.GENERAL,
    recipientRole: 'REPLY' as const,
    description:   'Reply email sent to the visitor when the admin responds to a general inquiry.',
  },
];

/** All valid EmailTemplate enum values as a Set for O(1) lookup. */
const VALID_TEMPLATE_NAMES = new Set<string>(Object.values(EmailTemplate));

/** Sensible preview fallback values applied when caller omits variables. */
const PREVIEW_FALLBACKS: Required<TemplateVariables> = {
  visitorName:    'there',
  visitorEmail:   'visitor@example.com',
  subject:        'Your enquiry',
  messageBody:    'This is a preview of your contact form message.',
  messageSummary: 'This is a preview of your contact form message.',
  queryTypeLabel: 'General Inquiry',
  replyBody:      'Thank you for reaching out. I will get back to you shortly.',
  ownerName:      'Portfolio Owner',
  portfolioUrl:   'https://your-portfolio.dev',
  adminPortalUrl: 'https://admin.your-portfolio.dev',
  submittedAt:    new Date().toUTCString(),
  replySlaHours:  48,
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/email-templates:
 *   get:
 *     summary: List all six email template descriptors
 *     tags: [Admin - Email Templates]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of template descriptor objects
 *       401:
 *         description: Unauthorized
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: TEMPLATE_DESCRIPTORS });
});

/**
 * @swagger
 * /api/admin/email-templates/{templateName}/preview:
 *   post:
 *     summary: Preview a rendered email template with supplied (or fallback) variables
 *     tags: [Admin - Email Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [SERVICE_INQUIRY_SENDER, SERVICE_INQUIRY_RECEIVER, SERVICE_INQUIRY_REPLY,
 *                  GENERAL_INQUIRY_SENDER, GENERAL_INQUIRY_RECEIVER, GENERAL_INQUIRY_REPLY]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               variables:
 *                 type: object
 *                 description: "Optional template variable overrides; missing fields use fallback values."
 *     responses:
 *       200:
 *         description: Rendered { html, text } output
 *       400:
 *         description: Unknown template name
 *       401:
 *         description: Unauthorized
 */
router.post('/:templateName/preview', async (req: Request, res: Response) => {
  const templateName = String(req.params['templateName'] ?? '');

  if (!VALID_TEMPLATE_NAMES.has(templateName)) {
    res.status(400).json(
      buildErrorResponse(
        ErrorCode.INVALID_INPUT,
        `Unknown template name: "${templateName}". Valid values: ${[...VALID_TEMPLATE_NAMES].join(', ')}`,
      ),
    );
    return;
  }

  const suppliedVars = (req.body as { variables?: Partial<TemplateVariables> }).variables ?? {};
  const variables: TemplateVariables = { ...PREVIEW_FALLBACKS, ...suppliedVars };

  const { html, text } = await emailTemplateService.renderTemplate(
    templateName as EmailTemplate,
    variables,
  );

  res.json({ success: true, data: { html, text } });
});

export default router;
