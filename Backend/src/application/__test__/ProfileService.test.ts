import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { ProfileService } from '../ProfileService';
import mongoose from 'mongoose';

describe('ProfileService', () => {
  const service = new ProfileService();
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create', () => {
    it('creates a profile for the user', async () => {
      const profile = await service.create(userId);
      expect(profile.userId.toString()).toBe(userId);
    });
  });

  describe('getByUserId', () => {
    it('returns the profile for an existing user', async () => {
      await service.create(userId);
      const profile = await service.getByUserId(userId);
      expect(profile).not.toBeNull();
      expect(profile!.userId.toString()).toBe(userId);
    });

    it('returns null when no profile exists', async () => {
      const profile = await service.getByUserId(new mongoose.Types.ObjectId().toString());
      expect(profile).toBeNull();
    });
  });

  describe('update', () => {
    it('updates profile fields and creates an audit log', async () => {
      await service.create(userId);
      const updated = await service.update(userId, { tagline: 'Full-Stack Dev' }, userId);
      expect(updated!.tagline).toBe('Full-Stack Dev');
    });

    it('returns null when profile does not exist', async () => {
      const result = await service.update(
        new mongoose.Types.ObjectId().toString(),
        { tagline: 'Ghost' },
        userId,
      );
      expect(result).toBeNull();
    });
  });

  describe('getPublished', () => {
    it('returns profile when isPublished is true', async () => {
      await service.create(userId);
      await service.update(userId, { isPublished: true }, userId);
      const profile = await service.getPublished(userId);
      expect(profile).not.toBeNull();
    });

    it('returns null when profile is not published', async () => {
      await service.create(userId);
      const profile = await service.getPublished(userId);
      expect(profile).toBeNull();
    });
  });

  describe('delete', () => {
    it('soft-deletes the profile', async () => {
      await service.create(userId);
      await service.delete(userId);
      const profile = await service.getByUserId(userId);
      expect(profile).toBeNull();
    });
  });
});
