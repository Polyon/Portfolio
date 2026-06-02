import { Project, ProjectStatus } from '../infrastructure/database/models/Project';
import { ProjectSkill } from '../infrastructure/database/models/ProjectSkill';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { IProject } from '../infrastructure/database/models/index';
import { NotFoundError } from '../domain/errors/AppError';
import { portfolioCache } from '../infrastructure/cache/PortfolioCache';

export interface CreateProjectDTO {
  name: string;
  description: string;
  shortDescription?: string;
  status?: ProjectStatus;
  startDate?: Date;
  completionDate?: Date;
  liveUrl?: string;
  repositoryUrl?: string;
  images?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {
  isPublished?: boolean;
}

export class ProjectService {
  /**
   * List all non-deleted projects for a user, sorted by displayOrder then updatedAt descending.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of project documents
   * @auth Requires authenticated user context
   */
  async list(userId: string): Promise<IProject[]> {
    return Project.find({ userId, isDeleted: false }).sort({ displayOrder: 1, updatedAt: -1 });
  }

  /**
   * Create a new project for a user and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param dto    - Project fields
   * @returns The newly created project document
   * @auth Requires authenticated user context
   */
  async create(userId: string, dto: CreateProjectDTO): Promise<IProject> {
    const project = await Project.create({ ...dto, userId });
    await AuditLog.create({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Project',
      entityId: project._id,
      newValues: project.toObject(),
    });
    return project;
  }

  /**
   * Update a project owned by the user and write an audit log entry.
   * @param userId     - Portfolio owner user ID
   * @param projectId  - MongoDB ObjectId of the project to update
   * @param dto        - Partial project fields to apply
   * @returns The updated project document, or null if not found
   * @auth Requires authenticated user context
   */
  async update(userId: string, projectId: string, dto: UpdateProjectDTO): Promise<IProject | null> {
    const old = await Project.findOne({ _id: projectId, userId, isDeleted: false });
    const updated = await Project.findOneAndUpdate(
      { _id: projectId, userId, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after' }
    );
    if (updated) {
      portfolioCache.invalidateUser(userId);
      await AuditLog.create({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: updated._id,
        oldValues: old?.toObject(),
        newValues: updated.toObject(),
      });
    }
    return updated;
  }

  /**
   * Soft-delete a project and write an audit log entry.
   * @param userId    - Portfolio owner user ID
   * @param projectId - MongoDB ObjectId of the project to delete
   * @returns Resolves when the soft-delete completes
   * @auth Requires authenticated user context
   */
  async delete(userId: string, projectId: string): Promise<void> {
    await Project.updateOne({ _id: projectId, userId }, { $set: { isDeleted: true } });
    await AuditLog.create({ userId, action: AuditAction.DELETE, entityType: 'Project', entityId: projectId });
  }

  /**
   * Set the skills associated with a project (replaces existing).
   * @param userId    - Portfolio owner user ID (used for ownership verification)
   * @param projectId - MongoDB ObjectId of the project
   * @param skillIds  - Array of Skill ObjectId strings to associate
   * @returns Resolves when skill associations have been updated
   * @auth Requires authenticated user context
   */
  async setSkills(userId: string, projectId: string, skillIds: string[]): Promise<void> {
    const project = await Project.findOne({ _id: projectId, userId, isDeleted: false });
    if (!project) throw new NotFoundError('Project not found');
    await ProjectSkill.deleteMany({ projectId });
    if (skillIds.length > 0) {
      await ProjectSkill.insertMany(skillIds.map((skillId) => ({ projectId, skillId })));
    }
    await AuditLog.create({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Project',
      entityId: projectId,
      newValues: { skillIds },
    });
  }

  /**
   * Retrieve the skill IDs associated with a project.
   * @param projectId - MongoDB ObjectId of the project
   * @returns Array of Skill ObjectId strings
   */
  async getSkills(projectId: string): Promise<string[]> {
    const records = await ProjectSkill.find({ projectId });
    return records.map((r) => r.skillId.toString());
  }

  /**
   * Set featured status on a project.
   * @param userId     - Portfolio owner user ID
   * @param projectId  - MongoDB ObjectId of the project
   * @param isFeatured - Whether to mark the project as featured
   * @returns The updated project document, or null if not found
   * @auth Requires authenticated user context
   */
  async setFeatured(userId: string, projectId: string, isFeatured: boolean): Promise<IProject | null> {
    return this.update(userId, projectId, { isFeatured });
  }

  /**
   * Find a single project by id for the given user.
   * @param userId    - Portfolio owner user ID
   * @param projectId - MongoDB ObjectId of the project
   * @returns The project document, or null if not found or deleted
   * @auth Requires authenticated user context
   */
  async findById(userId: string, projectId: string): Promise<IProject | null> {
    return Project.findOne({ _id: projectId, userId, isDeleted: false });
  }

  /** List featured projects for a user. */
  async listFeatured(userId: string): Promise<IProject[]> {
    return Project.find({ userId, isFeatured: true, isDeleted: false }).sort({ displayOrder: 1 });
  }

  /** Filter projects by status. */
  async listByStatus(userId: string, status: ProjectStatus): Promise<IProject[]> {
    return Project.find({ userId, status, isDeleted: false }).sort({ displayOrder: 1, updatedAt: -1 });
  }
}
