import { Schema, model, Document, Types } from 'mongoose';

export enum ProjectStatus {
  PLANNING = 'Planning',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  DEPLOYED = 'Deployed',
}

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  shortDescription?: string;
  status: ProjectStatus;
  startDate?: Date;
  completionDate?: Date;
  liveUrl?: string;
  repositoryUrl?: string;
  images: string[];
  isFeatured: boolean;
  displayOrder: number;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 10000 },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.PLANNING },
    startDate: { type: Date },
    completionDate: { type: Date },
    liveUrl: { type: String, trim: true },
    repositoryUrl: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'] != null ? String(ret['_id']) : undefined;
        delete ret['_id'];
        delete ret['__v'];
        delete ret['isDeleted'];
        return ret;
      },
    },
  }
);

projectSchema.index({ userId: 1, isFeatured: 1, displayOrder: 1 });
projectSchema.index({ userId: 1, isPublished: 1, updatedAt: -1 });

export const Project = model<IProject>('Project', projectSchema);
