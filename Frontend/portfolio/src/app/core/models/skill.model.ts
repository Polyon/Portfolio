/**
 * Skill data models for the admin portal.
 *
 * @file skill.model.ts
 */

/** Categorises a skill by domain. */
export enum SkillCategory {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  DEVOPS = 'DEVOPS',
  AI = 'AI',
  DATABASE = 'DATABASE',
  OTHER = 'OTHER'
}

/** A single skill record returned from the API. */
export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: SkillCategory;
  /** Proficiency level on a 1–5 scale. */
  proficiencyLevel: number;
  endorsementCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Form model used when creating or editing a skill. */
export interface SkillFormData {
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
  endorsementCount: number;
  isPublished: boolean;
}

/** Query parameters for the skills list endpoint. */
export interface SkillFilter {
  page?: number;
  limit?: number;
  category?: SkillCategory;
  search?: string;
  proficiencyLevel?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
