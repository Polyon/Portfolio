import { Contact } from '../database/models/Contact';
import type { IContact } from '../database/models/index';

export class ContactRepository {
  /**
   * Upsert contact information for a user.
   * Creates the document if it does not exist; updates it otherwise.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial contact fields to set
   * @returns The upserted contact document
   */
  async upsert(userId: string, data: Partial<IContact>): Promise<IContact> {
    return Contact.findOneAndUpdate(
      { userId },
      { $set: { ...data, userId } },
      { returnDocument: 'after', upsert: true }
    ) as Promise<IContact>;
  }

  /**
   * Return the contact document for a user (non-deleted), or null if not set.
   * @param userId - Portfolio owner user ID
   * @returns The contact document, or null if not found
   */
  async findByUserId(userId: string): Promise<IContact | null> {
    return Contact.findOne({ userId, isDeleted: false });
  }

  /**
   * Return only publicly visible contact fields (respects *Public boolean flags).
   * @param userId - Portfolio owner user ID
   * @returns Partial contact object with only public fields, or null if no record exists
   */
  async getPublic(userId: string): Promise<Partial<IContact> | null> {
    const contact = await Contact.findOne({ userId, isDeleted: false });
    if (!contact) return null;
    return {
      email: contact.emailPublic ? contact.email : undefined,
      phone: contact.phonePublic ? contact.phone : undefined,
      linkedinUrl: contact.linkedinPublic ? contact.linkedinUrl : undefined,
      githubUrl: contact.githubPublic ? contact.githubUrl : undefined,
      twitterUrl: contact.twitterPublic ? contact.twitterUrl : undefined,
      websiteUrl: contact.websitePublic ? contact.websiteUrl : undefined,
    };
  }
}
