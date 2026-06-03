import express from 'express';
import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import publicController from '../public.controller';
import { Profile } from '../../../infrastructure/database/models/Profile';
import { Skill, SkillCategory } from '../../../infrastructure/database/models/Skill';
import { User } from '../../../infrastructure/database/models/User';
import { UserRole } from '../../../domain/entities/User.entity';
import mongoose from 'mongoose';
import { portfolioCache } from '../../../infrastructure/cache/PortfolioCache';

const app = express();
app.use(express.json());
app.use('/api/public', publicController);

describe('GET /api/public routes', () => {
  let userId: string;

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => {
    await clearTestDb();
    portfolioCache.invalidateUser(userId ?? '');
  });
  afterAll(async () => { await stopTestDb(); });

  beforeEach(async () => {
    const user = await User.create({
      email: 'pub@test.com',
      passwordHash: 'hash',
      role: UserRole.ADMIN,
    });
    userId = user._id.toString();
  });

  describe('GET /api/public/profile', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await supertest(app).get('/api/public/profile');
      expect(res.status).toBe(400);
    });

    it('returns 404 when no published profile exists', async () => {
      const res = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res.status).toBe(404);
    });

    it('returns 200 with published profile', async () => {
      await Profile.create({ userId, firstName: 'John', lastName: 'Doe', bio: 'Hello', isPublished: true });
      const res = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Hello');
    });

    it('does NOT return unpublished profile', async () => {
      await Profile.create({ userId, firstName: 'John', lastName: 'Doe', bio: 'Hidden', isPublished: false });
      const res = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/public/skills', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await supertest(app).get('/api/public/skills');
      expect(res.status).toBe(400);
    });

    it('returns only published skills', async () => {
      await Skill.create({ userId, name: 'TypeScript', category: SkillCategory.BACKEND, proficiencyLevel: 5, isPublished: true });
      await Skill.create({ userId, name: 'Draft', category: SkillCategory.BACKEND, proficiencyLevel: 5, isPublished: false });
      const res = await supertest(app).get(`/api/public/skills?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('TypeScript');
    });

    it('filters by category', async () => {
      await Skill.create({ userId, name: 'Angular', category: SkillCategory.FRONTEND, proficiencyLevel: 4, isPublished: true });
      await Skill.create({ userId, name: 'Node', category: SkillCategory.BACKEND, proficiencyLevel: 5, isPublished: true });
      const res = await supertest(app).get(`/api/public/skills?userId=${userId}&category=${SkillCategory.FRONTEND}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Angular');
    });
  });

  describe('GET /api/public/portfolio', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await supertest(app).get('/api/public/portfolio');
      expect(res.status).toBe(400);
    });

    it('returns aggregate portfolio for a user', async () => {
      await Profile.create({ userId, firstName: 'John', lastName: 'Doe', bio: 'About me', isPublished: true });
      await Skill.create({ userId, name: 'TypeScript', category: SkillCategory.BACKEND, proficiencyLevel: 5, isPublished: true });
      const res = await supertest(app).get(`/api/public/portfolio?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('skills');
      expect(res.body).toHaveProperty('experience');
      expect(res.body).toHaveProperty('projects');
      expect(res.body).toHaveProperty('services');
    });
  });

  describe('Caching behaviour', () => {
    it('returns the same data on repeated requests (cache hit)', async () => {
      await Profile.create({ userId, firstName: 'Cached', lastName: 'User', bio: 'Cached bio', isPublished: true });
      const res1 = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res1.status).toBe(200);
      const res2 = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.bio).toBe(res1.body.data.bio);
    });

    it('reflects new data after cache is invalidated', async () => {
      await Profile.create({ userId, firstName: 'Original', lastName: 'Name', bio: 'Original bio', isPublished: true });
      const res1 = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res1.status).toBe(200);
      // Invalidate the cache and update the record
      portfolioCache.invalidateUser(userId);
      await Profile.updateOne({ userId }, { bio: 'Updated bio' });
      const res2 = await supertest(app).get(`/api/public/profile?userId=${userId}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.bio).toBe('Updated bio');
    });
  });

  describe('Contact visibility flags', () => {
    it('returns only publicly visible contact fields', async () => {
      const { Contact } = await import('../../../infrastructure/database/models/Contact');
      await Contact.create({
        userId,
        email: 'pub@example.com',
        emailPublic: true,
        phone: '555-1234',
        phonePublic: false,
      });
      const res = await supertest(app).get(`/api/public/contact?userId=${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('pub@example.com');
      expect(res.body.data.phone).toBeUndefined();
    });
  });
});
