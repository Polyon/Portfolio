import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { ProjectService } from '../ProjectService';
import { ProjectStatus } from '../../infrastructure/database/models/Project';
import { SkillService } from '../SkillService';
import { SkillCategory } from '../../infrastructure/database/models/Skill';
import mongoose from 'mongoose';

jest.setTimeout(120000);

describe('ProjectService', () => {
  const service = new ProjectService();
  const skillService = new SkillService();
  const userId = new mongoose.Types.ObjectId().toString();

  const sampleProject = {
    name: 'Portfolio App',
    description: 'A sample portfolio',
    status: ProjectStatus.IN_PROGRESS,
  };

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create', () => {
    it('creates a project', async () => {
      const project = await service.create(userId, sampleProject);
      expect(project.name).toBe('Portfolio App');
      expect(project.status).toBe(ProjectStatus.IN_PROGRESS);
    });
  });

  describe('list', () => {
    it('returns non-deleted projects', async () => {
      await service.create(userId, sampleProject);
      await service.create(userId, { ...sampleProject, name: 'Second Project' });
      const list = await service.list(userId);
      expect(list).toHaveLength(2);
    });

    it('excludes soft-deleted projects', async () => {
      const project = await service.create(userId, sampleProject);
      await service.delete(userId, project._id.toString());
      const list = await service.list(userId);
      expect(list).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('finds a project by id', async () => {
      const project = await service.create(userId, sampleProject);
      const found = await service.findById(userId, project._id.toString());
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Portfolio App');
    });

    it('returns null for non-existent id', async () => {
      const found = await service.findById(userId, new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates project fields', async () => {
      const project = await service.create(userId, sampleProject);
      const updated = await service.update(userId, project._id.toString(), { name: 'Updated App' });
      expect(updated!.name).toBe('Updated App');
    });
  });

  describe('setFeatured', () => {
    it('sets isFeatured to true', async () => {
      const project = await service.create(userId, sampleProject);
      const updated = await service.setFeatured(userId, project._id.toString(), true);
      expect(updated!.isFeatured).toBe(true);
    });

    it('listFeatured returns only featured projects', async () => {
      const p1 = await service.create(userId, sampleProject);
      await service.create(userId, { ...sampleProject, name: 'P2' });
      await service.setFeatured(userId, p1._id.toString(), true);
      const featured = await service.listFeatured(userId);
      expect(featured).toHaveLength(1);
      expect(featured[0]!.name).toBe('Portfolio App');
    });
  });

  describe('listByStatus', () => {
    it('filters by status', async () => {
      await service.create(userId, { ...sampleProject, status: ProjectStatus.DEPLOYED });
      await service.create(userId, { ...sampleProject, name: 'P2', status: ProjectStatus.PLANNING });
      const deployed = await service.listByStatus(userId, ProjectStatus.DEPLOYED);
      expect(deployed).toHaveLength(1);
      expect(deployed[0]!.status).toBe(ProjectStatus.DEPLOYED);
    });
  });

  describe('setSkills / getSkills', () => {
    it('associates skills with a project', async () => {
      const skill = await skillService.create(userId, { name: 'React', category: SkillCategory.FRONTEND, proficiencyLevel: 4 });
      const project = await service.create(userId, sampleProject);
      await service.setSkills(userId, project._id.toString(), [skill._id.toString()]);
      const skillIds = await service.getSkills(project._id.toString());
      expect(skillIds).toHaveLength(1);
    });

    it('throws when project not found', async () => {
      await expect(
        service.setSkills(userId, new mongoose.Types.ObjectId().toString(), []),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('soft-deletes a project', async () => {
      const project = await service.create(userId, sampleProject);
      await service.delete(userId, project._id.toString());
      const found = await service.findById(userId, project._id.toString());
      expect(found).toBeNull();
    });
  });
});
