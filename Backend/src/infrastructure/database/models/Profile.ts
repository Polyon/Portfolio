import { Schema, model, Document, Types } from 'mongoose';

export interface IProfile extends Document {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  tagline: string;
  bio: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  profileImageUrl?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, trim: true, maxlength: 100 },
    lastName: { type: String, trim: true, maxlength: 100 },
    tagline: { type: String, trim: true, maxlength: 200 },
    bio: { type: String, trim: true, maxlength: 5000 },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    profileImageUrl: { type: String, trim: true },
    email: { type: String, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    linkedinUrl: { type: String, trim: true, maxlength: 500 },
    githubUrl: { type: String, trim: true, maxlength: 500 },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

profileSchema.index({ userId: 1, isPublished: 1, updatedAt: -1 });
profileSchema.index({ bio: 'text' });

export const Profile = model<IProfile>('Profile', profileSchema);
