import { Injectable, inject } from '@angular/core';
import { Observable, of, catchError } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { ApiResponse, PaginatedResponse } from '../../../core/models/common.models';
import { Profile } from '../../../core/models/profile.model';
import { Skill } from '../../../core/models/skill.model';
import { Experience } from '../../../core/models/experience.model';
import { Project } from '../../../core/models/project.model';
import { Service } from '../../../core/models/service.model';
import { Contact } from '../../../core/models/contact.model';
import { SeoMetadata } from '../models/public-portal.models';
import { environment } from '../../../../environments/environment';

/**
 * Public portfolio data service for the public portal.
 * Fetches published data from backend REST APIs.
 * All methods include error handling with fallback empty values.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private api = inject(ApiService);

  /**
   * Fetches the published profile data for display in hero and about sections.
   *
   * @returns Observable wrapping the public profile API response.
   */
  getProfile(): Observable<ApiResponse<Profile>> {
    return this.api.get<ApiResponse<Profile>>('/public/profile', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: null as unknown as Profile, message: 'Failed to load profile' })),
    );
  }

  /**
   * Fetches all published skills for the skills section.
   *
   * @returns Observable wrapping the published skills array.
   */
  getSkills(): Observable<ApiResponse<Skill[]>> {
    return this.api.get<ApiResponse<Skill[]>>('/public/skills', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: [], message: 'Failed to load skills' })),
    );
  }

  /**
   * Fetches all published work experiences, ordered by start date descending.
   *
   * @returns Observable wrapping the published experiences array.
   */
  getExperiences(): Observable<ApiResponse<Experience[]>> {
    return this.api.get<ApiResponse<Experience[]>>('/public/experiences', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: [], message: 'Failed to load experience' })),
    );
  }

  /**
   * Fetches all published projects, with featured projects first.
   *
   * @returns Observable wrapping the published projects array.
   */
  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.api.get<ApiResponse<Project[]>>('/public/projects', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: [], message: 'Failed to load projects' })),
    );
  }

  /**
   * Fetches all published services for the services section.
   *
   * @returns Observable wrapping the published services array.
   */
  getServices(): Observable<ApiResponse<Service[]>> {
    return this.api.get<ApiResponse<Service[]>>('/public/services', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: [], message: 'Failed to load services' })),
    );
  }

  /**
   * Fetches publicly visible contact information.
   *
   * @returns Observable wrapping the public contact data.
   */
  getContact(): Observable<ApiResponse<Contact>> {
    return this.api.get<ApiResponse<Contact>>('/public/contact', { userId: environment.portfolioUserId }).pipe(
      catchError(() => of({ success: false, data: null as unknown as Contact, message: 'Failed to load contact' })),
    );
  }

  /**
   * Fetches SEO metadata for a specific section of the portfolio.
   *
   * @param section - Section identifier (e.g. 'hero', 'about', 'skills').
   * @returns Observable wrapping the SEO metadata for the section.
   */
  getMetadata(section: string): Observable<ApiResponse<SeoMetadata>> {
    return this.api.get<ApiResponse<SeoMetadata>>('/seo/metadata', { section }).pipe(
      catchError(() => of({ success: false, data: null as unknown as SeoMetadata, message: 'Failed to load metadata' })),
    );
  }
}
