import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SkillsService } from './skills.service';
import { Skill, SkillCategory, SkillFormData } from '../models/skill.model';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('SkillsService', () => {
  let service: SkillsService;
  let http: HttpTestingController;

  const mockSkill: Skill = {
    id: 's1',
    userId: 'u1',
    name: 'TypeScript',
    category: SkillCategory.BACKEND,
    proficiencyLevel: 5,
    endorsementCount: 3,
    isPublished: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPagedResponse: PaginatedResponse<Skill> = {
    data: [mockSkill],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        SkillsService,
      ],
    });
    service = TestBed.inject(SkillsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getSkills()', () => {
    it('should GET /admin/skills without filters', () => {
      service.getSkills().subscribe((res) => {
        expect(res.data.length).toBe(1);
        expect(res.data[0].name).toBe('TypeScript');
      });
      const req = http.expectOne((r) => r.url === `${BASE}/admin/skills`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPagedResponse);
    });

    it('should include query params when filters are provided', () => {
      service.getSkills({ page: 2, limit: 5, category: SkillCategory.BACKEND, search: 'Type' }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/skills`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('category')).toBe('BACKEND');
      expect(req.request.params.get('search')).toBe('Type');
      req.flush(mockPagedResponse);
    });
  });

  describe('createSkill()', () => {
    it('should POST /admin/skills with the form data', () => {
      const payload: SkillFormData = {
        name: 'Angular',
        category: SkillCategory.FRONTEND,
        proficiencyLevel: 4,
        endorsementCount: 0,
        isPublished: true,
      };
      const mockResponse: ApiResponse<Skill> = { data: { ...mockSkill, ...payload }, success: true };

      service.createSkill(payload).subscribe((res) => {
        expect(res.data.name).toBe('Angular');
      });

      const req = http.expectOne(`${BASE}/admin/skills`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('updateSkill()', () => {
    it('should PUT /admin/skills/:id with partial data', () => {
      const partial = { name: 'TypeScript 5' };
      const mockResponse: ApiResponse<Skill> = { data: { ...mockSkill, ...partial }, success: true };

      service.updateSkill('s1', partial).subscribe((res) => {
        expect(res.data.name).toBe('TypeScript 5');
      });

      const req = http.expectOne(`${BASE}/admin/skills/s1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('deleteSkill()', () => {
    it('should DELETE /admin/skills/:id', () => {
      const mockResponse: ApiResponse<void> = { data: undefined as never, success: true };
      service.deleteSkill('s1').subscribe();
      const req = http.expectOne(`${BASE}/admin/skills/s1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });

  describe('searchSkills()', () => {
    it('should GET with limit=200 and optional search term', () => {
      service.searchSkills('Type').subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/skills`);
      expect(req.request.params.get('limit')).toBe('200');
      expect(req.request.params.get('search')).toBe('Type');
      req.flush(mockPagedResponse);
    });
  });
});
