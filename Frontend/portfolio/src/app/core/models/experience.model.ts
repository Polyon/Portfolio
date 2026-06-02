/**
 * Experience data models for the admin portal.
 *
 * @file experience.model.ts
 */

import { Skill } from './skill.model';

/** Employment type enumeration — mirrors backend EmploymentType enum. */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  FREELANCE = 'FREELANCE',
  INTERNSHIP = 'INTERNSHIP',
}

/** A single work-experience record returned from the API. */
export interface Experience {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  description: string;
  startDate: string;           // ISO 8601
  endDate?: string;            // ISO 8601; absent when isCurrentPosition is true
  isCurrentPosition: boolean;
  location?: string;
  employmentType?: EmploymentType;
  isPublished: boolean;
  skills?: Skill[];            // Associated skills (populated)
  displayOrder: number;
  companyLogoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Form model used when creating or editing an experience entry. */
export interface ExperienceFormData {
  company: string;
  jobTitle: string;
  description: string;
  startDate: string;
  endDate?: string;
  isCurrentPosition: boolean;
  location?: string;
  employmentType?: EmploymentType;
  isPublished: boolean;
  companyLogoUrl?: string;
}

/** Query parameters for the experience list endpoint. */
export interface ExperienceFilter {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  employmentType?: EmploymentType;
}
