/**
 * Verify that critical MongoDB indexes are defined on all collection schemas.
 * This ensures query performance meets the <200ms response time target.
 */

import { startTestDb, stopTestDb } from './test-db';
import { Skill } from '../models/Skill';
import { Profile } from '../models/Profile';
import { Experience } from '../models/Experience';
import { Project } from '../models/Project';
import { Service } from '../models/Service';
import { User } from '../models/User';
import { SEOMetadata } from '../models/SEOMetadata';
import { AuditLog } from '../models/AuditLog';
import { ExperienceSkill } from '../models/ExperienceSkill';
import { ProjectSkill } from '../models/ProjectSkill';
import { ContactMessage } from '../models/ContactMessage';

describe('Model Indexes', () => {
  beforeAll(async () => {
    await startTestDb();
    // Force collection + index creation in the in-memory DB before querying indexes
    await Promise.all([
      Skill.createIndexes(),
      Profile.createIndexes(),
      Experience.createIndexes(),
      Project.createIndexes(),
      Service.createIndexes(),
      User.createIndexes(),
      SEOMetadata.createIndexes(),
      AuditLog.createIndexes(),
      ExperienceSkill.createIndexes(),
      ProjectSkill.createIndexes(),
      ContactMessage.createIndexes(),
    ]);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  function getIndexPaths(indexes: Array<{ key: Record<string, unknown> }>): string[][] {
    return indexes.map((idx) => Object.keys(idx.key).filter((k) => k !== '_id'));
  }

  it('Skill model has userId+category compound index', async () => {
    const indexes = await Skill.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some((keys) => keys.includes('userId') && keys.includes('category'));
    expect(hasIndex).toBe(true);
  });

  it('Skill model has unique userId+name partial index', async () => {
    const indexes = await Skill.collection.indexes();
    const uniqueNameIndex = indexes.find(
      (idx) => idx['key']['userId'] && idx['key']['name'] && idx['unique'] === true
    );
    expect(uniqueNameIndex).toBeDefined();
  });

  it('Profile model has userId+isPublished compound index', async () => {
    const indexes = await Profile.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some((keys) => keys.includes('userId') && keys.includes('isPublished'));
    expect(hasIndex).toBe(true);
  });

  it('Experience model has userId+startDate index for sort performance', async () => {
    const indexes = await Experience.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some((keys) => keys.includes('userId') && keys.includes('startDate'));
    expect(hasIndex).toBe(true);
  });

  it('Project model has userId+isFeatured+displayOrder index', async () => {
    const indexes = await Project.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some(
      (keys) => keys.includes('userId') && keys.includes('isFeatured') && keys.includes('displayOrder')
    );
    expect(hasIndex).toBe(true);
  });

  it('Service model has userId+isPublished+displayOrder index', async () => {
    const indexes = await Service.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some(
      (keys) => keys.includes('userId') && keys.includes('isPublished') && keys.includes('displayOrder')
    );
    expect(hasIndex).toBe(true);
  });

  it('User model has unique email index', async () => {
    const indexes = await User.collection.indexes();
    const uniqueEmailIndex = indexes.find(
      (idx) => idx['key']['email'] && idx['unique'] === true
    );
    expect(uniqueEmailIndex).toBeDefined();
  });

  it('SEOMetadata model has unique userId+pageType index', async () => {
    const indexes = await SEOMetadata.collection.indexes();
    const uniqueIndex = indexes.find(
      (idx) => idx['key']['userId'] && idx['key']['pageType'] && idx['unique'] === true
    );
    expect(uniqueIndex).toBeDefined();
  });

  it('AuditLog model has userId+entityType+createdAt index', async () => {
    const indexes = await AuditLog.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some(
      (keys) => keys.includes('userId') && keys.includes('entityType') && keys.includes('createdAt')
    );
    expect(hasIndex).toBe(true);
  });

  it('ExperienceSkill model has unique experienceId+skillId index', async () => {
    const indexes = await ExperienceSkill.collection.indexes();
    const uniqueIndex = indexes.find(
      (idx) => idx['key']['experienceId'] && idx['key']['skillId'] && idx['unique'] === true
    );
    expect(uniqueIndex).toBeDefined();
  });

  it('ProjectSkill model has unique projectId+skillId index', async () => {
    const indexes = await ProjectSkill.collection.indexes();
    const uniqueIndex = indexes.find(
      (idx) => idx['key']['projectId'] && idx['key']['skillId'] && idx['unique'] === true
    );
    expect(uniqueIndex).toBeDefined();
  });

  it('ContactMessage model has queryType+createdAt compound index (SC-008)', async () => {
    const indexes = await ContactMessage.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some((keys) => keys.includes('queryType') && keys.includes('createdAt'));
    expect(hasIndex).toBe(true);
  });

  it('ContactMessage model has isRead+createdAt compound index (SC-008)', async () => {
    const indexes = await ContactMessage.collection.indexes();
    const paths = getIndexPaths(indexes);
    const hasIndex = paths.some((keys) => keys.includes('isRead') && keys.includes('createdAt'));
    expect(hasIndex).toBe(true);
  });
});
