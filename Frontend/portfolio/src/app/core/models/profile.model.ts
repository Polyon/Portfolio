export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  profileImageUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  profileImageUrl: string;
  isPublished: boolean;
}

export interface PublishProfileRequest {
  isPublished: boolean;
}
