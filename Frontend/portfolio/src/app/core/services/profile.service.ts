import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiResponse } from '../models/common.models';
import { Profile, ProfileFormData, PublishProfileRequest } from '../models/profile.model';

/**
 * Service for managing the admin's portfolio profile.
 * Caches the last-fetched profile via `profile$` so components can react to changes.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private api = inject(ApiService);
  private profileSubject = new BehaviorSubject<Profile | null>(null);

  /** Emits the cached profile whenever it is fetched or updated. */
  readonly profile$ = this.profileSubject.asObservable();

  /**
   * Fetches the current user's profile from the backend.
   *
   * @returns Observable wrapping the profile API response.
   */
  getProfile(): Observable<ApiResponse<Profile>> {
    return this.api.get<ApiResponse<Profile>>('/admin/profile').pipe(
      tap((response) => this.profileSubject.next(response.data as Profile))
    );
  }

  /**
   * Sends partial profile updates to the backend.
   *
   * @param data - Partial profile form data to persist.
   * @returns Observable wrapping the updated profile response.
   */
  updateProfile(data: Partial<ProfileFormData>): Observable<ApiResponse<Profile>> {
    return this.api.put<ApiResponse<Profile>>('/admin/profile', data).pipe(
      tap((response) => this.profileSubject.next(response.data as Profile))
    );
  }

  /**
   * Toggles the published visibility of the profile.
   *
   * @param request - Object containing the desired `isPublished` flag.
   * @returns Observable wrapping the updated profile response.
   */
  publishProfile(request: PublishProfileRequest): Observable<ApiResponse<Profile>> {
    return this.api.put<ApiResponse<Profile>>('/admin/profile/publish', request).pipe(
      tap((response) => this.profileSubject.next(response.data as Profile))
    );
  }

  /**
   * Uploads a profile image and returns the public CDN URL.
   *
   * @param file - Image file selected by the user (jpg, png, webp).
   * @returns Observable wrapping the response containing the updated profileImageUrl.
   */
  uploadImage(file: File): Observable<ApiResponse<{ profileImageUrl: string; publicId: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.post<ApiResponse<{ profileImageUrl: string; publicId: string }>>('/admin/profile/image', formData);
  }
}
