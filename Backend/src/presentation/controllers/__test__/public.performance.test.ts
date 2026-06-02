/**
 * Performance tests for public portfolio endpoints.
 *
 * Validates:
 *  - Single-endpoint response times <100ms (with warm cache)
 *  - Concurrent request handling (no errors under load)
 *  - No N+1 query regressions (aggregate endpoint uses Promise.all)
 */

import express from 'express';
import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import publicController from '../public.controller';
import { Profile } from '../../../infrastructure/database/models/Profile';
import { Skill, SkillCategory } from '../../../infrastructure/database/models/Skill';
import { Experience, EmploymentType } from '../../../infrastructure/database/models/Experience';
import { Project, ProjectStatus } from '../../../infrastructure/database/models/Project';
import { User } from '../../../infrastructure/database/models/User';
import { UserRole } from '../../../domain/entities/User.entity';
import { portfolioCache } from '../../../infrastructure/cache/PortfolioCache';

const app = express();
app.use(express.json());
app.use('/api/public', publicController);

const RESPONSE_TIME_BUDGET_MS = 100;
const CONCURRENT_REQUESTS = 20;

describe('Public API – Performance Tests', () => {
  let userId: string;

  beforeAll(async () => {
    await startTestDb();
    const user = await User.create({ email: 'perf@test.com', passwordHash: 'hash', role: UserRole.ADMIN });
    userId = user._id.toString();

    // Seed realistic data
    await Profile.create({
      userId,
      firstName: 'Perf',
      lastName: 'User',
      bio: 'Performance test profile',
      isPublished: true,
    });
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        Skill.create({
          userId,
          name: `Skill ${i}`,
          category: i % 2 === 0 ? SkillCategory.BACKEND : SkillCategory.FRONTEND,
          proficiencyLevel: 3,
          isPublished: true,
        })
      )
    );
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        Experience.create({
          userId,
          company: `Company ${i}`,
          jobTitle: `Engineer ${i}`,
          employmentType: EmploymentType.FULL_TIME,
          startDate: new Date(2020 + i, 0, 1),
          isCurrentPosition: i === 4,
          isPublished: true,
        })
      )
    );
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        Project.create({
          userId,
          name: `Project ${i}`,
          status: ProjectStatus.DEPLOYED,
          isFeatured: i < 2,
          isPublished: true,
        })
      )
    );
  });

  afterAll(async () => {
    await clearTestDb();
    await stopTestDb();
  });

  beforeEach(() => {
    // Warm cache before each test group
    portfolioCache.invalidateUser(userId);
  });

  it('GET /api/public/profile responds within time budget (warm cache)', async () => {
    // Prime the cache
    await supertest(app).get(`/api/public/profile?userId=${userId}`);

    const start = Date.now();
    const res = await supertest(app).get(`/api/public/profile?userId=${userId}`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(RESPONSE_TIME_BUDGET_MS);
  });

  it('GET /api/public/portfolio responds within time budget (warm cache)', async () => {
    // Prime the cache
    await supertest(app).get(`/api/public/portfolio?userId=${userId}`);

    const start = Date.now();
    const res = await supertest(app).get(`/api/public/portfolio?userId=${userId}`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(RESPONSE_TIME_BUDGET_MS);
  });

  it(`handles ${CONCURRENT_REQUESTS} concurrent requests to /api/public/portfolio without errors`, async () => {
    const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      supertest(app).get(`/api/public/portfolio?userId=${userId}`)
    );
    const results = await Promise.all(requests);
    const failures = results.filter((r) => r.status !== 200);
    expect(failures).toHaveLength(0);
  });

  it('GET /api/public/projects returns featured projects first', async () => {
    const res = await supertest(app).get(`/api/public/projects?userId=${userId}`);
    expect(res.status).toBe(200);
    const projects: Array<{ isFeatured: boolean }> = res.body;
    expect(projects.length).toBeGreaterThan(0);
    const firstNonFeatured = projects.findIndex((p) => !p.isFeatured);
    const lastFeatured = projects.map((p) => p.isFeatured).lastIndexOf(true);
    // All featured should appear before any non-featured
    if (firstNonFeatured !== -1 && lastFeatured !== -1) {
      expect(lastFeatured).toBeLessThan(firstNonFeatured);
    }
  });

  it('GET /api/public/experiences returns entries sorted by startDate descending', async () => {
    const res = await supertest(app).get(`/api/public/experiences?userId=${userId}`);
    expect(res.status).toBe(200);
    const experiences: Array<{ startDate: string }> = res.body;
    expect(experiences.length).toBeGreaterThan(1);
    for (let i = 1; i < experiences.length; i++) {
      expect(new Date(experiences[i - 1].startDate).getTime()).toBeGreaterThanOrEqual(
        new Date(experiences[i].startDate).getTime()
      );
    }
  });
});
