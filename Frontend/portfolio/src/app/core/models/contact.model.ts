/**
 * Contact data models for the admin portal.
 *
 * @file contact.model.ts
 */

/** Full contact information entity returned from the API. */
export interface Contact {
  id: string;
  userId: string;
  email: string;
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
  createdAt: string;
  updatedAt: string;
}

/** Form model used when creating or updating contact information. */
export interface ContactFormData {
  email: string;
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
}

/** Contact fields that a visibility toggle can control. */
export type ContactVisibilityField =
  | 'emailPublic'
  | 'phonePublic'
  | 'linkedinPublic'
  | 'githubPublic'
  | 'twitterPublic'
  | 'websitePublic';
