import {
  Component,
  OnInit,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ContactInboxService } from '../../services/contact-inbox.service';
import { ContactInboxStateService } from '../../services/contact-inbox-state.service';
import { InboxStatsBarComponent } from '../inbox-stats-bar/inbox-stats-bar.component';
import {
  ContactMessageListItem,
  ContactMessageStats,
  InboxFilterState,
  PaginationMeta,
  QueryType,
} from '../../../../../shared/models/contact-inbox.models';

/** Default filter/pagination state for the inbox list. */
const DEFAULT_FILTER: InboxFilterState = {
  queryType: null,
  isRead:    null,
  page:      1,
  limit:     20,
};

/**
 * Admin contact inbox list — paginated, filterable table of visitor messages.
 *
 * On init, loads aggregate stats and the first page of messages.
 * Supports filter by query type (All / Service / General) and read status
 * (All / Unread / Read). Pagination is handled by MatPaginator.
 */
@Component({
  selector: 'app-inbox-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    InboxStatsBarComponent,
  ],
  template: `
    <div class="inbox-list-container">

      <!-- Header -->
      <div class="list-header">
        <h2 class="list-title">Contact Inbox</h2>
        <button
          mat-icon-button
          class="refresh-btn"
          matTooltip="Refresh inbox"
          [disabled]="isLoading()"
          (click)="refresh()"
          aria-label="Refresh inbox"
        >
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Stats bar -->
      <app-inbox-stats-bar [stats]="stats()"></app-inbox-stats-bar>

      <!-- Glass panel: filters + content -->
      <div class="inbox-panel">

        <!-- Filter toolbar -->
        <div class="filter-toolbar" role="toolbar" aria-label="Message filters">
          <div class="filter-group">
            <button
              class="filter-pill"
              [class.filter-pill--active]="(filterState().queryType ?? '') === ''"
              (click)="onQueryTypeFilter('')"
            >All</button>
            <button
              class="filter-pill"
              [class.filter-pill--active]="filterState().queryType === QueryType.SERVICE"
              (click)="onQueryTypeFilter(QueryType.SERVICE)"
            >Service</button>
            <button
              class="filter-pill"
              [class.filter-pill--active]="filterState().queryType === QueryType.GENERAL"
              (click)="onQueryTypeFilter(QueryType.GENERAL)"
            >General</button>
          </div>

          <div class="filter-group filter-group--right">
            <button
              class="filter-pill"
              [class.filter-pill--active]="readFilterValue() === ''"
              (click)="onReadFilter('')"
            >All Status</button>
            <button
              class="filter-pill"
              [class.filter-pill--active]="readFilterValue() === 'unread'"
              (click)="onReadFilter('unread')"
            >Unread</button>
            <button
              class="filter-pill"
              [class.filter-pill--active]="readFilterValue() === 'read'"
              (click)="onReadFilter('read')"
            >Read</button>

            <button class="sort-btn" matTooltip="Sort options" aria-label="Sort messages">
              <mat-icon>filter_list</mat-icon>
              Sort By: Date
            </button>
          </div>
        </div>

        <div class="panel-divider"></div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="loading-overlay" aria-live="polite" aria-busy="true">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <!-- Content -->
        <div *ngIf="!isLoading()">

          <!-- Empty state -->
          <div *ngIf="messages().length === 0" class="empty-state" role="status">
            <div class="empty-icon-wrap">
              <mat-icon class="empty-icon-bg">mail_outline</mat-icon>
              <div class="empty-icon-badge">
                <mat-icon class="empty-icon-search">search</mat-icon>
              </div>
            </div>
            <h3 class="empty-title">No messages match your search</h3>
            <p class="empty-desc">We couldn't find any inquiries that match the current<br>filters. Try adjusting your criteria or checking other folders.</p>
            <div class="empty-actions">
              <button class="empty-btn empty-btn--primary" (click)="clearFilters()">Clear All Filters</button>
              <button class="empty-btn empty-btn--ghost" (click)="refresh()">Refresh Inbox</button>
            </div>
          </div>

          <!-- Message table -->
          <div class="table-wrapper" *ngIf="messages().length > 0">
            <table
              mat-table
              [dataSource]="messages()"
              class="inbox-table"
              aria-label="Contact messages"
            >
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Sender</th>
                <td mat-cell *matCellDef="let msg">
                  <span class="sender-name">{{ msg.name }}</span>
                  <span class="sender-email">{{ msg.email }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>Subject</th>
                <td mat-cell *matCellDef="let msg">{{ msg.subject || '(no subject)' }}</td>
              </ng-container>

              <ng-container matColumnDef="queryType">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let msg">
                  <span
                    class="type-badge"
                    [class.type-badge--service]="msg.queryType === QueryType.SERVICE"
                    [class.type-badge--general]="msg.queryType === QueryType.GENERAL"
                  >{{ msg.queryType === QueryType.SERVICE ? 'Service' : 'General' }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let msg">
                  <mat-icon
                    [class.status-unread]="!msg.isRead"
                    [class.status-read]="msg.isRead"
                    [matTooltip]="msg.isRead ? 'Read' : 'Unread'"
                  >{{ msg.isRead ? 'drafts' : 'email' }}</mat-icon>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Received</th>
                <td mat-cell *matCellDef="let msg">{{ msg.createdAt | date:'dd MMM y, HH:mm' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let msg">
                  <button mat-icon-button matTooltip="View message" (click)="openMessage(msg)" [attr.aria-label]="'View message from ' + msg.name">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let msg; columns: displayedColumns"
                [class.row--unread]="!msg.isRead"
                (click)="openMessage(msg)"
                style="cursor:pointer"></tr>
            </table>

            <mat-paginator
              [length]="pagination()?.total ?? 0"
              [pageSize]="filterState().limit"
              [pageIndex]="filterState().page - 1"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onPage($event)"
              aria-label="Pagination"
            ></mat-paginator>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .inbox-list-container {
      padding: 28px 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    // ── Header ─────────────────────────────────────────────────────────────
    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .list-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.92);
    }

    .refresh-btn {
      color: rgba(255, 255, 255, 0.45);
      transition: color 0.15s ease;
      &:hover { color: var(--color-accent); }
    }

    // ── Glass panel ────────────────────────────────────────────────────────
    .inbox-panel {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      overflow: hidden;
    }

    .panel-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.07);
    }

    // ── Filter toolbar ─────────────────────────────────────────────────────
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 4px;

      &--right {
        gap: 4px;
        margin-left: auto;
      }
    }

    .filter-pill {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.82rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      white-space: nowrap;
      font-family: inherit;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.78);
      }

      &--active {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.92);
        font-weight: 600;
      }
    }

    .sort-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.8rem;
      font-weight: 500;
      padding: 5px 12px 5px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      font-family: inherit;
      margin-left: 6px;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
      }
    }

    // ── Loading ────────────────────────────────────────────────────────────
    .loading-overlay {
      display: flex;
      justify-content: center;
      padding: 72px 0;
    }

    // ── Empty state ────────────────────────────────────────────────────────
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 24px 52px;
      gap: 0;
    }

    .empty-icon-wrap {
      position: relative;
      width: 88px;
      height: 88px;
      margin-bottom: 20px;
    }

    .empty-icon-bg {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: rgba(255, 255, 255, 0.1);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);

      // circular backdrop
      &::before {
        content: '';
        position: absolute;
        inset: -18px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.07);
      }
    }

    .empty-icon-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-search {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-title {
      margin: 0 0 10px;
      font-size: 1.15rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.88);
      text-align: center;
    }

    .empty-desc {
      margin: 0 0 28px;
      color: rgba(255, 255, 255, 0.38);
      font-size: 0.875rem;
      line-height: 1.6;
      text-align: center;
      max-width: 380px;
    }

    .empty-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .empty-btn {
      padding: 9px 22px;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.15s ease;
      font-family: inherit;
      border: none;

      &:hover { opacity: 0.88; transform: translateY(-1px); }
      &:active { transform: translateY(0); }

      &--primary {
        background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
        color: #fff;
      }

      &--ghost {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.65);
      }
    }

    // ── Table ──────────────────────────────────────────────────────────────
    .table-wrapper { overflow-x: auto; }

    .inbox-table { width: 100%; background: transparent !important; }

    ::ng-deep .inbox-table {
      .mat-mdc-header-row {
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .mat-mdc-header-cell {
        color: rgba(255, 255, 255, 0.32);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.9px;
        text-transform: uppercase;
        border-bottom: none;
        padding: 0 16px;
      }
      .mat-mdc-row {
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        transition: background 0.14s ease;
        &:hover { background: rgba(255, 255, 255, 0.04); }
        &:last-child { border-bottom: none; }
      }
      .mat-mdc-cell {
        color: rgba(255, 255, 255, 0.65);
        border-bottom: none;
        font-size: 0.875rem;
        padding: 0 16px;
      }
      .row--unread .mat-mdc-cell {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
      }
    }

    .sender-name  { display: block; font-weight: 500; color: rgba(255, 255, 255, 0.85); }
    .sender-email { display: block; font-size: 0.76rem; color: rgba(255, 255, 255, 0.33); margin-top: 2px; }

    .type-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;

      &--service {
        background: rgba(100, 181, 246, 0.14);
        color: #64b5f6;
        border: 1px solid rgba(100, 181, 246, 0.22);
      }
      &--general {
        background: rgba(129, 199, 132, 0.14);
        color: #81c784;
        border: 1px solid rgba(129, 199, 132, 0.22);
      }
    }

    .status-unread { color: #f87c7c; font-size: 18px; }
    .status-read   { color: rgba(255, 255, 255, 0.2); font-size: 18px; }

    @media (max-width: 768px) {
      .inbox-list-container { padding: 16px; }
      .filter-toolbar { flex-direction: column; align-items: flex-start; }
      .filter-group--right { margin-left: 0; }
    }
  `],
})
export class InboxListComponent implements OnInit {
  private readonly inboxService = inject(ContactInboxService);
  private readonly stateService = inject(ContactInboxStateService);
  private readonly snackBar     = inject(MatSnackBar);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);

  /** Angular Material table column order. */
  readonly displayedColumns = ['name', 'subject', 'queryType', 'status', 'createdAt', 'actions'];

  /** Expose enum to template. */
  readonly QueryType = QueryType;

  /** Reactive: current list of messages for the table. */
  readonly messages = signal<ContactMessageListItem[]>([]);

  /** Reactive: inbox aggregate stats for the stats bar. */
  readonly stats = signal<ContactMessageStats | null>(null);

  /** Reactive: current pagination metadata. */
  readonly pagination = signal<PaginationMeta | null>(null);

  /** Reactive: whether a fetch is in progress. */
  readonly isLoading = signal<boolean>(false);

  /** Reactive: active filter/pagination state. */
  readonly filterState = signal<InboxFilterState>({ ...DEFAULT_FILTER });

  /**
   * Derived string value for the read-status toggle group.
   * Returns '' (all), 'unread', or 'read'.
   */
  readFilterValue(): '' | 'unread' | 'read' {
    const v = this.filterState().isRead;
    if (v === null) return '';
    return v ? 'read' : 'unread';
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadStats();
    this.fetchMessages();
  }

  /**
   * Fetches aggregate inbox stats and propagates unread count to the sidebar badge.
   */
  private loadStats(): void {
    this.inboxService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.stats.set(res.data);
          this.stateService.setUnreadCount(res.data.unread);
        },
        error: () => {
          this.snackBar.open('Could not load inbox stats.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /**
   * Fetches the message list using the current filter state.
   */
  private fetchMessages(): void {
    this.isLoading.set(true);
    const f = this.filterState();
    const params = {
      page:  f.page,
      limit: f.limit,
      ...(f.queryType !== null ? { queryType: f.queryType } : {}),
      ...(f.isRead    !== null ? { isRead:    f.isRead    } : {}),
    };

    this.inboxService.listMessages(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.messages.set(res.data);
          this.pagination.set(res.pagination);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('Could not load messages.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /**
   * Handles query-type filter toggle changes.
   * Resets to page 1 and re-fetches the list.
   *
   * @param value - Toggle value: '' for all, or a QueryType enum value.
   */
  onQueryTypeFilter(value: string): void {
    const queryType = value === '' ? null : value as QueryType;
    this.filterState.update(s => ({ ...s, queryType, page: 1 }));
    this.fetchMessages();
  }

  /**
   * Handles read-status filter toggle changes.
   * Resets to page 1 and re-fetches the list.
   *
   * @param value - Toggle value: '' for all, 'unread', or 'read'.
   */
  onReadFilter(value: string): void {
    const isRead = value === '' ? null : value === 'read';
    this.filterState.update(s => ({ ...s, isRead, page: 1 }));
    this.fetchMessages();
  }

  /**
   * Handles MatPaginator page events.
   * Updates the page/limit in filter state and re-fetches.
   *
   * @param event - The PageEvent from MatPaginator.
   */
  onPage(event: PageEvent): void {
    this.filterState.update(s => ({
      ...s,
      page:  event.pageIndex + 1,
      limit: event.pageSize,
    }));
    this.fetchMessages();
  }

  /**
   * Resets all filters to defaults (All / All / page 1) and re-fetches.
   */
  clearFilters(): void {
    this.filterState.set({ ...DEFAULT_FILTER });
    this.fetchMessages();
  }

  /**
   * Re-fetches both stats and the message list with the current filter state.
   */
  refresh(): void {
    this.loadStats();
    this.fetchMessages();
  }

  /**
   * Navigates to the detail view for the given message.
   *
   * @param msg - The list item whose detail to view.
   */
  openMessage(msg: ContactMessageListItem): void {
    void this.router.navigate(['/admin/contact/inbox', msg.id]);
  }
}

