import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}${environment.apiPrefix}`;

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── GET ──────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('should send a GET request to the correct URL', () => {
      service.get('/skills').subscribe();
      const req = http.expectOne(`${BASE}/skills`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should append query parameters', () => {
      service.get('/skills', { category: 'Backend', page: 1 }).subscribe();
      const req = http.expectOne((r) => r.url === `${BASE}/skills`);
      expect(req.request.params.get('category')).toBe('Backend');
      expect(req.request.params.get('page')).toBe('1');
      req.flush([]);
    });

    it('should return the response body', () => {
      const mockData = [{ id: '1', name: 'Node.js' }];
      let result: unknown;
      service.get('/skills').subscribe((data) => (result = data));
      http.expectOne(`${BASE}/skills`).flush(mockData);
      expect(result).toEqual(mockData);
    });
  });

  // ─── POST ─────────────────────────────────────────────────────────────────

  describe('post()', () => {
    it('should send a POST request with the body', () => {
      const payload = { name: 'TypeScript' };
      service.post('/skills', payload).subscribe();
      const req = http.expectOne(`${BASE}/skills`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: '2', ...payload });
    });
  });

  // ─── PUT ──────────────────────────────────────────────────────────────────

  describe('put()', () => {
    it('should send a PUT request with the body', () => {
      const payload = { name: 'Updated' };
      service.put('/skills/1', payload).subscribe();
      const req = http.expectOne(`${BASE}/skills/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: '1', ...payload });
    });
  });

  // ─── PATCH ────────────────────────────────────────────────────────────────

  describe('patch()', () => {
    it('should send a PATCH request with the body', () => {
      const payload = { isPublished: true };
      service.patch('/skills/1', payload).subscribe();
      const req = http.expectOne(`${BASE}/skills/1`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });
  });

  // ─── DELETE ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should send a DELETE request', () => {
      service.delete('/skills/1').subscribe();
      const req = http.expectOne(`${BASE}/skills/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  // ─── Error propagation ────────────────────────────────────────────────────

  it('should propagate HTTP errors to the caller', () => {
    let caughtError: unknown;
    service.get('/not-found').subscribe({ error: (e) => (caughtError = e) });
    http.expectOne(`${BASE}/not-found`).flush('Not found', { status: 404, statusText: 'Not Found' });
    expect(caughtError).toBeTruthy();
  });
});
