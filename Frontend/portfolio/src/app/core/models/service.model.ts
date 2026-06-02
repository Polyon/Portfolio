/**
 * Service data models for the admin portal.
 *
 * @file service.model.ts
 */

/** Categories of offered services. */
export enum ServiceCategory {
  BACKEND_DEV = 'BACKEND_DEV',
  FRONTEND_DEV = 'FRONTEND_DEV',
  FULLSTACK = 'FULLSTACK',
  DEVOPS = 'DEVOPS',
  AI_INTEGRATION = 'AI_INTEGRATION',
  CONSULTING = 'CONSULTING',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

/** A single service offering record returned from the API. */
export interface Service {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: ServiceCategory;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Form model used when creating or editing a service. */
export interface ServiceFormData {
  name: string;
  description: string;
  category: ServiceCategory;
  isPublished: boolean;
}

/** Query parameters for the services list endpoint. */
export interface ServiceFilter {
  page?: number;
  limit?: number;
  category?: ServiceCategory;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  isPublished?: boolean;
}
