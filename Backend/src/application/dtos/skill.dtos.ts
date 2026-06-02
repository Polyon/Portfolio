import { SkillCategory } from '../../infrastructure/database/models/Skill';

/** Request body for POST /api/admin/skills */
export interface CreateSkillDTO {
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
  endorsementCount?: number;
  isPublished?: boolean;
}

/** Request body for PUT /api/admin/skills/:id */
export interface UpdateSkillDTO {
  name?: string;
  category?: SkillCategory;
  proficiencyLevel?: number;
  endorsementCount?: number;
  isPublished?: boolean;
}

/** Response shape for skill endpoints. */
export interface SkillResponse {
  id: string;
  userId: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
  endorsementCount: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Query parameters for GET /api/admin/skills */
export interface SkillsListQuery {
  page?: number;
  limit?: number;
  category?: SkillCategory;
  search?: string;
}
