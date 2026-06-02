import { Experience } from '../database/models/Experience';
import { ExperienceSkill } from '../database/models/ExperienceSkill';
import type { IExperience } from '../database/models/index';

export class ExperienceRepository {
  /**
   * Create a new experience document for the given user.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial experience fields to set
   * @returns The newly created experience document
   */
  async create(userId: string, data: Partial<IExperience>): Promise<IExperience> {
    return Experience.create({ ...data, userId });
  }

  /**
   * Return all non-deleted experiences for a user, sorted by startDate descending.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of experience documents
   */
  async findByUserId(userId: string): Promise<IExperience[]> {
    return Experience.find({ userId, isDeleted: false }).sort({ startDate: -1 });
  }

  /**
   * Find a single non-deleted experience by its MongoDB ObjectId.
   * @param expId - MongoDB ObjectId of the experience
   * @returns The experience document, or null if not found or deleted
   */
  async findById(expId: string): Promise<IExperience | null> {
    return Experience.findOne({ _id: expId, isDeleted: false });
  }

  /**
   * Apply a partial update to a non-deleted experience. Returns the updated document or null.
   * @param expId - MongoDB ObjectId of the experience
   * @param data  - Partial experience fields to apply
   * @returns The updated experience document, or null if not found
   */
  async update(expId: string, data: Partial<IExperience>): Promise<IExperience | null> {
    return Experience.findOneAndUpdate({ _id: expId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /**
   * Soft-delete an experience by setting isDeleted=true.
   * @param expId - MongoDB ObjectId of the experience
   * @returns Resolves when the soft-delete completes
   */
  async delete(expId: string): Promise<void> {
    await Experience.updateOne({ _id: expId }, { $set: { isDeleted: true } });
  }

  /**
   * Replace all skills for an experience (deletes existing associations then bulk-inserts new ones).
   * @param experienceId - MongoDB ObjectId of the experience
   * @param skillIds     - Array of Skill ObjectId strings
   * @returns Resolves when associations have been updated
   */
  async setSkills(experienceId: string, skillIds: string[]): Promise<void> {
    await ExperienceSkill.deleteMany({ experienceId });
    if (skillIds.length > 0) {
      await ExperienceSkill.insertMany(skillIds.map((skillId) => ({ experienceId, skillId })));
    }
  }

  /**
   * Return the skill IDs currently associated with an experience.
   * @param experienceId - MongoDB ObjectId of the experience
   * @returns Array of Skill ObjectId strings
   */
  async getSkills(experienceId: string): Promise<string[]> {
    const records = await ExperienceSkill.find({ experienceId });
    return records.map((r) => r.skillId.toString());
  }
}
