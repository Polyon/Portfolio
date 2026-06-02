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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { SkillsService } from '../../../core/services/skills.service';
import { Skill, SkillCategory, SkillFilter } from '../../../core/models/skill.model';
import { PaginationMetadata } from '../../../core/models/common.models';
import { SkillFormComponent, SkillDialogData } from '../skill-form/skill-form.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-skills-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="skills-list-container">
      <!-- Header -->
      <div class="list-header">
        <h2 class="list-title">Manage Portfolio Skills</h2>
        <button class="add-btn" mat-flat-button (click)="openAddDialog()">
          <mat-icon>add</mat-icon> Add Skill
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-pill">
        <!-- Search -->
        <div class="pill-search">
          <mat-icon class="pill-search-icon">search</mat-icon>
          <input class="pill-input" [formControl]="filterForm.controls.search" placeholder="Search skills" />
        </div>

        <!-- Divider -->
        <span class="pill-divider"></span>

        <!-- Category dropdown -->
        <div class="pill-dropdown" (click)="$event.stopPropagation()">
          <button class="pill-trigger" (click)="toggleCategory()">
            <span>{{ selectedCategoryLabel }}</span>
            <mat-icon [class.rotated]="categoryOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="dropdown-panel" *ngIf="categoryOpen()">
            <button class="dropdown-item" [class.active]="filterForm.controls.category.value === ''" (click)="selectCategory('')">All categories</button>
            <button class="dropdown-item" *ngFor="let cat of categories" [class.active]="filterForm.controls.category.value === cat.value" (click)="selectCategory(cat.value)">{{ cat.label }}</button>
          </div>
        </div>

        <!-- Divider -->
        <span class="pill-divider"></span>

        <!-- Proficiency dropdown -->
        <div class="pill-dropdown" (click)="$event.stopPropagation()">
          <button class="pill-trigger" (click)="toggleProficiency()">
            <span>{{ selectedProficiencyLabel }}</span>
            <mat-icon [class.rotated]="proficiencyOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="dropdown-panel" *ngIf="proficiencyOpen()">
            <button class="dropdown-item" [class.active]="filterForm.controls.proficiency.value === 0" (click)="selectProficiency(0)">Experience level</button>
            <button class="dropdown-item" *ngFor="let lvl of proficiencyLevels" [class.active]="filterForm.controls.proficiency.value === lvl.value" (click)="selectProficiency(lvl.value)">{{ lvl.label }}</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Table -->
      <div *ngIf="!isLoading()" class="table-wrapper">
        <table mat-table [dataSource]="skills()" class="skills-table">

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let skill">{{ skill.name }}</td>
          </ng-container>

          <!-- Category Column -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Category</th>
            <td mat-cell *matCellDef="let skill">
              <span class="category-pill"
                [style.background-color]="getCategoryBg(skill.category)"
                [style.color]="getCategoryFg(skill.category)">
                {{ getCategoryLabel(skill.category) }}
              </span>
            </td>
          </ng-container>

          <!-- Proficiency Column -->
          <ng-container matColumnDef="proficiencyLevel">
            <th mat-header-cell *matHeaderCellDef>Proficiency</th>
            <td mat-cell *matCellDef="let skill">
              <div class="proficiency-stars" [attr.aria-label]="skill.proficiencyLevel + ' out of 5'">
                <mat-icon *ngFor="let i of [1,2,3,4,5]"
                  [class.filled]="i <= skill.proficiencyLevel"
                  class="star-icon">
                  {{ i <= skill.proficiencyLevel ? 'star' : 'star_border' }}
                </mat-icon>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="isPublished">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let skill">
              <div class="status-cell">
                <span class="status-label" [class.published]="skill.isPublished">
                  {{ skill.isPublished ? 'Published' : 'Draft' }}
                </span>
                <mat-slide-toggle
                  [checked]="skill.isPublished"
                  (change)="togglePublished(skill)"
                  color="primary"
                  aria-label="Toggle published status">
                </mat-slide-toggle>
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">Actions</th>
            <td mat-cell *matCellDef="let skill" class="actions-cell">
              <button mat-icon-button class="action-edit" matTooltip="Edit" (click)="openEditDialog(skill)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button class="action-delete" matTooltip="Delete" (click)="confirmDelete(skill)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="skill-row"></tr>

          <!-- Empty state -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data-cell" [attr.colspan]="displayedColumns.length">
              No skills found. Add your first skill using the button above.
            </td>
          </tr>
        </table>

      </div>

      <!-- Custom paginator -->
      <div *ngIf="!isLoading() && (pagination()?.total ?? 0) > 0" class="paginator-row">
        <span class="paginator-label">Items per page:</span>

        <div class="pager-size-wrap" (click)="$event.stopPropagation()">
          <button class="pager-size-trigger" (click)="toggleSizeDropdown()">
            {{ pageSize() }}<mat-icon [class.rotated]="sizeDropdownOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="pager-dropdown-panel" *ngIf="sizeDropdownOpen()">
            <button class="pager-dropdown-item" *ngFor="let s of pageSizeOptions"
              [class.active]="pageSize() === s" (click)="changePageSize(s)">{{ s }}</button>
          </div>
        </div>

        <span class="paginator-info">
          {{ currentPage() * pageSize() + 1 }} – {{ min((currentPage() + 1) * pageSize(), pagination()?.total ?? 0) }} of {{ pagination()?.total ?? 0 }}
        </span>

        <button class="pager-btn" [disabled]="currentPage() <= 0" (click)="goToPage(currentPage() - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button class="pager-btn" [disabled]="(currentPage() + 1) * pageSize() >= (pagination()?.total ?? 0)" (click)="goToPage(currentPage() + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .skills-list-container { padding: 0; }

    /* ── Header ─────────────────────────────────────────────── */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }
    .list-title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.3px;
    }
    .add-btn {
      background: #3b82f6;
      color: #fff;
      border-radius: 8px;
      font-weight: 500;
      padding: 0 18px;
      height: 38px;
      line-height: 38px;
    }
    .add-btn mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px; }

    /* ── Filter pill bar ──────────────────────────────────── */
    .filters-pill {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
      background: #1a1f2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 40px;
      padding: 0 20px;
      min-height: 48px;
      gap: 0;
    }

    /* Search section */
    .pill-search {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .pill-search-icon {
      color: rgba(255,255,255,0.35);
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .pill-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      font-family: inherit;
      min-width: 0;
    }
    .pill-input::placeholder { color: rgba(255,255,255,0.3); }

    /* Divider */
    .pill-divider {
      width: 1px;
      height: 22px;
      background: rgba(255,255,255,0.12);
      margin: 0 16px;
      flex-shrink: 0;
    }

    /* Custom dropdown */
    .pill-dropdown { position: relative; }
    .pill-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      padding: 0;
    }
    .pill-trigger mat-icon {
      color: rgba(255,255,255,0.45);
      font-size: 18px;
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
    }
    .pill-trigger mat-icon.rotated { transform: rotate(180deg); }
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 16px);
      left: 50%;
      transform: translateX(-50%);
      background: #161c2d;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      min-width: 170px;
      z-index: 200;
      overflow: hidden;
      padding: 4px 0;
    }
    .dropdown-item {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      padding: 10px 18px;
      color: rgba(255,255,255,0.78);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .dropdown-item.active { background: rgba(59,130,246,0.15); color: #60a5fa; }

    /* ── Loading ────────────────────────────────────────────── */
    .loading-overlay { display: flex; justify-content: center; padding: 56px; }

    /* ── Table wrapper ──────────────────────────────────────── */
    .table-wrapper {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }
    .skills-table { width: 100%; min-width: 560px; background: transparent; }

    /* Header row */
    .skills-table th.mat-header-cell {
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.55);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 12px 16px;
    }

    /* Data rows */
    .skills-table td.mat-cell {
      border-bottom: 1px solid rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.88);
      font-size: 14px;
      padding: 14px 16px;
    }
    .skill-row:last-child td.mat-cell { border-bottom: none; }
    .skill-row:hover td.mat-cell { background: rgba(255,255,255,0.04); }

    /* ── Category pill ──────────────────────────────────────── */
    .category-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* ── Stars ──────────────────────────────────────────────── */
    .proficiency-stars { display: flex; gap: 2px; align-items: center; }
    .star-icon { font-size: 18px; width: 18px; height: 18px; color: rgba(255,255,255,0.2); }
    .star-icon.filled { color: #00D9FF; }

    /* ── Status cell ────────────────────────────────────────── */
    .status-cell { display: flex; align-items: center; gap: 10px; }
    .status-label {
      font-size: 13px;
      color: rgba(255,255,255,0.4);
      min-width: 60px;
    }
    .status-label.published { color: rgba(255,255,255,0.85); }

    /* ── Actions ────────────────────────────────────────────── */
    .actions-header, .actions-cell { text-align: right; white-space: nowrap; }
    .action-edit { color: rgba(255,255,255,0.65); }
    .action-edit:hover { color: #fff; }
    .action-delete { color: #ef4444; }
    .action-delete:hover { color: #fca5a5; }

    /* ── Empty state ────────────────────────────────────────── */
    .no-data-cell { text-align: center; padding: 40px; color: rgba(255,255,255,0.35); }

    /* ── Custom paginator ───────────────────────────────────── */
    .paginator-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
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
  `],
})
export class SkillsListComponent implements OnInit {
  private skillsService = inject(SkillsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  skills = signal<Skill[]>([]);
  pagination = signal<PaginationMetadata | null>(null);
  isLoading = signal(false);
  currentPage = signal(0);
  pageSize = signal(10);
  categoryOpen = signal(false);
  proficiencyOpen = signal(false);
  sizeDropdownOpen = signal(false);

  readonly pageSizeOptions = [10, 25, 50];

  @HostListener('document:click')
  closeDropdowns(): void {
    this.categoryOpen.set(false);
    this.proficiencyOpen.set(false);
    this.sizeDropdownOpen.set(false);
  }

  toggleSizeDropdown(): void {
    this.sizeDropdownOpen.update(v => !v);
    this.categoryOpen.set(false);
    this.proficiencyOpen.set(false);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
    this.sizeDropdownOpen.set(false);
    this.loadSkills();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadSkills();
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  toggleCategory(): void {
    this.categoryOpen.update(v => !v);
    this.proficiencyOpen.set(false);
  }

  toggleProficiency(): void {
    this.proficiencyOpen.update(v => !v);
    this.categoryOpen.set(false);
  }

  selectCategory(value: string): void {
    this.filterForm.controls.category.setValue(value);
    this.categoryOpen.set(false);
  }

  selectProficiency(value: number): void {
    this.filterForm.controls.proficiency.setValue(value);
    this.proficiencyOpen.set(false);
  }

  get selectedCategoryLabel(): string {
    const v = this.filterForm.controls.category.value;
    return this.categories.find(c => c.value === v)?.label ?? 'All categories';
  }

  get selectedProficiencyLabel(): string {
    const v = this.filterForm.controls.proficiency.value;
    return v ? (this.proficiencyLevels.find(l => l.value === v)?.label ?? 'Experience level') : 'Experience level';
  }

  displayedColumns = ['name', 'category', 'proficiencyLevel', 'isPublished', 'actions'];

  filterForm = this.fb.nonNullable.group({
    search: [''],
    category: [''],
    proficiency: [0],
  });

  readonly proficiencyLevels: Array<{ value: number; label: string }> = [
    { value: 1, label: '★ Beginner' },
    { value: 2, label: '★★ Elementary' },
    { value: 3, label: '★★★ Intermediate' },
    { value: 4, label: '★★★★ Advanced' },
    { value: 5, label: '★★★★★ Expert' },
  ];

  readonly categories: Array<{ value: SkillCategory; label: string }> = [
    { value: SkillCategory.BACKEND, label: 'Backend' },
    { value: SkillCategory.FRONTEND, label: 'Frontend' },
    { value: SkillCategory.DEVOPS, label: 'DevOps' },
    { value: SkillCategory.AI, label: 'AI / ML' },
    { value: SkillCategory.DATABASE, label: 'Database' },
    { value: SkillCategory.OTHER, label: 'Other' },
  ];

  ngOnInit(): void {
    this.loadSkills();
    this.filterForm.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadSkills();
    });
  }

  /** Opens the add skill dialog. */
  openAddDialog(): void {
    const dialogRef = this.dialog.open<SkillFormComponent, SkillDialogData, Skill | null>(
      SkillFormComponent,
      { data: {}, width: '540px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSkills();
    });
  }

  /** Opens the edit skill dialog pre-populated with existing data. */
  openEditDialog(skill: Skill): void {
    const dialogRef = this.dialog.open<SkillFormComponent, SkillDialogData, Skill | null>(
      SkillFormComponent,
      { data: { skill }, width: '540px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSkills();
    });
  }

  /** Prompts the user before deleting a skill. */
  confirmDelete(skill: Skill): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete Skill',
          message: `Are you sure you want to delete "${skill.name}"? This cannot be undone.`,
          confirmText: 'Delete',
        },
      },
    );
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteSkill(skill);
    });
  }

  /** Resets all filters to their default values. */
  resetFilters(): void {
    this.filterForm.reset({ search: '', category: '', proficiency: 0 });
  }

  /**
   * Returns a short uppercase label for a skill category.
   */
  getCategoryLabel(category: SkillCategory): string {
    const map: Record<SkillCategory, string> = {
      [SkillCategory.BACKEND]: 'BACKEND',
      [SkillCategory.FRONTEND]: 'FRONTEND',
      [SkillCategory.DEVOPS]: 'DEVOPS',
      [SkillCategory.AI]: 'AI',
      [SkillCategory.DATABASE]: 'DATABASE',
      [SkillCategory.OTHER]: 'OTHER',
    };
    return map[category] ?? category;
  }

  /**
   * Returns the background colour for a category pill.
   */
  getCategoryBg(category: SkillCategory): string {
    const map: Record<SkillCategory, string> = {
      [SkillCategory.BACKEND]: 'rgba(37,99,235,0.25)',
      [SkillCategory.FRONTEND]: 'rgba(124,58,237,0.25)',
      [SkillCategory.DEVOPS]: 'rgba(5,150,105,0.25)',
      [SkillCategory.AI]: 'rgba(234,88,12,0.25)',
      [SkillCategory.DATABASE]: 'rgba(96,165,250,0.25)',
      [SkillCategory.OTHER]: 'rgba(100,116,139,0.25)',
    };
    return map[category] ?? 'rgba(100,116,139,0.25)';
  }

  /**
   * Returns the text colour for a category pill.
   */
  getCategoryFg(category: SkillCategory): string {
    const map: Record<SkillCategory, string> = {
      [SkillCategory.BACKEND]: '#60a5fa',
      [SkillCategory.FRONTEND]: '#c084fc',
      [SkillCategory.DEVOPS]: '#34d399',
      [SkillCategory.AI]: '#fb923c',
      [SkillCategory.DATABASE]: '#818cf8',
      [SkillCategory.OTHER]: '#94a3b8',
    };
    return map[category] ?? '#94a3b8';
  }

  /** Toggles the published state of a skill inline. */
  togglePublished(skill: Skill): void {
    const updated = { ...skill, isPublished: !skill.isPublished };
    this.skillsService.updateSkill(skill.id, { isPublished: updated.isPublished }).subscribe({
      next: () => this.loadSkills(),
      error: () => this.snackBar.open('Failed to update status.', 'Dismiss', { duration: 5000 }),
    });
  }

  private loadSkills(): void {
    this.isLoading.set(true);
    const { search, category, proficiency } = this.filterForm.getRawValue();
    const filters: SkillFilter = {
      page: this.currentPage() + 1,
      limit: this.pageSize(),
      search: search || undefined,
      category: (category as SkillCategory) || undefined,
      proficiencyLevel: proficiency || undefined,
    };

    this.skillsService.getSkills(filters).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        const minLevel = Number(proficiency) || 0;
        const data = minLevel > 0
          ? response.data.filter(s => s.proficiencyLevel >= minLevel)
          : response.data;
        this.skills.set(data);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load skills.', 'Dismiss', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  private deleteSkill(skill: Skill): void {
    this.skillsService.deleteSkill(skill.id).subscribe({
      next: () => {
        this.snackBar.open(`"${skill.name}" deleted.`, 'OK', { duration: 3000 });
        this.loadSkills();
      },
      error: () => {
        this.snackBar.open('Failed to delete skill.', 'Dismiss', { duration: 5000 });
      },
    });
  }
}
