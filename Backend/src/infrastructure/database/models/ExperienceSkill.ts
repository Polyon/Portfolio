import { Schema, model, Document, Types } from 'mongoose';

export interface IExperienceSkill extends Document {
  experienceId: Types.ObjectId;
  skillId: Types.ObjectId;
  createdAt: Date;
}

const experienceSkillSchema = new Schema<IExperienceSkill>(
  {
    experienceId: { type: Schema.Types.ObjectId, ref: 'Experience', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

experienceSkillSchema.index({ experienceId: 1, skillId: 1 }, { unique: true });

export const ExperienceSkill = model<IExperienceSkill>('ExperienceSkill', experienceSkillSchema);
