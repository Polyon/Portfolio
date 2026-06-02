import { Schema, model, Document, Types } from 'mongoose';

export interface IContact extends Document {
  userId: Types.ObjectId;
  email?: string;
  emailPublic: boolean;
  phone?: string;
  phonePublic: boolean;
  linkedinUrl?: string;
  linkedinPublic: boolean;
  githubUrl?: string;
  githubPublic: boolean;
  twitterUrl?: string;
  twitterPublic: boolean;
  websiteUrl?: string;
  websitePublic: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email: { type: String, trim: true },
    emailPublic: { type: Boolean, default: true },
    phone: { type: String, trim: true },
    phonePublic: { type: Boolean, default: false },
    linkedinUrl: { type: String, trim: true },
    linkedinPublic: { type: Boolean, default: true },
    githubUrl: { type: String, trim: true },
    githubPublic: { type: Boolean, default: true },
    twitterUrl: { type: String, trim: true },
    twitterPublic: { type: Boolean, default: false },
    websiteUrl: { type: String, trim: true },
    websitePublic: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Contact = model<IContact>('Contact', contactSchema);
