export interface PublicProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  location: { city?: string; state?: string; country?: string };
  profileImageUrl?: string;
}

export interface PublicSkillsResponse {
  data: PublicSkillItem[];
  meta: PaginationMeta;
}

export interface PublicSkillItem {
  id: string;
  name: string;
  category: string;
  proficiencyLevel: number;
  endorsementCount: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PublicExperienceItem {
  id: string;
  company: string;
  jobTitle: string;
  employmentType: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrentPosition: boolean;
  description?: string;
}

export type PublicExperienceResponse = PublicExperienceItem[];

export interface PublicProjectItem {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  projectUrl?: string;
  githubUrl?: string;
  images: string[];
  isFeatured: boolean;
}

export type PublicProjectsResponse = PublicProjectItem[];

export interface PublicServiceItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  displayOrder: number;
}

export type PublicServicesResponse = PublicServiceItem[];

export interface PublicContactResponse {
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
}

export interface PublicPortfolioResponse {
  profile: PublicProfileResponse | null;
  skills: PublicSkillItem[];
  experience: PublicExperienceItem[];
  projects: PublicProjectItem[];
  services: PublicServiceItem[];
  contact: PublicContactResponse | null;
}
