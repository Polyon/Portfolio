import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ContactInboxStateService } from './contact-inbox-state.service';

describe('ContactInboxStateService', () => {
  let service: ContactInboxStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactInboxStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise unreadCount$ to 0', async () => {
    const count = await firstValueFrom(service.unreadCount$);
    expect(count).toBe(0);
  });

  describe('setUnreadCount()', () => {
    it('should set the unread count to the given value', async () => {
      service.setUnreadCount(7);
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(7);
    });

    it('should overwrite a previously set value', async () => {
      service.setUnreadCount(5);
      service.setUnreadCount(3);
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(3);
    });

    it('should accept 0 to reset the count', async () => {
      service.setUnreadCount(10);
      service.setUnreadCount(0);
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(0);
    });
  });

  describe('decrementUnread()', () => {
    it('should decrement the unread count by 1', async () => {
      service.setUnreadCount(4);
      service.decrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(3);
    });

    it('should not decrement below 0 (floor at 0)', async () => {
      service.setUnreadCount(0);
      service.decrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(0);
    });

    it('should reach exactly 0 when decremented from 1', async () => {
      service.setUnreadCount(1);
      service.decrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(0);
    });
  });

  describe('incrementUnread()', () => {
    it('should increment the unread count by 1', async () => {
      service.setUnreadCount(2);
      service.incrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(3);
    });

    it('should increment from 0', async () => {
      service.incrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(1);
    });

    it('should handle multiple increments sequentially', async () => {
      service.setUnreadCount(0);
      service.incrementUnread();
      service.incrementUnread();
      service.incrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(3);
    });
  });

  describe('unreadCount$ observable', () => {
    it('should emit the latest value to new subscribers immediately (BehaviorSubject)', async () => {
      service.setUnreadCount(9);
      // New subscription should immediately receive the current value
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(9);
    });

    it('should reflect a round-trip of increment then decrement', async () => {
      service.setUnreadCount(5);
      service.incrementUnread();
      service.decrementUnread();
      const count = await firstValueFrom(service.unreadCount$);
      expect(count).toBe(5);
    });
  });
});
