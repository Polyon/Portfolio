import { Skill, SkillCategory } from '../infrastructure/database/models/Skill';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { ISkill } from '../infrastructure/database/models/index';

export interface CreateSkillDTO {
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
}

export interface UpdateSkillDTO {
  name?: string;
  category?: SkillCategory;
  proficiencyLevel?: number;
  isPublished?: boolean;
}

export class SkillService {
  /**
   * List all non-deleted skills for a user, sorted by category then name.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of skill documents
   * @auth Requires authenticated user context
   */
  async list(userId: string): Promise<ISkill[]> {
    return Skill.find({ userId, isDeleted: false }).sort({ category: 1, name: 1 });
  }

  /**
   * List skills filtered by category for a user, sorted alphabetically.
   * @param userId   - Portfolio owner user ID
   * @param category - SkillCategory enum value to filter by
   * @returns Resolved array of skill documents matching the category
   * @auth Requires authenticated user context
   */
  async listByCategory(userId: string, category: string): Promise<ISkill[]> {
    return Skill.find({ userId, category, isDeleted: false }).sort({ name: 1 });
  }

  /**
   * Create a new skill for a user and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param dto    - Skill fields
   * @returns The newly created skill document
   * @auth Requires authenticated user context
   */
  async create(userId: string, dto: CreateSkillDTO): Promise<ISkill> {
    const skill = await Skill.create({ ...dto, userId });
    await AuditLog.create({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Skill',
      entityId: skill._id,
      newValues: skill.toObject(),
    });
    return skill;
  }

  /**
   * Update a skill owned by the user and write an audit log entry.
   * @param userId  - Portfolio owner user ID
   * @param skillId - MongoDB ObjectId of the skill to update
   * @param dto     - Partial skill fields to apply
   * @returns The updated skill document, or null if not found
   * @auth Requires authenticated user context
   */
  async update(userId: string, skillId: string, dto: UpdateSkillDTO): Promise<ISkill | null> {
    const old = await Skill.findOne({ _id: skillId, userId, isDeleted: false });
    const updated = await Skill.findOneAndUpdate(
      { _id: skillId, userId, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after' }
    );
    if (updated) {
      await AuditLog.create({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Skill',
        entityId: updated._id,
        oldValues: old?.toObject(),
        newValues: updated.toObject(),
      });
    }
    return updated;
  }

  /**
   * Soft-delete a skill and write an audit log entry.
   * @param userId  - Portfolio owner user ID
   * @param skillId - MongoDB ObjectId of the skill to delete
   * @returns Resolves when the soft-delete completes
   * @auth Requires authenticated user context
   */
  async delete(userId: string, skillId: string): Promise<void> {
    await Skill.updateOne({ _id: skillId, userId }, { $set: { isDeleted: true } });
    await AuditLog.create({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Skill',
      entityId: skillId,
    });
  }

  /**
   * Search skills by name (case-insensitive) with optional category filter.
   * @param userId     - Portfolio owner user ID
   * @param searchTerm - Substring to match against skill names (case-insensitive regex)
   * @param category   - Optional SkillCategory to further filter results
   * @returns Resolved array of matching skill documents
   * @auth Requires authenticated user context
   */
  async searchSkills(userId: string, searchTerm: string, category?: string): Promise<ISkill[]> {
    const query: Record<string, unknown> = {
      userId,
      isDeleted: false,
      name: { $regex: searchTerm, $options: 'i' },
    };
    if (category) {
      query['category'] = category;
    }
    return Skill.find(query).sort({ category: 1, name: 1 });
  }

  /**
   * Find a single skill by id for the given user.
   * @param userId  - Portfolio owner user ID
   * @param skillId - MongoDB ObjectId of the skill
   * @returns The skill document, or null if not found or deleted
   * @auth Requires authenticated user context
   */
  async findById(userId: string, skillId: string): Promise<ISkill | null> {
    return Skill.findOne({ _id: skillId, userId, isDeleted: false });
  }
}
