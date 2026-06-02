import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { forkJoin, switchMap, of } from 'rxjs';
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

import { ProjectsService } from '../../../core/services/projects.service';
import { Project, ProjectFormData, ProjectStatus, ProjectImage } from '../../../core/models/project.model';
import { SkillSelectComponent } from '../../../shared/components/skill-select/skill-select.component';
import { ImageGalleryComponent } from '../../../shared/components/image-gallery/image-gallery.component';
import { RichTextComponent } from '../../../shared/components/rich-text/rich-text.component';

export interface ProjectDialogData {
  project?: Project;
}

@Component({
  selector: 'app-project-form',
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
    SkillSelectComponent,
    ImageGalleryComponent,
    CKEditorModule,
    RichTextComponent,
  ],
  template: `
    <!-- ── Dialog header ── -->
    <div class="dialog-header">
      <mat-icon class="header-icon">folder_special</mat-icon>
      <h2 mat-dialog-title class="dialog-title">{{ isEditMode() ? 'Edit Project' : 'Add Project' }}</h2>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="project-form">

        <!-- ── Section: Project Info ── -->
        <div class="form-section">
          <span class="section-label">Project Info</span>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Project Name</mat-label>
            <mat-icon matPrefix>drive_file_rename_outline</mat-icon>
            <input matInput formControlName="name" placeholder="My Awesome Project" />
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
            <mat-error *ngIf="form.get('name')?.hasError('maxlength')">Max 200 characters</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Short Description</mat-label>
            <mat-icon matPrefix>short_text</mat-icon>
            <input matInput formControlName="shortDescription" placeholder="One-liner summary" />
            <mat-error *ngIf="form.get('shortDescription')?.hasError('maxlength')">Max 300 characters</mat-error>
          </mat-form-field>

          <!-- Rich-text description -->
          <div class="ck-field-label-row">
            <span class="ck-field-label">Full Description</span>
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
                placeholder="Detailed project description…"></textarea>
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

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Status</mat-label>
            <mat-icon matPrefix>flag</mat-icon>
            <mat-select formControlName="status">
              <mat-option *ngFor="let s of statuses" [value]="s.value">{{ s.label }}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>
        </div>

        <!-- ── Section: Timeline ── -->
        <div class="form-section">
          <span class="section-label">Timeline</span>
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
              <mat-label>Completion Date</mat-label>
              <mat-icon matPrefix>event</mat-icon>
              <input matInput [matDatepicker]="endPicker" formControlName="completionDate" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>
        </div>

        <!-- ── Section: Links ── -->
        <div class="form-section">
          <span class="section-label">Links</span>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>GitHub / Repository URL</mat-label>
            <mat-icon matPrefix>code</mat-icon>
            <input matInput formControlName="repositoryUrl" placeholder="https://github.com/…" />
            <mat-error *ngIf="form.get('repositoryUrl')?.hasError('pattern')">Enter a valid URL</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Live URL</mat-label>
            <mat-icon matPrefix>open_in_new</mat-icon>
            <input matInput formControlName="liveUrl" placeholder="https://…" />
            <mat-error *ngIf="form.get('liveUrl')?.hasError('pattern')">Enter a valid URL</mat-error>
          </mat-form-field>
        </div>

        <!-- ── Section: Visibility ── -->
        <div class="form-section">
          <span class="section-label">Visibility</span>
          <div class="form-row toggles-row">
            <div class="toggle-chip">
              <mat-icon class="toggle-chip-icon">star</mat-icon>
              <div class="toggle-chip-labels">
                <span class="toggle-chip-title">Featured</span>
                <span class="toggle-chip-sub">Promoted in portfolio</span>
              </div>
              <mat-slide-toggle formControlName="isFeatured" color="accent"></mat-slide-toggle>
            </div>

            <div class="toggle-chip">
              <mat-icon class="toggle-chip-icon">public</mat-icon>
              <div class="toggle-chip-labels">
                <span class="toggle-chip-title">Published</span>
                <span class="toggle-chip-sub">Visible on public site</span>
              </div>
              <mat-slide-toggle formControlName="isPublished" color="accent"></mat-slide-toggle>
            </div>
          </div>
        </div>

        <!-- ── Section: Skills ── -->
        <div class="form-section">
          <span class="section-label">Technologies &amp; Skills</span>
          <app-skill-select
            formControlName="skillIds"
            label="Technologies / Skills"
            placeholder="Search skills…"
            [initialSkillIds]="initialSkillIds"
          ></app-skill-select>
        </div>

        <!-- ── Section: Images ── -->
        <div class="form-section">
          <span class="section-label">Images</span>
          <app-image-gallery
            [existingImages]="existingImages"
            (imagesChange)="onImagesChange($event)"
          ></app-image-gallery>
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
    .project-form {
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
    .full-width { width: 100%; }

    /* ── Toggle chips ── */
    .toggles-row { align-items: stretch; }
    .toggle-chip {
      flex: 1;
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

    /* ── CKEditor wrapper ── */
    .ck-field-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: -4px;
    }
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

    /* ── CK field label row ── */
    .ck-field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ── Rich-text preview toggle bar ── */
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
  `],
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectsService = inject(ProjectsService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ProjectFormComponent>);
  private platformId = inject(PLATFORM_ID);
  dialogData = inject<ProjectDialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  isSaving = signal(false);
  showDescriptionPreview = signal(false);
  existingImages: ProjectImage[] = [];
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
    placeholder: 'Detailed project description…',
  };

  private pendingImageFiles: File[] = [];
  private imageOrder: ProjectImage[] = [];

  private readonly urlPattern = /^https?:\/\/.+/;

  readonly statuses: Array<{ value: ProjectStatus; label: string }> = [
    { value: ProjectStatus.PLANNING, label: 'Planning' },
    { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
    { value: ProjectStatus.COMPLETED, label: 'Completed' },
    { value: ProjectStatus.DEPLOYED, label: 'Deployed' },
  ];

  /** @returns true when editing an existing project. */
  isEditMode(): boolean {
    return !!this.dialogData?.project;
  }

  ngOnInit(): void {
    const p = this.dialogData?.project;
    // Backend stores images as string[]; normalize to ProjectImage[] for the gallery component.
    this.existingImages = (p?.images ?? []).map((url, i) => ({ url, order: i }));
    this.initialSkillIds = p?.skills?.map((s) => s.id) ?? [];

    this.form = this.fb.group({
      name: [p?.name ?? '', [Validators.required, Validators.maxLength(200)]],
      shortDescription: [p?.shortDescription ?? '', [Validators.maxLength(300)]],
      description: [p?.description ?? '', [Validators.maxLength(5000)]],
      status: [p?.status ?? ProjectStatus.PLANNING, [Validators.required]],
      startDate: [p?.startDate ? new Date(p.startDate) : null, [Validators.required]],
      completionDate: [p?.completionDate ? new Date(p.completionDate) : null],
      repositoryUrl: [p?.repositoryUrl ?? '', [Validators.pattern(this.urlPattern)]],
      liveUrl: [p?.liveUrl ?? '', [Validators.pattern(this.urlPattern)]],
      isFeatured: [p?.isFeatured ?? false],
      isPublished: [p?.isPublished ?? true],
      skillIds: [this.initialSkillIds],
    });
  }

  /** Receives updated image data from the gallery component. */
  onImagesChange(event: { files: File[]; order: ProjectImage[] }): void {
    this.pendingImageFiles = event.files;
    this.imageOrder = event.order;
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close(null);
  }

  /** Validates and submits the form, uploading any pending images via Cloudinary. */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const raw = this.form.getRawValue();

    const payload: ProjectFormData = {
      name: raw.name,
      shortDescription: raw.shortDescription ?? '',
      description: raw.description ?? '',
      status: raw.status,
      startDate: raw.startDate instanceof Date ? raw.startDate.toISOString() : raw.startDate,
      completionDate: raw.completionDate instanceof Date ? raw.completionDate.toISOString() : raw.completionDate,
      repositoryUrl: raw.repositoryUrl || undefined,
      liveUrl: raw.liveUrl || undefined,
      isFeatured: raw.isFeatured,
      isPublished: raw.isPublished,
      skillIds: raw.skillIds ?? [],
    };

    const save$ = this.isEditMode()
      ? this.projectsService.updateProject(this.dialogData.project!.id, payload)
      : this.projectsService.createProject(payload);

    save$.pipe(
      switchMap((response) => {
        const project = response.data as Project;

        // If no image changes, return immediately
        if (this.pendingImageFiles.length === 0 && this.imageOrder.length === 0) {
          return of(response);
        }

        // Upload all new files in parallel
        const uploads$ = this.pendingImageFiles.length > 0
          ? forkJoin(this.pendingImageFiles.map((file) => this.projectsService.uploadProjectImage(file)))
          : of([]);

        return uploads$.pipe(
          switchMap((uploadResults) => {
            // Build ordered images array: existing (reordered) + newly uploaded
            const existingUrls = [...this.imageOrder]
              .sort((a, b) => a.order - b.order)
              .map((img) => img.url)
              .filter(Boolean);
            const newUrls = uploadResults.map((r) => r.data.url);
            const allImages = [...existingUrls, ...newUrls];

            return this.projectsService.updateProjectImages(project.id, allImages);
          }),
        );
      }),
    ).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.isEditMode() ? 'Project updated.' : 'Project created.',
          'OK',
          { duration: 3000 },
        );
        this.dialogRef.close(response.data);
      },
      error: () => {
        this.snackBar.open('Failed to save project. Please try again.', 'Dismiss', { duration: 5000 });
        this.isSaving.set(false);
      },
    });
  }
}
