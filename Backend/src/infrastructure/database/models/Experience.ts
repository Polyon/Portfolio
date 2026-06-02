import { Schema, model, Document, Types } from 'mongoose';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  FREELANCE = 'FREELANCE',
  INTERNSHIP = 'INTERNSHIP',
}

export interface IExperience extends Document {
  userId: Types.ObjectId;
  company: string;
  jobTitle: string;
  employmentType: EmploymentType;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentPosition: boolean;
  description?: string;
  skills: Types.ObjectId[];
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true, trim: true, maxlength: 200 },
    jobTitle: { type: String, required: true, trim: true, maxlength: 200 },
    employmentType: { type: String, enum: Object.values(EmploymentType), required: true },
    location: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isCurrentPosition: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 5000 },
    skills: [{ type: Schema.Types.ObjectId, ref: 'Skill', default: [] }],
    isPublished: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        r['id'] = r['_id'] != null ? String(r['_id']) : undefined;
        delete r['_id'];
        delete r['__v'];
        delete r['isDeleted'];
        return r;
      },
    },
  }
);

experienceSchema.index({ userId: 1, startDate: -1 });
experienceSchema.index({ userId: 1, isPublished: 1, updatedAt: -1 });

export const Experience = model<IExperience>('Experience', experienceSchema);
