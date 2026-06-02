import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse, PaginatedResponse, UploadResult } from '../models/common.models';
import { Project, ProjectFormData, ProjectFilter } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private api = inject(ApiService);

  /**
   * Fetches a paginated list of projects with optional filters.
   *
   * @param filters - Pagination and filter parameters.
   * @returns Observable wrapping a paginated projects response.
   */
  getProjects(filters?: ProjectFilter): Observable<PaginatedResponse<Project>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters) {
      if (filters.page !== undefined) params['page'] = filters.page;
      if (filters.limit !== undefined) params['limit'] = filters.limit;
      if (filters.status) params['status'] = filters.status;
      if (filters.search) params['search'] = filters.search;
      if (filters.sort) params['sort'] = filters.sort;
      if (filters.order) params['order'] = filters.order;
      if (filters.featured !== undefined) params['featured'] = filters.featured;
    }
    return this.api.get<PaginatedResponse<Project>>('/admin/projects', params);
  }

  /**
   * Creates a new project.
   *
   * @param data - Project creation payload.
   * @returns Observable wrapping the created project.
   */
  createProject(data: ProjectFormData): Observable<ApiResponse<Project>> {
    return this.api.post<ApiResponse<Project>>('/admin/projects', data);
  }

  /**
   * Updates an existing project by ID.
   *
   * @param id - Project identifier.
   * @param data - Partial project update payload.
   * @returns Observable wrapping the updated project.
   */
  updateProject(id: string, data: Partial<ProjectFormData>): Observable<ApiResponse<Project>> {
    return this.api.put<ApiResponse<Project>>(`/admin/projects/${id}`, data);
  }

  /**
   * Soft-deletes a project by ID.
   *
   * @param id - Project identifier.
   * @returns Observable wrapping the deletion result.
   */
  deleteProject(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/admin/projects/${id}`);
  }

  /**
   * Associates a list of skills with a project.
   *
   * @param projectId - Project identifier.
   * @param skillIds - Array of skill identifiers to associate.
   * @returns Observable wrapping the updated project.
   */
  setProjectSkills(projectId: string, skillIds: string[]): Observable<ApiResponse<Project>> {
    return this.api.put<ApiResponse<Project>>(`/admin/projects/${projectId}/skills`, { skillIds });
  }

  /**
   * Toggles the featured flag for a project.
   *
   * @param projectId - Project identifier.
   * @param isFeatured - Desired featured state.
   * @returns Observable wrapping the updated project.
   */
  setFeatured(projectId: string, isFeatured: boolean): Observable<ApiResponse<Project>> {
    return this.api.patch<ApiResponse<Project>>(`/admin/projects/${projectId}/featured`, {
      isFeatured,
    });
  }

  /**
   * Uploads a single image file to Cloudinary via the backend upload endpoint.
   * Uses the `projects` folder in Cloudinary.
   *
   * @param file - Image file to upload (JPG, PNG, or WebP; max 5 MB).
   * @returns Observable wrapping the upload result containing the public `url`.
   */
  uploadProjectImage(file: File): Observable<ApiResponse<UploadResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.upload<ApiResponse<UploadResult>>('/admin/upload', formData, {
      folder: 'projects',
    });
  }

  /**
   * Persists the ordered images array for a project.
   * Replaces the existing images list entirely.
   *
   * @param projectId - Project identifier.
   * @param images - Ordered array of Cloudinary image URL strings.
   * @returns Observable wrapping the updated project.
   */
  updateProjectImages(projectId: string, images: string[]): Observable<ApiResponse<Project>> {
    return this.api.put<ApiResponse<Project>>(`/admin/projects/${projectId}`, { images });
  }
}
