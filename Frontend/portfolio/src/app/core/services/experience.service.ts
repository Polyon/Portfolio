import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse, PaginatedResponse, UploadResult } from '../models/common.models';
import { Experience, ExperienceFormData, ExperienceFilter } from '../models/experience.model';

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private api = inject(ApiService);

  /**
   * Fetches a paginated list of experience entries with optional filters.
   * Results are sorted by startDate descending by default.
   *
   * @param filters - Pagination and filter parameters.
   * @returns Observable wrapping a paginated experience response.
   */
  getExperiences(filters?: ExperienceFilter): Observable<PaginatedResponse<Experience>> {
    const params: Record<string, string | number | boolean> = {
      sort: 'startDate',
      order: 'desc',
    };
    if (filters) {
      if (filters.page !== undefined) params['page'] = filters.page;
      if (filters.limit !== undefined) params['limit'] = filters.limit;
      if (filters.sort) params['sort'] = filters.sort;
      if (filters.order) params['order'] = filters.order;
      if (filters.search) params['search'] = filters.search;
      if (filters.employmentType) params['employmentType'] = filters.employmentType;
    }
    return this.api.get<PaginatedResponse<Experience>>('/admin/experiences', params);
  }

  /**
   * Creates a new experience entry.
   *
   * @param data - Experience creation payload.
   * @returns Observable wrapping the created experience.
   */
  createExperience(data: ExperienceFormData): Observable<ApiResponse<Experience>> {
    return this.api.post<ApiResponse<Experience>>('/admin/experiences', data);
  }

  /**
   * Updates an existing experience entry by ID.
   *
   * @param id - Experience identifier.
   * @param data - Partial experience update payload.
   * @returns Observable wrapping the updated experience.
   */
  updateExperience(id: string, data: Partial<ExperienceFormData>): Observable<ApiResponse<Experience>> {
    return this.api.put<ApiResponse<Experience>>(`/admin/experiences/${id}`, data);
  }

  /**
   * Soft-deletes an experience entry by ID.
   *
   * @param id - Experience identifier.
   * @returns Observable wrapping the deletion result.
   */
  deleteExperience(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/admin/experiences/${id}`);
  }

  /**
   * Associates a list of skills with an experience entry.
   *
   * @param experienceId - Experience identifier.
   * @param skillIds - Array of skill identifiers to associate.
   * @returns Observable wrapping the updated experience.
   */
  setExperienceSkills(experienceId: string, skillIds: string[]): Observable<ApiResponse<Experience>> {
    return this.api.post<ApiResponse<Experience>>(`/admin/experiences/${experienceId}/skills`, { skillIds });
  }

  /**
   * Uploads a company logo image to the CDN via the shared upload endpoint.
   * Uses the `experiences` folder so logos are organised separately from project images.
   *
   * @param file - Image file to upload (JPG, PNG, or WebP; max 5 MB).
   * @returns Observable wrapping the upload result containing the public `url`.
   */
  uploadCompanyLogo(file: File): Observable<ApiResponse<UploadResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.upload<ApiResponse<UploadResult>>('/admin/upload', formData, {
      folder: 'experiences',
    });
  }
}
