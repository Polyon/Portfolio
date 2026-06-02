import { Contact } from '../infrastructure/database/models/Contact';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { IContact } from '../infrastructure/database/models/index';
import { portfolioCache } from '../infrastructure/cache/PortfolioCache';

export interface UpdateContactDTO {
  email?: string;
  emailPublic?: boolean;
  phone?: string;
  phonePublic?: boolean;
  linkedinUrl?: string;
  linkedinPublic?: boolean;
  githubUrl?: string;
  githubPublic?: boolean;
  twitterUrl?: string;
  twitterPublic?: boolean;
  websiteUrl?: string;
  websitePublic?: boolean;
}

export class ContactService {
  /**
   * Retrieve a user's contact information document; returns null if not set.
   * @param userId - Portfolio owner user ID
   * @returns The contact document, or null if not found
   * @auth Requires authenticated user context
   */
  async getByUserId(userId: string): Promise<IContact | null> {
    return Contact.findOne({ userId, isDeleted: false });
  }

  /**
   * Upsert contact information for a user and write an audit log entry.
   * Creates the document if it does not exist; updates it otherwise.
   * @param userId      - Portfolio owner user ID
   * @param dto         - Contact fields to set
   * @param requesterId - User performing the action (for audit trail)
   * @returns The upserted contact document
   * @auth Requires authenticated user context
   */
  async upsert(userId: string, dto: UpdateContactDTO, requesterId?: string): Promise<IContact> {
    const old = await Contact.findOne({ userId, isDeleted: false });
    const updated = await Contact.findOneAndUpdate(
      { userId },
      { $set: { ...dto, userId } },
      { returnDocument: 'after', upsert: true }
    );
    portfolioCache.invalidate(`${userId}:contact`);
    if (requesterId) {
      await AuditLog.create({
        userId: requesterId,
        action: old ? AuditAction.UPDATE : AuditAction.CREATE,
        entityType: 'Contact',
        entityId: updated._id,
        oldValues: old?.toObject(),
        newValues: updated.toObject(),
      });
    }
    return updated;
  }
}
