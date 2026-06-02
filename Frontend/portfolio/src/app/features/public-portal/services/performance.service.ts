import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

/** Core Web Vitals snapshot. */
export interface WebVitals {
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  ttfb?: number;
}

/** Visibility record for a section entering the viewport. */
export interface SectionVisibilityEvent {
  sectionId: string;
  visibleAt: number; // performance.now() timestamp
}

/**
 * Performance monitoring service for the public portfolio portal.
 * Tracks First Contentful Paint, LCP, CLS, TTFB and section visibility
 * using PerformanceObserver and IntersectionObserver APIs.
 *
 * T111: Core Web Vitals dashboard — subscribe to vitals$ for live updates.
 */
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private document = inject(DOCUMENT);
  private vitals: WebVitals = {};
  private sectionVisibilitySubject = new Subject<SectionVisibilityEvent>();
  /** T111: BehaviorSubject that emits the latest vitals snapshot after each update. */
  private vitalsSubject = new BehaviorSubject<WebVitals>({});

  /** Emits whenever a tracked section enters the viewport. */
  readonly sectionVisibility$: Observable<SectionVisibilityEvent> =
    this.sectionVisibilitySubject.asObservable();

  /**
   * T111: Observable Core Web Vitals dashboard.
   * Emits an updated WebVitals snapshot whenever FCP, LCP, or CLS changes.
   */
  readonly vitals$: Observable<WebVitals> = this.vitalsSubject.asObservable();

  /**
   * Begins observing FCP, LCP, CLS and TTFB via PerformanceObserver.
   * Stores results in the internal vitals snapshot and emits to vitals$.
   */
  trackPageLoad(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByName('first-contentful-paint')[0];
        if (entry) {
          this.vitals.fcp = entry.startTime;
          this.emitVitals();
          fcpObserver.disconnect();
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch { /* not supported */ }

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          this.vitals.lcp = last.startTime;
          this.emitVitals();
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* not supported */ }

    // CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) {
            this.vitals.cls = (this.vitals.cls ?? 0) + shift.value;
            this.emitVitals();
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch { /* not supported */ }

    // T111: TTFB via Navigation Timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (entry) {
          this.vitals.ttfb = entry.responseStart - entry.requestStart;
          this.emitVitals();
          navObserver.disconnect();
        }
      });
      navObserver.observe({ type: 'navigation', buffered: true });
    } catch { /* not supported */ }
  }

  /**
   * Attaches an IntersectionObserver to a list of section elements.
   * Emits a {@link SectionVisibilityEvent} when each section first becomes visible.
   *
   * @param sectionIds - Array of element IDs to observe.
   */
  trackSectionVisibility(sectionIds: string[]): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.sectionVisibilitySubject.next({
              sectionId: entry.target.id,
              visibleAt: performance.now(),
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    sectionIds.forEach((id) => {
      const el = this.document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /**
   * Returns the current Core Web Vitals snapshot.
   *
   * @returns The collected {@link WebVitals} values.
   */
  reportMetrics(): WebVitals {
    return { ...this.vitals };
  }

  /**
   * Logs the collected Core Web Vitals to the console.
   * Useful for debugging performance in development mode.
   */
  logWebVitals(): void {
    const v = this.reportMetrics();
    console.group('[PerformanceService] Core Web Vitals');
    console.log('FCP:', v.fcp != null ? `${v.fcp.toFixed(0)} ms` : 'pending');
    console.log('LCP:', v.lcp != null ? `${v.lcp.toFixed(0)} ms` : 'pending');
    console.log('CLS:', v.cls != null ? v.cls.toFixed(4) : 'pending');
    console.log('TTFB:', v.ttfb != null ? `${v.ttfb.toFixed(0)} ms` : 'pending');
    console.groupEnd();
  }

  /** Emits the latest vitals snapshot to vitals$. */
  private emitVitals(): void {
    this.vitalsSubject.next({ ...this.vitals });
  }
}
