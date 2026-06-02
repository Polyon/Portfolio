import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { SkillService } from '../SkillService';
import { SkillCategory } from '../../infrastructure/database/models/Skill';
import mongoose from 'mongoose';

describe('SkillService', () => {
  const service = new SkillService();
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create', () => {
    it('creates a skill and returns it', async () => {
      const skill = await service.create(userId, {
        name: 'TypeScript',
        category: SkillCategory.BACKEND,
        proficiencyLevel: 5,
      });
      expect(skill.name).toBe('TypeScript');
      expect(skill.category).toBe(SkillCategory.BACKEND);
      expect(skill.proficiencyLevel).toBe(5);
    });
  });

  describe('list', () => {
    it('returns all non-deleted skills for user', async () => {
      await service.create(userId, { name: 'A', category: SkillCategory.BACKEND, proficiencyLevel: 3 });
      await service.create(userId, { name: 'B', category: SkillCategory.FRONTEND, proficiencyLevel: 4 });
      const skills = await service.list(userId);
      expect(skills).toHaveLength(2);
    });

    it('excludes deleted skills', async () => {
      const skill = await service.create(userId, { name: 'ToDelete', category: SkillCategory.DEVOPS, proficiencyLevel: 3 });
      await service.delete(userId, skill._id.toString());
      const skills = await service.list(userId);
      expect(skills).toHaveLength(0);
    });
  });

  describe('listByCategory', () => {
    it('filters skills by category', async () => {
      await service.create(userId, { name: 'Node', category: SkillCategory.BACKEND, proficiencyLevel: 4 });
      await service.create(userId, { name: 'Angular', category: SkillCategory.FRONTEND, proficiencyLevel: 3 });
      const backend = await service.listByCategory(userId, SkillCategory.BACKEND);
      expect(backend).toHaveLength(1);
      expect(backend[0]!.name).toBe('Node');
    });
  });

  describe('update', () => {
    it('updates skill fields', async () => {
      const skill = await service.create(userId, { name: 'JS', category: SkillCategory.FRONTEND, proficiencyLevel: 3 });
      const updated = await service.update(userId, skill._id.toString(), { proficiencyLevel: 5 });
      expect(updated!.proficiencyLevel).toBe(5);
    });

    it('returns null for non-existent skill', async () => {
      const updated = await service.update(userId, new mongoose.Types.ObjectId().toString(), { name: 'X' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('soft-deletes a skill', async () => {
      const skill = await service.create(userId, { name: 'Go', category: SkillCategory.BACKEND, proficiencyLevel: 2 });
      await service.delete(userId, skill._id.toString());
      const list = await service.list(userId);
      expect(list).toHaveLength(0);
    });
  });
});
