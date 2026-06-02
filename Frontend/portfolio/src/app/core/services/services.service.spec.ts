import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ServicesService } from './services.service';
import { Service, ServiceFormData, ServiceCategory } from '../models/service.model';
import { ApiResponse, PaginatedResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('ServicesService', () => {
  let service: ServicesService;
  let http: HttpTestingController;

  const mockService: Service = {
    id: 's1',
    userId: 'u1',
    name: 'Full-Stack Development',
    description: 'End-to-end web application development.',
    category: ServiceCategory.FULLSTACK,
    isPublished: true,
    displayOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPaged: PaginatedResponse<Service> = {
    data: [mockService],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  const mockApiResponse: ApiResponse<Service> = { data: mockService, success: true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ServicesService,
      ],
    });
    service = TestBed.inject(ServicesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getServices()', () => {
    it('should GET /admin/services without filters', () => {
      service.getServices().subscribe((res) => {
        expect(res.data[0].name).toBe('Full-Stack Development');
      });
      const req = http.expectOne((r) => r.url === `${BASE}/admin/services`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaged);
    });

    it('should include category param when provided', () => {
      service.getServices({ category: ServiceCategory.FULLSTACK }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/services`);
      expect(req.request.params.get('category')).toBe('Fullstack');
      req.flush(mockPaged);
    });

    it('should include search param when provided', () => {
      service.getServices({ search: 'dev' }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/services`);
      expect(req.request.params.get('search')).toBe('dev');
      req.flush(mockPaged);
    });

    it('should include pagination params when provided', () => {
      service.getServices({ page: 2, limit: 5 }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/admin/services`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      req.flush(mockPaged);
    });
  });

  describe('createService()', () => {
    it('should POST /admin/services', () => {
      const payload: ServiceFormData = {
        name: 'API Design',
        description: 'REST and GraphQL API design.',
        category: ServiceCategory.BACKEND_DEV,
        isPublished: true,
      };

      service.createService(payload).subscribe((res) => {
        expect(res.data.name).toBe('Full-Stack Development');
      });

      const req = http.expectOne(`${BASE}/admin/services`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockApiResponse);
    });
  });

  describe('updateService()', () => {
    it('should PUT /admin/services/:id', () => {
      const payload: Partial<ServiceFormData> = { name: 'Backend Engineering' };

      service.updateService('s1', payload).subscribe((res) => {
        expect(res.data.id).toBe('s1');
      });

      const req = http.expectOne(`${BASE}/admin/services/s1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockApiResponse);
    });
  });

  describe('deleteService()', () => {
    it('should DELETE /admin/services/:id', () => {
      service.deleteService('s1').subscribe();

      const req = http.expectOne(`${BASE}/admin/services/s1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null });
    });
  });

  describe('updateDisplayOrder()', () => {
    it('should PATCH /admin/services/reorder with ordered IDs', () => {
      const orderedIds = ['s2', 's1', 's3'];

      service.updateDisplayOrder(orderedIds).subscribe();

      const req = http.expectOne(`${BASE}/admin/services/reorder`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ orderedIds });
      req.flush({ data: null });
    });
  });
});
