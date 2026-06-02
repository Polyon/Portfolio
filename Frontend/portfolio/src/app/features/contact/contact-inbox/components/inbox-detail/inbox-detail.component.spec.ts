import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { InboxDetailComponent } from './inbox-detail.component';
import { ContactInboxService } from '../../services/contact-inbox.service';
import { ContactInboxStateService } from '../../services/contact-inbox-state.service';
import {
  ContactMessageDetail,
  ContactMessageDetailResponse,
  MarkReadResponse,
  DeleteMessageResponse,
  QueryType,
} from '../../../../../shared/models/contact-inbox.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDetail(overrides: Partial<ContactMessageDetail> = {}): ContactMessageDetail {
  return {
    id:         'msg-001',
    name:       'Alice',
    email:      'alice@example.com',
    subject:    'Test subject',
    message:    'Hello from Alice.',
    queryType:  QueryType.GENERAL,
    isRead:     false,
    replies:    [],
    createdAt:  '2026-01-01T10:00:00.000Z',
    updatedAt:  '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeDetailResponse(overrides: Partial<ContactMessageDetail> = {}): ContactMessageDetailResponse {
  return { success: true, data: makeDetail(overrides) };
}

function makeMarkReadResponse(isRead: boolean): MarkReadResponse {
  return { success: true, data: makeDetail({ isRead }) };
}

const mockDeleteResponse: DeleteMessageResponse = { success: true, message: 'Deleted.' };

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('InboxDetailComponent', () => {
  let fixture:       ComponentFixture<InboxDetailComponent>;
  let component:     InboxDetailComponent;
  let inboxService:  jasmine.SpyObj<ContactInboxService>;
  let stateService:  jasmine.SpyObj<ContactInboxStateService>;
  let snackBar:      jasmine.SpyObj<MatSnackBar>;
  let dialog:        jasmine.SpyObj<MatDialog>;

  function setupWithId(id: string, detailOverrides: Partial<ContactMessageDetail> = {}): void {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse(detailOverrides)));

    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ id }),
        },
      },
    });

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    inboxService = jasmine.createSpyObj<ContactInboxService>('ContactInboxService', [
      'getMessage', 'markRead', 'deleteMessage',
    ]);
    stateService = jasmine.createSpyObj<ContactInboxStateService>('ContactInboxStateService', [
      'setUnreadCount', 'decrementUnread', 'incrementUnread',
    ]);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    dialog   = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports:   [InboxDetailComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'msg-001' }) },
          },
        },
        { provide: ContactInboxService,      useValue: inboxService },
        { provide: ContactInboxStateService, useValue: stateService },
        { provide: MatSnackBar,              useValue: snackBar      },
        { provide: MatDialog,                useValue: dialog        },
      ],
    }).compileComponents();
  });

  // ─── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse()));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ─── Detail loads on init ──────────────────────────────────────────────────

  it('should call getMessage with route param on init', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse()));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(inboxService.getMessage).toHaveBeenCalledWith('msg-001');
  });

  it('should populate detail signal after successful load', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ name: 'Alice' })));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.detail()?.name).toBe('Alice');
    expect(component.isLoading()).toBeFalse();
  });

  it('should render sender name in the detail view', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ name: 'Alice' })));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Alice');
  });

  // ─── 404 handling ─────────────────────────────────────────────────────────

  it('should set notFound signal when API returns 404', () => {
    inboxService.getMessage.and.returnValue(throwError(() => ({ status: 404 })));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.notFound()).toBeTrue();
    expect(component.isLoading()).toBeFalse();
  });

  it('should show not-found state element when notFound is true', () => {
    inboxService.getMessage.and.returnValue(throwError(() => ({ status: 404 })));
    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const notFoundEl = fixture.debugElement.query(By.css('.not-found-state'));
    expect(notFoundEl).toBeTruthy();
  });

  // ─── Mark read / unread ────────────────────────────────────────────────────

  it('should call markRead(id, true) when message is unread and toggleReadStatus is called', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ isRead: false })));
    inboxService.markRead.and.returnValue(of(makeMarkReadResponse(true)));

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleReadStatus();

    expect(inboxService.markRead).toHaveBeenCalledWith('msg-001', true);
  });

  it('should call decrementUnread when marking as read', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ isRead: false })));
    inboxService.markRead.and.returnValue(of(makeMarkReadResponse(true)));

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleReadStatus();
    expect(stateService.decrementUnread).toHaveBeenCalled();
  });

  it('should call incrementUnread when marking as unread', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ isRead: true })));
    inboxService.markRead.and.returnValue(of(makeMarkReadResponse(false)));

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleReadStatus();
    expect(stateService.incrementUnread).toHaveBeenCalled();
  });

  it('should update local detail signal after markRead succeeds', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ isRead: false })));
    inboxService.markRead.and.returnValue(of(makeMarkReadResponse(true)));

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleReadStatus();
    expect(component.detail()?.isRead).toBeTrue();
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  it('should open confirmation dialog when confirmDelete is called', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse()));
    const mockDialogRef = { afterClosed: () => of(false) } as MatDialogRef<unknown>;
    dialog.open.and.returnValue(mockDialogRef as MatDialogRef<unknown>);

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.confirmDelete();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should call deleteMessage when dialog confirmed', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse()));
    inboxService.deleteMessage.and.returnValue(of(mockDeleteResponse));
    const mockDialogRef = { afterClosed: () => of(true) } as MatDialogRef<unknown>;
    dialog.open.and.returnValue(mockDialogRef as MatDialogRef<unknown>);

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.confirmDelete();
    expect(inboxService.deleteMessage).toHaveBeenCalledWith('msg-001');
  });

  it('should NOT call deleteMessage when dialog is cancelled', () => {
    inboxService.getMessage.and.returnValue(of(makeDetailResponse()));
    const mockDialogRef = { afterClosed: () => of(false) } as MatDialogRef<unknown>;
    dialog.open.and.returnValue(mockDialogRef as MatDialogRef<unknown>);

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.confirmDelete();
    expect(inboxService.deleteMessage).not.toHaveBeenCalled();
  });

  // ─── Reply history ─────────────────────────────────────────────────────────

  it('should render reply history when replies are present', () => {
    const replies = [
      { id: 'r1', body: 'Thanks for reaching out.', sentAt: '2026-01-02T09:00:00.000Z', sentBy: 'admin1' },
    ];
    inboxService.getMessage.and.returnValue(of(makeDetailResponse({ replies })));

    fixture   = TestBed.createComponent(InboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const replySection = fixture.debugElement.query(By.css('.replies-section'));
    expect(replySection).toBeTruthy();
    const replyBodies = fixture.debugElement.queryAll(By.css('.reply-body'));
    expect(replyBodies[0].nativeElement.textContent).toContain('Thanks for reaching out.');
  });
});
