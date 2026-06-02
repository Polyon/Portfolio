import { Router } from 'express';
import { PublicPortfolioService } from '../../application/PublicPortfolioService';
import { ContactMessageService } from '../../application/ContactMessageService';
import { QueryType } from '../../domain/enums/query-type.enum';
import type { Request, Response } from 'express';

const router = Router();
const publicService = new PublicPortfolioService();
const contactMessageService = new ContactMessageService();

/**
 * @swagger
 * /api/public/profile:
 *   get:
 *     summary: Get published profile for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Portfolio owner's user ID
 *     responses:
 *       200:
 *         description: Published profile returned
 *       400:
 *         description: userId query parameter is required
 *       404:
 *         description: No published profile found for userId
 */
router.get('/profile', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  const profile = await publicService.getPublicProfile(userId);
  if (!profile) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: profile });
});

/**
 * @swagger
 * /api/public/skills:
 *   get:
 *     summary: Get published skills for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by skill category
 *     responses:
 *       200:
 *         description: Array of published skills
 *       400:
 *         description: userId query parameter is required
 */
router.get('/skills', async (req: Request, res: Response) => {
  const { userId, category } = req.query as { userId?: string; category?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  res.json({ success: true, data: await publicService.getPublicSkills(userId, category) });
});

/**
 * @swagger
 * /api/public/experiences:
 *   get:
 *     summary: Get published work experience for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of published experience entries sorted by startDate descending
 *       400:
 *         description: userId query parameter is required
 */
router.get('/experiences', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  res.json({ success: true, data: await publicService.getPublicExperience(userId) });
});

/**
 * @swagger
 * /api/public/projects:
 *   get:
 *     summary: Get published projects for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: featured
 *         required: false
 *         schema:
 *           type: boolean
 *         description: When true, return only featured projects
 *     responses:
 *       200:
 *         description: Array of published projects (featured first)
 *       400:
 *         description: userId query parameter is required
 */
router.get('/projects', async (req: Request, res: Response) => {
  const { userId, featured } = req.query as { userId?: string; featured?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  res.json({ success: true, data: await publicService.getPublicProjects(userId, featured === 'true') });
});

/**
 * @swagger
 * /api/public/services:
 *   get:
 *     summary: Get published services for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of published services sorted by displayOrder
 *       400:
 *         description: userId query parameter is required
 */
router.get('/services', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  res.json({ success: true, data: await publicService.getPublicServices(userId) });
});

/**
 * @swagger
 * /api/public/contact:
 *   get:
 *     summary: Get publicly-visible contact information for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact fields where visibility flag is true
 *       400:
 *         description: userId query parameter is required
 *       404:
 *         description: No contact record found
 */
router.get('/contact', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ success: false, message: 'userId required' }); return; }
  const contact = await publicService.getPublicContact(userId);
  if (!contact) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: contact });
});

/**
 * @swagger
 * /api/public/portfolio:
 *   get:
 *     summary: Get full aggregated portfolio for a portfolio owner
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aggregated portfolio with profile, skills, experience, projects, services and contact
 *       400:
 *         description: userId query parameter is required
 */
router.get('/portfolio', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ message: 'userId required' }); return; }
  res.json(await publicService.getFullPortfolio(userId));
});

/**
 * @swagger
 * /api/public/contact/message:
 *   post:
 *     summary: Submit a contact inquiry message from a portfolio visitor
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name:      { type: string, maxLength: 120 }
 *               email:     { type: string, format: email, maxLength: 254 }
 *               subject:   { type: string, maxLength: 200 }
 *               message:   { type: string, minLength: 10, maxLength: 4000 }
 *               queryType: { type: string, enum: [SERVICE, GENERAL], description: "Inquiry classification. Defaults to GENERAL." }
 *     responses:
 *       201:
 *         description: Message saved successfully
 *       400:
 *         description: Validation error — missing, invalid, or out-of-range fields
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/contact/message', async (req: Request, res: Response) => {
  const { name, email, subject, message, queryType } = req.body as {
    name?:      string;
    email?:     string;
    subject?:   string;
    message?:   string;
    queryType?: string;
  };

  // Basic field validation
  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'name is required' });
    return;
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ success: false, message: 'A valid email address is required' });
    return;
  }
  if (!message?.trim() || message.trim().length < 10) {
    res.status(400).json({ success: false, message: 'message must be at least 10 characters' });
    return;
  }
  if (name.trim().length > 120 || email.trim().length > 254 || (subject ?? '').length > 200 || message.trim().length > 4000) {
    res.status(400).json({ success: false, message: 'One or more fields exceed maximum length' });
    return;
  }

  // queryType validation — must be SERVICE or GENERAL if provided
  const validQueryTypes: string[] = Object.values(QueryType);
  if (queryType !== undefined && !validQueryTypes.includes(queryType)) {
    res.status(400).json({
      success: false,
      message: `queryType must be one of: ${validQueryTypes.join(', ')}`,
    });
    return;
  }

  try {
    await contactMessageService.send({
      name:      name.trim(),
      email:     email.trim(),
      subject:   subject?.trim(),
      message:   message.trim(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      queryType: queryType as QueryType | undefined,
    });
    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

export default router;
