import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';

import { SeoService } from './seo.service';

/**
 * T125b — SeoService tests.
 * Validates meta-tag updates, Open Graph tags, canonical URL management,
 * structured-data script injection, and generateMetaForSection().
 */
describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, provideZonelessChangeDetection()],
    });
    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    // Clean up any injected nodes between tests
    doc.getElementById('structured-data')?.remove();
    doc.querySelector('link[rel="canonical"]')?.remove();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── setMeta() ────────────────────────────────────────────────────────────

  describe('setMeta()', () => {
    it('should update the document title', () => {
      service.setMeta('About Me', 'A brief bio', 'portfolio, developer');
      expect(titleService.getTitle()).toContain('About Me');
    });

    it('should set the meta description', () => {
      service.setMeta('Skills', 'All my skills', 'angular, typescript');
      const tag = metaService.getTag('name="description"');
      expect(tag?.content).toBe('All my skills');
    });

    it('should set the meta keywords', () => {
      service.setMeta('Projects', 'My projects', 'angular, nodejs');
      const tag = metaService.getTag('name="keywords"');
      expect(tag?.content).toBe('angular, nodejs');
    });

    it('should append the site name to the title', () => {
      service.setMeta('Hero', 'Tagline', 'key');
      expect(titleService.getTitle()).toContain(' | ');
    });
  });

  // ─── setOgTags() ─────────────────────────────────────────────────────────

  describe('setOgTags()', () => {
    it('should set og:title', () => {
      service.setOgTags('OG Title', 'OG Desc', 'https://img.com/a.jpg', 'https://example.com');
      const tag = metaService.getTag('property="og:title"');
      expect(tag?.content).toBe('OG Title');
    });

    it('should set og:description', () => {
      service.setOgTags('T', 'OG Desc', 'https://img.com/a.jpg', 'https://example.com');
      const tag = metaService.getTag('property="og:description"');
      expect(tag?.content).toBe('OG Desc');
    });

    it('should set og:image', () => {
      service.setOgTags('T', 'D', 'https://img.com/photo.jpg', 'https://example.com');
      const tag = metaService.getTag('property="og:image"');
      expect(tag?.content).toBe('https://img.com/photo.jpg');
    });

    it('should set og:url', () => {
      service.setOgTags('T', 'D', 'https://img.com/a.jpg', 'https://example.com/page');
      const tag = metaService.getTag('property="og:url"');
      expect(tag?.content).toBe('https://example.com/page');
    });

    it('should set twitter:card', () => {
      service.setOgTags('T', 'D', 'https://img.com/a.jpg', 'https://example.com');
      const tag = metaService.getTag('name="twitter:card"');
      expect(tag?.content).toBe('summary_large_image');
    });
  });

  // ─── setStructuredData() ─────────────────────────────────────────────────

  describe('setStructuredData()', () => {
    it('should inject a script tag with JSON-LD type', () => {
      const schema = { '@context': 'https://schema.org', '@type': 'Person', name: 'Test' };
      service.setStructuredData(schema);
      const script = doc.getElementById('structured-data') as HTMLScriptElement | null;
      expect(script).not.toBeNull();
      expect(script!.type).toBe('application/ld+json');
    });

    it('should serialise the schema as JSON', () => {
      const schema = { '@type': 'WebSite', name: 'Portfolio' };
      service.setStructuredData(schema);
      const script = doc.getElementById('structured-data') as HTMLScriptElement;
      const parsed = JSON.parse(script.text);
      expect(parsed['@type']).toBe('WebSite');
      expect(parsed.name).toBe('Portfolio');
    });

    it('should replace a previously injected structured-data script', () => {
      service.setStructuredData({ '@type': 'Person', name: 'First' });
      service.setStructuredData({ '@type': 'WebSite', name: 'Second' });
      const scripts = doc.querySelectorAll('#structured-data');
      expect(scripts.length).toBe(1);
      const parsed = JSON.parse((scripts[0] as HTMLScriptElement).text);
      expect(parsed.name).toBe('Second');
    });
  });

  // ─── setCanonicalUrl() ───────────────────────────────────────────────────

  describe('setCanonicalUrl()', () => {
    it('should create a canonical link tag', () => {
      service.setCanonicalUrl('https://example.com');
      const link = doc.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('https://example.com');
    });

    it('should update the existing canonical link tag if called again', () => {
      service.setCanonicalUrl('https://example.com/v1');
      service.setCanonicalUrl('https://example.com/v2');
      const links = doc.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('https://example.com/v2');
    });
  });

  // ─── generateMetaForSection() ────────────────────────────────────────────

  describe('generateMetaForSection()', () => {
    it('should use seoData.title when provided', () => {
      service.generateMetaForSection('Skills', { title: 'Custom Title', description: 'Desc', keywords: ['k'] });
      expect(titleService.getTitle()).toContain('Custom Title');
    });

    it('should fall back to sectionName when title is absent', () => {
      service.generateMetaForSection('Projects', { description: 'Projects page' });
      expect(titleService.getTitle()).toContain('Projects');
    });

    it('should not throw when seoData is an empty object', () => {
      expect(() => service.generateMetaForSection('Contact', {})).not.toThrow();
    });
  });
});
