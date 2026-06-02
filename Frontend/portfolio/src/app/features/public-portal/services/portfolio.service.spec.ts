import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { PortfolioService } from './portfolio.service';
import { ApiService } from '../../../core/http/api.service';

/**
 * T125b — PortfolioService tests.
 * Validates all public data-fetching methods and their error-handling fallbacks.
 */
describe('PortfolioService', () => {
  let service: PortfolioService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PortfolioService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(PortfolioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getProfile() ─────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('should call api.get with /public/profile', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: {} }));
      service.getProfile().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/profile',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return fallback response on API error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      service.getProfile().subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toContain('Failed to load profile');
        done();
      });
    });
  });

  // ─── getSkills() ──────────────────────────────────────────────────────────

  describe('getSkills()', () => {
    it('should call api.get with /public/skills', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [] }));
      service.getSkills().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/skills',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return empty array fallback on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getSkills().subscribe((res) => {
        expect(res.data).toEqual([]);
        done();
      });
    });
  });

  // ─── getExperiences() ────────────────────────────────────────────────────

  describe('getExperiences()', () => {
    it('should call api.get with /public/experiences', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [] }));
      service.getExperiences().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/experiences',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return empty array fallback on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getExperiences().subscribe((res) => {
        expect(res.data).toEqual([]);
        done();
      });
    });
  });

  // ─── getProjects() ───────────────────────────────────────────────────────

  describe('getProjects()', () => {
    it('should call api.get with /public/projects', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [] }));
      service.getProjects().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/projects',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return empty array fallback on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getProjects().subscribe((res) => {
        expect(res.data).toEqual([]);
        done();
      });
    });
  });

  // ─── getServices() ───────────────────────────────────────────────────────

  describe('getServices()', () => {
    it('should call api.get with /public/services', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [] }));
      service.getServices().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/services',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return empty array fallback on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getServices().subscribe((res) => {
        expect(res.data).toEqual([]);
        done();
      });
    });
  });

  // ─── getContact() ────────────────────────────────────────────────────────

  describe('getContact()', () => {
    it('should call api.get with /public/contact', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: {} }));
      service.getContact().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/public/contact',
        jasmine.objectContaining({ userId: jasmine.any(String) }),
      );
    });

    it('should return fallback response on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getContact().subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toContain('Failed to load contact');
        done();
      });
    });
  });

  // ─── getMetadata() ───────────────────────────────────────────────────────

  describe('getMetadata()', () => {
    it('should call api.get with /seo/metadata and the section name', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: {} }));
      service.getMetadata('hero').subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/seo/metadata',
        jasmine.objectContaining({ section: 'hero' }),
      );
    });

    it('should return fallback response on error', (done) => {
      apiSpy.get.and.returnValue(throwError(() => new Error()));
      service.getMetadata('about').subscribe((res) => {
        expect(res.success).toBeFalse();
        done();
      });
    });
  });
});
