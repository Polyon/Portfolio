import { SkillCategory } from '../../infrastructure/database/models/Skill';
import { EmploymentType } from '../../infrastructure/database/models/Experience';
import { ProjectStatus } from '../../infrastructure/database/models/Project';
import { ServiceCategory } from '../../infrastructure/database/models/Service';

// ---------- Skill ----------
export interface SkillCreateDTO {
  name: string;
  category: SkillCategory;
  proficiencyLevel: number;
}

export interface SkillUpdateDTO {
  name?: string;
  category?: SkillCategory;
  proficiencyLevel?: number;
  isPublished?: boolean;
}

export interface SkillResponseDTO {
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

// ---------- Experience ----------
export interface ExperienceCreateDTO {
  company: string;
  jobTitle: string;
  employmentType: EmploymentType;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentPosition?: boolean;
  description?: string;
  skillIds?: string[];
}

export interface ExperienceUpdateDTO extends Partial<ExperienceCreateDTO> {
  isPublished?: boolean;
}

export interface ExperienceResponseDTO {
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
  skills: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Project ----------
export interface ProjectCreateDTO {
  name: string;
  description: string;
  shortDescription?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  projectUrl?: string;
  githubUrl?: string;
  images?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  skillIds?: string[];
}

export interface ProjectUpdateDTO extends Partial<ProjectCreateDTO> {
  isPublished?: boolean;
}

export interface ProjectResponseDTO {
  id: string;
  userId: string;
  name: string;
  description: string;
  shortDescription?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  projectUrl?: string;
  githubUrl?: string;
  images: string[];
  isFeatured: boolean;
  displayOrder: number;
  skills: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Service ----------
export interface ServiceCreateDTO {
  name: string;
  description: string;
  category: ServiceCategory;
  displayOrder?: number;
}

export interface ServiceUpdateDTO extends Partial<ServiceCreateDTO> {
  isPublished?: boolean;
}

export interface ServiceResponseDTO {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: ServiceCategory;
  displayOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Contact ----------
export interface ContactCreateDTO {
  email?: string;
  emailPublic?: boolean;
  phone?: string;
  phonePublic?: boolean;
  linkedinUrl?: string;
  linkedinPublic?: boolean;
  githubUrl?: string;
  githubPublic?: boolean;
  twitterUrl?: string;
  twitterPublic?: boolean;
  websiteUrl?: string;
  websitePublic?: boolean;
}

export type ContactUpdateDTO = ContactCreateDTO;

export interface ContactResponseDTO {
  id: string;
  userId: string;
  email?: string;
  emailPublic: boolean;
  phone?: string;
  phonePublic: boolean;
  linkedinUrl?: string;
  linkedinPublic: boolean;
  githubUrl?: string;
  githubPublic: boolean;
  twitterUrl?: string;
  twitterPublic: boolean;
  websiteUrl?: string;
  websitePublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
