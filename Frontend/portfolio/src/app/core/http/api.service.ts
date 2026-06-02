import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Low-level HTTP client wrapper that prepends the configured API base URL.
 * All feature services should use this class instead of HttpClient directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = `${environment.apiUrl}${environment.apiPrefix}`;

  constructor(private http: HttpClient) {}

  /**
   * Sends a GET request to the given endpoint with optional query parameters.
   *
   * @param endpoint - Path relative to the API base URL (e.g. `/admin/skills`).
   * @param params - Optional key/value query parameters.
   * @returns Observable of the typed response body.
   */
  get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params: httpParams });
  }

  /**
   * Sends a POST request to the given endpoint.
   *
   * @param endpoint - Path relative to the API base URL.
   * @param body - Request body payload.
   * @returns Observable of the typed response body.
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a PUT request to the given endpoint.
   *
   * @param endpoint - Path relative to the API base URL.
   * @param body - Request body payload.
   * @returns Observable of the typed response body.
   */
  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a PATCH request to the given endpoint.
   *
   * @param endpoint - Path relative to the API base URL.
   * @param body - Partial update payload.
   * @returns Observable of the typed response body.
   */
  patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Sends a DELETE request to the given endpoint.
   *
   * @param endpoint - Path relative to the API base URL.
   * @returns Observable of the typed response body.
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  /**
   * Sends a multipart/form-data POST request (file upload).
   *
   * @param endpoint - Path relative to the API base URL.
   * @param formData - FormData payload containing the file.
   * @param params - Optional query parameters (e.g. `{ folder: 'projects' }`).
   * @returns Observable of the typed response body.
   */
  upload<T>(endpoint: string, formData: FormData, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, value);
      });
    }
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData, { params: httpParams });
  }
}
