import { Router } from 'express';
import Joi from 'joi';
import { SEOService } from '../../application/SEOService';
import { PublicationService } from '../../application/PublicationService';
import { buildSuccessResponse, buildErrorResponse } from '../../infrastructure/utils/response.builder';
import { ErrorCode } from '../../domain/enums/error-codes.enum';
import type { Response, Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import type { SEOSection } from '../../application/dtos/seo.dtos';

const router = Router();
const seoService = new SEOService();
const publicationService = new PublicationService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const seoMetadataSchema = Joi.object({
  pageTitle: Joi.string().max(70).required(),
  metaDescription: Joi.string().max(160).required(),
  keywords: Joi.array().items(Joi.string().max(60)).max(20).optional(),
  ogTitle: Joi.string().max(95).allow('', null).optional(),
  ogDescription: Joi.string().max(200).allow('', null).optional(),
  ogImageUrl: Joi.string().uri().allow('', null).optional(),
});

const publishSchema = Joi.object({
  isPublished: Joi.boolean().required(),
});

const featuredProjectsSchema = Joi.object({
  projectIds: Joi.array().items(Joi.string().hex().length(24)).required(),
});

const validSections: SEOSection[] = [
  'HOME', 'ABOUT', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'SERVICES', 'CONTACT',
];

// ─── Admin SEO routes (require auth) ─────────────────────────────────────────

/**
 * @swagger
 * /api/admin/seo/{section}:
 *   get:
 *     summary: Get SEO metadata for a specific page section
 *     tags: [SEO]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [HOME, ABOUT, SKILLS, EXPERIENCE, PROJECTS, SERVICES, CONTACT]
 *     responses:
 *       200:
 *         description: SEO metadata returned
 *       400:
 *         description: Invalid section
 *       404:
 *         description: No SEO metadata found for section
 */
router.get('/admin/seo/:section', async (req: AuthenticatedRequest, res: Response) => {
  const section = (req.params['section'] as string).toUpperCase() as SEOSection;
  if (!validSections.includes(section)) {
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, `Invalid section. Must be one of: ${validSections.join(', ')}`));
    return;
  }
  const metadata = await seoService.getSEOMetadata(req.user!.sub, section);
  if (!metadata) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, `No SEO metadata found for section ${section}`));
    return;
  }
  res.json(buildSuccessResponse({
    section,
    pageTitle: metadata.title ?? '',
    metaDescription: metadata.description ?? '',
    keywords: metadata.keywords ?? [],
    ogTitle: metadata.ogTitle,
    ogDescription: metadata.ogDescription,
    ogImageUrl: metadata.ogImage,
    lastUpdated: metadata.updatedAt.toISOString(),
  }));
});

/**
 * @swagger
 * /api/admin/seo/{section}:
 *   put:
 *     summary: Create or update SEO metadata for a page section
 *     tags: [SEO]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [HOME, ABOUT, SKILLS, EXPERIENCE, PROJECTS, SERVICES, CONTACT]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pageTitle, metaDescription]
 *             properties:
 *               pageTitle:
 *                 type: string
 *                 maxLength: 70
 *               metaDescription:
 *                 type: string
 *                 maxLength: 160
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               ogTitle:
 *                 type: string
 *                 maxLength: 95
 *               ogDescription:
 *                 type: string
 *                 maxLength: 200
 *               ogImageUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: SEO metadata saved
 *       400:
 *         description: Validation error
 */
router.put('/admin/seo/:section', async (req: AuthenticatedRequest, res: Response) => {
  const section = (req.params['section'] as string).toUpperCase() as SEOSection;
  if (!validSections.includes(section)) {
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, `Invalid section. Must be one of: ${validSections.join(', ')}`));
    return;
  }
  const { error, value } = seoMetadataSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const metadata = await seoService.updateSEOMetadata(req.user!.sub, section, value as Parameters<SEOService['updateSEOMetadata']>[2]);
  res.json(buildSuccessResponse({
    section,
    pageTitle: metadata.title ?? '',
    metaDescription: metadata.description ?? '',
    keywords: metadata.keywords ?? [],
    ogTitle: metadata.ogTitle,
    ogDescription: metadata.ogDescription,
    ogImageUrl: metadata.ogImage,
    lastUpdated: metadata.updatedAt.toISOString(),
  }));
});

/**
 * @swagger
 * /api/admin/seo:
 *   get:
 *     summary: Get all SEO metadata for all configured sections
 *     tags: [SEO]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of SEO metadata entries
 */
router.get('/admin/seo', async (req: AuthenticatedRequest, res: Response) => {
  const all = await seoService.getAllSEOMetadata(req.user!.sub);
  res.json(buildSuccessResponse(all.map((m) => ({
    section: m.pageType,
    pageTitle: m.title ?? '',
    metaDescription: m.description ?? '',
    keywords: m.keywords ?? [],
    ogTitle: m.ogTitle,
    ogDescription: m.ogDescription,
    ogImageUrl: m.ogImage,
    lastUpdated: m.updatedAt.toISOString(),
  }))));
});

/**
 * @swagger
 * /api/admin/publication/profile:
 *   put:
 *     summary: Publish or unpublish the admin profile
 *     tags: [Publication]
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
 *         description: Profile publication status updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Profile not found
 */
router.put('/admin/publication/profile', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = publishSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { isPublished } = value as { isPublished: boolean };
  const updated = await publicationService.publishProfile(req.user!.sub, isPublished);
  if (!updated) {
    res.status(404).json(buildErrorResponse(ErrorCode.NOT_FOUND, 'Profile not found'));
    return;
  }
  res.json(buildSuccessResponse({ isPublished: updated.isPublished, updatedAt: updated.updatedAt.toISOString() }));
});

/**
 * @swagger
 * /api/admin/publication/projects/featured:
 *   put:
 *     summary: Set featured projects (replaces existing featured list)
 *     tags: [Publication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectIds]
 *             properties:
 *               projectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Featured projects updated
 *       400:
 *         description: Validation error
 */
router.put('/admin/publication/projects/featured', async (req: AuthenticatedRequest, res: Response) => {
  const { error, value } = featuredProjectsSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const fieldErrors = error.details.map((d) => ({ field: String(d.path.join('.')), message: d.message }));
    res.status(400).json(buildErrorResponse(ErrorCode.INVALID_INPUT, 'Validation failed', fieldErrors));
    return;
  }
  const { projectIds } = value as { projectIds: string[] };
  const count = await publicationService.setFeaturedProjects(req.user!.sub, projectIds);
  res.json(buildSuccessResponse({ featuredCount: count }));
});

// ─── Public SEO routes (no auth) ─────────────────────────────────────────────

/**
 * @swagger
 * /api/public/seo/{section}:
 *   get:
 *     summary: Get public SEO metadata for a page section
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [HOME, ABOUT, SKILLS, EXPERIENCE, PROJECTS, SERVICES, CONTACT]
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SEO metadata for the section
 *       400:
 *         description: Invalid section or missing userId
 *       404:
 *         description: No SEO metadata configured for section
 */
router.get('/public/seo/:section', async (req: Request, res: Response) => {
  const section = (req.params['section'] as string).toUpperCase() as SEOSection;
  const { userId } = req.query as { userId?: string };

  if (!userId) {
    res.status(400).json({ message: 'userId required' });
    return;
  }
  if (!validSections.includes(section)) {
    res.status(400).json({ message: `Invalid section. Must be one of: ${validSections.join(', ')}` });
    return;
  }

  const metadata = await seoService.getSEOMetadata(userId, section);
  if (!metadata) {
    res.status(404).json({ message: `No SEO metadata found for section ${section}` });
    return;
  }
  res.json({
    section,
    pageTitle: metadata.title ?? '',
    metaDescription: metadata.description ?? '',
    keywords: metadata.keywords ?? [],
    ogTitle: metadata.ogTitle,
    ogDescription: metadata.ogDescription,
    ogImageUrl: metadata.ogImage,
    lastUpdated: metadata.updatedAt.toISOString(),
  });
});

/**
 * @swagger
 * /api/public/sitemap.xml:
 *   get:
 *     summary: Generate XML sitemap for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: baseUrl
 *         required: false
 *         schema:
 *           type: string
 *     produces:
 *       - application/xml
 *     responses:
 *       200:
 *         description: XML sitemap
 *       400:
 *         description: userId required
 */
router.get('/public/sitemap.xml', async (req: Request, res: Response) => {
  const { userId, baseUrl = 'https://portfolio.example.com' } = req.query as {
    userId?: string;
    baseUrl?: string;
  };
  if (!userId) {
    res.status(400).json({ message: 'userId required' });
    return;
  }

  const sections = validSections.map((s) => s.toLowerCase());
  const urls = [
    `  <url><loc>${baseUrl}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
    ...sections.map(
      (s) =>
        `  <url><loc>${baseUrl}/${s}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
    ),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.set('Content-Type', 'application/xml').send(xml);
});

/**
 * @swagger
 * /api/public/robots.txt:
 *   get:
 *     summary: Get robots.txt for the portfolio
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: baseUrl
 *         required: false
 *         schema:
 *           type: string
 *     produces:
 *       - text/plain
 *     responses:
 *       200:
 *         description: robots.txt content
 */
router.get('/public/robots.txt', (req: Request, res: Response) => {
  const { baseUrl = 'https://portfolio.example.com' } = req.query as { baseUrl?: string };
  const content = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/api/public/sitemap.xml\n`;
  res.set('Content-Type', 'text/plain').send(content);
});

export default router;
