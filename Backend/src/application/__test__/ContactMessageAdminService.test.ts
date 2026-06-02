/**
 * Unit tests for ContactMessageAdminService (inbox methods).
 * TDD Phase: RED — these tests must FAIL before ContactMessageAdminService is implemented.
 *
 * Coverage targets (T017):
 *  - list() returns paginated results ordered by createdAt desc
 *  - list({ queryType: SERVICE }) filters correctly
 *  - list({ isRead: false }) filters correctly
 *  - list({ page: 2, limit: 5 }) returns correct page
 *  - getById() returns full document including replies
 *  - getById() returns null for non-existent ID
 *  - markRead() updates isRead field and returns updated document
 *  - delete() removes document and returns deleted doc
 *  - stats() returns correct { total, unread, serviceQueries, generalQueries } counts
 */

import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { ContactMessageAdminService } from '../ContactMessageAdminService';
import { ContactMessage } from '../../infrastructure/database/models/ContactMessage';
import { QueryType } from '../../domain/enums/query-type.enum';

const SERVICE_MSG = {
  name:      'Alice',
  email:     'alice@example.com',
  subject:   'Service inquiry',
  message:   'I would like to hire you for a project.',
  queryType: QueryType.SERVICE,
  isRead:    false,
};

const GENERAL_MSG = {
  name:      'Bob',
  email:     'bob@example.com',
  subject:   'General question',
  message:   'Just a general question about your portfolio.',
  queryType: QueryType.GENERAL,
  isRead:    true,
};

describe('ContactMessageAdminService', () => {
  let service: ContactMessageAdminService;

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  beforeEach(() => {
    service = new ContactMessageAdminService();
  });

  // ─── list() ──────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns paginated results ordered by createdAt desc', async () => {
      await ContactMessage.create({ ...SERVICE_MSG, email: 'a@test.com' });
      await new Promise((r) => setTimeout(r, 5));
      await ContactMessage.create({ ...GENERAL_MSG, email: 'b@test.com' });

      const result = await service.list({});
      expect(result.data.length).toBe(2);
      // Most recent first
      expect(result.data[0]!.email).toBe('b@test.com');
      expect(result.data[1]!.email).toBe('a@test.com');
    });

    it('returns correct pagination meta', async () => {
      await ContactMessage.create(SERVICE_MSG);
      const result = await service.list({ page: 1, limit: 20 });
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.pages).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('filters by queryType: SERVICE', async () => {
      await ContactMessage.create(SERVICE_MSG);
      await ContactMessage.create(GENERAL_MSG);

      const result = await service.list({ queryType: QueryType.SERVICE });
      expect(result.data.length).toBe(1);
      expect(result.data[0]!.queryType).toBe(QueryType.SERVICE);
    });

    it('filters by queryType: GENERAL', async () => {
      await ContactMessage.create(SERVICE_MSG);
      await ContactMessage.create(GENERAL_MSG);

      const result = await service.list({ queryType: QueryType.GENERAL });
      expect(result.data.length).toBe(1);
      expect(result.data[0]!.queryType).toBe(QueryType.GENERAL);
    });

    it('filters by isRead: false', async () => {
      await ContactMessage.create(SERVICE_MSG);  // isRead: false
      await ContactMessage.create(GENERAL_MSG);  // isRead: true

      const result = await service.list({ isRead: false });
      expect(result.data.length).toBe(1);
      expect(result.data[0]!.isRead).toBe(false);
    });

    it('filters by isRead: true', async () => {
      await ContactMessage.create(SERVICE_MSG);  // isRead: false
      await ContactMessage.create(GENERAL_MSG);  // isRead: true

      const result = await service.list({ isRead: true });
      expect(result.data.length).toBe(1);
      expect(result.data[0]!.isRead).toBe(true);
    });

    it('paginates correctly — page 2 with limit 1', async () => {
      await ContactMessage.create({ ...SERVICE_MSG, email: 'p1@test.com' });
      await new Promise((r) => setTimeout(r, 5));
      await ContactMessage.create({ ...GENERAL_MSG, email: 'p2@test.com' });

      const result = await service.list({ page: 2, limit: 1 });
      expect(result.data.length).toBe(1);
      expect(result.data[0]!.email).toBe('p1@test.com');
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(2);
    });

    it('returns empty data array when no messages match filter', async () => {
      const result = await service.list({ queryType: QueryType.SERVICE });
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('excludes message body from list items (FR-017)', async () => {
      await ContactMessage.create(SERVICE_MSG);
      const result = await service.list({});
      const item = result.data[0]!;
      // list items must NOT include the full message body
      expect((item as unknown as Record<string, unknown>)['message']).toBeUndefined();
    });

    it('includes replyCount in list items', async () => {
      await ContactMessage.create(SERVICE_MSG);
      const result = await service.list({});
      expect(typeof result.data[0]!.replyCount).toBe('number');
    });
  });

  // ─── getById() ────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('returns the full document including replies array', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);
      const found = await service.getById(doc._id.toString());
      expect(found).not.toBeNull();
      expect(found!.email).toBe('alice@example.com');
      expect(Array.isArray(found!.replies)).toBe(true);
    });

    it('returns null for a non-existent ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const found = await service.getById(fakeId);
      expect(found).toBeNull();
    });
  });

  // ─── markRead() ───────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('sets isRead: true and returns updated document', async () => {
      const doc = await ContactMessage.create({ ...SERVICE_MSG, isRead: false });
      const updated = await service.markRead(doc._id.toString(), true);
      expect(updated).not.toBeNull();
      expect(updated!.isRead).toBe(true);
    });

    it('sets isRead: false and returns updated document', async () => {
      const doc = await ContactMessage.create({ ...GENERAL_MSG, isRead: true });
      const updated = await service.markRead(doc._id.toString(), false);
      expect(updated!.isRead).toBe(false);
    });

    it('returns null for a non-existent ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await service.markRead(fakeId, true);
      expect(result).toBeNull();
    });

    it('persists the isRead update in the database', async () => {
      const doc = await ContactMessage.create({ ...SERVICE_MSG, isRead: false });
      await service.markRead(doc._id.toString(), true);
      const fromDb = await ContactMessage.findById(doc._id).lean();
      expect(fromDb?.isRead).toBe(true);
    });
  });

  // ─── delete() ─────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('removes the document and returns the deleted doc', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);
      const deleted = await service.delete(doc._id.toString());
      expect(deleted).not.toBeNull();
      expect(deleted!.email).toBe('alice@example.com');

      const fromDb = await ContactMessage.findById(doc._id).lean();
      expect(fromDb).toBeNull();
    });

    it('returns null when deleting a non-existent ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await service.delete(fakeId);
      expect(result).toBeNull();
    });
  });

  // ─── stats() ──────────────────────────────────────────────────────────────

  describe('stats()', () => {
    it('returns zero counts when no messages exist', async () => {
      const stats = await service.stats();
      expect(stats).toEqual({ total: 0, unread: 0, serviceQueries: 0, generalQueries: 0 });
    });

    it('returns correct total, unread, serviceQueries, generalQueries counts', async () => {
      await ContactMessage.create({ ...SERVICE_MSG, isRead: false });  // unread service
      await ContactMessage.create({ ...SERVICE_MSG, email: 's2@t.com', isRead: true });  // read service
      await ContactMessage.create({ ...GENERAL_MSG, isRead: false });  // unread general
      await ContactMessage.create({ ...GENERAL_MSG, email: 'g2@t.com', isRead: true });  // read general

      const stats = await service.stats();
      expect(stats.total).toBe(4);
      expect(stats.unread).toBe(2);
      expect(stats.serviceQueries).toBe(2);
      expect(stats.generalQueries).toBe(2);
    });
  });

  // ─── sendReply() (T020) ───────────────────────────────────────────────────

  describe('sendReply()', () => {
    let mockEmailService: { send: jest.Mock; renderTemplate: jest.Mock };

    beforeEach(() => {
      mockEmailService = {
        send:           jest.fn().mockResolvedValue(undefined),
        renderTemplate: jest.fn().mockResolvedValue({ html: '<p>reply</p>', text: 'reply' }),
      };
      service = new ContactMessageAdminService(mockEmailService);
    });

    afterEach(() => { jest.restoreAllMocks(); });

    it('success path: persists reply and returns ContactReplyDetail', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);

      const result = await service.sendReply(doc._id.toString(), { body: 'Hello from admin!' }, 'admin-001');

      // Returned shape
      expect(typeof result.id).toBe('string');
      expect(result.body).toBe('Hello from admin!');
      expect(result.sentBy).toBe('admin-001');
      expect(typeof result.sentAt).toBe('string');

      // Persisted in DB
      const updated = await ContactMessage.findById(doc._id).lean();
      expect(updated!.replies).toHaveLength(1);
      expect(updated!.replies[0]!.body).toBe('Hello from admin!');
      expect(updated!.replies[0]!.sentBy).toBe('admin-001');
    });

    it('SMTP failure: does NOT persist reply and rethrows error', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);
      mockEmailService.send.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.sendReply(doc._id.toString(), { body: 'Hello!' }, 'admin-001'),
      ).rejects.toThrow('SMTP down');

      const fromDb = await ContactMessage.findById(doc._id).lean();
      expect(fromDb!.replies).toHaveLength(0);
    });

    it('second reply appends to existing replies (multiple replies supported)', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);

      await service.sendReply(doc._id.toString(), { body: 'First reply' }, 'admin-001');
      await service.sendReply(doc._id.toString(), { body: 'Second reply' }, 'admin-002');

      const updated = await ContactMessage.findById(doc._id).lean();
      expect(updated!.replies).toHaveLength(2);
      expect(updated!.replies[0]!.body).toBe('First reply');
      expect(updated!.replies[1]!.body).toBe('Second reply');
    });

    it('throws NotFoundError (httpStatus 404) for non-existent message ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(
        service.sendReply(fakeId, { body: 'Hello!' }, 'admin-001'),
      ).rejects.toMatchObject({ httpStatus: 404 });
    });

    it('subject defaults to "Re: {original subject}" when not provided', async () => {
      const doc = await ContactMessage.create({ ...SERVICE_MSG, subject: 'My inquiry' });
      await service.sendReply(doc._id.toString(), { body: 'Hello!' }, 'admin-001');

      expect(mockEmailService.renderTemplate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subject: 'Re: My inquiry' }),
      );
    });

    it('subject defaults to "Re: Your enquiry" when original subject is absent', async () => {
      const doc = await ContactMessage.create({ ...SERVICE_MSG, subject: undefined });
      await service.sendReply(doc._id.toString(), { body: 'Hello!' }, 'admin-001');

      expect(mockEmailService.renderTemplate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subject: 'Re: Your enquiry' }),
      );
    });

    it('passes body as replyBody variable — Handlebars handles HTML-escaping at render time', async () => {
      const doc = await ContactMessage.create(SERVICE_MSG);
      const xssBody = '<script>alert("xss")</script>';
      await service.sendReply(doc._id.toString(), { body: xssBody }, 'admin-001');

      expect(mockEmailService.renderTemplate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ replyBody: xssBody }),
      );
    });

    it('uses SERVICE_INQUIRY_REPLY template for SERVICE query type', async () => {
      const doc = await ContactMessage.create({ ...SERVICE_MSG, queryType: QueryType.SERVICE });
      await service.sendReply(doc._id.toString(), { body: 'Hi' }, 'admin-001');

      const { EmailTemplate } = await import('../../infrastructure/email/types');
      expect(mockEmailService.renderTemplate).toHaveBeenCalledWith(
        EmailTemplate.SERVICE_INQUIRY_REPLY,
        expect.anything(),
      );
    });

    it('uses GENERAL_INQUIRY_REPLY template for GENERAL query type', async () => {
      const doc = await ContactMessage.create({ ...GENERAL_MSG, queryType: QueryType.GENERAL });
      await service.sendReply(doc._id.toString(), { body: 'Hi' }, 'admin-001');

      const { EmailTemplate } = await import('../../infrastructure/email/types');
      expect(mockEmailService.renderTemplate).toHaveBeenCalledWith(
        EmailTemplate.GENERAL_INQUIRY_REPLY,
        expect.anything(),
      );
    });
  });
});
