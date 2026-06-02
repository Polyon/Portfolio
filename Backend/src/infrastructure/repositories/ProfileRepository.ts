import { Profile } from '../database/models/Profile';
import type { IProfile } from '../database/models/index';

export class ProfileRepository {
  /**
   * Create a new profile document for the given user.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial profile fields to set
   * @returns The newly created profile document
   */
  async create(userId: string, data: Partial<IProfile>): Promise<IProfile> {
    return Profile.create({ ...data, userId });
  }

  /**
   * Find a non-deleted profile by user ID.
   * @param userId - Portfolio owner user ID
   * @returns The profile document, or null if not found
   */
  async findByUserId(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId, isDeleted: false });
  }

  /**
   * Apply a partial update to the user's non-deleted profile. Returns the updated document or null.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial profile fields to apply
   * @returns The updated profile document, or null if not found
   */
  async update(userId: string, data: Partial<IProfile>): Promise<IProfile | null> {
    return Profile.findOneAndUpdate({ userId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /**
   * Soft-delete the user's profile.
   * @param userId - Portfolio owner user ID
   * @returns Resolves when the soft-delete completes
   */
  async delete(userId: string): Promise<void> {
    await Profile.updateOne({ userId }, { $set: { isDeleted: true } });
  }

  /**
   * Returns the profile only if it is published (isPublished=true).
   * @param userId - Portfolio owner user ID
   * @returns The published profile document, or null if unpublished
   */
  async getPublished(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId, isPublished: true, isDeleted: false });
  }
}
