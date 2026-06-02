import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { ImageOptimizerService } from './image-optimizer.service';

/**
 * T125b — ImageOptimizerService tests.
 * Validates URL generation, WebP conversion, preload injection,
 * and LCP tracking resilience.
 */
describe('ImageOptimizerService', () => {
  let service: ImageOptimizerService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ImageOptimizerService] });
    service = TestBed.inject(ImageOptimizerService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    // Remove preload links added during tests
    doc.querySelectorAll('link[rel="preload"][as="image"]').forEach((el) => el.remove());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getResponsiveImageUrl() ──────────────────────────────────────────────

  describe('getResponsiveImageUrl()', () => {
    it('should append width and format query parameters', () => {
      const url = service.getResponsiveImageUrl('https://cdn.example.com/photo.jpg', 768, 'webp');
      expect(url).toContain('w=768');
      expect(url).toContain('fmt=webp');
    });

    it('should use webp as the default format', () => {
      const url = service.getResponsiveImageUrl('https://cdn.example.com/img.jpg', 320);
      expect(url).toContain('fmt=webp');
    });

    it('should return empty string for an empty URL', () => {
      expect(service.getResponsiveImageUrl('', 640)).toBe('');
    });

    it('should use & as separator when URL already has query params', () => {
      const url = service.getResponsiveImageUrl('https://example.com/img.jpg?v=2', 1280);
      expect(url).toContain('&w=1280');
    });

    it('should support avif format', () => {
      const url = service.getResponsiveImageUrl('https://example.com/img.png', 640, 'avif');
      expect(url).toContain('fmt=avif');
    });
  });

  // ─── getWebPUrl() ────────────────────────────────────────────────────────

  describe('getWebPUrl()', () => {
    it('should return empty string for an empty URL', () => {
      expect(service.getWebPUrl('')).toBe('');
    });

    it('should not modify a URL that already ends in .webp', () => {
      const webp = 'https://cdn.example.com/photo.webp';
      expect(service.getWebPUrl(webp)).toBe(webp);
    });

    it('should append webp format hint for a jpg URL', () => {
      const url = service.getWebPUrl('https://cdn.example.com/photo.jpg');
      expect(url).toContain('webp');
    });
  });

  // ─── preloadCriticalImages() ─────────────────────────────────────────────

  describe('preloadCriticalImages()', () => {
    it('should inject a <link rel="preload"> for each URL', () => {
      service.preloadCriticalImages([
        'https://example.com/hero.jpg',
        'https://example.com/avatar.jpg',
      ]);
      const links = doc.querySelectorAll('link[rel="preload"][as="image"]');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('should not inject duplicate preload links', () => {
      const url = 'https://example.com/unique.jpg';
      service.preloadCriticalImages([url]);
      service.preloadCriticalImages([url]);
      const links = doc.querySelectorAll(`link[rel="preload"][href="${url}"]`);
      expect(links.length).toBe(1);
    });

    it('should skip empty URL entries', () => {
      expect(() => service.preloadCriticalImages(['', ''])).not.toThrow();
    });

    it('should not throw for an empty array', () => {
      expect(() => service.preloadCriticalImages([])).not.toThrow();
    });
  });

  // ─── trackImageMetrics() ────────────────────────────────────────────────

  describe('trackImageMetrics()', () => {
    it('should not throw when PerformanceObserver is undefined', () => {
      const origPO = (window as Window & { PerformanceObserver?: unknown }).PerformanceObserver;
      delete (window as Window & { PerformanceObserver?: unknown }).PerformanceObserver;
      expect(() => service.trackImageMetrics()).not.toThrow();
      (window as Window & { PerformanceObserver?: unknown }).PerformanceObserver = origPO;
    });

    it('should not throw in a normal browser environment', () => {
      expect(() => service.trackImageMetrics()).not.toThrow();
    });
  });
});
