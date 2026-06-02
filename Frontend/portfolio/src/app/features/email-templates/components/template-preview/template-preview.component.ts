import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplateDescriptor,
  TemplatePreviewResult,
  TemplatePreviewVariables,
  QueryType,
} from '../../../../shared/models/contact-inbox.models';

/** Sensible sample defaults used to pre-fill the preview variables form. */
const SAMPLE_DEFAULTS: Required<TemplatePreviewVariables> = {
  visitorName:    'Jane Smith',
  visitorEmail:   'jane.smith@example.com',
  subject:        'Enquiry about your services',
  messageBody:    'Hi, I\'m interested in learning more about your development services. Could we schedule a call?',
  messageSummary: 'Interested in development services',
  queryTypeLabel: 'Service Inquiry',
  replyBody:      'Thank you for reaching out. I\'d be happy to discuss your project in more detail.',
  ownerName:      'Alex Portfolio',
  portfolioUrl:   'https://example.com',
  adminPortalUrl: 'https://admin.example.com',
  submittedAt:    new Date().toISOString(),
  replySlaHours:  48,
};

/**
 * Embedded template preview panel for the admin email-templates page.
 *
 * Accepts a selected `EmailTemplateDescriptor` via `@Input() template`.
 * Renders a form with one control per `TemplatePreviewVariables` field,
 * pre-filled with sensible sample values.
 *
 * On any form value change (debounced 400 ms) the panel calls
 * `EmailTemplateService.previewTemplate()` and renders the result.
 * Switches between HTML and plain-text via a `MatTabGroup`.
 *
 * When no template is selected, shows a placeholder prompt.
 * On API failure, shows a dismissible error banner without clearing the form.
 */
@Component({
  selector: 'app-template-preview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <!-- No template selected: show nothing -->
    <ng-container *ngIf="!template">
      <div class="tp-empty">
        <mat-icon class="tp-empty__icon">mail_outline</mat-icon>
        <p>Select a template above to configure and preview it.</p>
      </div>
    </ng-container>

    <!-- Template selected: split layout -->
    <ng-container *ngIf="template">
      <div class="tp-split">

        <!-- ── LEFT: Configuration panel ───────────────────────────── -->
        <div class="tp-config">
          <div class="tp-config__header">
            <div>
              <h3 class="tp-config__title">Template Configuration</h3>
              <p class="tp-config__sub">Customize variables and structure</p>
            </div>
            <button
              class="tp-save-btn"
              type="button"
              (click)="saveChanges()"
              [disabled]="isSaving()"
            >
              <mat-icon>save</mat-icon>
              SAVE CHANGES
            </button>
          </div>

          <!-- Save error -->
          <div *ngIf="saveError()" class="tp-banner tp-banner--error" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ saveError() }}</span>
            <button class="tp-banner__close" type="button" (click)="saveError.set(null)" aria-label="Dismiss">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="form" class="tp-fields" autocomplete="off">

            <!-- Visitor Name / Visitor Email -->
            <div class="tp-row" *ngIf="showField('visitorName') || showField('visitorEmail')">
              <div class="tp-field" *ngIf="showField('visitorName')">
                <label class="tp-label">Visitor Name</label>
                <input class="tp-input" formControlName="visitorName" />
              </div>
              <div class="tp-field" *ngIf="showField('visitorEmail')">
                <label class="tp-label">Visitor Email</label>
                <input class="tp-input" formControlName="visitorEmail" />
              </div>
            </div>

            <!-- Subject Line (RECEIVER, REPLY) -->
            <div class="tp-field tp-field--full" *ngIf="showField('subject')">
              <label class="tp-label">Subject Line</label>
              <input class="tp-input" formControlName="subject" />
            </div>

            <!-- Enquiry Summary (SENDER) -->
            <div class="tp-field tp-field--full" *ngIf="showField('messageSummary')">
              <label class="tp-label">Enquiry Summary <span class="tp-label__hint">(shown to visitor)</span></label>
              <textarea class="tp-textarea" formControlName="messageSummary" rows="3"></textarea>
            </div>

            <!-- Owner Name / Portfolio URL (SENDER, REPLY) -->
            <div class="tp-row" *ngIf="showField('ownerName') || showField('portfolioUrl')">
              <div class="tp-field" *ngIf="showField('ownerName')">
                <label class="tp-label">Owner Name</label>
                <input class="tp-input" formControlName="ownerName" />
              </div>
              <div class="tp-field" *ngIf="showField('portfolioUrl')">
                <label class="tp-label">Portfolio URL</label>
                <input class="tp-input" formControlName="portfolioUrl" />
              </div>
            </div>

            <!-- Reply SLA Hours (SENDER) -->
            <div class="tp-field" *ngIf="showField('replySlaHours')">
              <label class="tp-label">Reply SLA Hours</label>
              <input class="tp-input" type="number" formControlName="replySlaHours" />
            </div>

            <!-- Query Type Label / Submitted At (RECEIVER) -->
            <div class="tp-row" *ngIf="showField('queryTypeLabel') || showField('submittedAt')">
              <div class="tp-field" *ngIf="showField('queryTypeLabel')">
                <label class="tp-label">Query Type Label</label>
                <input class="tp-input" formControlName="queryTypeLabel" />
              </div>
              <div class="tp-field" *ngIf="showField('submittedAt')">
                <label class="tp-label">Submitted At</label>
                <input class="tp-input" formControlName="submittedAt" />
              </div>
            </div>

            <!-- Admin Portal URL (RECEIVER) -->
            <div class="tp-field tp-field--full" *ngIf="showField('adminPortalUrl')">
              <label class="tp-label">Admin Portal URL</label>
              <input class="tp-input" formControlName="adminPortalUrl" />
            </div>

            <!-- Message Body (RECEIVER) -->
            <div class="tp-field tp-field--full" *ngIf="showField('messageBody')">
              <label class="tp-label">Message Body <span class="tp-label__hint">(Live Editor)</span></label>
              <textarea class="tp-textarea tp-textarea--code" formControlName="messageBody" rows="8" spellcheck="false"></textarea>
            </div>

            <!-- Reply Body (REPLY) -->
            <div class="tp-field tp-field--full" *ngIf="showField('replyBody')">
              <label class="tp-label">Reply Body</label>
              <textarea class="tp-textarea" formControlName="replyBody" rows="4"></textarea>
            </div>

          </form>
        </div>

        <!-- ── RIGHT: Preview panel ──────────────────────────────────── -->
        <div class="tp-preview">

          <!-- Preview tabs header -->
          <div class="tp-preview__tabs">
            <div class="tp-tabs">
              <button
                class="tp-tab"
                [class.tp-tab--active]="previewMode === 'html'"
                (click)="previewMode = 'html'"
                type="button"
              >HTML Preview</button>
              <button
                class="tp-tab"
                [class.tp-tab--active]="previewMode === 'text'"
                (click)="previewMode = 'text'"
                type="button"
              >Plain Text</button>
            </div>
            <button
              class="tp-desktop-btn"
              type="button"
              (click)="desktopView = !desktopView"
              [class.tp-desktop-btn--active]="desktopView"
              title="Toggle desktop view"
            >
              <mat-icon>desktop_windows</mat-icon>
              Desktop View
            </button>
          </div>

          <!-- Preview loading -->
          <div *ngIf="isLoading()" class="tp-preview__loading">
            <mat-spinner diameter="28"></mat-spinner>
            <span>Rendering…</span>
          </div>

          <!-- Preview error -->
          <div *ngIf="previewError() && !isLoading()" class="tp-banner tp-banner--error" role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ previewError() }}</span>
            <button class="tp-banner__close" type="button" (click)="previewError.set(null)" aria-label="Dismiss">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- HTML preview -->
          <div
            *ngIf="previewMode === 'html' && previewResult() && !isLoading()"
            class="tp-preview__frame"
            [class.tp-preview__frame--desktop]="desktopView"
          >
            <div
              class="tp-preview__html"
              [innerHTML]="safeHtml()"
            ></div>
          </div>

          <!-- Plain text preview -->
          <pre
            *ngIf="previewMode === 'text' && previewResult() && !isLoading()"
            class="tp-preview__text"
          >{{ previewResult()?.text }}</pre>

          <!-- No preview yet -->
          <div *ngIf="!previewResult() && !isLoading() && !previewError()" class="tp-preview__empty">
            <mat-spinner diameter="24"></mat-spinner>
            <span>Generating preview…</span>
          </div>

        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    /* ── Empty state ────────────────────────────────────────────────── */
    .tp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 160px;
      color: rgba(255,255,255,0.3);
      font-size: 0.9rem;
      margin: 0 28px;
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: 14px;
    }

    .tp-empty__icon { font-size: 36px; width: 36px; height: 36px; opacity: 0.4; }

    /* ── Split layout ───────────────────────────────────────────────── */
    .tp-split {
      display: grid;
      grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
      gap: 0;
      margin: 0 28px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      overflow: hidden;
      min-height: 480px;
    }

    @media (max-width: 960px) {
      .tp-split { grid-template-columns: 1fr; }
    }

    /* ── Config panel ───────────────────────────────────────────────── */
    .tp-config {
      background: rgba(255,255,255,0.025);
      border-right: 1px solid rgba(255,255,255,0.07);
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      max-height: 780px;
    }

    .tp-config__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
    }

    .tp-config__title {
      margin: 0 0 2px;
      font-size: 1rem;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
    }

    .tp-config__sub {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.35);
    }

    .tp-save-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 7px;
      border: none;
      background: rgba(67,97,238,0.2);
      color: #818cf8;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }

      &:hover:not([disabled]) { background: rgba(67,97,238,0.35); }
      &[disabled] { opacity: 0.4; cursor: not-allowed; }
    }

    /* ── Form fields ────────────────────────────────────────────────── */
    .tp-fields {
      padding: 20px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tp-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 520px) {
      .tp-row { grid-template-columns: 1fr; }
    }

    .tp-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .tp-field--full { grid-column: 1 / -1; }

    .tp-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.4);
    }

    .tp-label__hint {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: rgba(255,255,255,0.25);
      font-size: 0.65rem;
    }

    .tp-input {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px;
      padding: 8px 12px;
      color: rgba(255,255,255,0.85);
      font-size: 0.83rem;
      font-family: inherit;
      outline: none;
      transition: border-color 150ms ease;
      width: 100%;
      box-sizing: border-box;

      &:focus { border-color: rgba(67,97,238,0.5); }
      &::placeholder { color: rgba(255,255,255,0.2); }
    }

    .tp-textarea {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px;
      padding: 10px 12px;
      color: rgba(255,255,255,0.85);
      font-size: 0.83rem;
      font-family: inherit;
      outline: none;
      resize: vertical;
      width: 100%;
      box-sizing: border-box;
      transition: border-color 150ms ease;
      line-height: 1.5;

      &:focus { border-color: rgba(67,97,238,0.5); }
    }

    .tp-textarea--code {
      font-family: 'Courier New', monospace;
      font-size: 0.78rem;
      background: rgba(0,0,0,0.25);
      color: #a5f3fc;
      border-color: rgba(255,255,255,0.08);
    }

    /* ── Banner (error / success) ───────────────────────────────────── */
    .tp-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 0.82rem;
      border-radius: 0;
      flex-shrink: 0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

      span { flex: 1; }
    }

    .tp-banner--error {
      background: rgba(239,68,68,0.12);
      color: #fca5a5;
      border-bottom: 1px solid rgba(239,68,68,0.15);
    }

    .tp-banner__close {
      display: flex;
      align-items: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      padding: 2px;
      opacity: 0.6;
      &:hover { opacity: 1; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ── Preview panel ──────────────────────────────────────────────── */
    .tp-preview {
      background: rgba(255,255,255,0.015);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tp-preview__tabs {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tp-tabs {
      display: flex;
      gap: 4px;
    }

    .tp-tab {
      padding: 5px 14px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.4);
      font-size: 0.83rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease;

      &:hover { color: rgba(255,255,255,0.7); }
    }

    .tp-tab--active {
      color: rgba(255,255,255,0.95) !important;
      background: rgba(255,255,255,0.07);
      border-bottom: 2px solid #4361ee;
      border-radius: 6px 6px 0 0;
    }

    .tp-desktop-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent;
      color: rgba(255,255,255,0.4);
      font-size: 0.75rem;
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }

      &:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
    }

    .tp-desktop-btn--active {
      background: rgba(67,97,238,0.15) !important;
      color: #818cf8 !important;
      border-color: rgba(67,97,238,0.3) !important;
    }

    .tp-preview__loading,
    .tp-preview__empty {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 24px 20px;
      color: rgba(255,255,255,0.35);
      font-size: 0.83rem;
    }

    .tp-preview__frame {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: rgba(255,255,255,0.02);
    }

    .tp-preview__frame--desktop {
      padding: 24px 40px;
    }

    .tp-preview__html {
      all: revert;
      pointer-events: none;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }

    .tp-preview__text {
      margin: 0;
      padding: 20px;
      font-size: 0.82rem;
      font-family: 'Courier New', monospace;
      color: rgba(255,255,255,0.65);
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-y: auto;
      flex: 1;
    }
  `],
})
export class TemplatePreviewComponent implements OnChanges, OnDestroy {
  private readonly templateService = inject(EmailTemplateService);
  private readonly sanitizer       = inject(DomSanitizer);
  private readonly fb              = inject(FormBuilder);

  /**
   * The email template descriptor to preview.
   * When null/undefined the panel shows a placeholder prompt.
   */
  @Input() template: EmailTemplateDescriptor | null = null;

  /** Expose enum to template. */
  readonly QueryType = QueryType;

  /** Reactive: rendered template output. Null until first successful API response. */
  readonly previewResult = signal<TemplatePreviewResult | null>(null);

  /** Reactive: true while preview fetch is in flight. */
  readonly isLoading = signal<boolean>(false);

  /**
   * Reactive: error message from a failed preview call.
   * Shown in the dismissible error banner; null when no error.
   */
  readonly previewError = signal<string | null>(null);

  /** Which preview tab is active: 'html' or 'text'. */
  previewMode: 'html' | 'text' = 'html';

  /** Whether to render the preview in a wider desktop frame. */
  desktopView = false;

  /** True while a save operation is in progress. */
  readonly isSaving = signal<boolean>(false);

  /** Error from a save operation; null when no error. */
  readonly saveError = signal<string | null>(null);

  /**
   * Reactive form with one `FormControl` per `TemplatePreviewVariables` field.
   * Pre-filled with sensible sample values from `SAMPLE_DEFAULTS`.
   */
  readonly form: FormGroup = this.fb.group({
    visitorName:    [SAMPLE_DEFAULTS.visitorName],
    visitorEmail:   [SAMPLE_DEFAULTS.visitorEmail],
    subject:        [SAMPLE_DEFAULTS.subject],
    messageBody:    [SAMPLE_DEFAULTS.messageBody],
    messageSummary: [SAMPLE_DEFAULTS.messageSummary],
    queryTypeLabel: [SAMPLE_DEFAULTS.queryTypeLabel],
    replyBody:      [SAMPLE_DEFAULTS.replyBody],
    ownerName:      [SAMPLE_DEFAULTS.ownerName],
    portfolioUrl:   [SAMPLE_DEFAULTS.portfolioUrl],
    adminPortalUrl: [SAMPLE_DEFAULTS.adminPortalUrl],
    submittedAt:    [SAMPLE_DEFAULTS.submittedAt],
    replySlaHours:  [SAMPLE_DEFAULTS.replySlaHours],
  });

  /** Subject used to push form changes into the debounced preview pipeline. */
  private readonly _formChanges$ = new Subject<TemplatePreviewVariables>();

  /** Subscription to the debounced preview observable. */
  private readonly _previewSub: Subscription = this._formChanges$.pipe(
    debounceTime(400),
    switchMap(variables => {
      if (!this.template) return of(null);
      this.isLoading.set(true);
      this.previewError.set(null);
      return this.templateService.previewTemplate(this.template.name, variables).pipe(
        catchError(() => {
          this.isLoading.set(false);
          this.previewError.set('Preview failed. Please try again.');
          this.previewResult.set(null);
          return of(null);
        }),
      );
    }),
  ).subscribe(res => {
    this.isLoading.set(false);
    if (res) {
      this.previewResult.set(res.data);
    }
  });

  /** Subscription to form value changes feeding `_formChanges$`. */
  private readonly _valueSub: Subscription = this.form.valueChanges.subscribe(v => {
    this._formChanges$.next(v as TemplatePreviewVariables);
  });

  /** @inheritdoc */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template'] && this.template) {
      // Reset preview and trigger a fresh render when a new template is selected.
      this.previewResult.set(null);
      this.previewError.set(null);
      this._formChanges$.next(this.form.getRawValue() as TemplatePreviewVariables);
    }
  }

  /** @inheritdoc */
  ngOnDestroy(): void {
    this._previewSub.unsubscribe();
    this._valueSub.unsubscribe();
    this._formChanges$.complete();
  }

  /**
   * Placeholder save handler — re-triggers a preview with the current form values.
   * Replace with a real API call when a save endpoint is available.
   */
  saveChanges(): void {
    this._formChanges$.next(this.form.getRawValue() as TemplatePreviewVariables);
  }

  /**
   * Returns the sanitized safe HTML string for binding to `[innerHTML]`.
   * Returns null when no preview result is available.
   */
  safeHtml(): SafeHtml | null {
    const html = this.previewResult()?.html;
    return html != null ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  }

  /**
   * Fields shown for each recipient role, derived from the actual HBS template variables.
   * SENDER   → visitor confirmation (visitorName, messageSummary, replySlaHours, ownerName, portfolioUrl)
   * RECEIVER → owner notification   (visitorName, visitorEmail, subject, queryTypeLabel, submittedAt, messageBody, adminPortalUrl, portfolioUrl)
   * REPLY    → visitor reply        (visitorName, subject, replyBody, ownerName, portfolioUrl)
   */
  private static readonly ROLE_FIELDS: Readonly<Record<string, readonly string[]>> = {
    SENDER:   ['visitorName', 'messageSummary', 'replySlaHours', 'ownerName', 'portfolioUrl'],
    RECEIVER: ['visitorName', 'visitorEmail', 'subject', 'queryTypeLabel', 'submittedAt', 'messageBody', 'adminPortalUrl', 'portfolioUrl'],
    REPLY:    ['visitorName', 'subject', 'replyBody', 'ownerName', 'portfolioUrl'],
  };

  /**
   * Returns true when the given form field is used by the currently selected template.
   * Falls back to true when no template is selected (shows all fields).
   *
   * @param name - FormControl name to check.
   */
  showField(name: string): boolean {
    if (!this.template) return true;
    const fields = TemplatePreviewComponent.ROLE_FIELDS[this.template.recipientRole];
    return fields ? fields.includes(name) : true;
  }
}
