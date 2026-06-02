import { Profile } from '../infrastructure/database/models/Profile';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { IProfile } from '../infrastructure/database/models/index';
import type { UpdateProfileDTO } from './dtos/profile.dtos';
import type { Types } from 'mongoose';

export class ProfileService {
  /** Get a profile by user id. */
  async getByUserId(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId, isDeleted: false });
  }

  /** Create a new empty profile for a user. */
  async create(userId: string | Types.ObjectId): Promise<IProfile> {
    return Profile.create({ userId });
  }

  /** Update profile fields. */
  async update(userId: string, dto: UpdateProfileDTO, requesterId?: string): Promise<IProfile | null> {
    const existing = await Profile.findOne({ userId, isDeleted: false });
    const updated = await Profile.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after', upsert: false }
    );

    if (updated && requesterId) {
      await AuditLog.create({
        userId: requesterId,
        action: AuditAction.UPDATE,
        entityType: 'Profile',
        entityId: updated._id,
        oldValues: existing ? existing.toObject() : undefined,
        newValues: updated.toObject(),
      });
    }

    return updated;
  }

  /** Soft-delete a profile. */
  async delete(userId: string): Promise<void> {
    await Profile.updateOne({ userId }, { $set: { isDeleted: true } });
  }

  /** Returns the profile only when isPublished=true; used by the public API. */
  async getPublished(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId, isPublished: true, isDeleted: false });
  }
}
