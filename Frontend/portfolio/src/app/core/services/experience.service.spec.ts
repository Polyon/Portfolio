import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { ExperienceService } from './experience.service';
import { Experience, ExperienceFormData, EmploymentType } from '../models/experience.model';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('ExperienceService', () => {
  let service: ExperienceService;
  let http: HttpTestingController;

  const mockExperience: Experience = {
    id: 'e1',
    userId: 'u1',
    company: 'Acme Corp',
    title: 'Senior Developer',
    description: 'Led team',
    startDate: '2022-01-01T00:00:00Z',
    endDate: '2024-01-01T00:00:00Z',
    isCurrentRole: false,
    location: 'Cape Town',
    employmentType: EmploymentType.FULL_TIME,
    isPublished: true,
    displayOrder: 1,
    createdAt: '2022-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPaged: PaginatedResponse<Experience> = {
    data: [mockExperience],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ExperienceService,
      ],
    });
    service = TestBed.inject(ExperienceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getExperiences()', () => {
    it('should GET /admin/experiences with default sort parameters', () => {
      service.getExperiences().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].company).toBe('Acme Corp');
      });
      const req = http.expectOne((r) => r.url === `${BASE}/admin/experiences`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sort')).toBe('startDate');
      expect(req.request.params.get('order')).toBe('desc');
      req.flush(mockPaged);
    });

    it('should include search and employmentType filters when provided', () => {
      service.getExperiences({ search: 'acme', employmentType: EmploymentType.CONTRACT }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/experiences`);
      expect(req.request.params.get('search')).toBe('acme');
      expect(req.request.params.get('employmentType')).toBe(EmploymentType.CONTRACT);
      req.flush(mockPaged);
    });

    it('should include pagination params when provided', () => {
      service.getExperiences({ page: 2, limit: 5 }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/experiences`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      req.flush(mockPaged);
    });
  });

  describe('createExperience()', () => {
    it('should POST /admin/experiences with the form data', () => {
      const payload: ExperienceFormData = {
        company: 'New Corp',
        title: 'Engineer',
        description: 'Build stuff',
        startDate: '2023-01-01T00:00:00Z',
        isCurrentRole: true,
        isPublished: true,
      };
      const mockResponse: ApiResponse<Experience> = { data: { ...mockExperience, ...payload }, success: true };

      service.createExperience(payload).subscribe((res) => {
        expect(res.data.company).toBe('New Corp');
      });
      const req = http.expectOne(`${BASE}/admin/experiences`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('updateExperience()', () => {
    it('should PUT /admin/experiences/:id with partial data', () => {
      const payload: Partial<ExperienceFormData> = { title: 'Lead Engineer' };
      const mockResponse: ApiResponse<Experience> = { data: { ...mockExperience, title: 'Lead Engineer' }, success: true };

      service.updateExperience('e1', payload).subscribe((res) => {
        expect(res.data.title).toBe('Lead Engineer');
      });
      const req = http.expectOne(`${BASE}/admin/experiences/e1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('deleteExperience()', () => {
    it('should DELETE /admin/experiences/:id', () => {
      service.deleteExperience('e1').subscribe();
      const req = http.expectOne(`${BASE}/admin/experiences/e1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null, success: true });
    });
  });

  describe('setExperienceSkills()', () => {
    it('should PUT /admin/experiences/:id/skills with skillIds', () => {
      const skillIds = ['s1', 's2'];
      const mockResponse: ApiResponse<Experience> = { data: mockExperience, success: true };

      service.setExperienceSkills('e1', skillIds).subscribe();
      const req = http.expectOne(`${BASE}/admin/experiences/e1/skills`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ skillIds });
      req.flush(mockResponse);
    });
  });
});
