import { Experience, EmploymentType } from '../infrastructure/database/models/Experience';
import { ExperienceSkill } from '../infrastructure/database/models/ExperienceSkill';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { IExperience } from '../infrastructure/database/models/index';
import { NotFoundError } from '../domain/errors/AppError';
import { portfolioCache } from '../infrastructure/cache/PortfolioCache';

export interface CreateExperienceDTO {
  company: string;
  jobTitle: string;
  employmentType: EmploymentType;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentPosition?: boolean;
  description?: string;
}

export interface UpdateExperienceDTO extends Partial<CreateExperienceDTO> {
  isPublished?: boolean;
}

export class ExperienceService {
  /**
   * List all non-deleted experiences for a user, sorted by startDate descending.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of experience documents
   * @auth Requires authenticated user context
   */
  async list(userId: string): Promise<IExperience[]> {
    return Experience.find({ userId, isDeleted: false }).populate('skills').sort({ startDate: -1 });
  }

  /**
   * Create a new experience entry for a user and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param dto    - Experience fields
   * @returns The newly created experience document
   * @auth Requires authenticated user context
   */
  async create(userId: string, dto: CreateExperienceDTO): Promise<IExperience> {
    const exp = await Experience.create({ ...dto, userId });
    await AuditLog.create({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Experience',
      entityId: exp._id,
      newValues: exp.toObject(),
    });
    return exp;
  }

  /**
   * Update an experience owned by the user and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param expId  - MongoDB ObjectId of the experience to update
   * @param dto    - Partial experience fields to apply
   * @returns The updated experience document, or null if not found
   * @auth Requires authenticated user context
   */
  async update(userId: string, expId: string, dto: UpdateExperienceDTO): Promise<IExperience | null> {
    const old = await Experience.findOne({ _id: expId, userId, isDeleted: false });
    const updated = await Experience.findOneAndUpdate(
      { _id: expId, userId, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after' }
    );
    if (updated) {
      await AuditLog.create({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Experience',
        entityId: updated._id,
        oldValues: old?.toObject(),
        newValues: updated.toObject(),
      });
    }
    return updated;
  }

  /**
   * Soft-delete an experience and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param expId  - MongoDB ObjectId of the experience to delete
   * @returns Resolves when the soft-delete completes
   * @auth Requires authenticated user context
   */
  async delete(userId: string, expId: string): Promise<void> {
    await Experience.updateOne({ _id: expId, userId }, { $set: { isDeleted: true } });
    await AuditLog.create({ userId, action: AuditAction.DELETE, entityType: 'Experience', entityId: expId });
  }

  /**
   * Set the skills associated with an experience (replaces existing).
   * @param userId   - Portfolio owner user ID (used for ownership verification)
   * @param expId    - MongoDB ObjectId of the experience
   * @param skillIds - Array of Skill ObjectId strings to associate
   * @returns Resolves when skill associations have been updated
   * @auth Requires authenticated user context
   */
  async setSkills(userId: string, expId: string, skillIds: string[]): Promise<void> {
    // Verify ownership
    const exp = await Experience.findOne({ _id: expId, userId, isDeleted: false });
    if (!exp) throw new NotFoundError('Experience not found');
    // Update junction table (legacy)
    await ExperienceSkill.deleteMany({ experienceId: expId });
    if (skillIds.length > 0) {
      await ExperienceSkill.insertMany(skillIds.map((skillId) => ({ experienceId: expId, skillId })));
    }
    // Update embedded skills array on Experience document
    await Experience.updateOne({ _id: expId }, { $set: { skills: skillIds } });
    // Invalidate public portfolio cache so changes are reflected immediately
    portfolioCache.invalidate(`${userId}:experience`);
    await AuditLog.create({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Experience',
      entityId: expId,
      newValues: { skillIds },
    });
  }

  /** Retrieve the skill IDs associated with an experience. */
  async getSkills(expId: string): Promise<string[]> {
    const records = await ExperienceSkill.find({ experienceId: expId });
    return records.map((r) => r.skillId.toString());
  }

  /** Find a single experience by id for the given user. */
  async findById(userId: string, expId: string): Promise<IExperience | null> {
    return Experience.findOne({ _id: expId, userId, isDeleted: false });
  }
}
