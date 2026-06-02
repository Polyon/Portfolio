import { startTestDb, clearTestDb, stopTestDb } from '../../database/__test__/test-db';
import { UserRepository } from '../UserRepository';
import { UserRole } from '../../../domain/entities/User.entity';

describe('UserRepository', () => {
  const repo = new UserRepository();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('create & findByEmail', () => {
    it('creates a user and retrieves by email', async () => {
      await repo.create({ email: 'test@example.com', passwordHash: 'hash123', role: UserRole.ADMIN });
      const found = await repo.findByEmail('test@example.com');
      expect(found).not.toBeNull();
      expect(found!.email).toBe('test@example.com');
    });

    it('stores email in lowercase', async () => {
      await repo.create({ email: 'Upper@Example.COM', passwordHash: 'hash' });
      const found = await repo.findByEmail('upper@example.com');
      expect(found).not.toBeNull();
    });

    it('returns null for unknown email', async () => {
      const found = await repo.findByEmail('nobody@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('finds a user by id', async () => {
      const user = await repo.create({ email: 'id@test.com', passwordHash: 'h' });
      const found = await repo.findById(user._id.toString());
      expect(found).not.toBeNull();
      expect(found!.email).toBe('id@test.com');
    });

    it('returns null for non-existent id', async () => {
      const found = await repo.findById('000000000000000000000000');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a user field', async () => {
      const user = await repo.create({ email: 'update@test.com', passwordHash: 'old' });
      const updated = await repo.update(user._id.toString(), { passwordHash: 'new' });
      expect(updated!.passwordHash).toBe('new');
    });
  });

  describe('delete (soft)', () => {
    it('soft-deletes a user so findByEmail returns null', async () => {
      const user = await repo.create({ email: 'del@test.com', passwordHash: 'h' });
      await repo.delete(user._id.toString());
      const found = await repo.findByEmail('del@test.com');
      expect(found).toBeNull();
    });
  });

  describe('unique email constraint', () => {
    it('throws when creating duplicate email', async () => {
      await repo.create({ email: 'dup@test.com', passwordHash: 'h' });
      await expect(repo.create({ email: 'dup@test.com', passwordHash: 'h2' })).rejects.toThrow();
    });
  });
});
