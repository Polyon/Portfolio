import { Schema, model, Document, Types } from 'mongoose';

export enum SkillCategory {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  DEVOPS = 'DEVOPS',
  AI = 'AI',
  DATABASE = 'DATABASE',
  OTHER = 'OTHER',
}

export interface ISkill extends Document {
  userId: Types.ObjectId;
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
  endorsementCount: number;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: Object.values(SkillCategory), required: true },
    proficiencyLevel: { type: Number, min: 1, max: 5, required: true },
    endorsementCount: { type: Number, default: 0 },
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

skillSchema.index({ userId: 1, category: 1 });
skillSchema.index({ userId: 1, isPublished: 1, updatedAt: -1 });
skillSchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Skill = model<ISkill>('Skill', skillSchema);
