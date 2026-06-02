export interface ProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  location: { city?: string; state?: string; country?: string };
  profileImageUrl?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  tagline?: string;
  bio?: string;
  location?: { city?: string; state?: string; country?: string };
  profileImageUrl?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  isPublished?: boolean;
}

/** Request body for toggling publication status. */
export interface PublishProfileRequest {
  isPublished: boolean;
}

/** SEO metadata returned from GET /api/profile/seo and public SEO endpoints. */
export interface ProfileSEOResponse {
  pageTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  lastUpdated: Date;
}
