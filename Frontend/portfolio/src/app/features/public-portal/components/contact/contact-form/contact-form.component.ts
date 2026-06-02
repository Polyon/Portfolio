import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  output,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// Lighthouse audit (SC-006) — run with: npm run lighthouse:ci
// Target: Performance ≥ 85, FCP < 2 s
// Last recorded score (2026-05-24): PENDING — run `npm run lighthouse:ci` and update below.
// Performance: ?, FCP: ?, LCP: ?, TBT: ?, CLS: ?
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import type { EditorConfig } from 'ckeditor5';

import { ContactMessageService } from '../../../services/contact-message.service';
import { QueryType } from '../../../../../shared/models/contact-inbox.models';

/** Strips HTML tags and entities, returning plain text for length validation. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Requires non-empty plain-text content in a rich-text (HTML) control. */
function richTextRequired(control: AbstractControl): ValidationErrors | null {
  return stripHtml(control.value ?? '').length === 0 ? { required: true } : null;
}

/** Enforces a minimum plain-text character count on a rich-text (HTML) control. */
function richTextMinLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const len = stripHtml(control.value ?? '').length;
    return len < min ? { minlength: { requiredLength: min, actualLength: len } } : null;
  };
}

/**
 * Contact inquiry form for the public portfolio portal.
 *
 * Renders a reactive form with Name, Email, Subject and Message fields.
 * Manages its own submission lifecycle: loading state, success state,
 * and server-error state with retry capability.
 *
 * Emits `messageSent` on successful submission so parent components
 * can react if needed.
 */
@Component({
  selector: 'app-contact-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CKEditorModule,
  ],
  template: `
    <!-- ── Success state ──────────────────────────────────────────────────── -->
    @if (submitted()) {
      <div class="form-success" role="status" aria-live="polite">
        <mat-icon class="success-icon" aria-hidden="true">check_circle</mat-icon>
        <h3 class="success-title">Message sent!</h3>
        <p class="success-body">
          @if (submittedQueryType() === queryTypeEnum.SERVICE) {
            Your service inquiry has been received. I'll get back to you as soon as possible.
          } @else {
            Your message has been received. I'll get back to you as soon as possible.
          }
        </p>
        <button mat-stroked-button class="success-reset-btn" (click)="reset()">
          Send another message
        </button>
      </div>
    }

    <!-- ── Form ───────────────────────────────────────────────────────────── -->
    @if (!submitted()) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="contact-form"
        novalidate
        aria-label="Contact inquiry form"
      >
        <!-- Query type -->
        <div class="form-field form-field--toggle">
          <span class="toggle-label" id="query-type-label">Inquiry Type</span>
          <mat-button-toggle-group
            formControlName="queryType"
            aria-labelledby="query-type-label"
            aria-label="Inquiry Type"
            class="query-type-toggle"
          >
            <mat-button-toggle [value]="queryTypeEnum.GENERAL">
              <mat-icon>chat_bubble_outline</mat-icon>
              <span>General Inquiry</span>
            </mat-button-toggle>
            <mat-button-toggle [value]="queryTypeEnum.SERVICE">
              <mat-icon>build</mat-icon>
              <span>Service Inquiry</span>
            </mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <!-- Name + Email row -->
        <div class="form-row">
          <div class="field-group">
            <label class="field-label" for="contact-name">Name <span class="req-star">*</span></label>
            <mat-form-field appearance="outline" class="form-field" hideRequiredMarker>
              <input
                id="contact-name"
                matInput
                formControlName="name"
                autocomplete="name"
                placeholder="John Doe"
                [attr.aria-describedby]="nameCtrl.invalid && nameCtrl.touched ? 'name-error' : null"
              />
              @if (nameCtrl.invalid && nameCtrl.touched) {
                <mat-error id="name-error">Name is required</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="field-group">
            <label class="field-label" for="contact-email">Email <span class="req-star">*</span></label>
            <mat-form-field appearance="outline" class="form-field" hideRequiredMarker>
              <input
                id="contact-email"
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="john@example.com"
                [attr.aria-describedby]="emailCtrl.invalid && emailCtrl.touched ? 'email-error' : null"
              />
              @if (emailCtrl.invalid && emailCtrl.touched) {
                <mat-error id="email-error">
                  @if (emailCtrl.hasError('required')) { Email is required }
                  @else { Enter a valid email address }
                </mat-error>
              }
            </mat-form-field>
          </div>
        </div>

        <!-- Subject (optional) -->
        <div class="field-group">
          <label class="field-label" for="contact-subject">Subject <span class="optional-hint">(optional)</span></label>
          <mat-form-field appearance="outline" class="form-field">
            <input
              id="contact-subject"
              matInput
              formControlName="subject"
              autocomplete="off"
              placeholder="Project discussion"
            />
          </mat-form-field>
        </div>

        <!-- Message (rich text) -->
        <div class="field-group">
          <label class="field-label" id="contact-message-label">
            Message <span class="req-star">*</span>
          </label>
          <div
            class="ck-field-wrapper"
            [class.ck-field-wrapper--focused]="ckFocused"
            [class.ck-field-wrapper--error]="messageCtrl.invalid && messageCtrl.touched"
            [class.ck-field-wrapper--toolbar-open]="toolbarVisible"
            role="group"
            aria-labelledby="contact-message-label"
          >
            <!-- Toolbar toggle button -->
            @if (isBrowser && Editor) {
              <button
                type="button"
                class="ck-toolbar-toggle"
                [class.ck-toolbar-toggle--active]="toolbarVisible"
                (click)="toolbarVisible = !toolbarVisible"
                [attr.aria-expanded]="toolbarVisible"
                aria-label="Toggle formatting toolbar"
                title="Toggle formatting toolbar"
              >
                <mat-icon>text_format</mat-icon>
              </button>
            }
            @if (isBrowser && Editor) {
              <ckeditor
                [editor]="Editor"
                [config]="editorConfig"
                formControlName="message"
                (focus)="ckFocused = true"
                (blur)="ckFocused = false; messageCtrl.markAsTouched()"
              ></ckeditor>
            } @else {
              <textarea
                class="ck-ssr-placeholder"
                formControlName="message"
                rows="5"
                placeholder="How can I help you?"
                aria-labelledby="contact-message-label"
              ></textarea>
            }
          </div>
          @if (messageCtrl.invalid && messageCtrl.touched) {
            <span class="field-error" id="message-error" role="alert">
              @if (messageCtrl.hasError('required')) { Message is required }
              @else if (messageCtrl.hasError('minlength')) { Message must be at least 10 characters }
            </span>
          }
        </div>

        <!-- Server error banner -->
        @if (serverError()) {
          <div class="form-error-banner" role="alert" aria-live="assertive">
            <mat-icon aria-hidden="true">warning_amber</mat-icon>
            <span>{{ serverError() }}</span>
            <button mat-stroked-button class="retry-btn" (click)="clearError()" aria-label="Try again">
              Try Again
            </button>
          </div>
        }

        <!-- Submit button -->
        <div class="form-actions">
          <button
            mat-flat-button
            type="submit"
            class="submit-btn"
            [disabled]="form.invalid || submitting()"
            aria-label="Send message"
          >
            @if (submitting()) {
              <mat-spinner diameter="20" class="btn-spinner" />
              <span>Sending…</span>
            } @else {
              <span class="btn-content">
                <mat-icon>send</mat-icon>
                <span>Send Message</span>
              </span>
            }
          </button>
        </div>
      </form>
    }
  `,
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit {
  /** Exposes the QueryType enum to the template for value comparisons. */
  protected readonly queryTypeEnum = QueryType;

  /**
   * CKEditor ClassicEditor constructor, loaded dynamically in the browser only.
   * Null during SSR to prevent `domDocument.createElement` errors.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected Editor: any = null;

  /** CKEditor 5 configuration: minimal toolbar suitable for a contact form. */
  protected editorConfig: EditorConfig = {};

  /** True only in the browser — gates the <ckeditor> from rendering during SSR. */
  protected isBrowser: boolean;

  /** Whether the CKEditor editing area currently has focus (drives border highlight). */
  protected ckFocused = false;

  /** Whether the rich-text toolbar pill is expanded (visible). Collapsed by default. */
  protected toolbarVisible = false;

  /** Emitted when the message is successfully sent. */
  readonly messageSent = output<void>();

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  /** Stores the query type selected at the time of submission for the success message. */
  protected readonly submittedQueryType = signal<QueryType>(QueryType.GENERAL);

  private readonly fb = inject(FormBuilder);
  private readonly contactMessageService = inject(ContactMessageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /** Dynamically loads CKEditor 5 — browser only, avoids SSR DOM errors. */
  ngOnInit(): void {
    if (!this.isBrowser) return;
    import('ckeditor5').then(({ ClassicEditor, Bold, Italic, Essentials, Paragraph, List, Link, Undo }) => {
      this.editorConfig = {
        licenseKey: 'GPL',
        plugins: [Essentials, Bold, Italic, Paragraph, List, Link, Undo],
        toolbar: {
          items: ['bold', 'italic', '|', 'bulletedList', 'numberedList', '|', 'link', '|', 'undo', 'redo'],
        },
        placeholder: 'How can I help you?',
        link: { addTargetToExternalLinks: true },
      };
      this.Editor = ClassicEditor;
      this.cdr.markForCheck();
    });
  }

  protected readonly form = this.fb.nonNullable.group({
    queryType: [QueryType.GENERAL as QueryType],
    name:      ['', [Validators.required, Validators.maxLength(120)]],
    email:     ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    subject:   ['', [Validators.maxLength(200)]],
    message:   ['', [richTextRequired, richTextMinLength(10)]],
  });

  protected get nameCtrl(): AbstractControl    { return this.form.controls.name; }
  protected get emailCtrl(): AbstractControl   { return this.form.controls.email; }
  protected get messageCtrl(): AbstractControl { return this.form.controls.message; }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.serverError.set(null);

    const { name, email, subject, message, queryType } = this.form.getRawValue();
    this.submittedQueryType.set(queryType);

    this.contactMessageService.sendMessage({
      name,
      email,
      subject: subject || undefined,
      message,
      queryType,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.messageSent.emit();
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.serverError.set(
          err?.error?.message ?? 'Something went wrong. Please try again.',
        );
      },
    });
  }

  protected clearError(): void {
    this.serverError.set(null);
  }

  protected reset(): void {
    this.submitted.set(false);
    this.serverError.set(null);
    this.form.reset();
  }
}
