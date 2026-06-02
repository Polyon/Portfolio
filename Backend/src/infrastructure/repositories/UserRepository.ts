import { User, UserRole } from '../database/models/index';
import type { IUser } from '../database/models/index';
import type { Types } from 'mongoose';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  role?: UserRole;
}

/**
 * Repository for User entity persistence operations.
 */
export class UserRepository {
  /** Find a user by email (case-insensitive). */
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase(), isDeleted: false });
  }

  /** Find a user by their MongoDB ObjectId. */
  async findById(userId: string): Promise<IUser | null> {
    return User.findOne({ _id: userId, isDeleted: false });
  }

  /** Create a new user. */
  async create(data: CreateUserInput): Promise<IUser> {
    return User.create({ ...data, email: data.email.toLowerCase() });
  }

  /** Update a user by id, returning the updated document. */
  async update(userId: string | Types.ObjectId, data: UpdateUserInput): Promise<IUser | null> {
    return User.findOneAndUpdate({ _id: userId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /** Soft-delete a user. */
  async delete(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { isDeleted: true } });
  }
}
