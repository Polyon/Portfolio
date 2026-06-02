import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectsService } from './projects.service';
import { Project, ProjectFormData, ProjectStatus } from '../models/project.model';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('ProjectsService', () => {
  let service: ProjectsService;
  let http: HttpTestingController;

  const mockProject: Project = {
    id: 'p1',
    userId: 'u1',
    name: 'Portfolio App',
    description: 'My portfolio',
    shortDescription: 'Portfolio',
    status: ProjectStatus.DEPLOYED,
    startDate: '2024-01-01T00:00:00Z',
    isFeatured: true,
    isPublished: true,
    displayOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPaged: PaginatedResponse<Project> = {
    data: [mockProject],
    pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ProjectsService,
      ],
    });
    service = TestBed.inject(ProjectsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getProjects()', () => {
    it('should GET /admin/projects without filters', () => {
      service.getProjects().subscribe((res) => {
        expect(res.data[0].name).toBe('Portfolio App');
      });
      const req = http.expectOne((r) => r.url === `${BASE}/admin/projects`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaged);
    });

    it('should include status and featured params when provided', () => {
      service.getProjects({ status: ProjectStatus.DEPLOYED, featured: true }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/projects`);
      expect(req.request.params.get('status')).toBe('Deployed');
      expect(req.request.params.get('featured')).toBe('true');
      req.flush(mockPaged);
    });
  });

  describe('createProject()', () => {
    it('should POST /admin/projects', () => {
      const payload: ProjectFormData = {
        name: 'New Project',
        description: 'Desc',
        shortDescription: 'Short',
        status: ProjectStatus.PLANNING,
        startDate: '2024-01-01T00:00:00Z',
        isFeatured: false,
        isPublished: true,
      };
      const mockResponse: ApiResponse<Project> = { data: { ...mockProject, ...payload }, success: true };

      service.createProject(payload).subscribe((res) => {
        expect(res.data.name).toBe('New Project');
      });

      const req = http.expectOne(`${BASE}/admin/projects`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('updateProject()', () => {
    it('should PUT /admin/projects/:id', () => {
      const mockResponse: ApiResponse<Project> = { data: mockProject, success: true };
      service.updateProject('p1', { name: 'Updated' }).subscribe();
      const req = http.expectOne(`${BASE}/admin/projects/p1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('deleteProject()', () => {
    it('should DELETE /admin/projects/:id', () => {
      service.deleteProject('p1').subscribe();
      const req = http.expectOne(`${BASE}/admin/projects/p1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null, success: true });
    });
  });

  describe('setProjectSkills()', () => {
    it('should PUT /admin/projects/:id/skills with skillIds array', () => {
      const mockResponse: ApiResponse<Project> = { data: mockProject, success: true };
      service.setProjectSkills('p1', ['s1', 's2']).subscribe();
      const req = http.expectOne(`${BASE}/admin/projects/p1/skills`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ skillIds: ['s1', 's2'] });
      req.flush(mockResponse);
    });
  });

  describe('setFeatured()', () => {
    it('should PATCH /admin/projects/:id/featured', () => {
      const mockResponse: ApiResponse<Project> = { data: mockProject, success: true };
      service.setFeatured('p1', true).subscribe();
      const req = http.expectOne(`${BASE}/admin/projects/p1/featured`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isFeatured: true });
      req.flush(mockResponse);
    });
  });
});
