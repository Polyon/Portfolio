import {
  Component,
  inject,
  OnInit,
  signal,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ExperienceService } from '../../../core/services/experience.service';
import { Experience, EmploymentType, ExperienceFilter } from '../../../core/models/experience.model';
import { PaginationMetadata } from '../../../core/models/common.models';
import {
  ExperienceFormComponent,
  ExperienceDialogData,
} from '../experience-form/experience-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-experience-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="experience-list-container">

      <!-- Header -->
      <div class="list-header">
        <h2 class="list-title">Work Experience</h2>
        <button class="add-btn" mat-flat-button (click)="openAddDialog()">
          <mat-icon>add</mat-icon> Add Experience
        </button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <mat-icon class="filter-search-icon">search</mat-icon>
          <input class="filter-input" [formControl]="filterForm.controls.search" placeholder="Search company or title…" />
        </div>

        <!-- Employment Type custom dropdown -->
        <div class="filter-dropdown" (click)="$event.stopPropagation()">
          <div class="filter-field-wrap">
            <span class="filter-field-label">Employment Type</span>
            <button class="filter-trigger" (click)="toggleTypeDropdown()">
              <span>{{ selectedTypeLabel }}</span>
              <mat-icon [class.rotated]="typeDropdownOpen()">keyboard_arrow_down</mat-icon>
            </button>
          </div>
          <div class="dropdown-panel" *ngIf="typeDropdownOpen()">
            <button class="dropdown-item" [class.active]="filterForm.controls.employmentType.value === ''" (click)="selectType('')">All Types</button>
            <button class="dropdown-item" *ngFor="let et of employmentTypes" [class.active]="filterForm.controls.employmentType.value === et.value" (click)="selectType(et.value)">{{ et.label }}</button>
          </div>
        </div>

        <!-- Filter icon -->
        <button class="filter-icon-btn" matTooltip="Reset filters" (click)="resetFilters()">
          <mat-icon>filter_alt</mat-icon>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Experience Cards -->
      <div *ngIf="!isLoading()" class="experience-cards">
        <div *ngFor="let exp of experiences()" class="exp-card">

          <!-- Top-right actions -->
          <div class="card-actions">
            <button mat-icon-button class="action-edit" matTooltip="Edit" (click)="openEditDialog(exp)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button class="action-delete" matTooltip="Delete" (click)="confirmDelete(exp)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>

          <div class="card-body">
            <!-- Company icon -->
            <div class="company-icon">
              <img *ngIf="exp.companyLogoUrl" [src]="exp.companyLogoUrl" [alt]="exp.company" class="company-logo" />
              <mat-icon *ngIf="!exp.companyLogoUrl" class="company-placeholder-icon">business</mat-icon>
            </div>

            <!-- Content -->
            <div class="card-content">
              <h3 class="exp-title">{{ exp.jobTitle }} at {{ exp.company }}</h3>

              <p class="exp-meta">
                {{ exp.startDate | date:'MMM yyyy' }} –
                <span *ngIf="exp.isCurrentPosition; else endDate">Present</span>
                <ng-template #endDate>{{ exp.endDate ? (exp.endDate | date:'MMM yyyy') : '—' }}</ng-template>
                <span *ngIf="exp.location"> &nbsp;{{ exp.location }}</span>
              </p>

              <div class="badge-row">
                <span *ngIf="exp.employmentType" class="badge badge-type">{{ formatEmploymentType(exp.employmentType) }}</span>
                <span class="badge" [class.badge-published]="exp.isPublished" [class.badge-draft]="!exp.isPublished">
                  <mat-icon class="badge-icon">{{ exp.isPublished ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  {{ exp.isPublished ? 'Published' : 'Draft' }}
                </span>
              </div>

              <div *ngIf="exp.description" class="exp-description" [innerHTML]="sanitize(exp.description)"></div>

              <div *ngIf="exp.skills && exp.skills.length > 0" class="skills-row">
                <span class="skill-tag" *ngFor="let skill of exp.skills">
                  <span class="skill-dot" [style.background]="skillCategoryColor(skill.category)"></span>
                  {{ skill.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="experiences().length === 0" class="empty-state">
          <mat-icon>work_off</mat-icon>
          <p>No experience entries found. Add your first work experience!</p>
        </div>
      </div>

      <!-- Paginator -->
      <div *ngIf="!isLoading() && pagination().total > 0" class="paginator-row">
        <span class="paginator-label">Items per page:</span>

        <!-- Page size custom dropdown -->
        <div class="pager-size-wrap" (click)="$event.stopPropagation()">
          <button class="pager-size-trigger" (click)="toggleSizeDropdown()">
            {{ pagination().limit }}<mat-icon [class.rotated]="sizeDropdownOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="pager-dropdown-panel" *ngIf="sizeDropdownOpen()">
            <button class="pager-dropdown-item" *ngFor="let s of pageSizeOptions" [class.active]="pagination().limit === s" (click)="changePageSize(s)">{{ s }}</button>
          </div>
        </div>

        <span class="paginator-info">
          {{ (pagination().page - 1) * pagination().limit + 1 }} – {{ min(pagination().page * pagination().limit, pagination().total) }} of {{ pagination().total }}
        </span>
        <button class="pager-btn" [disabled]="pagination().page <= 1" (click)="loadExperiences(pagination().page - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button class="pager-btn" [disabled]="pagination().page >= pagination().totalPages" (click)="loadExperiences(pagination().page + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    .experience-list-container { padding: 0; }

    /* ── Header ─────────────────────────────────────────────── */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .list-title { margin: 0; font-size: 22px; font-weight: 600; color: #fff; }
    .add-btn {
      background: #3b82f6;
      color: #fff;
      border-radius: 8px;
      font-weight: 500;
      padding: 0 18px;
      height: 38px;
    }
    .add-btn mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px; }

    /* ── Filter bar ─────────────────────────────────────────── */
    .filter-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      margin-bottom: 20px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 0 14px;
      min-height: 52px;
    }
    .filter-search {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .filter-search-icon { color: rgba(255,255,255,0.3); font-size: 18px; width: 18px; height: 18px; }
    .filter-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      font-family: inherit;
    }
    .filter-input::placeholder { color: rgba(255,255,255,0.28); }

    /* Employment Type dropdown */
    .filter-dropdown {
      position: relative;
      border-left: 1px solid rgba(255,255,255,0.1);
      padding-left: 16px;
      margin-left: 12px;
    }
    .filter-field-wrap { display: flex; flex-direction: column; }
    .filter-field-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 1px; letter-spacing: 0.4px; text-transform: uppercase; }
    .filter-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      padding: 0;
    }
    .filter-trigger mat-icon { font-size: 18px; width: 18px; height: 18px; color: rgba(255,255,255,0.4); transition: transform 0.2s; }
    .filter-trigger mat-icon.rotated { transform: rotate(180deg); }

    .dropdown-panel {
      position: absolute;
      top: calc(100% + 14px);
      right: 0;
      background: #161c2d;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      min-width: 160px;
      z-index: 300;
      overflow: hidden;
      padding: 4px 0;
    }
    .dropdown-item {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      padding: 10px 18px;
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
    }
    .dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .dropdown-item.active { background: rgba(59,130,246,0.15); color: #60a5fa; }

    /* Filter icon button */
    .filter-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(59,130,246,0.15);
      border: none;
      border-radius: 8px;
      color: #60a5fa;
      cursor: pointer;
      margin-left: 12px;
      flex-shrink: 0;
    }
    .filter-icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .filter-icon-btn:hover { background: rgba(59,130,246,0.25); }

    /* ── Loading ────────────────────────────────────────────── */
    .loading-overlay { display: flex; justify-content: center; padding: 56px; }

    /* ── Experience Cards ───────────────────────────────────── */
    .experience-cards { display: flex; flex-direction: column; gap: 14px; }
    .exp-card {
      position: relative;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 20px 20px 20px 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .exp-card:hover {
      border-color: rgba(59,130,246,0.3);
      box-shadow: 0 4px 24px rgba(59,130,246,0.08);
    }

    /* Card top-right actions */
    .card-actions {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      gap: 2px;
    }
    .action-edit { color: rgba(255,255,255,0.55); }
    .action-edit:hover { color: #fff; }
    .action-delete { color: #ef4444; }
    .action-delete:hover { color: #fca5a5; }

    /* Card body */
    .card-body { display: flex; gap: 16px; align-items: flex-start; padding-right: 72px; }

    /* Company icon */
    .company-icon {
      width: 48px;
      height: 48px;
      min-width: 48px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .company-logo { width: 100%; height: 100%; object-fit: cover; }
    .company-placeholder-icon { color: rgba(255,255,255,0.35); font-size: 24px; width: 24px; height: 24px; }

    /* Content */
    .card-content { flex: 1; min-width: 0; }
    .exp-title { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #fff; }
    .exp-meta { margin: 0 0 10px; font-size: 13px; color: rgba(255,255,255,0.5); }

    /* Badges */
    .badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid transparent;
    }
    .badge-type { background: rgba(56,189,248,0.12); color: #38bdf8; border-color: rgba(56,189,248,0.2); }
    .badge-published { background: rgba(34,197,94,0.12); color: #4ade80; border-color: rgba(34,197,94,0.2); }
    .badge-draft { background: rgba(251,191,36,0.12); color: #fbbf24; border-color: rgba(251,191,36,0.2); }
    .badge-icon { font-size: 13px; width: 13px; height: 13px; }

    /* Description (rich-text rendered HTML) */
    .exp-description {
      margin: 8px 0 10px;
      font-size: 13px;
      color: rgba(255,255,255,0.65);
      line-height: 1.65;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    /* Strip CKEditor default paragraph margin inside the clamp box */
    .exp-description :is(p, ul, ol) { margin: 0 0 4px; padding: 0; }
    .exp-description ul, .exp-description ol { padding-left: 18px; }
    .exp-description li { margin-bottom: 2px; }
    .exp-description strong { color: rgba(255,255,255,0.9); }
    .exp-description em { color: rgba(255,255,255,0.75); }
    .exp-description a { color: #00D9FF; text-decoration: none; }
    .exp-description blockquote {
      margin: 4px 0;
      padding-left: 10px;
      border-left: 2px solid rgba(0,217,255,0.4);
      color: rgba(255,255,255,0.5);
    }

    /* Skill chips */
    .skills-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .skill-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(0,217,255,0.07);
      color: rgba(255,255,255,0.8);
      border: 1px solid rgba(0,217,255,0.18);
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
    .skill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Empty state */
    .empty-state { text-align: center; padding: 56px; color: rgba(255,255,255,0.3); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; margin-inline: auto; }

    /* ── Paginator ───────────────────────────────────────────── */
    .paginator-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
    }
    .paginator-label { white-space: nowrap; }
    .paginator-info { white-space: nowrap; }
    .pager-size-wrap { position: relative; }
    .pager-size-trigger {
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: rgba(255,255,255,0.75);
      font-size: 13px;
      font-family: inherit;
      padding: 3px 8px;
      cursor: pointer;
    }
    .pager-size-trigger mat-icon { font-size: 16px; width: 16px; height: 16px; transition: transform 0.2s; }
    .pager-size-trigger mat-icon.rotated { transform: rotate(180deg); }
    .pager-dropdown-panel {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      background: #161c2d;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      min-width: 60px;
      z-index: 300;
      overflow: hidden;
      padding: 4px 0;
    }
    .pager-dropdown-item {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      padding: 7px 14px;
      color: rgba(255,255,255,0.75);
      font-size: 13px;
      font-family: inherit;
      text-align: center;
      cursor: pointer;
    }
    .pager-dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .pager-dropdown-item.active { color: #60a5fa; }
    .pager-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      padding: 0;
    }
    .pager-btn:disabled { opacity: 0.3; cursor: default; }
    .pager-btn:not(:disabled):hover { background: rgba(255,255,255,0.1); color: #fff; }
    .pager-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    @media (max-width: 600px) {
      .filter-bar { padding: 8px 14px; border-radius: 10px; gap: 8px; }
      .filter-dropdown { border-left: none; padding-left: 0; margin-left: 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; width: 100%; }
    }
  `],
})
export class ExperienceListComponent implements OnInit {
  private experienceService = inject(ExperienceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  experiences = signal<Experience[]>([]);
  isLoading = signal(true);
  pagination = signal<PaginationMetadata>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  typeDropdownOpen = signal(false);
  sizeDropdownOpen = signal(false);

  readonly pageSizeOptions = [5, 10, 20];

  @HostListener('document:click')
  closeDropdowns(): void {
    this.typeDropdownOpen.set(false);
    this.sizeDropdownOpen.set(false);
  }

  toggleTypeDropdown(): void { this.typeDropdownOpen.update(v => !v); this.sizeDropdownOpen.set(false); }
  toggleSizeDropdown(): void { this.sizeDropdownOpen.update(v => !v); this.typeDropdownOpen.set(false); }

  selectType(value: string): void {
    this.filterForm.controls.employmentType.setValue(value);
    this.typeDropdownOpen.set(false);
  }

  changePageSize(size: number): void {
    this.pagination.update(p => ({ ...p, limit: size }));
    this.sizeDropdownOpen.set(false);
    this.loadExperiences(1);
  }

  get selectedTypeLabel(): string {
    const v = this.filterForm.controls.employmentType.value;
    return this.employmentTypes.find(e => e.value === v)?.label ?? 'All Types';
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  formatEmploymentType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  skillCategoryColor(category: string): string {
    const map: Record<string, string> = {
      BACKEND:  '#818cf8',
      FRONTEND: '#34d399',
      DEVOPS:   '#fb923c',
      AI:       '#f472b6',
      DATABASE: '#60a5fa',
      OTHER:    '#94a3b8',
    };
    return map[category] ?? '#94a3b8';
  }

  filterForm = this.fb.nonNullable.group({
    search: [''],
    employmentType: [''],
  });

  readonly employmentTypes: Array<{ value: EmploymentType; label: string }> = [
    { value: EmploymentType.FULL_TIME, label: 'Full-time' },
    { value: EmploymentType.PART_TIME, label: 'Part-time' },
    { value: EmploymentType.CONTRACT, label: 'Contract' },
    { value: EmploymentType.FREELANCE, label: 'Freelance' },
    { value: EmploymentType.INTERNSHIP, label: 'Internship' },
  ];

  ngOnInit(): void {
    this.filterForm.controls.search.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadExperiences(1));

    this.filterForm.controls.employmentType.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadExperiences(1));

    this.loadExperiences(1);
  }

  /** Loads experiences for the given page number. */
  loadExperiences(page: number): void {
    this.isLoading.set(true);
    const { search, employmentType } = this.filterForm.getRawValue();
    const filters: ExperienceFilter = {
      page,
      limit: this.pagination().limit,
      search: search || undefined,
      employmentType: employmentType ? (employmentType as EmploymentType) : undefined,
    };

    this.experienceService.getExperiences(filters).subscribe({
      next: (res) => {
        this.experiences.set(res.data);
        this.pagination.set(res.pagination);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load experience entries.', 'Dismiss', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  /** Resets all filter fields and reloads the list. */
  resetFilters(): void {
    this.filterForm.reset({}, { emitEvent: false });
    this.loadExperiences(1);
  }

  /** Opens the add-experience dialog. */
  openAddDialog(): void {
    const dialogRef = this.dialog.open<ExperienceFormComponent, ExperienceDialogData, Experience | null>(
      ExperienceFormComponent,
      { data: {}, width: '640px', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadExperiences(this.pagination().page);
    });
  }

  /**
   * Opens the edit-experience dialog pre-populated with the given entry.
   *
   * @param exp - Experience entry to edit.
   */
  openEditDialog(exp: Experience): void {
    const dialogRef = this.dialog.open<ExperienceFormComponent, ExperienceDialogData, Experience | null>(
      ExperienceFormComponent,
      { data: { experience: exp }, width: '640px', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadExperiences(this.pagination().page);
    });
  }

  /**
   * Asks for confirmation, then deletes the experience entry.
   *
   * @param exp - Experience entry to delete.
   */
  confirmDelete(exp: Experience): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete Experience',
          message: `Are you sure you want to delete the experience at "${exp.company}"? This action cannot be undone.`,
          confirmText: 'Delete',
        },
      },
    );

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.experienceService.deleteExperience(exp.id).subscribe({
        next: () => {
          this.snackBar.open('Experience deleted.', 'OK', { duration: 3000 });
          this.loadExperiences(this.pagination().page);
        },
        error: () => {
          this.snackBar.open('Failed to delete experience. Please try again.', 'Dismiss', { duration: 5000 });
        },
      });
    });
  }
}
