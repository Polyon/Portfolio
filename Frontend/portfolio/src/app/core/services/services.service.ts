import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { Service, ServiceFormData, ServiceFilter } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private api = inject(ApiService);

  /**
   * Fetches a paginated list of services with optional filters.
   *
   * @param filters - Pagination and filter parameters.
   * @returns Observable wrapping a paginated services response.
   */
  getServices(filters?: ServiceFilter): Observable<PaginatedResponse<Service>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters) {
      if (filters.page !== undefined) params['page'] = filters.page;
      if (filters.limit !== undefined) params['limit'] = filters.limit;
      if (filters.category) params['category'] = filters.category;
      if (filters.search) params['search'] = filters.search;
      if (filters.sort) params['sort'] = filters.sort;
      if (filters.order) params['order'] = filters.order;
      if (filters.isPublished !== undefined) params['isPublished'] = filters.isPublished;
    }
    return this.api.get<PaginatedResponse<Service>>('/admin/services', params);
  }

  /**
   * Creates a new service.
   *
   * @param data - Service creation payload.
   * @returns Observable wrapping the created service.
   */
  createService(data: ServiceFormData): Observable<ApiResponse<Service>> {
    return this.api.post<ApiResponse<Service>>('/admin/services', data);
  }

  /**
   * Updates an existing service by ID.
   *
   * @param id - Service identifier.
   * @param data - Partial service update payload.
   * @returns Observable wrapping the updated service.
   */
  updateService(id: string, data: Partial<ServiceFormData>): Observable<ApiResponse<Service>> {
    return this.api.put<ApiResponse<Service>>(`/admin/services/${id}`, data);
  }

  /**
   * Soft-deletes a service by ID.
   *
   * @param id - Service identifier.
   * @returns Observable wrapping the deletion result.
   */
  deleteService(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/admin/services/${id}`);
  }

  /**
   * Updates the display order for a list of services.
   *
   * @param orderedIds - Array of service IDs in the desired display order.
   * @returns Observable wrapping the result.
   */
  updateDisplayOrder(orderedIds: string[]): Observable<ApiResponse<void>> {
    return this.api.patch<ApiResponse<void>>('/admin/services/reorder', { orderedIds });
  }
}
