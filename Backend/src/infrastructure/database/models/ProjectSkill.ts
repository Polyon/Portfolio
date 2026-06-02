import { Schema, model, Document, Types } from 'mongoose';

export interface IProjectSkill extends Document {
  projectId: Types.ObjectId;
  skillId: Types.ObjectId;
  createdAt: Date;
}

const projectSkillSchema = new Schema<IProjectSkill>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

projectSkillSchema.index({ projectId: 1, skillId: 1 }, { unique: true });

export const ProjectSkill = model<IProjectSkill>('ProjectSkill', projectSkillSchema);
