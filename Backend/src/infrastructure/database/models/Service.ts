import { Schema, model, Document, Types } from 'mongoose';

export enum ServiceCategory {
  BACKEND_DEV = 'BACKEND_DEV',
  FRONTEND_DEV = 'FRONTEND_DEV',
  FULLSTACK = 'FULLSTACK',
  DEVOPS = 'DEVOPS',
  AI_INTEGRATION = 'AI_INTEGRATION',
  CONSULTING = 'CONSULTING',
  OTHER = 'OTHER',
}

export interface IService extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  category: ServiceCategory;
  displayOrder: number;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, enum: Object.values(ServiceCategory), required: true },
    displayOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

serviceSchema.index({ userId: 1, isPublished: 1, displayOrder: 1 });

export const Service = model<IService>('Service', serviceSchema);
