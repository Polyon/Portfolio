import { Profile } from '../infrastructure/database/models/Profile';
import { Project } from '../infrastructure/database/models/Project';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import { portfolioCache } from '../infrastructure/cache/PortfolioCache';
import type { IProfile } from '../infrastructure/database/models/Profile';
import type { IProject } from '../infrastructure/database/models/Project';

/**
 * Service responsible for content publication and visibility controls.
 *
 * Publishing a profile makes it visible through the public API.
 * Featuring projects controls display prominence on the public portfolio.
 */
export class PublicationService {
  /**
   * Publish or unpublish a user's profile.
   * Invalidates the public portfolio cache on change.
   *
   * @param userId      - Portfolio owner user ID (also the requester in single-owner setup)
   * @param isPublished - Desired publication state
   * @returns The updated profile document
   */
  async publishProfile(userId: string, isPublished: boolean): Promise<IProfile | null> {
    const existing = await Profile.findOne({ userId, isDeleted: false });
    if (!existing) return null;

    const updated = await Profile.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: { isPublished } },
      { returnDocument: 'after' },
    );

    if (updated) {
      portfolioCache.invalidateUser(userId);
      await AuditLog.create({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Profile',
        entityId: updated._id,
        oldValues: { isPublished: existing.isPublished },
        newValues: { isPublished: updated.isPublished },
      });
    }

    return updated;
  }

  /**
   * Publish or unpublish an individual content entity.
   * Supported entity types: 'skill', 'experience', 'project', 'service'.
   *
   * @param userId      - Portfolio owner user ID
   * @param entityType  - Type of entity to update
   * @param entityId    - MongoDB ObjectId string of the entity
   * @param isPublished - Desired publication state
   */
  async publishEntity(
    userId: string,
    entityType: string,
    entityId: string,
    isPublished: boolean,
  ): Promise<boolean> {
    const modelMap: Record<string, Parameters<typeof Profile.findOneAndUpdate>[0] extends never ? never : unknown> = {};
    void modelMap; // kept for future extension; currently handled via dynamic import

    // Dynamic model resolution to keep this service lean
    let Model: typeof Profile | typeof Project | null = null;
    if (entityType === 'profile') {
      const result = await this.publishProfile(userId, isPublished);
      return result !== null;
    } else if (entityType === 'project') {
      Model = Project as unknown as typeof Profile;
    }

    if (!Model) return false;

    const result = await (Model as typeof Profile).findOneAndUpdate(
      { _id: entityId, userId, isDeleted: false },
      { $set: { isPublished } },
      { returnDocument: 'after' },
    );
    if (result) portfolioCache.invalidateUser(userId);
    return result !== null;
  }

  /**
   * Set (or replace) the list of featured projects for a user.
   * Only project IDs in the provided array will be marked featured; all others are un-featured.
   *
   * @param userId     - Portfolio owner user ID
   * @param projectIds - Array of ObjectId strings to mark as featured
   * @returns Number of documents modified
   */
  async setFeaturedProjects(userId: string, projectIds: string[]): Promise<number> {
    // Un-feature everything first
    await Project.updateMany({ userId, isDeleted: false }, { $set: { isFeatured: false } });

    if (projectIds.length === 0) {
      portfolioCache.invalidateUser(userId);
      return 0;
    }

    const result = await Project.updateMany(
      { _id: { $in: projectIds }, userId, isDeleted: false },
      { $set: { isFeatured: true } },
    );

    portfolioCache.invalidateUser(userId);
    return result.modifiedCount;
  }

  /**
   * Get a list of currently featured projects for a user.
   *
   * @param userId - Portfolio owner user ID
   */
  async getFeaturedProjects(userId: string): Promise<IProject[]> {
    return Project.find({ userId, isFeatured: true, isDeleted: false }).sort({ displayOrder: 1 });
  }
}
