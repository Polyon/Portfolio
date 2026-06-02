import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { InboxListComponent } from './inbox-list.component';
import { ContactInboxService } from '../../services/contact-inbox.service';
import { ContactInboxStateService } from '../../services/contact-inbox-state.service';
import {
  ContactMessageListItem,
  ContactMessageListResponse,
  ContactMessageStatsResponse,
  QueryType,
} from '../../../../../shared/models/contact-inbox.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeListItem(overrides: Partial<ContactMessageListItem> = {}): ContactMessageListItem {
  return {
    id:         'msg-001',
    name:       'Alice',
    email:      'alice@example.com',
    subject:    'Hello',
    queryType:  QueryType.GENERAL,
    isRead:     false,
    replyCount: 0,
    createdAt:  '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

const mockStatsResponse: ContactMessageStatsResponse = {
  success: true,
  data:    { total: 5, unread: 2, serviceQueries: 3, generalQueries: 2 },
};

function makeListResponse(items: ContactMessageListItem[]): ContactMessageListResponse {
  return {
    success:    true,
    data:       items,
    pagination: { total: items.length, pages: 1, currentPage: 1, limit: 20 },
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('InboxListComponent', () => {
  let fixture:       ComponentFixture<InboxListComponent>;
  let component:     InboxListComponent;
  let inboxService:  jasmine.SpyObj<ContactInboxService>;
  let stateService:  jasmine.SpyObj<ContactInboxStateService>;

  const defaultItems = [makeListItem({ id: '1', name: 'Alice' }), makeListItem({ id: '2', name: 'Bob', isRead: true })];

  beforeEach(async () => {
    inboxService = jasmine.createSpyObj<ContactInboxService>('ContactInboxService', [
      'listMessages', 'getStats',
    ]);
    stateService = jasmine.createSpyObj<ContactInboxStateService>('ContactInboxStateService', [
      'setUnreadCount', 'decrementUnread', 'incrementUnread',
    ]);

    inboxService.getStats.and.returnValue(of(mockStatsResponse));
    inboxService.listMessages.and.returnValue(of(makeListResponse(defaultItems)));

    await TestBed.configureTestingModule({
      imports:   [InboxListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContactInboxService,      useValue: inboxService },
        { provide: ContactInboxStateService, useValue: stateService },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(InboxListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Stats on init ─────────────────────────────────────────────────────────

  it('should call getStats on init', () => {
    expect(inboxService.getStats).toHaveBeenCalled();
  });

  it('should set unread count via ContactInboxStateService on init', () => {
    expect(stateService.setUnreadCount).toHaveBeenCalledWith(2);
  });

  it('should populate stats signal', () => {
    expect(component.stats()).toEqual(mockStatsResponse.data);
  });

  // ─── Messages on init ──────────────────────────────────────────────────────

  it('should call listMessages on init with page 1 limit 20', () => {
    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, limit: 20 })
    );
  });

  it('should render message rows in the table', () => {
    const rows = fixture.debugElement.queryAll(By.css('mat-row, [mat-row]'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should show two rows for two messages', () => {
    // Rows in Angular Material table — check rendered data
    expect(component.messages().length).toBe(2);
  });

  // ─── Filter — query type ───────────────────────────────────────────────────

  it('should re-fetch with SERVICE queryType filter when selected', () => {
    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse([])));

    component.onQueryTypeFilter(QueryType.SERVICE);
    fixture.detectChanges();

    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ queryType: QueryType.SERVICE, page: 1 })
    );
  });

  it('should re-fetch without queryType filter when "all" selected', () => {
    component.onQueryTypeFilter(QueryType.SERVICE);
    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse(defaultItems)));

    component.onQueryTypeFilter('');
    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1 })
    );
    const callArgs = inboxService.listMessages.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(callArgs?.['queryType']).toBeUndefined();
  });

  // ─── Filter — read status ─────────────────────────────────────────────────

  it('should re-fetch with isRead=false when "unread" selected', () => {
    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse([])));

    component.onReadFilter('unread');

    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ isRead: false, page: 1 })
    );
  });

  it('should re-fetch with isRead=true when "read" selected', () => {
    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse([])));

    component.onReadFilter('read');

    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ isRead: true, page: 1 })
    );
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('should show empty state when data is empty', () => {
    inboxService.listMessages.and.returnValue(of(makeListResponse([])));
    component.onReadFilter('unread');
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('should not show empty state when data exists', () => {
    fixture.detectChanges();
    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeNull();
  });

  it('should reset filters when "Clear filters" is clicked in empty state', () => {
    inboxService.listMessages.and.returnValue(of(makeListResponse([])));
    component.onReadFilter('unread');
    fixture.detectChanges();

    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse(defaultItems)));

    const clearBtn = fixture.debugElement.query(By.css('.empty-state button'));
    clearBtn.nativeElement.click();
    fixture.detectChanges();

    const state = component.filterState();
    expect(state.queryType).toBeNull();
    expect(state.isRead).toBeNull();
    expect(state.page).toBe(1);
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  it('should re-fetch with updated page/limit on paginator page event', () => {
    inboxService.listMessages.calls.reset();
    inboxService.listMessages.and.returnValue(of(makeListResponse(defaultItems)));

    component.onPage({ pageIndex: 1, pageSize: 10, length: 50, previousPageIndex: 0 });

    expect(inboxService.listMessages).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2, limit: 10 })
    );
  });

  // ─── Refresh ──────────────────────────────────────────────────────────────

  it('should call both getStats and listMessages on refresh', () => {
    inboxService.getStats.calls.reset();
    inboxService.listMessages.calls.reset();

    component.refresh();

    expect(inboxService.getStats).toHaveBeenCalled();
    expect(inboxService.listMessages).toHaveBeenCalled();
  });
});
