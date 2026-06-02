import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';

import { ContactInboxService } from './contact-inbox.service';
import { ApiService } from '../../../../core/http/api.service';
import { QueryType } from '../../../../shared/models/contact-inbox.models';

/**
 * T005 — ContactInboxService unit tests.
 *
 * Verifies that every public method constructs the correct HTTP call by spying
 * on ApiService. No real HTTP requests are made.
 */
describe('ContactInboxService', () => {
  let service: ContactInboxService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ContactInboxService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ContactInboxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── listMessages() ────────────────────────────────────────────────────────

  describe('listMessages()', () => {
    it('should call api.get with /admin/contact/messages', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [], pagination: {} as never }));
      service.listMessages().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/admin/contact/messages',
        jasmine.any(Object),
      );
    });

    it('should forward page and limit as numeric query params', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [], pagination: {} as never }));
      service.listMessages({ page: 2, limit: 10 }).subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/admin/contact/messages',
        jasmine.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should forward queryType filter when provided', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [], pagination: {} as never }));
      service.listMessages({ queryType: QueryType.SERVICE }).subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/admin/contact/messages',
        jasmine.objectContaining({ queryType: QueryType.SERVICE }),
      );
    });

    it('should forward isRead filter when provided', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [], pagination: {} as never }));
      service.listMessages({ isRead: false }).subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith(
        '/admin/contact/messages',
        jasmine.objectContaining({ isRead: false }),
      );
    });

    it('should omit undefined params from the query object', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: [], pagination: {} as never }));
      service.listMessages({}).subscribe();
      const callArgs = apiSpy.get.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(Object.keys(callArgs)).not.toContain('queryType');
      expect(Object.keys(callArgs)).not.toContain('isRead');
    });
  });

  // ─── getMessage() ──────────────────────────────────────────────────────────

  describe('getMessage()', () => {
    it('should call api.get with the interpolated message id path', () => {
      apiSpy.get.and.returnValue(of({ success: true, data: {} as never }));
      service.getMessage('abc-123').subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/contact/messages/abc-123');
    });
  });

  // ─── markRead() ────────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('should call api.patch with isRead: true', () => {
      apiSpy.patch.and.returnValue(of({ success: true, data: {} as never }));
      service.markRead('abc-123', true).subscribe();
      expect(apiSpy.patch).toHaveBeenCalledWith(
        '/admin/contact/messages/abc-123/read',
        { isRead: true },
      );
    });

    it('should call api.patch with isRead: false to mark unread', () => {
      apiSpy.patch.and.returnValue(of({ success: true, data: {} as never }));
      service.markRead('abc-123', false).subscribe();
      expect(apiSpy.patch).toHaveBeenCalledWith(
        '/admin/contact/messages/abc-123/read',
        { isRead: false },
      );
    });
  });

  // ─── deleteMessage() ───────────────────────────────────────────────────────

  describe('deleteMessage()', () => {
    it('should call api.delete with the interpolated message id path', () => {
      apiSpy.delete.and.returnValue(of({ success: true, message: 'Deleted' }));
      service.deleteMessage('abc-123').subscribe();
      expect(apiSpy.delete).toHaveBeenCalledWith('/admin/contact/messages/abc-123');
    });
  });

  // ─── sendReply() ───────────────────────────────────────────────────────────

  describe('sendReply()', () => {
    it('should call api.post with the reply DTO payload', () => {
      apiSpy.post.and.returnValue(of({ success: true, message: 'Sent', data: {} as never }));
      const dto = { body: 'Thank you for reaching out.' };
      service.sendReply('abc-123', dto).subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/admin/contact/messages/abc-123/reply',
        dto,
      );
    });

    it('should include optional subject in the payload when provided', () => {
      apiSpy.post.and.returnValue(of({ success: true, message: 'Sent', data: {} as never }));
      const dto = { subject: 'Re: Your enquiry', body: 'Hello!' };
      service.sendReply('abc-123', dto).subscribe();
      expect(apiSpy.post).toHaveBeenCalledWith(
        '/admin/contact/messages/abc-123/reply',
        dto,
      );
    });
  });

  // ─── getStats() ────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should call api.get with /admin/contact/messages/stats', () => {
      apiSpy.get.and.returnValue(
        of({
          success: true,
          data: { total: 5, unread: 2, serviceQueries: 1, generalQueries: 4 },
        }),
      );
      service.getStats().subscribe();
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/contact/messages/stats');
    });
  });
});
