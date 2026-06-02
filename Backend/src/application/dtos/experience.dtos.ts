import { EmploymentType } from '../../infrastructure/database/models/Experience';

/** Request body for POST /api/admin/experiences */
export interface CreateExperienceDTO {
  company: string;
  jobTitle: string;
  employmentType: EmploymentType;
  location?: string;
  startDate: Date | string;
  endDate?: Date | string;
  isCurrentPosition?: boolean;
  description?: string;
  isPublished?: boolean;
}

/** Request body for PUT /api/admin/experiences/:id */
export interface UpdateExperienceDTO {
  company?: string;
  jobTitle?: string;
  employmentType?: EmploymentType;
  location?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isCurrentPosition?: boolean;
  description?: string;
  isPublished?: boolean;
}

/** Response shape for experience endpoints. */
export interface ExperienceResponse {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  employmentType: EmploymentType;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentPosition: boolean;
  description?: string;
  isPublished: boolean;
  skillIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Request body for POST /api/admin/experiences/:id/skills */
export interface SetExperienceSkillsRequest {
  skillIds: string[];
}
