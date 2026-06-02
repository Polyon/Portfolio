/**
 * JSON-LD structured data schema builder utilities.
 *
 * All builder functions return plain objects ready to be passed to
 * `SeoService.setStructuredData()`.  Every schema uses `https://schema.org`
 * as its context and is typed as `Record<string, unknown>` so they can be
 * serialised directly to JSON without needing to cast at the call site.
 *
 * @file schema.utils.ts
 */

import { Profile } from '../../../core/models/profile.model';
import { Project } from '../../../core/models/project.model';
import { environment } from '../../../../environments/environment';

// ─── Person ──────────────────────────────────────────────────────────────────

/**
 * Builds a Schema.org `Person` object for the portfolio owner.
 *
 * @param profile - Public profile data.
 * @returns JSON-LD Person schema.
 */
export function buildPersonSchema(profile: Profile): Record<string, unknown> {
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

  if (profile.location?.country) {
    const parts = [profile.location.city, profile.location.state, profile.location.country]
      .filter(Boolean)
      .join(', ');
    schema['address'] = {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city ?? '',
      addressRegion: profile.location.state ?? '',
      addressCountry: profile.location.country,
    };
    schema['workLocation'] = parts;
  }

  return schema;
}

// ─── WebSite ─────────────────────────────────────────────────────────────────

/**
 * Builds a Schema.org `WebSite` object for the portfolio site.
 *
 * @returns JSON-LD WebSite schema.
 */
export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: environment.seo.siteName,
    url: environment.seo.siteUrl,
    description: environment.seo.defaultDescription,
    author: {
      '@type': 'Person',
      name: environment.seo.author,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${environment.seo.siteUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

/** A single breadcrumb item. */
export interface BreadcrumbItem {
  /** Human-readable name. */
  name: string;
  /** Absolute URL for the breadcrumb position. */
  url: string;
}

/**
 * Builds a Schema.org `BreadcrumbList` from an ordered array of items.
 *
 * @param items - Breadcrumb positions in order (first = root).
 * @returns JSON-LD BreadcrumbList schema.
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── CreativeWork (Project) ───────────────────────────────────────────────────

/**
 * Builds a Schema.org `CreativeWork` for a portfolio project.
 *
 * @param project - Project data from the API.
 * @returns JSON-LD CreativeWork schema.
 */
export function buildProjectSchema(project: Project): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.name,
    description: project.shortDescription || project.description,
    author: {
      '@type': 'Person',
      name: environment.seo.author,
    },
    dateCreated: project.startDate,
  };

  if (project.completionDate) {
    schema['datePublished'] = project.completionDate;
  }

  if (project.liveUrl) {
    schema['url'] = project.liveUrl;
  }

  if (project.repositoryUrl) {
    schema['codeRepository'] = project.repositoryUrl;
  }

  if (project.imageUrl) {
    schema['image'] = project.imageUrl;
  }

  if (project.skills && project.skills.length > 0) {
    schema['keywords'] = project.skills.map((s) => s.name).join(', ');
    schema['programmingLanguage'] = project.skills.map((s) => s.name);
  }

  return schema;
}
