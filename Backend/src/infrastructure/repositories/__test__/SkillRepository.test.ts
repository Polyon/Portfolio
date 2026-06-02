import { startTestDb, clearTestDb, stopTestDb } from '../../database/__test__/test-db';
import { SkillRepository } from '../SkillRepository';
import { SkillCategory } from '../../database/models/Skill';
import mongoose from 'mongoose';

describe('SkillRepository', () => {
  const repo = new SkillRepository();
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create & findByUserId', () => {
    it('stores and retrieves skills for a user', async () => {
      await repo.create(userId, { name: 'Rust', category: SkillCategory.BACKEND, proficiencyLevel: 4 });
      const skills = await repo.findByUserId(userId);
      expect(skills).toHaveLength(1);
      expect(skills[0]!.name).toBe('Rust');
    });

    it('does not return another user\'s skills', async () => {
      const other = new mongoose.Types.ObjectId().toString();
      await repo.create(other, { name: 'Python', category: SkillCategory.BACKEND, proficiencyLevel: 3 });
      const skills = await repo.findByUserId(userId);
      expect(skills).toHaveLength(0);
    });
  });

  describe('findByCategory', () => {
    it('returns only skills in the specified category', async () => {
      await repo.create(userId, { name: 'React', category: SkillCategory.FRONTEND, proficiencyLevel: 4 });
      await repo.create(userId, { name: 'Docker', category: SkillCategory.DEVOPS, proficiencyLevel: 3 });
      const fe = await repo.findByCategory(userId, SkillCategory.FRONTEND);
      expect(fe).toHaveLength(1);
      expect(fe[0]!.name).toBe('React');
    });
  });

  describe('findById', () => {
    it('finds a skill by id', async () => {
      const skill = await repo.create(userId, { name: 'SQL', category: SkillCategory.DATABASE, proficiencyLevel: 3 });
      const found = await repo.findById(skill._id.toString());
      expect(found).not.toBeNull();
      expect(found!.name).toBe('SQL');
    });

    it('returns null for invalid id', async () => {
      const found = await repo.findById('000000000000000000000000');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates skill data', async () => {
      const skill = await repo.create(userId, { name: 'MongoDB', category: SkillCategory.DATABASE, proficiencyLevel: 3 });
      const updated = await repo.update(skill._id.toString(), { proficiencyLevel: 9 });
      expect(updated!.proficiencyLevel).toBe(9);
    });
  });

  describe('delete (soft)', () => {
    it('soft-deletes and excludes from findByUserId', async () => {
      const skill = await repo.create(userId, { name: 'Redis', category: SkillCategory.DATABASE, proficiencyLevel: 2 });
      await repo.delete(skill._id.toString());
      const skills = await repo.findByUserId(userId);
      expect(skills).toHaveLength(0);
    });
  });
});
