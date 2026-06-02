/**
 * Public portal data models.
 * Re-exports core models and extends them with public display configurations.
 *
 * @file public-portal.models.ts
 */

import { Profile } from '../../../core/models/profile.model';
import { Skill, SkillCategory } from '../../../core/models/skill.model';
import { Experience } from '../../../core/models/experience.model';
import { Project, ProjectStatus } from '../../../core/models/project.model';
import { Service, ServiceCategory } from '../../../core/models/service.model';
import { Contact } from '../../../core/models/contact.model';

// Re-export core types for convenience
export type { Profile, Skill, SkillCategory, Experience, Project, ProjectStatus, Service, ServiceCategory, Contact };

/**
 * SEO metadata for a portfolio section.
 *
 * @interface SeoMetadata
 */
export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterHandle?: string;
  structuredData?: unknown;
}

/**
 * Controls section-level visibility on the public portal.
 *
 * @interface SectionVisibility
 */
export interface SectionVisibility {
  aboutVisible: boolean;
  skillsVisible: boolean;
  experienceVisible: boolean;
  projectsVisible: boolean;
  servicesVisible: boolean;
  contactVisible: boolean;
}

/**
 * Top-level configuration for the public portal display.
 *
 * @interface PublicPortalConfig
 */
export interface PublicPortalConfig {
  siteName: string;
  siteDescription: string;
  portfolioOwner: string;
  primaryColor: string;
  accentColor: string;
  showServices: boolean;
  showContact: boolean;
  sections: SectionVisibility;
}

/**
 * Aggregated portfolio data used to render the full public page.
 *
 * @interface PortfolioPageData
 */
export interface PortfolioPageData {
  config: PublicPortalConfig;
  profile: Profile;
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  services: Service[];
  contact: Contact;
  seoMetadata: SeoMetadata;
  sections: SectionVisibility;
}

/**
 * Generic wrapper for section data that includes loading and error states.
 *
 * @template T - The underlying data type.
 * @interface SectionData
 */
export interface SectionData<T> {
  data: T;
  loading: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Cache entry for portfolio data with expiration tracking.
 *
 * @interface PortfolioCacheEntry
 */
export interface PortfolioCacheEntry {
  data: PortfolioPageData;
  timestamp: Date;
  expiresAt: Date;
  /** Time to live in milliseconds. */
  ttl: number;
}
