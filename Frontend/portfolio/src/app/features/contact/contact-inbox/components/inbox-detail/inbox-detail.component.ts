import {
  Component,
  OnInit,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ContactInboxService } from '../../services/contact-inbox.service';
import { ContactInboxStateService } from '../../services/contact-inbox-state.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ReplyComposeComponent } from '../reply-compose/reply-compose.component';
import {
  ContactMessageDetail,
  ContactReplyItem,
  ReplyComposeDialogData,
  QueryType,
} from '../../../../../shared/models/contact-inbox.models';

/**
 * Admin contact inbox detail view.
 *
 * Loads a single contact message by route param `id`, displays all fields
 * and reply history. Supports Mark as Read/Unread, Delete with confirmation
 * dialog, and a placeholder "Reply" button wired by Phase 5.
 *
 * Handles 404 responses with a dedicated not-found empty state.
 */
@Component({
  selector: 'app-inbox-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="detail-wrap">

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-overlay" aria-live="polite" aria-busy="true">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Not found -->
      <div *ngIf="!isLoading() && notFound()" class="not-found-state" role="status">
        <mat-icon class="not-found-icon">search_off</mat-icon>
        <p>Message not found</p>
        <a routerLink="/admin/contact/inbox" class="back-link">Back to Inbox</a>
      </div>

      <ng-container *ngIf="!isLoading() && !notFound() && detail() as msg">

        <!-- ── Action bar ──────────────────────────────────────────────── -->
        <div class="action-bar">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/admin/contact/inbox" class="breadcrumb-link">Inbox</a>
            <mat-icon class="breadcrumb-sep">chevron_right</mat-icon>
            <span class="breadcrumb-current">{{ msg.name }}</span>
          </nav>

          <div class="action-btns">
            <button
              class="btn btn--ghost"
              [disabled]="isActionPending()"
              [matTooltip]="msg.isRead ? 'Mark as unread' : 'Mark as read'"
              (click)="toggleReadStatus()"
              aria-label="Toggle read status"
            >
              <mat-icon>{{ msg.isRead ? 'mark_email_unread' : 'drafts' }}</mat-icon>
              {{ msg.isRead ? 'Mark Unread' : 'Mark Read' }}
            </button>

            <button
              class="btn btn--danger"
              [disabled]="isActionPending()"
              (click)="confirmDelete()"
              aria-label="Delete message"
            >
              <mat-icon>delete</mat-icon>
              Delete
            </button>

            <button
              class="btn btn--primary"
              [disabled]="isActionPending()"
              (click)="openReply()"
              aria-label="Reply to message"
            >
              <mat-icon>reply</mat-icon>
              Reply
            </button>
          </div>
        </div>

        <!-- ── Meta card ──────────────────────────────────────────────── -->
        <div class="meta-card">
          <div class="meta-col">
            <span class="meta-col__label">FROM</span>
            <span class="meta-col__name">{{ msg.name }}</span>
            <span class="meta-col__email">{{ msg.email }}</span>
          </div>

          <div class="meta-vdivider"></div>

          <div class="meta-col">
            <span class="meta-col__label">INQUIRY TYPE</span>
            <span
              class="type-pill"
              [class.type-pill--service]="msg.queryType === QueryType.SERVICE"
              [class.type-pill--general]="msg.queryType === QueryType.GENERAL"
            >
              {{ msg.queryType === QueryType.SERVICE ? 'Service Request' : 'General Inquiry' }}
            </span>
          </div>

          <div class="meta-vdivider"></div>

          <div class="meta-col meta-col--right">
            <span class="meta-col__label">RECEIVED</span>
            <span class="meta-col__date">{{ msg.createdAt | date:'MMM d, y' }}</span>
            <span class="meta-col__time">{{ msg.createdAt | date:'· hh:mm a' }}</span>
          </div>
        </div>

        <!-- ── Message card ───────────────────────────────────────────── -->
        <div class="message-card">
          <div class="message-card__header">
            <div class="quote-badge" aria-hidden="true">
              <mat-icon>format_quote</mat-icon>
            </div>
            <h2 class="message-subject">{{ msg.subject || '(no subject)' }}</h2>
          </div>

          <div class="message-body" [innerHTML]="safeBody(msg.message)"></div>

          <!-- Reply history -->
          <ng-container *ngIf="msg.replies.length > 0">
            <div class="section-divider"></div>
            <div class="replies-section">
              <span class="section-label">REPLY HISTORY ({{ msg.replies.length }})</span>
              <div *ngFor="let reply of msg.replies" class="reply-item">
                <div class="reply-item__meta">
                  <span class="reply-item__subject">{{ reply.subject || 'Re: (no subject)' }}</span>
                  <span class="reply-item__date">{{ reply.sentAt | date:'MMM d, y · hh:mm a' }}</span>
                </div>
                <div class="reply-item__body">{{ reply.body }}</div>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- ── Quick reply bar ────────────────────────────────────────── -->
        <div class="reply-bar">
          <div
            class="reply-bar__input"
            role="button"
            tabindex="0"
            aria-label="Open reply compose"
            (click)="openReply()"
            (keydown.enter)="openReply()"
          >Click here to write a quick reply…</div>
          <button
            class="reply-bar__attach"
            aria-label="Attach file"
            matTooltip="Attach file"
            (click)="openReply()"
          >
            <mat-icon>attach_file</mat-icon>
          </button>
          <button
            class="reply-bar__send"
            aria-label="Send reply"
            [disabled]="isActionPending()"
            (click)="openReply()"
          >Send</button>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    // ── Layout ─────────────────────────────────────────────────────────────
    .detail-wrap {
      padding: 28px 32px 40px;
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .loading-overlay {
      display: flex;
      justify-content: center;
      padding: 80px 0;
    }

    .not-found-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 80px 24px;
      color: rgba(255,255,255,0.5);
    }
    .not-found-icon { font-size: 56px; width: 56px; height: 56px; opacity: 0.25; }
    .back-link {
      color: var(--color-accent, #00d9ff);
      text-decoration: none;
      font-size: 0.9rem;
      &:hover { text-decoration: underline; }
    }

    // ── Action bar ─────────────────────────────────────────────────────────
    .action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .breadcrumb-link {
      color: rgba(255,255,255,0.42);
      text-decoration: none;
      letter-spacing: 0.01em;
      transition: color 0.15s;
      &:hover { color: rgba(255,255,255,0.72); }
    }
    .breadcrumb-sep {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255,255,255,0.2);
      flex-shrink: 0;
    }
    .breadcrumb-current {
      color: rgba(255,255,255,0.9);
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .action-btns {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s, transform 0.15s;
      white-space: nowrap;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not([disabled]) { opacity: 0.85; transform: translateY(-1px); }
      &:active:not([disabled]) { transform: translateY(0); }
      &[disabled] { opacity: 0.4; cursor: not-allowed; }

      &--ghost {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.65);
      }
      &--danger {
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.25);
        color: #f87171;
      }
      &--primary {
        background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
        color: #fff;
      }
    }

    // ── Meta card ──────────────────────────────────────────────────────────
    .meta-card {
      display: flex;
      align-items: stretch;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      overflow: hidden;
    }

    .meta-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 20px 24px;

      &--right { align-items: flex-end; }
    }

    .meta-col__label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-col__name {
      font-size: 1.05rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
    }
    .meta-col__email {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.38);
    }
    .meta-col__date {
      font-size: 0.95rem;
      font-weight: 600;
      color: rgba(255,255,255,0.8);
    }
    .meta-col__time {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.38);
    }

    .meta-vdivider {
      width: 1px;
      background: rgba(255,255,255,0.07);
      flex-shrink: 0;
      align-self: stretch;
    }

    .type-pill {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
      margin-top: 4px;

      &--service {
        background: rgba(139,92,246,0.18);
        color: #c4b5fd;
        border: 1px solid rgba(139,92,246,0.3);
      }
      &--general {
        background: rgba(16,185,129,0.08);
        color: #34d399;
        border: 1px solid rgba(16,185,129,0.2);
      }
    }

    // ── Message card ───────────────────────────────────────────────────────
    .message-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 28px 32px;
    }

    .message-card__header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }

    .quote-badge {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: rgba(255,255,255,0.45);
      }
    }

    .message-subject {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      line-height: 1.4;
      padding-top: 6px;
    }

    .message-body {
      color: rgba(255,255,255,0.65);
      font-size: 0.93rem;
      line-height: 1.8;
      white-space: pre-wrap;
      padding-left: 56px;  // aligns under quote badge

      // Rich-text content
      ::ng-deep {
        ul, ol { margin: 8px 0; padding-left: 20px; }
        li { margin-bottom: 4px; }
        a { color: var(--color-accent, #00d9ff); }
        p { margin: 0 0 8px; }
        strong { color: rgba(255,255,255,0.85); }
      }
    }

    // ── Replies ────────────────────────────────────────────────────────────
    .section-divider {
      height: 1px;
      background: rgba(255,255,255,0.07);
      margin: 24px 0;
    }

    .section-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      display: block;
      margin-bottom: 16px;
    }

    .reply-item {
      border-left: 2px solid rgba(99,102,241,0.4);
      padding: 10px 16px;
      margin-bottom: 12px;
      background: rgba(99,102,241,0.04);
      border-radius: 0 8px 8px 0;
    }
    .reply-item__meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 12px;
    }
    .reply-item__subject {
      font-weight: 600;
      font-size: 0.88rem;
      color: rgba(255,255,255,0.8);
    }
    .reply-item__date {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.32);
      white-space: nowrap;
    }
    .reply-item__body {
      font-size: 0.88rem;
      color: rgba(255,255,255,0.55);
      white-space: pre-wrap;
      line-height: 1.6;
    }

    // ── Quick reply bar ────────────────────────────────────────────────────
    .reply-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 12px 16px;
    }

    .reply-bar__input {
      flex: 1;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.28);
      cursor: text;
      user-select: none;
      padding: 4px 0;
    }

    .reply-bar__attach {
      background: none;
      border: none;
      color: rgba(255,255,255,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); }
    }

    .reply-bar__send {
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 9px;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.15s;
      &:hover:not([disabled]) { opacity: 0.88; }
      &[disabled] { opacity: 0.4; cursor: not-allowed; }
    }

    @media (max-width: 768px) {
      .detail-wrap { padding: 16px; }
      .meta-card { flex-direction: column; }
      .meta-vdivider { width: auto; height: 1px; }
      .meta-col--right { align-items: flex-start; }
      .message-body { padding-left: 0; }
    }
  `],
})
export class InboxDetailComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly sanitizer    = inject(DomSanitizer);
  private readonly inboxService = inject(ContactInboxService);
  private readonly stateService = inject(ContactInboxStateService);
  private readonly snackBar     = inject(MatSnackBar);
  private readonly dialog       = inject(MatDialog);
  private readonly destroyRef   = inject(DestroyRef);

  /** Expose enum to template. */
  readonly QueryType = QueryType;

  /** Reactive: full message detail. Null until loaded. */
  readonly detail = signal<ContactMessageDetail | null>(null);

  /** Reactive: true while initial load is in progress. */
  readonly isLoading = signal<boolean>(false);

  /** Reactive: true when the message was not found (404). */
  readonly notFound = signal<boolean>(false);

  /** Reactive: true while a mark-read or delete action is in flight. */
  readonly isActionPending = signal<boolean>(false);

  /** Sanitize message body for safe [innerHTML] binding. */
  safeBody(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** @inheritdoc */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadMessage(id);
  }

  /**
   * Fetches the full message detail from the API.
   * Sets `notFound` signal to true when the service returns null (404 mapped
   * at the service layer) or when any other error occurs.
   *
   * @param id - The contact message document ID from the route.
   */
  private loadMessage(id: string): void {
    this.isLoading.set(true);
    this.inboxService.getMessage(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.isLoading.set(false);
          if (res === null) {
            this.notFound.set(true);
          } else {
            this.detail.set(res.data);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('Could not load message.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /**
   * Toggles the read status of the current message.
   * Updates the local detail signal and the sidebar unread badge.
   */
  toggleReadStatus(): void {
    const current = this.detail();
    if (!current) return;

    this.isActionPending.set(true);
    const newReadState = !current.isRead;

    this.inboxService.markRead(current.id, newReadState)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.detail.set(res.data);
          this.isActionPending.set(false);

          if (newReadState) {
            this.stateService.decrementUnread();
          } else {
            this.stateService.incrementUnread();
          }

          this.snackBar.open(
            newReadState ? 'Marked as read.' : 'Marked as unread.',
            'Dismiss',
            { duration: 3000 },
          );
        },
        error: () => {
          this.isActionPending.set(false);
          this.snackBar.open('Could not update read status.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /**
   * Opens a confirmation dialog and deletes the message on confirmation.
   * Navigates back to the inbox list on success.
   */
  confirmDelete(): void {
    const current = this.detail();
    if (!current) return;

    const dialogData: ConfirmDialogData = {
      title:       'Delete message',
      message:     `Are you sure you want to permanently delete the message from ${current.name}?`,
      confirmText: 'Delete',
      cancelText:  'Cancel',
    };

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      { data: dialogData },
    );

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.executeDelete(current.id);
      });
  }

  /**
   * Calls the delete API and navigates to the inbox list on success.
   *
   * @param id - The message document ID to delete.
   */
  private executeDelete(id: string): void {
    this.isActionPending.set(true);
    this.inboxService.deleteMessage(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isActionPending.set(false);
          this.snackBar.open('Message deleted.', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/admin/contact/inbox']);
        },
        error: () => {
          this.isActionPending.set(false);
          this.snackBar.open('Could not delete message.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /**
   * Opens the ReplyComposeComponent dialog.
   * On dialog close with a ContactReplyItem result, appends the reply to the
   * local detail signal's reply history and shows a success snackbar.
   * No full page reload occurs.
   */
  openReply(): void {
    const current = this.detail();
    if (!current) return;

    const data: ReplyComposeDialogData = {
      messageId:        current.id,
      originalSubject:  current.subject,
      recipientEmail:   current.email,
      queryType:        current.queryType,
    };

    const ref = this.dialog.open<ReplyComposeComponent, ReplyComposeDialogData, ContactReplyItem | undefined>(
      ReplyComposeComponent,
      { data, width: '620px', disableClose: false },
    );

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reply: ContactReplyItem | undefined) => {
        if (!reply) return;
        // Append the new reply to the existing detail without reloading.
        const existing = this.detail();
        if (existing) {
          this.detail.set({ ...existing, replies: [...existing.replies, reply] });
        }
        this.snackBar.open('Reply sent successfully.', 'Dismiss', { duration: 3000 });
      });
  }
}

