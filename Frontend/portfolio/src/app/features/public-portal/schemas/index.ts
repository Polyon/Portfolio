/**
 * Re-exports all JSON-LD schema builder utilities.
 *
 * Import from this barrel when you need multiple schema types:
 *
 * ```ts
 * import { buildPersonSchema, buildWebSiteSchema } from '../schemas';
 * ```
 *
 * @file index.ts
 */
export {
  buildPersonSchema,
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  buildProjectSchema,
} from '../utils/schema.utils';

export type { BreadcrumbItem } from '../utils/schema.utils';
