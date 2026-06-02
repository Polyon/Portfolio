import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

import { ReplyComposeComponent } from './reply-compose.component';
import { ContactInboxService } from '../../services/contact-inbox.service';
import {
  ContactReplyItem,
  ReplyComposeDialogData,
  SendReplyResponse,
  QueryType,
} from '../../../../../shared/models/contact-inbox.models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockDialogData: ReplyComposeDialogData = {
  messageId:        'msg-001',
  originalSubject:  'Test subject',
  recipientEmail:   'alice@example.com',
  queryType:        QueryType.GENERAL,
};

const mockReplyItem: ContactReplyItem = {
  id:     'reply-001',
  body:   'Thank you for your enquiry.',
  sentAt: '2026-01-02T09:00:00.000Z',
  sentBy: 'admin1',
};

const mockSendReplyResponse: SendReplyResponse = {
  success: true,
  message: 'Reply sent.',
  data:    mockReplyItem,
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ReplyComposeComponent', () => {
  let fixture:      ComponentFixture<ReplyComposeComponent>;
  let component:    ReplyComposeComponent;
  let inboxService: jasmine.SpyObj<ContactInboxService>;
  let dialogRef:    jasmine.SpyObj<MatDialogRef<ReplyComposeComponent>>;

  function setup(dataOverrides: Partial<ReplyComposeDialogData> = {}): void {
    fixture   = TestBed.createComponent(ReplyComposeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    inboxService = jasmine.createSpyObj<ContactInboxService>('ContactInboxService', ['sendReply']);
    dialogRef    = jasmine.createSpyObj<MatDialogRef<ReplyComposeComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports:   [ReplyComposeComponent, ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContactInboxService, useValue: inboxService },
        { provide: MatDialogRef,        useValue: dialogRef    },
        { provide: MAT_DIALOG_DATA,     useValue: { ...mockDialogData } },
      ],
    }).compileComponents();
  });

  // ─── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  // ─── Form initialisation ───────────────────────────────────────────────────

  it('should pre-fill subject as "Re: {originalSubject}"', () => {
    setup();
    expect(component.form.get('subject')?.value).toBe('Re: Test subject');
  });

  it('should pre-fill subject as "Re: Your enquiry" when originalSubject is absent', async () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: { ...mockDialogData, originalSubject: undefined },
    });
    fixture   = TestBed.createComponent(ReplyComposeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.get('subject')?.value).toBe('Re: Your enquiry');
  });

  it('should initialise body as empty string', () => {
    setup();
    expect(component.form.get('body')?.value).toBe('');
  });

  // ─── Validation ────────────────────────────────────────────────────────────

  it('should not call sendReply service when body is empty', () => {
    setup();
    component.form.get('body')?.setValue('');
    component.sendReply();
    expect(inboxService.sendReply).not.toHaveBeenCalled();
  });

  it('should mark form as touched so mat-error appears when body is empty', () => {
    setup();
    component.form.get('body')?.setValue('');
    component.sendReply();
    expect(component.form.touched).toBeTrue();
  });

  it('should show body required error in template after submit with empty body', () => {
    setup();
    component.form.get('body')?.setValue('');
    component.sendReply();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('mat-error'));
    expect(error).toBeTruthy();
    expect(error.nativeElement.textContent).toContain('required');
  });

  // ─── Successful send ───────────────────────────────────────────────────────

  it('should call sendReply service with message ID and DTO when form is valid', () => {
    inboxService.sendReply.and.returnValue(of(mockSendReplyResponse));
    setup();

    component.form.get('body')?.setValue('Thank you for your enquiry.');
    component.sendReply();

    expect(inboxService.sendReply).toHaveBeenCalledWith(
      'msg-001',
      jasmine.objectContaining({ body: 'Thank you for your enquiry.' }),
    );
  });

  it('should close dialog with reply result on success', () => {
    inboxService.sendReply.and.returnValue(of(mockSendReplyResponse));
    setup();

    component.form.get('body')?.setValue('Thank you.');
    component.sendReply();

    expect(dialogRef.close).toHaveBeenCalledWith(mockReplyItem);
  });

  it('should default subject to "Re: Your enquiry" in DTO when subject field is cleared', () => {
    inboxService.sendReply.and.returnValue(of(mockSendReplyResponse));
    setup();

    component.form.get('subject')?.setValue('');
    component.form.get('body')?.setValue('Thanks.');
    component.sendReply();

    const dto = inboxService.sendReply.calls.mostRecent().args[1];
    expect(dto.subject).toBe('Re: Your enquiry');
  });

  it('should disable send button while in flight (isSending signal)', () => {
    // Return a never-completing observable to keep isSending = true
    inboxService.sendReply.and.returnValue(new (require('rxjs').Subject)().asObservable());
    setup();

    component.form.get('body')?.setValue('Hello.');
    component.sendReply();
    fixture.detectChanges();

    expect(component.isSending()).toBeTrue();
    const sendBtn = fixture.debugElement
      .queryAll(By.css('button'))
      .find(b => (b.nativeElement.textContent as string).includes('Sending'));
    expect(sendBtn?.nativeElement.disabled).toBeTrue();
  });

  // ─── Failed send ───────────────────────────────────────────────────────────

  it('should keep dialog open and show error banner when send fails', () => {
    inboxService.sendReply.and.returnValue(throwError(() => new Error('500')));
    setup();

    component.form.get('body')?.setValue('Hello.');
    component.sendReply();
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.sendError()).toBeTruthy();

    const banner = fixture.debugElement.query(By.css('.error-banner'));
    expect(banner).toBeTruthy();
  });

  it('should NOT clear body field when send fails', () => {
    inboxService.sendReply.and.returnValue(throwError(() => new Error('500')));
    setup();

    component.form.get('body')?.setValue('My reply body.');
    component.sendReply();

    expect(component.form.get('body')?.value).toBe('My reply body.');
  });

  it('should reset isSending to false after failed send', () => {
    inboxService.sendReply.and.returnValue(throwError(() => new Error('500')));
    setup();

    component.form.get('body')?.setValue('Hello.');
    component.sendReply();

    expect(component.isSending()).toBeFalse();
  });

  // ─── Cancel ────────────────────────────────────────────────────────────────

  it('should close dialog without a result when cancel is called', () => {
    setup();
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should NOT call sendReply service when cancel is called', () => {
    setup();
    component.cancel();
    expect(inboxService.sendReply).not.toHaveBeenCalled();
  });

  it('should close dialog when Cancel button is clicked', () => {
    setup();

    const cancelBtn = fixture.debugElement
      .queryAll(By.css('button'))
      .find(b => (b.nativeElement.textContent as string).trim() === 'Cancel');
    cancelBtn?.nativeElement.click();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  // ─── Display ───────────────────────────────────────────────────────────────

  it('should display recipient email in To: field', () => {
    setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('alice@example.com');
  });

  it('should show query type chip', () => {
    setup();
    const chip = fixture.debugElement.query(By.css('.query-chip'));
    expect(chip).toBeTruthy();
    expect(chip.nativeElement.textContent).toContain('General');
  });
});
