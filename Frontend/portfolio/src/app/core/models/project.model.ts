/**
 * Project data models for the admin portal.
 *
 * @file project.model.ts
 */

import { Skill } from './skill.model';

/** Lifecycle stage of a portfolio project. */
export enum ProjectStatus {
  PLANNING = 'Planning',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  DEPLOYED = 'Deployed',
}

/** A single project image entry. */
export interface ProjectImage {
  url: string;
  order: number;
}

/** A single portfolio project record returned from the API. */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  shortDescription: string;
  status: ProjectStatus;
  startDate: string;
  completionDate?: string;
  repositoryUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  /** Raw image URLs as returned by the backend (stored as string[] in MongoDB). */
  images?: string[];
  isFeatured: boolean;
  isPublished: boolean;
  skills?: Skill[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Form model used when creating or editing a project. */
export interface ProjectFormData {
  name: string;
  description: string;
  shortDescription: string;
  status: ProjectStatus;
  startDate: string;
  completionDate?: string;
  repositoryUrl?: string;
  liveUrl?: string;
  isFeatured: boolean;
  isPublished: boolean;
  skillIds?: string[];
}

/** Query parameters for the projects list endpoint. */
export interface ProjectFilter {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  featured?: boolean;
}

/** Visual configuration for a project status badge. */
export interface ProjectStatusBadge {
  status: ProjectStatus;
  label: string;
  color: string;
  icon: string;
}
