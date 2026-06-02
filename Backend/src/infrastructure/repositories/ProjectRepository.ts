import { Project } from '../database/models/Project';
import { ProjectSkill } from '../database/models/ProjectSkill';
import type { IProject } from '../database/models/index';

export class ProjectRepository {
  /**
   * Create a new project document for the given user.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial project fields to set
   * @returns The newly created project document
   */
  async create(userId: string, data: Partial<IProject>): Promise<IProject> {
    return Project.create({ ...data, userId });
  }

  /**
   * Return all non-deleted projects for a user, sorted by displayOrder then updatedAt descending.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of project documents
   */
  async findByUserId(userId: string): Promise<IProject[]> {
    return Project.find({ userId, isDeleted: false }).sort({ displayOrder: 1, updatedAt: -1 });
  }

  /**
   * Return non-deleted featured projects for a user.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of featured project documents
   */
  async findFeatured(userId: string): Promise<IProject[]> {
    return Project.find({ userId, isFeatured: true, isDeleted: false }).sort({ displayOrder: 1 });
  }

  /**
   * Find a single non-deleted project by its MongoDB ObjectId.
   * @param projectId - MongoDB ObjectId of the project
   * @returns The project document, or null if not found or deleted
   */
  async findById(projectId: string): Promise<IProject | null> {
    return Project.findOne({ _id: projectId, isDeleted: false });
  }

  /**
   * Apply a partial update to a non-deleted project. Returns the updated document or null.
   * @param projectId - MongoDB ObjectId of the project
   * @param data      - Partial project fields to apply
   * @returns The updated project document, or null if not found
   */
  async update(projectId: string, data: Partial<IProject>): Promise<IProject | null> {
    return Project.findOneAndUpdate({ _id: projectId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /**
   * Soft-delete a project by setting isDeleted=true.
   * @param projectId - MongoDB ObjectId of the project
   * @returns Resolves when the soft-delete completes
   */
  async delete(projectId: string): Promise<void> {
    await Project.updateOne({ _id: projectId }, { $set: { isDeleted: true } });
  }

  /**
   * Replace all skills for a project (deletes existing associations then bulk-inserts new ones).
   * @param projectId - MongoDB ObjectId of the project
   * @param skillIds  - Array of Skill ObjectId strings
   * @returns Resolves when associations have been updated
   */
  async setSkills(projectId: string, skillIds: string[]): Promise<void> {
    await ProjectSkill.deleteMany({ projectId });
    if (skillIds.length > 0) {
      await ProjectSkill.insertMany(skillIds.map((skillId) => ({ projectId, skillId })));
    }
  }

  /**
   * Return the skill IDs currently associated with a project.
   * @param projectId - MongoDB ObjectId of the project
   * @returns Array of Skill ObjectId strings
   */
  async getSkills(projectId: string): Promise<string[]> {
    const records = await ProjectSkill.find({ projectId });
    return records.map((r) => r.skillId.toString());
  }
}
