import { ProjectStatus } from '../../infrastructure/database/models/Project';

/** Request body for POST /api/admin/projects */
export interface CreateProjectDTO {
  name: string;
  description?: string;
  shortDescription?: string;
  status?: ProjectStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  projectUrl?: string;
  githubUrl?: string;
  images?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  isPublished?: boolean;
}

/** Request body for PUT /api/admin/projects/:id */
export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  shortDescription?: string;
  status?: ProjectStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  projectUrl?: string;
  githubUrl?: string;
  images?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  isPublished?: boolean;
}

/** Response shape for project endpoints. */
export interface ProjectResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  shortDescription?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  projectUrl?: string;
  githubUrl?: string;
  images: string[];
  isFeatured: boolean;
  displayOrder: number;
  isPublished: boolean;
  skillIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Request body for PUT /api/admin/projects/:id/featured */
export interface SetFeaturedRequest {
  isFeatured: boolean;
}

/** Request body for POST /api/admin/projects/:id/skills */
export interface SetProjectSkillsRequest {
  skillIds: string[];
}
