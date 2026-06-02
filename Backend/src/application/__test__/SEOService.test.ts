import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { SEOService } from '../SEOService';
import mongoose from 'mongoose';

describe('SEOService', () => {
  const service = new SEOService();
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  // ─── updateSEOMetadata ────────────────────────────────────────────────────

  describe('updateSEOMetadata', () => {
    it('creates a new SEO metadata document when none exists', async () => {
      const doc = await service.updateSEOMetadata(userId, 'HOME', {
        pageTitle: 'My Portfolio',
        metaDescription: 'Developer portfolio showcasing skills and projects.',
        keywords: ['developer', 'typescript'],
      });
      expect(doc.title).toBe('My Portfolio');
      expect(doc.description).toBe('Developer portfolio showcasing skills and projects.');
      expect(doc.keywords).toEqual(['developer', 'typescript']);
    });

    it('updates an existing SEO metadata document (upsert)', async () => {
      await service.updateSEOMetadata(userId, 'SKILLS', {
        pageTitle: 'Skills v1',
        metaDescription: 'Original description',
      });
      const updated = await service.updateSEOMetadata(userId, 'SKILLS', {
        pageTitle: 'Skills v2',
        metaDescription: 'Updated description',
        ogTitle: 'OG Skills',
      });
      expect(updated.title).toBe('Skills v2');
      expect(updated.ogTitle).toBe('OG Skills');
    });

    it('stores all OG fields correctly', async () => {
      const doc = await service.updateSEOMetadata(userId, 'PROJECTS', {
        pageTitle: 'Projects',
        metaDescription: 'Portfolio projects.',
        ogTitle: 'My Projects',
        ogDescription: 'See my work',
        ogImageUrl: 'https://example.com/og.png',
      });
      expect(doc.ogTitle).toBe('My Projects');
      expect(doc.ogDescription).toBe('See my work');
      expect(doc.ogImage).toBe('https://example.com/og.png');
    });
  });

  // ─── getSEOMetadata ───────────────────────────────────────────────────────

  describe('getSEOMetadata', () => {
    it('returns null when no metadata exists for the section', async () => {
      const result = await service.getSEOMetadata(userId, 'EXPERIENCE');
      expect(result).toBeNull();
    });

    it('returns the document for the matching section', async () => {
      await service.updateSEOMetadata(userId, 'ABOUT', {
        pageTitle: 'About Me',
        metaDescription: 'Learn more about me.',
      });
      const result = await service.getSEOMetadata(userId, 'ABOUT');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('About Me');
    });

    it('does NOT return metadata for a different section', async () => {
      await service.updateSEOMetadata(userId, 'CONTACT', {
        pageTitle: 'Contact',
        metaDescription: 'Get in touch.',
      });
      const result = await service.getSEOMetadata(userId, 'HOME');
      expect(result).toBeNull();
    });
  });

  // ─── getAllSEOMetadata ────────────────────────────────────────────────────

  describe('getAllSEOMetadata', () => {
    it('returns all configured sections for a user', async () => {
      await service.updateSEOMetadata(userId, 'HOME', { pageTitle: 'Home', metaDescription: 'Home page.' });
      await service.updateSEOMetadata(userId, 'SKILLS', { pageTitle: 'Skills', metaDescription: 'Skills page.' });
      const all = await service.getAllSEOMetadata(userId);
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no metadata configured', async () => {
      const all = await service.getAllSEOMetadata(userId);
      expect(all).toHaveLength(0);
    });

    it('does NOT return metadata belonging to another user', async () => {
      const otherUserId = new mongoose.Types.ObjectId().toString();
      await service.updateSEOMetadata(otherUserId, 'HOME', { pageTitle: 'Other Home', metaDescription: 'Other.' });
      const all = await service.getAllSEOMetadata(userId);
      expect(all).toHaveLength(0);
    });
  });

  // ─── validateSEOFields ───────────────────────────────────────────────────

  describe('validateSEOFields', () => {
    it('passes with valid lengths', () => {
      expect(() =>
        service.validateSEOFields({
          pageTitle: 'Short title',
          metaDescription: 'Short description',
        })
      ).not.toThrow();
    });

    it('throws when pageTitle exceeds 70 characters', () => {
      expect(() =>
        service.validateSEOFields({
          pageTitle: 'A'.repeat(71),
          metaDescription: 'OK',
        })
      ).toThrow('pageTitle must be 70 characters or fewer');
    });

    it('throws when metaDescription exceeds 160 characters', () => {
      expect(() =>
        service.validateSEOFields({
          pageTitle: 'OK',
          metaDescription: 'B'.repeat(161),
        })
      ).toThrow('metaDescription must be 160 characters or fewer');
    });

    it('throws when ogTitle exceeds 95 characters', () => {
      expect(() =>
        service.validateSEOFields({
          pageTitle: 'OK',
          metaDescription: 'OK',
          ogTitle: 'C'.repeat(96),
        })
      ).toThrow('ogTitle must be 95 characters or fewer');
    });

    it('throws when ogDescription exceeds 200 characters', () => {
      expect(() =>
        service.validateSEOFields({
          pageTitle: 'OK',
          metaDescription: 'OK',
          ogDescription: 'D'.repeat(201),
        })
      ).toThrow('ogDescription must be 200 characters or fewer');
    });
  });

  // ─── deleteSEOMetadata ───────────────────────────────────────────────────

  describe('deleteSEOMetadata', () => {
    it('soft-deletes a metadata entry (excludes it from subsequent reads)', async () => {
      await service.updateSEOMetadata(userId, 'SERVICES', { pageTitle: 'Services', metaDescription: 'Services page.' });
      await service.deleteSEOMetadata(userId, 'SERVICES');
      const result = await service.getSEOMetadata(userId, 'SERVICES');
      expect(result).toBeNull();
    });
  });
});
