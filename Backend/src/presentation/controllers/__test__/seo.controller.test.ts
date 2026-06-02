import request from 'supertest';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { Profile } from '../../../infrastructure/database/models/Profile';
import { Project } from '../../../infrastructure/database/models/Project';
import { ProjectStatus } from '../../../infrastructure/database/models/Project';
import { createApp } from '../../../app';

describe('SEO & Publication endpoints (integration)', () => {
  let app: Application;
  let token: string;
  let userId: string;

  const authService = new AuthService();

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    const admin = await authService.registerAdmin('seotest@test.com', 'Password1!');
    userId = admin._id.toString();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seotest@test.com', password: 'Password1!' });
    token = loginRes.body.data.token as string;
    // Create profile for publication tests
    await Profile.create({ userId, firstName: 'Test', lastName: 'User', bio: 'Bio', isPublished: false });
  });

  afterAll(async () => {
    await clearTestDb();
    await stopTestDb();
  });

  // ─── Admin SEO endpoints ──────────────────────────────────────────────────

  describe('PUT /api/admin/seo/:section', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app)
        .put('/api/admin/seo/HOME')
        .send({ pageTitle: 'Home', metaDescription: 'Home page' });
      expect(res.status).toBe(401);
    });

    it('creates SEO metadata for HOME section', async () => {
      const res = await request(app)
        .put('/api/admin/seo/HOME')
        .set('Authorization', `Bearer ${token}`)
        .send({
          pageTitle: 'My Portfolio Home',
          metaDescription: 'Welcome to my portfolio.',
          keywords: ['developer', 'typescript'],
          ogTitle: 'Portfolio OG',
          ogDescription: 'OG desc',
          ogImageUrl: 'https://example.com/og.png',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.pageTitle).toBe('My Portfolio Home');
      expect(res.body.data.keywords).toContain('developer');
    });

    it('returns 400 when pageTitle exceeds 70 characters', async () => {
      const res = await request(app)
        .put('/api/admin/seo/SKILLS')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageTitle: 'A'.repeat(71), metaDescription: 'OK' });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 for an invalid section', async () => {
      const res = await request(app)
        .put('/api/admin/seo/INVALID')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageTitle: 'Title', metaDescription: 'Desc' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/seo/:section', () => {
    it('returns 404 when no metadata exists', async () => {
      const res = await request(app)
        .get('/api/admin/seo/EXPERIENCE')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('returns the SEO metadata after creation', async () => {
      await request(app)
        .put('/api/admin/seo/ABOUT')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageTitle: 'About Me', metaDescription: 'About section.' });

      const res = await request(app)
        .get('/api/admin/seo/ABOUT')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.pageTitle).toBe('About Me');
      expect(res.body.data.section).toBe('ABOUT');
    });
  });

  describe('GET /api/admin/seo', () => {
    it('returns all configured SEO sections', async () => {
      const res = await request(app)
        .get('/api/admin/seo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Publication endpoints ────────────────────────────────────────────────

  describe('PUT /api/admin/publication/profile', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app)
        .put('/api/admin/publication/profile')
        .send({ isPublished: true });
      expect(res.status).toBe(401);
    });

    it('publishes the profile', async () => {
      const res = await request(app)
        .put('/api/admin/publication/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: true });
      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);
    });

    it('unpublishes the profile', async () => {
      const res = await request(app)
        .put('/api/admin/publication/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: false });
      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(false);
    });

    it('returns 400 without isPublished field', async () => {
      const res = await request(app)
        .put('/api/admin/publication/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });
  });

  describe('PUT /api/admin/publication/projects/featured', () => {
    it('sets featured projects', async () => {
      const p1 = await Project.create({ userId, name: 'P1', status: ProjectStatus.DEPLOYED, isPublished: true });
      const p2 = await Project.create({ userId, name: 'P2', status: ProjectStatus.DEPLOYED, isPublished: true });

      const res = await request(app)
        .put('/api/admin/publication/projects/featured')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectIds: [p1._id.toString()] });
      expect(res.status).toBe(200);
      expect(res.body.data.featuredCount).toBe(1);

      const featured = await Project.findById(p1._id);
      const notFeatured = await Project.findById(p2._id);
      expect(featured!.isFeatured).toBe(true);
      expect(notFeatured!.isFeatured).toBe(false);
    });

    it('returns 400 with invalid project id format', async () => {
      const res = await request(app)
        .put('/api/admin/publication/projects/featured')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectIds: ['not-an-id'] });
      expect(res.status).toBe(400);
    });
  });

  // ─── Public SEO endpoints ─────────────────────────────────────────────────

  describe('GET /api/public/seo/:section', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await request(app).get('/api/public/seo/HOME');
      expect(res.status).toBe(400);
    });

    it('returns 404 when no SEO metadata exists for section', async () => {
      const res = await request(app).get(`/api/public/seo/CONTACT?userId=${userId}`);
      expect(res.status).toBe(404);
    });

    it('returns SEO metadata without authentication', async () => {
      await request(app)
        .put('/api/admin/seo/SERVICES')
        .set('Authorization', `Bearer ${token}`)
        .send({ pageTitle: 'Services', metaDescription: 'Services page.' });

      const res = await request(app).get(`/api/public/seo/SERVICES?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.pageTitle).toBe('Services');
    });
  });

  describe('GET /api/public/sitemap.xml', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await request(app).get('/api/public/sitemap.xml');
      expect(res.status).toBe(400);
    });

    it('returns valid XML sitemap', async () => {
      const res = await request(app).get(`/api/public/sitemap.xml?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/xml/);
      expect(res.text).toContain('<?xml version="1.0"');
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('<url>');
    });
  });

  describe('GET /api/public/robots.txt', () => {
    it('returns text/plain with robots directives', async () => {
      const res = await request(app).get('/api/public/robots.txt');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('User-agent: *');
      expect(res.text).toContain('Allow: /');
      expect(res.text).toContain('Sitemap:');
    });
  });

  // ─── Unpublished content visibility ──────────────────────────────────────

  describe('Unpublished profile NOT visible via public API', () => {
    it('public profile endpoint returns 404 when profile is unpublished', async () => {
      // Ensure profile is unpublished
      await request(app)
        .put('/api/admin/publication/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: false });

      const res = await request(app).get(`/api/public/profile?userId=${userId}`);
      expect(res.status).toBe(404);
    });

    it('public profile endpoint returns 200 when profile is published', async () => {
      await request(app)
        .put('/api/admin/publication/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: true });

      const res = await request(app).get(`/api/public/profile?userId=${userId}`);
      expect(res.status).toBe(200);
    });
  });
});
