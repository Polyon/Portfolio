import { SEOMetadata, PageType } from '../infrastructure/database/models/SEOMetadata';
import type { ISEOMetadata } from '../infrastructure/database/models/SEOMetadata';
import type { SEOMetadataRequest, SEOSection } from './dtos/seo.dtos';
import { ValidationAppError } from '../domain/errors/AppError';

/**
 * Service for managing SEO metadata per page section.
 *
 * Each user can have one SEOMetadata document per PageType (enforced by unique index).
 * Upsert semantics are used so callers never need to worry about create vs update.
 */
export class SEOService {
  /**
   * Upsert SEO metadata for a given user/section pair.
   *
   * @param userId   - Portfolio owner user ID
   * @param section  - PageType section identifier
   * @param metadata - Fields to set/overwrite
   * @returns The saved SEO metadata document
   */
  async updateSEOMetadata(
    userId: string,
    section: SEOSection,
    metadata: SEOMetadataRequest,
  ): Promise<ISEOMetadata> {
    const pageType = section as PageType;
    const setFields: Partial<ISEOMetadata> = {
      title: metadata.pageTitle,
      description: metadata.metaDescription,
      keywords: metadata.keywords ?? [],
      ogTitle: metadata.ogTitle,
      ogDescription: metadata.ogDescription,
      ogImage: metadata.ogImageUrl,
    };

    const doc = await SEOMetadata.findOneAndUpdate(
      { userId, pageType, isDeleted: false },
      { $set: setFields },
      { returnDocument: 'after', upsert: true },
    );
    return doc!;
  }

  /**
   * Retrieve SEO metadata for a single section.
   *
   * @param userId  - Portfolio owner user ID
   * @param section - PageType section identifier
   */
  async getSEOMetadata(userId: string, section: SEOSection): Promise<ISEOMetadata | null> {
    return SEOMetadata.findOne({ userId, pageType: section as PageType, isDeleted: false });
  }

  /**
   * Retrieve SEO metadata for all sections that have been configured.
   *
   * @param userId - Portfolio owner user ID
   */
  async getAllSEOMetadata(userId: string): Promise<ISEOMetadata[]> {
    return SEOMetadata.find({ userId, isDeleted: false });
  }

  /**
   * Validate SEO field lengths.
   * Throws an Error with a descriptive message when any constraint is violated.
   *
   * @param metadata - The request body to validate
   */
  validateSEOFields(metadata: SEOMetadataRequest): void {
    if (metadata.pageTitle.length > 70) {
      throw new ValidationAppError('pageTitle must be 70 characters or fewer');
    }
    if (metadata.metaDescription.length > 160) {
      throw new ValidationAppError('metaDescription must be 160 characters or fewer');
    }
    if (metadata.ogTitle && metadata.ogTitle.length > 95) {
      throw new ValidationAppError('ogTitle must be 95 characters or fewer');
    }
    if (metadata.ogDescription && metadata.ogDescription.length > 200) {
      throw new ValidationAppError('ogDescription must be 200 characters or fewer');
    }
  }

  /**
   * Soft-delete SEO metadata for a section (admin operation).
   */
  async deleteSEOMetadata(userId: string, section: SEOSection): Promise<void> {
    await SEOMetadata.updateOne(
      { userId, pageType: section as PageType },
      { $set: { isDeleted: true } },
    );
  }
}
