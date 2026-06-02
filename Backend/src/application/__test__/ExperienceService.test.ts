import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { ExperienceService } from '../ExperienceService';
import { EmploymentType } from '../../infrastructure/database/models/Experience';
import { SkillService } from '../SkillService';
import { SkillCategory } from '../../infrastructure/database/models/Skill';
import mongoose from 'mongoose';

jest.setTimeout(120000);

describe('ExperienceService', () => {
  const service = new ExperienceService();
  const skillService = new SkillService();
  const userId = new mongoose.Types.ObjectId().toString();

  const sampleExp = {
    company: 'Acme Corp',
    jobTitle: 'Software Engineer',
    employmentType: EmploymentType.FULL_TIME,
    startDate: new Date('2022-01-01'),
  };

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create', () => {
    it('creates an experience entry', async () => {
      const exp = await service.create(userId, sampleExp);
      expect(exp.company).toBe('Acme Corp');
      expect(exp.jobTitle).toBe('Software Engineer');
    });
  });

  describe('list', () => {
    it('returns experiences sorted by startDate descending', async () => {
      await service.create(userId, { ...sampleExp, startDate: new Date('2020-01-01'), company: 'OldCo' });
      await service.create(userId, { ...sampleExp, startDate: new Date('2023-01-01'), company: 'NewCo' });
      const list = await service.list(userId);
      expect(list).toHaveLength(2);
      expect(list[0]!.company).toBe('NewCo');
    });

    it('excludes soft-deleted entries', async () => {
      const exp = await service.create(userId, sampleExp);
      await service.delete(userId, exp._id.toString());
      const list = await service.list(userId);
      expect(list).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('finds an experience by id', async () => {
      const exp = await service.create(userId, sampleExp);
      const found = await service.findById(userId, exp._id.toString());
      expect(found).not.toBeNull();
      expect(found!.company).toBe('Acme Corp');
    });

    it('returns null for non-existent id', async () => {
      const found = await service.findById(userId, new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates experience fields', async () => {
      const exp = await service.create(userId, sampleExp);
      const updated = await service.update(userId, exp._id.toString(), { company: 'NewCorp' });
      expect(updated!.company).toBe('NewCorp');
    });
  });

  describe('setSkills / getSkills', () => {
    it('associates skills with an experience', async () => {
      const skill = await skillService.create(userId, { name: 'TS', category: SkillCategory.BACKEND, proficiencyLevel: 5 });
      const exp = await service.create(userId, sampleExp);
      await service.setSkills(userId, exp._id.toString(), [skill._id.toString()]);
      const skillIds = await service.getSkills(exp._id.toString());
      expect(skillIds).toHaveLength(1);
    });

    it('replaces existing skills on subsequent calls', async () => {
      const s1 = await skillService.create(userId, { name: 'A', category: SkillCategory.BACKEND, proficiencyLevel: 3 });
      const s2 = await skillService.create(userId, { name: 'B', category: SkillCategory.FRONTEND, proficiencyLevel: 3 });
      const exp = await service.create(userId, sampleExp);
      await service.setSkills(userId, exp._id.toString(), [s1._id.toString()]);
      await service.setSkills(userId, exp._id.toString(), [s2._id.toString()]);
      const skillIds = await service.getSkills(exp._id.toString());
      expect(skillIds).toHaveLength(1);
      expect(skillIds[0]).toBe(s2._id.toString());
    });

    it('throws when experience not found', async () => {
      await expect(
        service.setSkills(userId, new mongoose.Types.ObjectId().toString(), []),
      ).rejects.toThrow('Experience not found');
    });
  });

  describe('delete', () => {
    it('soft-deletes an experience', async () => {
      const exp = await service.create(userId, sampleExp);
      await service.delete(userId, exp._id.toString());
      const found = await service.findById(userId, exp._id.toString());
      expect(found).toBeNull();
    });
  });
});
