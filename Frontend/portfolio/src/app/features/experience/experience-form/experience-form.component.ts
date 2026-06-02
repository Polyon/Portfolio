import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  Bold, Italic, Underline, Strikethrough,
  Essentials, Paragraph,
  List,
  Link, BlockQuote,
  Undo,
} from 'ckeditor5';

import { ExperienceService } from '../../../core/services/experience.service';
import { Experience, ExperienceFormData, EmploymentType } from '../../../core/models/experience.model';
import { SkillSelectComponent } from '../../../shared/components/skill-select/skill-select.component';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';

/** Data passed when opening the experience form dialog. */
export interface ExperienceDialogData {
  experience?: Experience;
}

/**
 * Cross-field validator: start date must be ≤ end date.
 * Only validates when isCurrentRole is false and both dates are set.
 *
 * @param group - The experience form group.
 * @returns Validation errors or null.
 */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const startDate = group.get('startDate')?.value as Date | null;
  const endDate = group.get('endDate')?.value as Date | null;
  const isCurrentPosition = group.get('isCurrentPosition')?.value as boolean;

  if (!isCurrentPosition && startDate && endDate) {
    if (startDate > endDate) {
      return { dateRange: 'Start date must be before or equal to end date' };
    }
  }
  return null;
}

@Component({
  selector: 'app-experience-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    CKEditorModule,
    SkillSelectComponent,
    ImageUploadComponent,
    RichTextComponent,
  ],
  template: `
    <!-- ── Dialog title ── -->
    <div class="dialog-header">
      <mat-icon class="header-icon">work_history</mat-icon>
      <h2 mat-dialog-title class="dialog-title">{{ isEditMode() ? 'Edit Experience' : 'Add Experience' }}</h2>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="experience-form">

        <!-- ── Section: Role info ── -->
        <div class="form-section">
          <span class="section-label">Role Information</span>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Company Name</mat-label>
              <mat-icon matPrefix>business</mat-icon>
              <input matInput formControlName="company" placeholder="Acme Corp" />
              <mat-error *ngIf="form.get('company')?.hasError('required')">Company name is required</mat-error>
              <mat-error *ngIf="form.get('company')?.hasError('maxlength')">Max 200 characters</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Job Title</mat-label>
              <mat-icon matPrefix>badge</mat-icon>
              <input matInput formControlName="jobTitle" placeholder="Senior Developer" />
              <mat-error *ngIf="form.get('jobTitle')?.hasError('required')">Job title is required</mat-error>
              <mat-error *ngIf="form.get('jobTitle')?.hasError('maxlength')">Max 200 characters</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Employment Type</mat-label>
              <mat-icon matPrefix>work</mat-icon>
              <mat-select formControlName="employmentType">
                <mat-option value="">— Select type —</mat-option>
                <mat-option *ngFor="let et of employmentTypes" [value]="et.value">{{ et.label }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Location</mat-label>
              <mat-icon matPrefix>location_on</mat-icon>
              <input matInput formControlName="location" placeholder="Cape Town, ZA" />
              <mat-error *ngIf="form.get('location')?.hasError('maxlength')">Max 200 characters</mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- ── Section: Dates ── -->
        <div class="form-section">
          <span class="section-label">Duration</span>

          <!-- Current Role Toggle -->
          <div class="toggle-chip">
            <mat-icon class="toggle-chip-icon">check_circle</mat-icon>
            <mat-slide-toggle formControlName="isCurrentPosition" color="accent" (change)="onCurrentRoleChange($event.checked)">
              Currently working here
            </mat-slide-toggle>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Start Date</mat-label>
              <mat-icon matPrefix>calendar_today</mat-icon>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
              <mat-error *ngIf="form.get('startDate')?.hasError('required')">Start date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>End Date</mat-label>
              <mat-icon matPrefix>event</mat-icon>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="form.get('startDate')?.value" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
              <mat-hint *ngIf="form.get('isCurrentPosition')?.value">Leave blank — currently working here</mat-hint>
            </mat-form-field>
          </div>

          <mat-error *ngIf="form.hasError('dateRange') && form.get('endDate')?.dirty" class="cross-field-error">
            {{ form.getError('dateRange') }}
          </mat-error>
        </div>

        <!-- ── Section: Description (Rich Text) ── -->
        <div class="form-section">
          <span class="section-label">Description</span>
          <div class="preview-toggle-bar">
            <button type="button" mat-icon-button class="preview-toggle-btn"
              [class.active]="!showDescriptionPreview()"
              (click)="showDescriptionPreview.set(false)"
              matTooltip="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button type="button" mat-icon-button class="preview-toggle-btn"
              [class.active]="showDescriptionPreview()"
              (click)="showDescriptionPreview.set(true)"
              matTooltip="Preview rendered output">
              <mat-icon>visibility</mat-icon>
            </button>
          </div>
          @if (!showDescriptionPreview()) {
            @if (isBrowser) {
              <div class="ck-wrap" [class.ck-error]="form.get('description')?.invalid && form.get('description')?.touched">
                <ckeditor
                  [editor]="Editor"
                  [config]="editorConfig"
                  formControlName="description">
                </ckeditor>
              </div>
            } @else {
              <textarea class="ssr-textarea" formControlName="description" rows="5"
                placeholder="Key responsibilities, achievements…"></textarea>
            }
            <span *ngIf="form.get('description')?.hasError('maxlength')" class="field-error">
              Max 5000 characters
            </span>
          } @else {
            <div class="rich-text-preview-panel">
              @if (form.get('description')?.value) {
                <app-rich-text [content]="form.get('description')?.value"></app-rich-text>
              } @else {
                <p class="preview-empty">Nothing to preview — write something in the editor first.</p>
              }
            </div>
          }
        </div>

        <!-- ── Section: Media & Visibility ── -->
        <div class="form-section">
          <span class="section-label">Media &amp; Visibility</span>

          <div class="form-row logo-published-row">
            <div class="logo-upload-block">
              <span class="logo-upload-label">Company Logo</span>
              <app-image-upload
                shape="square"
                placeholderIcon="business"
                alt="Company logo preview"
                [currentImageUrl]="currentLogoUrl()"
                [uploading]="isLogoUploading()"
                (imageSelected)="onLogoSelected($event)"
                (imageCleared)="onLogoCleared()">
              </app-image-upload>
            </div>

            <div class="published-chip">
              <div class="published-chip-labels">
                <span class="published-chip-title">Published</span>
                <span class="published-chip-sub">Visible on public portfolio</span>
              </div>
              <mat-slide-toggle formControlName="isPublished" color="accent"></mat-slide-toggle>
            </div>
          </div>
        </div>

        <!-- ── Skills ── -->
        <div class="form-section">
          <span class="section-label">Skills</span>
          <app-skill-select
            formControlName="skillIds"
            label="Related Skills"
            placeholder="Search skills…"
            [initialSkillIds]="initialSkillIds"
          ></app-skill-select>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button class="btn-cancel" (click)="cancel()">Cancel</button>
      <button mat-flat-button class="btn-save" [disabled]="isSaving()" (click)="save()">
        @if (isSaving()) {
          <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
          Saving…
        } @else {
          <ng-container>
            <mat-icon>{{ isEditMode() ? 'save' : 'add_circle' }}</mat-icon>
            {{ isEditMode() ? 'Update' : 'Create' }}
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* ── Dialog header ── */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 24px 14px;
      border-bottom: 1px solid rgba(0, 217, 255, 0.18);
      background: linear-gradient(135deg, rgba(0, 217, 255, 0.06) 0%, transparent 60%);
    }
    .header-icon {
      color: #00D9FF;
      font-size: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
    }
    .dialog-title {
      margin: 0;
      padding: 0;
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #e0e0e0;
    }

    /* ── Form container ── */
    .experience-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 580px;
      max-width: 100%;
      padding: 6px 0 4px;
    }

    /* ── Form sections (glass cards) ── */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px 16px;
      background: rgba(0, 217, 255, 0.03);
      border: 1px solid rgba(0, 217, 255, 0.1);
      border-radius: 10px;
      transition: border-color 0.2s;
    }
    .form-section:focus-within {
      border-color: rgba(0, 217, 255, 0.25);
    }
    .section-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(0, 217, 255, 0.6);
    }

    /* ── Row layouts ── */
    .form-row {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .half-width { flex: 1; min-width: 0; }

    /* ── Current-role toggle chip ── */
    .toggle-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: rgba(0, 217, 255, 0.05);
      border: 1px solid rgba(0, 217, 255, 0.15);
      border-radius: 8px;
    }
    .toggle-chip-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: rgba(0, 217, 255, 0.5);
    }

    /* ── Cross-field date error ── */
    .cross-field-error {
      font-size: 0.75rem;
      margin-top: -6px;
    }

    /* ── CKEditor wrapper ── */
    .ck-wrap {
      border: 1px solid rgba(0, 217, 255, 0.2);
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ck-wrap:focus-within {
      border-color: rgba(0, 217, 255, 0.65);
      box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
    }
    .ck-wrap.ck-error {
      border-color: #f44336;
      box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
    }

    /* ── SSR textarea fallback ── */
    .ssr-textarea {
      width: 100%;
      min-height: 110px;
      background: rgba(0, 217, 255, 0.04);
      border: 1px solid rgba(0, 217, 255, 0.2);
      border-radius: 8px;
      color: #e0e0e0;
      padding: 10px 14px;
      font-size: 0.875rem;
      font-family: inherit;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ssr-textarea:focus {
      border-color: rgba(0, 217, 255, 0.65);
      box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
    }
    .field-error {
      font-size: 0.75rem;
      color: #f44336;
    }

    /* ── Rich-text preview toggle bar ── */
    .preview-toggle-bar {
      display: flex;
      gap: 2px;
      align-self: flex-end;
    }
    .preview-toggle-btn {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      color: rgba(255, 255, 255, 0.4) !important;
      transition: color 0.15s, background 0.15s !important;
    }
    .preview-toggle-btn.active {
      color: #00D9FF !important;
      background: rgba(0, 217, 255, 0.1) !important;
      border-radius: 6px !important;
    }
    .preview-toggle-btn mat-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
    }

    /* ── Rich-text preview panel ── */
    .rich-text-preview-panel {
      min-height: 110px;
      padding: 12px 16px;
      background: rgba(0, 217, 255, 0.03);
      border: 1px solid rgba(0, 217, 255, 0.15);
      border-radius: 8px;
    }
    .preview-empty {
      color: rgba(255, 255, 255, 0.3);
      font-size: 0.85rem;
      font-style: italic;
      margin: 0;
    }

    /* ── Logo + Published row ── */
    .logo-published-row { align-items: flex-start; gap: 16px; }
    .logo-upload-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .logo-upload-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(0, 217, 255, 0.55);
    }
    .logo-field { flex: 1; min-width: 0; }
    .published-chip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(0, 217, 255, 0.05);
      border: 1px solid rgba(0, 217, 255, 0.15);
      border-radius: 8px;
      min-width: 0;
      flex-shrink: 0;
      margin-bottom: 22px;
    }
    .published-chip-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .published-chip-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #e0e0e0;
      white-space: nowrap;
    }
    .published-chip-sub {
      font-size: 0.68rem;
      color: rgba(255, 255, 255, 0.45);
      white-space: nowrap;
    }

    /* ── Dialog actions ── */
    .dialog-actions {
      padding: 12px 24px 16px !important;
      border-top: 1px solid rgba(0, 217, 255, 0.12);
      gap: 10px;
    }
    .btn-cancel {
      color: rgba(255, 255, 255, 0.6) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      border-radius: 8px !important;
    }
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      color: #e0e0e0 !important;
    }
    .btn-save {
      background: #00D9FF !important;
      color: #0D1B2A !important;
      font-weight: 600 !important;
      border-radius: 8px !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-save:hover:not(:disabled) {
      background: #33e4ff !important;
      box-shadow: 0 0 16px rgba(0, 217, 255, 0.35) !important;
    }
    .btn-save:disabled {
      opacity: 0.5 !important;
    }
    .btn-save mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .btn-spinner {
      display: inline-block;
      margin-right: 4px;
    }
  `],
})
export class ExperienceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private experienceService = inject(ExperienceService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ExperienceFormComponent>);
  private platformId = inject(PLATFORM_ID);
  dialogData = inject<ExperienceDialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  isSaving = signal(false);
  isLogoUploading = signal(false);
  currentLogoUrl = signal<string | undefined>(undefined);
  showDescriptionPreview = signal(false);
  initialSkillIds: string[] = [];
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // CKEditor
  readonly Editor = ClassicEditor;
  readonly editorConfig = {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Bold, Italic, Underline, Strikethrough,
      Paragraph, List, Link, BlockQuote, Undo,
    ],
    toolbar: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'bulletedList', 'numberedList', '|',
      'blockQuote', 'link', '|',
      'undo', 'redo',
    ],
    placeholder: 'Key responsibilities, achievements…',
  };

  readonly employmentTypes: Array<{ value: EmploymentType; label: string }> = [
    { value: EmploymentType.FULL_TIME,   label: 'Full-time' },
    { value: EmploymentType.PART_TIME,   label: 'Part-time' },
    { value: EmploymentType.CONTRACT,    label: 'Contract' },
    { value: EmploymentType.FREELANCE,   label: 'Freelance' },
    { value: EmploymentType.INTERNSHIP,  label: 'Internship' },
  ];

  /** @returns true when editing an existing experience entry. */
  isEditMode(): boolean {
    return !!this.dialogData?.experience;
  }

  ngOnInit(): void {
    const exp = this.dialogData?.experience;
    this.initialSkillIds = exp?.skills?.map((s) => s.id) ?? [];
    this.currentLogoUrl.set(exp?.companyLogoUrl ?? undefined);

    this.form = this.fb.group(
      {
        company: [exp?.company ?? '', [Validators.required, Validators.maxLength(200)]],
        jobTitle: [exp?.jobTitle ?? '', [Validators.required, Validators.maxLength(200)]],
        employmentType: [exp?.employmentType ?? EmploymentType.FULL_TIME],
        location: [exp?.location ?? '', [Validators.maxLength(200)]],
        isCurrentPosition: [exp?.isCurrentPosition ?? false],
        startDate: [exp?.startDate ? new Date(exp.startDate) : null, [Validators.required]],
        endDate: [exp?.endDate ? new Date(exp.endDate) : null],
        description: [exp?.description ?? '', [Validators.maxLength(5000)]],
        companyLogoUrl: [exp?.companyLogoUrl ?? ''],
        isPublished: [exp?.isPublished ?? true],
        skillIds: [this.initialSkillIds],
      },
      { validators: dateRangeValidator },
    );

    // If currently in position, disable end date field
    if (exp?.isCurrentPosition) {
      this.form.get('endDate')?.disable();
    }
  }

  /**
   * Handles the current-role toggle.
   * Disables end date when currently working here; re-enables when not.
   *
   * @param isCurrentRole - Whether the user is currently working here.
   */
  onCurrentRoleChange(isCurrentRole: boolean): void {
    const endDateControl = this.form.get('endDate');
    if (isCurrentRole) {
      endDateControl?.setValue(null);
      endDateControl?.disable();
    } else {
      endDateControl?.enable();
    }
  }

  /**
   * Uploads the selected company logo file and stores the returned CDN URL.
   *
   * @param file - File emitted by ImageUploadComponent.
   */
  onLogoSelected(file: File): void {
    this.isLogoUploading.set(true);
    this.experienceService.uploadCompanyLogo(file).subscribe({
      next: (response) => {
        const url = response.data?.url ?? '';
        this.currentLogoUrl.set(url);
        this.form.patchValue({ companyLogoUrl: url }, { emitEvent: false });
        this.isLogoUploading.set(false);
        this.snackBar.open('Company logo uploaded.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.isLogoUploading.set(false);
        this.snackBar.open('Logo upload failed. Please try again.', 'Dismiss', { duration: 5000 });
      },
    });
  }

  /** Clears the company logo selection and removes it from the form payload. */
  onLogoCleared(): void {
    this.currentLogoUrl.set(undefined);
    this.form.patchValue({ companyLogoUrl: '' });
    this.form.markAsDirty();
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close(null);
  }

  /** Validates and submits the form. */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const raw = this.form.getRawValue();

    const toIso = (v: Date | string | null | undefined): string | undefined =>
      v instanceof Date ? v.toISOString() : v ?? undefined;

    const skillIds: string[] = (raw.skillIds ?? []).filter(Boolean);

    const payload: ExperienceFormData = {
      company: raw.company,
      jobTitle: raw.jobTitle,
      description: raw.description ?? '',
      startDate: toIso(raw.startDate) as string,
      endDate: raw.isCurrentPosition ? undefined : toIso(raw.endDate),
      isCurrentPosition: raw.isCurrentPosition,
      location: raw.location || undefined,
      employmentType: raw.employmentType || undefined,
      isPublished: raw.isPublished,
      companyLogoUrl: raw.companyLogoUrl || undefined,
    };

    const save$ = this.isEditMode()
      ? this.experienceService.updateExperience(this.dialogData.experience!.id, payload)
      : this.experienceService.createExperience(payload);

    save$.pipe(
      switchMap((response) =>
        this.experienceService.setExperienceSkills(response.data.id, skillIds)
          .pipe(switchMap(() => of(response)))
      ),
    ).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.isEditMode() ? 'Experience updated.' : 'Experience created.',
          'OK',
          { duration: 3000 },
        );
        this.dialogRef.close(response.data);
      },
      error: () => {
        this.snackBar.open('Failed to save experience. Please try again.', 'Dismiss', { duration: 5000 });
        this.isSaving.set(false);
      },
    });
  }
}
