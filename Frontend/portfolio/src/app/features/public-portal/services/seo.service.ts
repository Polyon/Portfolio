import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { SeoMetadata } from '../models/public-portal.models';
import { Profile } from '../../../core/models/profile.model';

/**
 * SEO service for the public portfolio portal.
 * Manages document title, meta tags, Open Graph tags,
 * JSON-LD structured data, and canonical URLs.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  /**
   * Sets the page title and standard meta tags.
   *
   * @param pageTitle   - Browser tab and SEO title.
   * @param description - Meta description for search engines.
   * @param keywords    - Comma-separated keyword list.
   */
  setMeta(pageTitle: string, description: string, keywords: string): void {
    const fullTitle = `${pageTitle} | ${environment.seo.siteName}`;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ name: 'author', content: environment.seo.author });
  }

  /**
   * Sets Open Graph meta tags for rich social sharing previews.
   *
   * @param ogTitle       - OG title (usually same as page title).
   * @param ogDescription - OG description for social cards.
   * @param ogImage       - Absolute URL of the share image.
   * @param ogUrl         - Canonical page URL.
   */
  setOgTags(ogTitle: string, ogDescription: string, ogImage: string, ogUrl: string): void {
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: environment.seo.siteName });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: ogDescription });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:url', content: ogUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: ogDescription });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    if (environment.seo.twitterHandle) {
      this.meta.updateTag({ name: 'twitter:site', content: environment.seo.twitterHandle });
    }
  }

  /**
   * Injects a JSON-LD structured data script block into the document head.
   * Replaces any previously injected structured data script.
   *
   * @param schema - Schema.org JSON-LD object (e.g. Person, BreadcrumbList).
   */
  setStructuredData(schema: Record<string, unknown>): void {
    const existing = this.document.getElementById('structured-data');
    if (existing) {
      existing.remove();
    }
    const script = this.document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }

  /**
   * Sets a canonical link element for the given URL, preventing duplicate content.
   *
   * @param url - The canonical URL for the current page.
   */
  setCanonicalUrl(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Applies full SEO metadata (title, description, OG tags) for a portfolio section
   * from a pre-built SeoMetadata object.
   *
   * @param sectionName - Display name of the section (e.g. 'Hero', 'About').
   * @param seoData     - Resolved SeoMetadata from the backend.
   */
  generateMetaForSection(sectionName: string, seoData: Partial<SeoMetadata>): void {
    const title = seoData.title ?? sectionName;
    const description = seoData.description ?? environment.seo.defaultDescription;
    const keywords = seoData.keywords?.join(', ') ?? '';

    this.setMeta(title, description, keywords);

    if (seoData.ogTitle || seoData.ogDescription || seoData.ogImage || seoData.ogUrl) {
      this.setOgTags(
        seoData.ogTitle ?? title,
        seoData.ogDescription ?? description,
        seoData.ogImage ?? '',
        seoData.ogUrl ?? environment.seo.siteUrl,
      );
    }

    if (seoData.structuredData) {
      this.setStructuredData(seoData.structuredData as Record<string, unknown>);
    }

    if (seoData.ogUrl) {
      this.setCanonicalUrl(seoData.ogUrl);
    }
  }

  /**
   * Generates and applies a Person schema for the portfolio owner
   * based on profile data.
   *
   * @param profile - Public profile data from the backend.
   */
  applyPersonSchema(profile: Profile): void {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: `${profile.firstName} ${profile.lastName}`,
      jobTitle: profile.tagline,
      description: profile.bio,
      url: environment.seo.siteUrl,
    };
    if (profile.profileImageUrl) {
      schema['image'] = profile.profileImageUrl;
    }
    this.setStructuredData(schema);
  }
}
