import { Skill, SkillCategory } from '../database/models/Skill';
import type { ISkill } from '../database/models/index';

export class SkillRepository {
  /**
   * Create a new skill document for the given user.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial skill fields to set
   * @returns The newly created skill document
   */
  async create(userId: string, data: Partial<ISkill>): Promise<ISkill> {
    return Skill.create({ ...data, userId });
  }

  /**
   * Return all non-deleted skills for a user, sorted by category then name.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of skill documents
   */
  async findByUserId(userId: string): Promise<ISkill[]> {
    return Skill.find({ userId, isDeleted: false }).sort({ category: 1, name: 1 });
  }

  /**
   * Return non-deleted skills filtered by category for a user, sorted alphabetically.
   * @param userId   - Portfolio owner user ID
   * @param category - SkillCategory enum value to filter by
   * @returns Resolved array of matching skill documents
   */
  async findByCategory(userId: string, category: SkillCategory): Promise<ISkill[]> {
    return Skill.find({ userId, category, isDeleted: false }).sort({ name: 1 });
  }

  /**
   * Find a single non-deleted skill by its MongoDB ObjectId.
   * @param skillId - MongoDB ObjectId of the skill
   * @returns The skill document, or null if not found or deleted
   */
  async findById(skillId: string): Promise<ISkill | null> {
    return Skill.findOne({ _id: skillId, isDeleted: false });
  }

  /**
   * Apply a partial update to a non-deleted skill. Returns the updated document or null.
   * @param skillId - MongoDB ObjectId of the skill
   * @param data    - Partial skill fields to apply
   * @returns The updated skill document, or null if not found
   */
  async update(skillId: string, data: Partial<ISkill>): Promise<ISkill | null> {
    return Skill.findOneAndUpdate({ _id: skillId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /**
   * Soft-delete a skill by setting isDeleted=true.
   * @param skillId - MongoDB ObjectId of the skill
   * @returns Resolves when the soft-delete completes
   */
  async delete(skillId: string): Promise<void> {
    await Skill.updateOne({ _id: skillId }, { $set: { isDeleted: true } });
  }
}
