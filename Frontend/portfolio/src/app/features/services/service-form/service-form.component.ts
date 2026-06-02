import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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

import { ServicesService } from '../../../core/services/services.service';
import { Service, ServiceFormData, ServiceCategory } from '../../../core/models/service.model';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';

/** Data passed to the service form dialog. */
export interface ServiceDialogData {
  service?: Service;
}

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    CKEditorModule,
    RichTextComponent,
  ],
  template: `
    <!-- ── Dialog header ── -->
    <div class="dialog-header">
      <mat-icon class="header-icon">design_services</mat-icon>
      <h2 mat-dialog-title class="dialog-title">{{ isEditMode() ? 'Edit Service' : 'Add Service' }}</h2>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="service-form">

        <!-- ── Section: Service Info ── -->
        <div class="form-section">
          <span class="section-label">Service Info</span>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Service Name</mat-label>
            <mat-icon matPrefix>label</mat-icon>
            <input matInput formControlName="name" placeholder="e.g. Full-Stack Development" />
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
            <mat-error *ngIf="form.get('name')?.hasError('maxlength')">Max 200 characters</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category</mat-label>
            <mat-icon matPrefix>category</mat-icon>
            <mat-select formControlName="category">
              <mat-option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('category')?.hasError('required')">Category is required</mat-error>
          </mat-form-field>
        </div>

        <!-- ── Section: Description ── -->
        <div class="form-section">
          <div class="section-label-row">
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
                placeholder="Describe the service you offer…"></textarea>
            }
            <span *ngIf="form.get('description')?.hasError('required') && form.get('description')?.touched" class="field-error">
              Description is required
            </span>
            <span *ngIf="form.get('description')?.hasError('maxlength')" class="field-error">
              Max 2000 characters
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

        <!-- ── Section: Visibility ── -->
        <div class="form-section">
          <span class="section-label">Visibility</span>
          <div class="toggle-chip">
            <mat-icon class="toggle-chip-icon">public</mat-icon>
            <div class="toggle-chip-labels">
              <span class="toggle-chip-title">Published</span>
              <span class="toggle-chip-sub">Visible in public portfolio when enabled</span>
            </div>
            <mat-slide-toggle formControlName="isPublished" color="accent"></mat-slide-toggle>
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button class="btn-cancel" (click)="cancel()" [disabled]="isSaving()">Cancel</button>
      <button mat-flat-button class="btn-save" [disabled]="form.invalid || isSaving()" (click)="save()">
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
    .service-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 520px;
      max-width: 100%;
      padding: 6px 0 4px;
    }

    /* ── Form sections ── */
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
    .full-width { width: 100%; }

    /* ── Toggle chip ── */
    .toggle-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(0, 217, 255, 0.05);
      border: 1px solid rgba(0, 217, 255, 0.15);
      border-radius: 8px;
    }
    .toggle-chip-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: rgba(0, 217, 255, 0.5);
      flex-shrink: 0;
    }
    .toggle-chip-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .toggle-chip-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #e0e0e0;
    }
    .toggle-chip-sub {
      font-size: 0.68rem;
      color: rgba(255, 255, 255, 0.45);
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

    /* ── Section label row (label + preview toggle) ── */
    .section-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ── Preview toggle bar ── */
    .preview-toggle-bar {
      display: flex;
      gap: 2px;
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
    .btn-save:disabled { opacity: 0.5 !important; }
    .btn-save mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .btn-spinner { display: inline-block; margin-right: 4px; }
  `],
})
export class ServiceFormComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  data = inject<ServiceDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ServiceFormComponent>);

  isEditMode = signal(false);
  isSaving = signal(false);
  showDescriptionPreview = signal(false);
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
    placeholder: 'Describe the service you offer…',
  };

  form!: FormGroup;

  readonly categories: { value: ServiceCategory; label: string }[] = [
    { value: ServiceCategory.BACKEND_DEV, label: 'Backend Development' },
    { value: ServiceCategory.FRONTEND_DEV, label: 'Frontend Development' },
    { value: ServiceCategory.FULLSTACK, label: 'Fullstack' },
    { value: ServiceCategory.DEVOPS, label: 'DevOps' },
    { value: ServiceCategory.AI_INTEGRATION, label: 'AI Integration' },
    { value: ServiceCategory.CONSULTING, label: 'Consulting' },
    { value: ServiceCategory.TRAINING, label: 'Training' },
    { value: ServiceCategory.OTHER, label: 'Other' },
  ];

  ngOnInit(): void {
    this.isEditMode.set(!!this.data?.service);
    this.form = this.fb.group({
      name: [
        this.data?.service?.name ?? '',
        [Validators.required, Validators.maxLength(200)],
      ],
      description: [
        this.data?.service?.description ?? '',
        [Validators.required, Validators.maxLength(2000)],
      ],
      category: [
        this.data?.service?.category ?? ServiceCategory.OTHER,
        Validators.required,
      ],
      isPublished: [this.data?.service?.isPublished ?? false],
    });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close(null);
  }

  /** Submits the form to create or update a service. */
  save(): void {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const payload: ServiceFormData = this.form.getRawValue();

    const request$ = this.isEditMode()
      ? this.servicesService.updateService(this.data.service!.id, payload)
      : this.servicesService.createService(payload);

    request$.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.snackBar.open(
          this.isEditMode() ? 'Service updated successfully' : 'Service created successfully',
          'Dismiss',
          { duration: 3000 },
        );
        this.dialogRef.close(res.data);
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('Failed to save service. Please try again.', 'Dismiss', {
          duration: 5000,
          panelClass: 'error-snackbar',
        });
      },
    });
  }
}
