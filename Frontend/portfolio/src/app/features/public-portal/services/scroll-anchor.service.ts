import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { throttleTime, map, distinctUntilChanged } from 'rxjs/operators';

/**
 * Scroll anchor service for the public portfolio portal.
 * Provides smooth scrolling to section IDs and tracks
 * which section is currently visible for nav link highlighting.
 */
@Injectable({ providedIn: 'root' })
export class ScrollAnchorService {
  private document = inject(DOCUMENT);
  private activeSectionSubject = new BehaviorSubject<string>('');

  /** Emits the ID of the section currently in the viewport. */
  readonly activeSection$: Observable<string> = this.activeSectionSubject.asObservable();

  /**
   * Smoothly scrolls the viewport so the element with the given ID is visible.
   *
   * @param sectionId - The `id` attribute of the target section element.
   */
  smoothScroll(sectionId: string): void {
    const element = this.document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Returns the ID of the section currently occupying the most viewport space.
   * Falls back to an empty string when no sections are registered.
   *
   * @returns The active section ID string.
   */
  getCurrentSection(): string {
    return this.activeSectionSubject.getValue();
  }

  /**
   * Begins observing window scroll events and updating the active section.
   * Call this once after all section elements are rendered.
   *
   * @param sectionIds - Ordered list of section IDs to track.
   */
  updateActiveNavLink(sectionIds: string[]): void {
    fromEvent(this.document.defaultView ?? window, 'scroll')
      .pipe(
        throttleTime(100),
        map(() => this.resolveActiveSection(sectionIds)),
        distinctUntilChanged(),
      )
      .subscribe((id) => this.activeSectionSubject.next(id));
  }

  /**
   * Determines which section ID is currently most visible in the viewport.
   *
   * @param sectionIds - Ordered list of section IDs.
   * @returns The ID of the currently visible section, or empty string.
   */
  private resolveActiveSection(sectionIds: string[]): string {
    const viewportMid = this.document.defaultView!.scrollY + window.innerHeight / 2;
    let active = '';
    for (const id of sectionIds) {
      const el = this.document.getElementById(id);
      if (!el) continue;
      if (el.offsetTop <= viewportMid) {
        active = id;
      }
    }
    return active;
  }
}
