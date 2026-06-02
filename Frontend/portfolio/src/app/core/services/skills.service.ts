import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { Skill, SkillFormData, SkillFilter } from '../models/skill.model';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private api = inject(ApiService);

  /**
   * Fetches a paginated list of skills with optional filters.
   *
   * @param filters - Pagination and filter parameters.
   * @returns Observable wrapping a paginated skills response.
   */
  getSkills(filters?: SkillFilter): Observable<PaginatedResponse<Skill>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters) {
      if (filters.page !== undefined) params['page'] = filters.page;
      if (filters.limit !== undefined) params['limit'] = filters.limit;
      if (filters.category) params['category'] = filters.category;
      if (filters.search) params['search'] = filters.search;
      if (filters.proficiencyLevel) params['proficiency'] = filters.proficiencyLevel;
      if (filters.sort) params['sort'] = filters.sort;
      if (filters.order) params['order'] = filters.order;
    }
    return this.api.get<PaginatedResponse<Skill>>('/admin/skills', params);
  }

  /**
   * Creates a new skill.
   *
   * @param data - Skill creation payload.
   * @returns Observable wrapping the created skill.
   */
  createSkill(data: SkillFormData): Observable<ApiResponse<Skill>> {
    return this.api.post<ApiResponse<Skill>>('/admin/skills', data);
  }

  /**
   * Updates an existing skill by ID.
   *
   * @param id - Skill identifier.
   * @param data - Partial skill update payload.
   * @returns Observable wrapping the updated skill.
   */
  updateSkill(id: string, data: Partial<SkillFormData>): Observable<ApiResponse<Skill>> {
    return this.api.put<ApiResponse<Skill>>(`/admin/skills/${id}`, data);
  }

  /**
   * Soft-deletes a skill by ID.
   *
   * @param id - Skill identifier.
   * @returns Observable wrapping the deletion result.
   */
  deleteSkill(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/admin/skills/${id}`);
  }

  /**
   * Returns all skills without pagination (used by multi-select pickers).
   *
   * @param search - Optional name substring to filter results.
   * @returns Observable wrapping the full skills list.
   */
  searchSkills(search?: string): Observable<PaginatedResponse<Skill>> {
    const params: Record<string, string | number | boolean> = { limit: 200 };
    if (search) params['search'] = search;
    return this.api.get<PaginatedResponse<Skill>>('/admin/skills', params);
  }
}
