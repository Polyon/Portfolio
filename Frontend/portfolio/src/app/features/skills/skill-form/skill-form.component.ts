import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SkillsService } from '../../../core/services/skills.service';
import { Skill, SkillCategory, SkillFormData } from '../../../core/models/skill.model';

export interface SkillDialogData {
  skill?: Skill;
}

@Component({
  selector: 'app-skill-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <!-- ── Dialog header ── -->
    <div class="dialog-header">
      <mat-icon class="header-icon">psychology</mat-icon>
      <h2 mat-dialog-title class="dialog-title">{{ isEditMode() ? 'Edit Skill' : 'Add Skill' }}</h2>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="skill-form">

        <!-- ── Section: Skill Info ── -->
        <div class="form-section">
          <span class="section-label">Skill Info</span>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Skill Name</mat-label>
              <mat-icon matPrefix>label</mat-icon>
              <input matInput formControlName="name" placeholder="e.g. TypeScript" />
              <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
              <mat-error *ngIf="form.get('name')?.hasError('maxlength')">Max 100 characters</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="flex-grow">
              <mat-label>Category</mat-label>
              <mat-icon matPrefix>category</mat-icon>
              <mat-select formControlName="category">
                <mat-option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</mat-option>
              </mat-select>
              <mat-error *ngIf="form.get('category')?.hasError('required')">Category is required</mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- ── Section: Proficiency ── -->
        <div class="form-section">
          <span class="section-label">Proficiency</span>

          <div class="proficiency-header">
            <span class="proficiency-label">Proficiency Level</span>
            <span class="proficiency-value">{{ form.get('proficiencyLevel')?.value }} / 5</span>
          </div>
          <mat-slider min="1" max="5" step="1" discrete showTickMarks class="proficiency-slider">
            <input matSliderThumb formControlName="proficiencyLevel" />
          </mat-slider>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Endorsement Count</mat-label>
            <mat-icon matPrefix>thumb_up</mat-icon>
            <input matInput type="number" formControlName="endorsementCount" min="0" />
            <mat-error *ngIf="form.get('endorsementCount')?.hasError('min')">Must be ≥ 0</mat-error>
          </mat-form-field>
        </div>

        <!-- ── Section: Visibility ── -->
        <div class="form-section">
          <span class="section-label">Visibility</span>
          <div class="toggle-chip">
            <mat-icon class="toggle-chip-icon">public</mat-icon>
            <div class="toggle-chip-labels">
              <span class="toggle-chip-title">Published</span>
              <span class="toggle-chip-sub">Visible on public portfolio</span>
            </div>
            <mat-slide-toggle formControlName="isPublished" color="accent"></mat-slide-toggle>
          </div>
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
    .skill-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 480px;
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
    .form-section:focus-within { border-color: rgba(0, 217, 255, 0.25); }
    .section-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(0, 217, 255, 0.6);
    }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 14px; align-items: flex-start; }
    .flex-grow { flex: 1; min-width: 0; }

    /* ── Proficiency slider ── */
    .proficiency-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .proficiency-label {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.65);
    }
    .proficiency-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: #00D9FF;
    }
    .proficiency-slider { width: 100%; }

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
    .toggle-chip-labels { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .toggle-chip-title { font-size: 0.8rem; font-weight: 600; color: #e0e0e0; }
    .toggle-chip-sub { font-size: 0.68rem; color: rgba(255, 255, 255, 0.45); }

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
export class SkillFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private skillsService = inject(SkillsService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<SkillFormComponent>);
  dialogData = inject<SkillDialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  isSaving = signal(false);

  readonly categories: Array<{ value: SkillCategory; label: string }> = [
    { value: SkillCategory.BACKEND, label: 'Backend' },
    { value: SkillCategory.FRONTEND, label: 'Frontend' },
    { value: SkillCategory.DEVOPS, label: 'DevOps' },
    { value: SkillCategory.AI, label: 'AI / ML' },
    { value: SkillCategory.DATABASE, label: 'Database' },
    { value: SkillCategory.OTHER, label: 'Other' },
  ];

  /** @returns true when editing an existing skill. */
  isEditMode(): boolean {
    return !!this.dialogData?.skill;
  }

  ngOnInit(): void {
    const skill = this.dialogData?.skill;
    this.form = this.fb.group({
      name: [skill?.name ?? '', [Validators.required, Validators.maxLength(100)]],
      category: [skill?.category ?? SkillCategory.BACKEND, [Validators.required]],
      proficiencyLevel: [skill?.proficiencyLevel ?? 3, [Validators.required, Validators.min(1), Validators.max(5)]],
      endorsementCount: [skill?.endorsementCount ?? 0, [Validators.min(0)]],
      isPublished: [skill?.isPublished ?? true],
    });
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
    const payload: SkillFormData = this.form.getRawValue() as SkillFormData;
    const request$ = this.isEditMode()
      ? this.skillsService.updateSkill(this.dialogData.skill!.id, payload)
      : this.skillsService.createSkill(payload);

    request$.subscribe({
      next: (response) => {
        this.snackBar.open(
          this.isEditMode() ? 'Skill updated.' : 'Skill created.',
          'OK',
          { duration: 3000 },
        );
        this.dialogRef.close(response.data);
      },
      error: () => {
        this.snackBar.open('Failed to save skill. Please try again.', 'Dismiss', { duration: 5000 });
        this.isSaving.set(false);
      },
    });
  }
}
