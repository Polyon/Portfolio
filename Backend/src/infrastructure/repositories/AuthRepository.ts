import { User } from '../database/models/index';
import type { IUser } from '../database/models/index';

/**
 * Repository dedicated to authentication-related user queries.
 * Delegates to the User Mongoose model.
 */
export class AuthRepository {
  /**
   * Find an active (non-deleted) user by email address.
   * Returns the document including passwordHash for credential validation.
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase(), isDeleted: false });
  }

  /**
   * Update the lastLoginAt timestamp for a user.
   */
  async updateLastLogin(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId, isDeleted: false },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  /**
   * Record a failed login attempt for the given email.
   * Used for rate-limiting and audit purposes.
   * No-ops if the user does not exist.
   */
  async recordFailedLogin(email: string): Promise<void> {
    await User.updateOne(
      { email: email.toLowerCase(), isDeleted: false },
      { $inc: { failedLoginCount: 1 }, $set: { lastFailedLoginAt: new Date() } },
    );
  }

  /**
   * Find a user by their MongoDB ObjectId string.
   */
  async findUserById(userId: string): Promise<IUser | null> {
    return User.findOne({ _id: userId, isDeleted: false });
  }
}
