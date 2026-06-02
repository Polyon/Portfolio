import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { ContactService } from '../../../core/services/contact.service';
import { Contact, ContactFormData } from '../../../core/models/contact.model';

/** URL pattern validator for optional URL fields. */
function optionalUrlValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  try {
    new URL(control.value);
    return null;
  } catch {
    return { url: true };
  }
}

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="contact-form-container">

      <!-- Header -->
      <div class="form-header">
        <h2 class="form-title">
          <mat-icon class="title-icon">contacts</mat-icon>
          Contact Information
        </h2>
        <p class="form-subtitle">
          Manage your contact details. Use the visibility toggles to control what appears in your public portfolio.
        </p>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoadingData()" class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Form panel -->
      <div *ngIf="!isLoadingData()" class="form-panel">
        <form [formGroup]="form" class="contact-form">

          <!-- Email -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">email</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="email"
                  type="email"
                  placeholder="Email Address*"
                />
                <span class="field-hint error"
                  *ngIf="form.get('email')?.touched && form.get('email')?.hasError('required')">
                  Email is required
                </span>
                <span class="field-hint error"
                  *ngIf="form.get('email')?.touched && form.get('email')?.hasError('email')">
                  Enter a valid email address
                </span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="emailPublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

          <!-- Phone -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">phone</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="phone"
                  type="tel"
                  placeholder="Phone Number"
                />
                <span class="field-hint">Optional</span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="phonePublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

          <!-- Section heading -->
          <p class="section-label">Social &amp; Professional Links</p>

          <!-- LinkedIn -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">link</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="linkedinUrl"
                  type="url"
                  placeholder="LinkedIn URL"
                />
                <span class="field-hint">Optional</span>
                <span class="field-hint error"
                  *ngIf="form.get('linkedinUrl')?.touched && form.get('linkedinUrl')?.hasError('url')">
                  Enter a valid URL
                </span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="linkedinPublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

          <!-- GitHub -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">code</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="githubUrl"
                  type="url"
                  placeholder="GitHub URL"
                />
                <span class="field-hint">Optional</span>
                <span class="field-hint error"
                  *ngIf="form.get('githubUrl')?.touched && form.get('githubUrl')?.hasError('url')">
                  Enter a valid URL
                </span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="githubPublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

          <!-- Twitter / X -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">alternate_email</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="twitterUrl"
                  type="url"
                  placeholder="Twitter / X URL"
                />
                <span class="field-hint">Optional</span>
                <span class="field-hint error"
                  *ngIf="form.get('twitterUrl')?.touched && form.get('twitterUrl')?.hasError('url')">
                  Enter a valid URL
                </span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="twitterPublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

          <!-- Personal Website -->
          <div class="field-row">
            <div class="field-input-wrap">
              <mat-icon class="field-icon">language</mat-icon>
              <div class="field-text">
                <input
                  class="field-input"
                  formControlName="websiteUrl"
                  type="url"
                  placeholder="Personal Website"
                />
                <span class="field-hint">Optional</span>
                <span class="field-hint error"
                  *ngIf="form.get('websiteUrl')?.touched && form.get('websiteUrl')?.hasError('url')">
                  Enter a valid URL
                </span>
              </div>
            </div>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="websitePublic" color="accent"></mat-slide-toggle>
              <span class="toggle-label">Public</span>
            </div>
          </div>

        </form>

        <!-- Actions -->
        <div class="form-actions">
          <button
            class="btn-reset"
            (click)="resetForm()"
            [disabled]="isSaving() || !form.dirty"
          >
            <mat-icon>undo</mat-icon> Reset
          </button>
          <button
            class="btn-save"
            (click)="save()"
            [disabled]="form.invalid || isSaving() || !form.dirty"
          >
            <mat-spinner *ngIf="isSaving()" diameter="16" class="btn-spinner"></mat-spinner>
            <mat-icon *ngIf="!isSaving()">save</mat-icon>
            {{ isSaving() ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ── Container ───────────────────────────────────────────────────────── */
    .contact-form-container { max-width: 680px; margin: 0 auto; }

    /* ── Header ──────────────────────────────────────────────────────────── */
    .form-header { margin-bottom: 20px; }
    .form-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 20px; font-weight: 700; color: #e0e0e0; margin: 0 0 6px;
    }
    .title-icon { font-size: 22px; width: 22px; height: 22px; color: #e0e0e0; }
    .form-subtitle { margin: 0; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.5; }

    /* ── Loading ─────────────────────────────────────────────────────────── */
    .loading-overlay { display: flex; justify-content: center; padding: 64px; }

    /* ── Panel ───────────────────────────────────────────────────────────── */
    .form-panel {
      background: rgba(10, 20, 40, 0.85);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 24px 24px 20px;
    }

    /* ── Form ────────────────────────────────────────────────────────────── */
    .contact-form { display: flex; flex-direction: column; gap: 10px; }

    .section-label {
      margin: 8px 0 2px;
      font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,0.55);
    }

    /* ── Field row ───────────────────────────────────────────────────────── */
    .field-row {
      display: flex; align-items: flex-start; gap: 12px;
    }
    .field-input-wrap {
      flex: 1;
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 0 14px;
      min-height: 50px;
      transition: border-color 0.2s;
    }
    .field-input-wrap:focus-within {
      border-color: rgba(0, 217, 255, 0.45);
    }
    .field-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: rgba(255,255,255,0.35);
      flex-shrink: 0;
    }
    .field-text {
      flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 8px 0;
    }
    .field-input {
      background: transparent; border: none; outline: none;
      color: rgba(255,255,255,0.88); font-size: 14px; font-family: inherit;
      width: 100%;
    }
    .field-input::placeholder { color: rgba(255,255,255,0.32); }
    .field-hint {
      font-size: 11px; color: rgba(255,255,255,0.38); line-height: 1.3; margin-top: 2px;
    }
    .field-hint.error { color: #f87171; }

    /* ── Toggle ──────────────────────────────────────────────────────────── */
    .toggle-wrap {
      display: flex; flex-direction: column; align-items: center;
      gap: 3px; padding-top: 10px; min-width: 52px;
    }
    .toggle-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.85); }

    /* ── Actions ─────────────────────────────────────────────────────────── */
    .form-actions {
      display: flex; align-items: center; justify-content: flex-end;
      gap: 10px; margin-top: 20px; padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .btn-reset {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px; padding: 8px 16px;
      color: rgba(255,255,255,0.65); font-size: 14px; font-family: inherit;
      cursor: pointer; transition: background 0.2s, color 0.2s;
    }
    .btn-reset mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-reset:hover:not(:disabled) { background: rgba(255,255,255,0.07); color: #fff; }
    .btn-reset:disabled { opacity: 0.35; cursor: not-allowed; }

    .btn-save {
      display: inline-flex; align-items: center; gap: 6px;
      background: #00D9FF; color: #0D1B2A;
      border: none; border-radius: 8px; padding: 8px 18px;
      font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: background 0.2s;
    }
    .btn-save mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-save:hover:not(:disabled) { background: #33e4ff; }
    .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-spinner { display: inline-block; }
  `],
})
export class ContactFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private contactService = inject(ContactService);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  readonly isLoadingData = signal(false);
  readonly isSaving = signal(false);

  form!: FormGroup;
  private originalContact: Contact | null = null;

  ngOnInit(): void {
    this.buildForm();
    this.loadContact();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Constructs the reactive form with validators. */
  private buildForm(): void {
    this.form = this.fb.group({
      email:                ['', [Validators.required, Validators.email]],
      emailPublic:          [false],
      phone:                ['', [Validators.pattern(/^[\+]?[\d\s\-().]{7,20}$/)]],
      phonePublic:          [false],
      linkedinUrl:          ['', [optionalUrlValidator]],
      linkedinPublic:       [false],
      githubUrl:            ['', [optionalUrlValidator]],
      githubPublic:         [false],
      twitterUrl:           ['', [optionalUrlValidator]],
      twitterPublic:        [false],
      websiteUrl:            ['', [optionalUrlValidator]],
      websitePublic:         [false],
    });
  }

  /** Fetches contact data and populates the form. */
  private loadContact(): void {
    this.isLoadingData.set(true);
    this.contactService
      .getContact()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.originalContact = (response.data as Contact) ?? null;
          if (this.originalContact) {
            this.patchForm(this.originalContact);
          }
          this.isLoadingData.set(false);
        },
        error: () => {
          this.isLoadingData.set(false);
          this.snackBar.open('Failed to load contact information', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /** Patches form values from a Contact record. */
  private patchForm(contact: Contact): void {
    this.form.patchValue({
      email:                 contact.email ?? '',
      emailPublic:           contact.emailPublic ?? false,
      phone:                 contact.phone ?? '',
      phonePublic:           contact.phonePublic ?? false,
      linkedinUrl:           contact.linkedinUrl ?? '',
      linkedinPublic:        contact.linkedinPublic ?? false,
      githubUrl:             contact.githubUrl ?? '',
      githubPublic:          contact.githubPublic ?? false,
      twitterUrl:            contact.twitterUrl ?? '',
      twitterPublic:         contact.twitterPublic ?? false,
      websiteUrl:            contact.websiteUrl ?? '',
      websitePublic:         contact.websitePublic ?? false,
    });
    this.form.markAsPristine();
  }

  /** Submits the form and persists changes. */
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const payload: Partial<ContactFormData> = this.form.value;

    this.contactService
      .updateContact(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.originalContact = response.data as Contact;
          this.form.markAsPristine();
          this.isSaving.set(false);
          this.snackBar.open('Contact information saved', 'Dismiss', { duration: 3000 });
        },
        error: () => {
          this.isSaving.set(false);
          this.snackBar.open('Failed to save contact information', 'Dismiss', { duration: 4000 });
        },
      });
  }

  /** Resets the form to the last saved state. */
  resetForm(): void {
    if (this.originalContact) {
      this.patchForm(this.originalContact);
    }
  }
}
