import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../../../core/http/api.service';
import {
  ContactMessageListResponse,
  ContactMessageDetailResponse,
  MarkReadDTO,
  MarkReadResponse,
  DeleteMessageResponse,
  SendReplyDTO,
  SendReplyResponse,
  ContactMessageStatsResponse,
  InboxListQueryParams,
} from '../../../../shared/models/contact-inbox.models';

/**
 * Admin inbox service — handles all HTTP calls to the contact messages API.
 *
 * Endpoints (all under /api prefix configured in ApiService):
 *   GET    /admin/contact/messages            — paginated + filtered message list
 *   GET    /admin/contact/messages/stats      — unread / total counts
 *   GET    /admin/contact/messages/:id        — single message detail
 *   PATCH  /admin/contact/messages/:id/read   — toggle read status
 *   DELETE /admin/contact/messages/:id        — delete a message
 *   POST   /admin/contact/messages/:id/reply  — send an email reply
 */
@Injectable({ providedIn: 'root' })
export class ContactInboxService {
  private readonly api = inject(ApiService);

  /**
   * Fetches a paginated, optionally filtered list of contact messages.
   *
   * @param params - Optional pagination and filter parameters.
   * @returns Observable wrapping the paginated list response.
   */
  listMessages(params?: InboxListQueryParams): Observable<ContactMessageListResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params?.page      !== undefined) queryParams['page']      = params.page;
    if (params?.limit     !== undefined) queryParams['limit']     = params.limit;
    if (params?.queryType !== undefined) queryParams['queryType'] = params.queryType;
    if (params?.isRead    !== undefined) queryParams['isRead']    = params.isRead;
    return this.api.get<ContactMessageListResponse>('/admin/contact/messages', queryParams);
  }

  /**
   * Fetches the full detail for a single contact message.
   *
   * Returns `null` when the server responds with 404 so that callers can
   * display an empty-state UI without crashing. All other errors are
   * re-thrown for the global error interceptor to handle.
   *
   * @param id - The MongoDB document ID of the message.
   * @returns Observable wrapping the message detail response, or `null` on 404.
   */
  getMessage(id: string): Observable<ContactMessageDetailResponse | null> {
    return this.api.get<ContactMessageDetailResponse>(`/admin/contact/messages/${id}`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        throw err;
      }),
    );
  }

  /**
   * Marks a contact message as read or unread.
   *
   * @param id     - The message document ID.
   * @param isRead - `true` to mark as read, `false` to mark as unread.
   * @returns Observable wrapping the updated message detail.
   */
  markRead(id: string, isRead: boolean): Observable<MarkReadResponse> {
    const body: MarkReadDTO = { isRead };
    return this.api.patch<MarkReadResponse>(`/admin/contact/messages/${id}/read`, body);
  }

  /**
   * Permanently deletes a contact message.
   *
   * @param id - The message document ID.
   * @returns Observable wrapping the deletion confirmation.
   */
  deleteMessage(id: string): Observable<DeleteMessageResponse> {
    return this.api.delete<DeleteMessageResponse>(`/admin/contact/messages/${id}`);
  }

  /**
   * Sends an email reply to a contact message and records it in the message thread.
   *
   * @param id  - The message document ID to reply to.
   * @param dto - Reply payload containing optional subject and required body.
   * @returns Observable wrapping the reply confirmation and newly created reply record.
   */
  sendReply(id: string, dto: SendReplyDTO): Observable<SendReplyResponse> {
    return this.api.post<SendReplyResponse>(`/admin/contact/messages/${id}/reply`, dto);
  }

  /**
   * Fetches aggregate stats for the inbox (total, unread, breakdown by query type).
   *
   * @returns Observable wrapping the stats payload.
   */
  getStats(): Observable<ContactMessageStatsResponse> {
    return this.api.get<ContactMessageStatsResponse>('/admin/contact/messages/stats');
  }
}
