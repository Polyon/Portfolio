import { Schema, model, Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  isDeleted: boolean;
  lastLoginAt?: Date;
  failedLoginCount?: number;
  lastFailedLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.ADMIN },
    isDeleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lastFailedLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
