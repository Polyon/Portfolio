import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Supported responsive image output formats. */
export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';

/**
 * Image optimisation service for the public portal.
 * Generates responsive srcset URLs, converts to WebP,
 * preloads critical above-fold images, and tracks LCP.
 */
@Injectable({ providedIn: 'root' })
export class ImageOptimizerService {
  private document = inject(DOCUMENT);

  /**
   * Builds a URL for a responsive image at the requested width and format.
   * Falls back to the original URL when no transformation is needed.
   *
   * @param url    - Original image URL.
   * @param width  - Target display width in CSS pixels.
   * @param format - Desired output format (default: 'webp').
   * @returns Transformed image URL string.
   */
  getResponsiveImageUrl(url: string, width: number, format: ImageFormat = 'webp'): string {
    if (!url) return '';
    // If the URL already includes query parameters respect them, otherwise append
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&fmt=${format}`;
  }

  /**
   * Converts a JPEG or PNG URL to its WebP equivalent by appending a format hint.
   * No-op if the URL already points to a WebP resource.
   *
   * @param jpgUrl - Original image URL.
   * @returns WebP URL string.
   */
  getWebPUrl(jpgUrl: string): string {
    if (!jpgUrl) return '';
    if (jpgUrl.toLowerCase().endsWith('.webp')) return jpgUrl;
    return this.getResponsiveImageUrl(jpgUrl, 0, 'webp').replace('&w=0', '').replace('?w=0', '');
  }

  /**
   * Injects <link rel="preload"> tags into the document head for images that
   * appear above the fold (hero, profile photo) to improve LCP.
   *
   * @param imageUrls - Array of absolute image URLs to preload.
   */
  preloadCriticalImages(imageUrls: string[]): void {
    imageUrls.forEach((url) => {
      if (!url) return;
      const existing = this.document.querySelector(`link[rel="preload"][href="${url}"]`);
      if (existing) return;
      const link = this.document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      this.document.head.appendChild(link);
    });
  }

  /**
   * Observes the Largest Contentful Paint entry for the current page
   * and logs the value to the console for debugging.
   * Uses the PerformanceObserver API when available.
   */
  trackImageMetrics(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          console.debug('[ImageOptimizer] LCP candidate:', lastEntry.startTime.toFixed(0), 'ms', lastEntry);
        }
        observer.disconnect();
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // PerformanceObserver type may not be available in all environments.
    }
  }
}
