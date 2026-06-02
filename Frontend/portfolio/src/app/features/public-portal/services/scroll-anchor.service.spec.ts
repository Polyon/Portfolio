import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { ScrollAnchorService } from './scroll-anchor.service';

/**
 * T125b — ScrollAnchorService tests.
 * Validates smooth scrolling, active section tracking, and observable state.
 */
describe('ScrollAnchorService', () => {
  let service: ScrollAnchorService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ScrollAnchorService] });
    service = TestBed.inject(ScrollAnchorService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── activeSection$ ───────────────────────────────────────────────────────

  describe('activeSection$', () => {
    it('should emit an empty string as the initial active section', (done) => {
      service.activeSection$.subscribe((id) => {
        expect(id).toBe('');
        done();
      });
    });
  });

  // ─── getCurrentSection() ─────────────────────────────────────────────────

  describe('getCurrentSection()', () => {
    it('should return empty string before any section is tracked', () => {
      expect(service.getCurrentSection()).toBe('');
    });
  });

  // ─── smoothScroll() ──────────────────────────────────────────────────────

  describe('smoothScroll()', () => {
    it('should not throw when the target element does not exist', () => {
      expect(() => service.smoothScroll('non-existent-section')).not.toThrow();
    });

    it('should call scrollIntoView on the matching element', () => {
      const el = doc.createElement('div');
      el.id = 'test-anchor';
      doc.body.appendChild(el);
      const spy = spyOn(el, 'scrollIntoView');

      service.smoothScroll('test-anchor');

      expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      doc.body.removeChild(el);
    });
  });

  // ─── updateActiveNavLink() ────────────────────────────────────────────────

  describe('updateActiveNavLink()', () => {
    it('should not throw when called with an empty section list', () => {
      expect(() => service.updateActiveNavLink([])).not.toThrow();
    });

    it('should not throw when called with section ids that do not exist in DOM', () => {
      expect(() => service.updateActiveNavLink(['hero', 'about', 'skills'])).not.toThrow();
    });
  });
});
