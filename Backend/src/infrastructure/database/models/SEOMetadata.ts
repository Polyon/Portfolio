import { Schema, model, Document, Types } from 'mongoose';

export enum PageType {
  HOME = 'HOME',
  ABOUT = 'ABOUT',
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECTS = 'PROJECTS',
  SERVICES = 'SERVICES',
  CONTACT = 'CONTACT',
}

export interface ISEOMetadata extends Document {
  userId: Types.ObjectId;
  pageType: PageType;
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  structuredData?: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seoMetadataSchema = new Schema<ISEOMetadata>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pageType: { type: String, enum: Object.values(PageType), required: true },
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 160 },
    keywords: [{ type: String, trim: true }],
    ogTitle: { type: String, trim: true, maxlength: 95 },
    ogDescription: { type: String, trim: true, maxlength: 200 },
    ogImage: { type: String, trim: true },
    structuredData: { type: Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

seoMetadataSchema.index({ userId: 1, pageType: 1 }, { unique: true });

export const SEOMetadata = model<ISEOMetadata>('SEOMetadata', seoMetadataSchema);
