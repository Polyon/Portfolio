import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Singleton service that holds the reactive unread contact message count.
 *
 * Used by the admin sidebar navigation to display a badge on the "Contact Inbox"
 * nav item, and updated by InboxListComponent and InboxDetailComponent after
 * mark-read / mark-unread actions.
 *
 * State is initialised to 0 and populated by InboxListComponent on init via
 * a call to ContactInboxService.getStats().
 */
@Injectable({ providedIn: 'root' })
export class ContactInboxStateService {

  private readonly _unreadCount = new BehaviorSubject<number>(0);

  /**
   * Observable stream of the current unread message count.
   * Emit new values via setUnreadCount, decrementUnread, or incrementUnread.
   */
  readonly unreadCount$: Observable<number> = this._unreadCount.asObservable();

  /**
   * Replaces the current unread count with the given value.
   * Call this on inbox page init after receiving stats from the API.
   *
   * @param count - The authoritative unread count from the server.
   */
  setUnreadCount(count: number): void {
    this._unreadCount.next(count);
  }

  /**
   * Decrements the unread count by 1, with a floor of 0.
   * Call this when the admin marks a message as read.
   */
  decrementUnread(): void {
    this._unreadCount.next(Math.max(0, this._unreadCount.value - 1));
  }

  /**
   * Increments the unread count by 1.
   * Call this when the admin marks a message as unread.
   */
  incrementUnread(): void {
    this._unreadCount.next(this._unreadCount.value + 1);
  }
}
