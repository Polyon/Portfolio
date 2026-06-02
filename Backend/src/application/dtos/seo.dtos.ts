/**
 * SEO Metadata DTOs used by the SEO service, controller, and public endpoints.
 *
 * Section identifiers match the PageType enum from the SEOMetadata model.
 */

/** Valid page section identifiers for SEO metadata. */
export type SEOSection =
  | 'HOME'
  | 'ABOUT'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'PROJECTS'
  | 'SERVICES'
  | 'CONTACT';

/** Request body for creating or updating SEO metadata for a section. */
export interface SEOMetadataRequest {
  /** Page/document title shown in the browser tab and search results (max 70 chars). */
  pageTitle: string;
  /** Meta description used in search result snippets (max 160 chars). */
  metaDescription: string;
  /** Array of keywords for the page. */
  keywords?: string[];
  /** Open Graph title (max 95 chars). Falls back to pageTitle when omitted. */
  ogTitle?: string;
  /** Open Graph description (max 200 chars). Falls back to metaDescription when omitted. */
  ogDescription?: string;
  /** Absolute URL to Open Graph image. */
  ogImageUrl?: string;
}

/** Response body for GET SEO metadata endpoints. */
export interface SEOMetadataResponse {
  section: SEOSection;
  pageTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  lastUpdated: string; // ISO 8601 UTC timestamp
}

/** Request body for toggling profile publication status. */
export interface PublishRequest {
  isPublished: boolean;
}

/** Response body for publish/unpublish operations. */
export interface PublishResponse {
  isPublished: boolean;
  updatedAt: string;
}
