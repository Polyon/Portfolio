import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { ContactInboxService } from '../../services/contact-inbox.service';
import {
  ReplyComposeDialogData,
  ContactReplyItem,
  QueryType,
  SendReplyDTO,
} from '../../../../../shared/models/contact-inbox.models';

/**
 * Modal dialog for composing and sending an email reply to a visitor contact message.
 *
 * Opened via `MatDialog.open(ReplyComposeComponent, { data: ReplyComposeDialogData })`.
 * On successful send, closes the dialog with the new `ContactReplyItem` as the result.
 * On cancel, closes without a result — no navigation occurs.
 *
 * @example
 * const ref = this.dialog.open(ReplyComposeComponent, { data, width: '600px' });
 * ref.afterClosed().subscribe((reply?: ContactReplyItem) => { ... });
 */
@Component({
  selector: 'app-reply-compose',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-wrap">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="dialog-head">
        <div class="dialog-head__icon">
          <mat-icon>reply</mat-icon>
        </div>
        <div class="dialog-head__text">
          <h2 class="dialog-head__title">Compose Reply</h2>
          <p class="dialog-head__sub">Replying to <span class="dialog-head__email">{{ dialogData.recipientEmail }}</span></p>
        </div>
        <button class="close-btn" (click)="cancel()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-divider"></div>

      <mat-dialog-content>
        <form [formGroup]="form" class="reply-form" (ngSubmit)="sendReply()">

          <!-- To row -->
          <div class="to-row">
            <span class="to-label">TO</span>
            <span class="to-email">{{ dialogData.recipientEmail }}</span>
            <span
              class="type-pill"
              [class.type-pill--service]="dialogData.queryType === QueryType.SERVICE"
              [class.type-pill--general]="dialogData.queryType === QueryType.GENERAL"
            >{{ dialogData.queryType === QueryType.SERVICE ? 'Service Inquiry' : 'General Inquiry' }}</span>
          </div>

          <!-- Subject -->
          <div class="field-block">
            <label class="field-label">SUBJECT</label>
            <input
              class="field-input"
              formControlName="subject"
              placeholder="Re: Your enquiry"
              autocomplete="off"
            />
          </div>

          <!-- Body -->
          <div class="field-block field-block--body">
            <label class="field-label">MESSAGE <span class="field-required">*</span></label>
            <div class="textarea-wrap">
              <textarea
                class="field-textarea"
                formControlName="body"
                rows="7"
                placeholder="Type your response here..."
              ></textarea>
              <div class="textarea-tools">
                <button type="button" class="tool-btn" aria-label="Attach file" matTooltip="Attach file">
                  <mat-icon>attach_file</mat-icon>
                </button>
                <button type="button" class="tool-btn" aria-label="Insert emoji" matTooltip="Insert emoji">
                  <mat-icon>sentiment_satisfied_alt</mat-icon>
                </button>
              </div>
            </div>
            <span *ngIf="form.get('body')?.touched && form.get('body')?.hasError('required')" class="field-error">
              Reply body is required
            </span>
          </div>

          <!-- Error banner -->
          <div *ngIf="sendError()" class="error-banner" role="alert">
            <mat-icon class="error-banner__icon">error_outline</mat-icon>
            <span class="error-banner__text">{{ sendError() }}</span>
            <button type="button" class="error-banner__dismiss" aria-label="Dismiss" (click)="sendError.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          </div>

        </form>
      </mat-dialog-content>

      <!-- ── Footer ──────────────────────────────────────────────────────── -->
      <div class="dialog-footer">
        <button class="btn-cancel" type="button" [disabled]="isSending()" (click)="cancel()">Cancel</button>
        <button
          class="btn-send"
          type="button"
          [disabled]="isSending()"
          (click)="sendReply()"
          aria-label="Send reply"
        >
          <mat-spinner *ngIf="isSending()" diameter="15" class="btn-spinner"></mat-spinner>
          <mat-icon *ngIf="!isSending()">send</mat-icon>
          {{ isSending() ? 'Sending…' : 'Send Reply' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    ::ng-deep .cdk-overlay-dark-backdrop { background: rgba(0,0,0,0.65); }
    ::ng-deep mat-dialog-content { padding: 0 24px !important; margin: 0 !important; max-height: 70vh; overflow-y: auto; }

    .dialog-wrap {
      min-width: 560px;
      background: #141824;
      border-radius: 16px;
      overflow: hidden;
    }

    // ── Header ─────────────────────────────────────────────────────────────
    .dialog-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 22px 22px 18px;
    }

    .dialog-head__icon {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #a5b4fc; }
    }

    .dialog-head__text { flex: 1; padding-top: 2px; }
    .dialog-head__title {
      margin: 0 0 3px;
      font-size: 1rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      letter-spacing: -0.01em;
    }
    .dialog-head__sub {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.35);
    }
    .dialog-head__email { color: rgba(165,180,252,0.7); }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s, color 0.15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); }
    }

    .dialog-divider { height: 1px; background: rgba(255,255,255,0.06); }

    // ── Form ───────────────────────────────────────────────────────────────
    .reply-form {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 16px 0 8px;
    }

    .to-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0 14px;
      flex-wrap: wrap;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 14px;
    }
    .to-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: rgba(255,255,255,0.25);
      letter-spacing: 0.08em;
      min-width: 24px;
    }
    .to-email {
      font-size: 0.86rem;
      color: rgba(255,255,255,0.62);
      font-weight: 400;
    }

    .type-pill {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      &--service {
        background: rgba(139,92,246,0.15);
        color: #c4b5fd;
        border: 1px solid rgba(139,92,246,0.28);
      }
      &--general {
        background: rgba(16,185,129,0.08);
        color: #34d399;
        border: 1px solid rgba(16,185,129,0.2);
      }
    }

    // ── Fields ─────────────────────────────────────────────────────────────
    .field-block {
      margin-bottom: 14px;
    }
    .field-block--body { margin-bottom: 10px; }

    .field-label {
      display: block;
      font-size: 0.67rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.28);
      margin-bottom: 6px;
    }
    .field-required { color: rgba(239,68,68,0.7); }

    .field-input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 9px;
      padding: 10px 14px;
      font-size: 0.9rem;
      font-family: inherit;
      color: rgba(255,255,255,0.88);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      &::placeholder { color: rgba(255,255,255,0.2); }
      &:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.04); }
    }

    .textarea-wrap {
      position: relative;
    }
    .field-textarea {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 9px;
      padding: 12px 14px 44px;
      font-size: 0.88rem;
      font-family: inherit;
      color: rgba(255,255,255,0.85);
      outline: none;
      resize: vertical;
      min-height: 140px;
      transition: border-color 0.15s;
      box-sizing: border-box;
      &::placeholder { color: rgba(255,255,255,0.2); }
      &:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.04); }
    }
    .textarea-tools {
      position: absolute;
      bottom: 10px;
      right: 10px;
      display: flex;
      gap: 2px;
    }
    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.28);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s, color 0.15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); }
    }

    .field-error {
      display: block;
      font-size: 0.75rem;
      color: #fca5a5;
      margin-top: 5px;
    }

    // ── Error banner ───────────────────────────────────────────────────────
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.22);
      border-radius: 9px;
      padding: 9px 12px;
      color: #fca5a5;
      margin-top: 4px;
    }
    .error-banner__icon { font-size: 17px; width: 17px; height: 17px; flex-shrink: 0; }
    .error-banner__text { flex: 1; font-size: 0.83rem; }
    .error-banner__dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: rgba(252,165,165,0.6);
      cursor: pointer;
      padding: 2px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #fca5a5; }
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 24px 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .btn-cancel {
      padding: 8px 18px;
      border-radius: 9px;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent;
      color: rgba(255,255,255,0.5);
      font-size: 0.855rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      &:hover:not([disabled]) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
      &[disabled] { opacity: 0.35; cursor: not-allowed; }
    }

    .btn-send {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 9px;
      font-size: 0.855rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.12s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not([disabled]) { opacity: 0.88; transform: translateY(-1px); }
      &:active:not([disabled]) { transform: translateY(0); }
      &[disabled] { opacity: 0.4; cursor: not-allowed; }
    }

    .btn-spinner { display: inline-block; }

    @media (max-width: 600px) { .dialog-wrap { min-width: unset; } }
  `],
})
export class ReplyComposeComponent {
  /** Injected dialog data containing message context. */
  readonly dialogData = inject<ReplyComposeDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef   = inject(MatDialogRef<ReplyComposeComponent, ContactReplyItem | undefined>);
  private readonly inboxService = inject(ContactInboxService);
  private readonly fb           = inject(FormBuilder);

  /** Expose enum to template. */
  readonly QueryType = QueryType;

  /** Reactive: true while the send request is in flight. Disables the Send button. */
  readonly isSending = signal<boolean>(false);

  /**
   * Reactive: error message from a failed send attempt.
   * Shown in the dismissible error banner; cleared on dismiss or successful send.
   */
  readonly sendError = signal<string | null>(null);

  /**
   * Reactive form with `subject` (pre-filled, optional) and `body` (required) controls.
   * Subject is pre-filled as "Re: {originalSubject}" or "Re: Your enquiry" if absent.
   */
  readonly form: FormGroup = this.fb.group({
    subject: [this._buildSubject()],
    body:    ['', Validators.required],
  });

  /**
   * Builds the initial subject value from dialog data.
   * Falls back to "Re: Your enquiry" when original subject is absent.
   */
  private _buildSubject(): string {
    const orig = this.dialogData.originalSubject?.trim();
    return orig ? `Re: ${orig}` : 'Re: Your enquiry';
  }

  /**
   * Validates the form, then calls `ContactInboxService.sendReply()`.
   * On success: closes the dialog passing the new `ContactReplyItem` as result.
   * On failure: keeps the dialog open, displays a dismissible error banner,
   * and does NOT clear the body field.
   *
   * If `subject` was cleared by the admin, defaults to "Re: Your enquiry" in the DTO.
   */
  sendReply(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue() as { subject: string; body: string };
    const dto: SendReplyDTO = {
      subject: raw.subject?.trim() || 'Re: Your enquiry',
      body:    raw.body,
    };

    this.isSending.set(true);
    this.sendError.set(null);

    this.inboxService.sendReply(this.dialogData.messageId, dto).subscribe({
      next: res => {
        this.isSending.set(false);
        this.dialogRef.close(res.data);
      },
      error: () => {
        this.isSending.set(false);
        this.sendError.set('Failed to send reply. Please try again.');
      },
    });
  }

  /**
   * Closes the dialog without a result.
   * Does not send the reply and does not navigate away from the detail view.
   */
  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
