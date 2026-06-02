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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ProjectsService } from '../../../core/services/projects.service';
import { Project, ProjectStatus, ProjectFilter } from '../../../core/models/project.model';
import { PaginationMetadata } from '../../../core/models/common.models';
import { ProjectFormComponent, ProjectDialogData } from '../project-form/project-form.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-projects-list',
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
    MatSlideToggleModule,
    DragDropModule,
    StatusBadgeComponent,
  ],
  template: `
    <div class="projects-list-container">

      <!-- Header -->
      <div class="list-header">
        <h2 class="list-title">Projects</h2>
        <button class="add-btn" mat-flat-button (click)="openAddDialog()">
          <mat-icon>add</mat-icon> Add Project
        </button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <!-- Search -->
        <div class="filter-search">
          <input class="filter-input" [formControl]="filterForm.controls.search" placeholder="Search" />
          <mat-icon class="filter-search-icon">search</mat-icon>
        </div>

        <!-- Status custom dropdown -->
        <div class="filter-dropdown" (click)="$event.stopPropagation()">
          <button class="filter-trigger" (click)="toggleStatusDropdown()">
            <span>{{ selectedStatusLabel }}</span>
            <mat-icon [class.rotated]="statusDropdownOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="dropdown-panel" *ngIf="statusDropdownOpen()">
            <button class="dropdown-item" [class.active]="filterForm.controls.status.value === ''" (click)="selectStatus('')">All Statuses</button>
            <button class="dropdown-item" *ngFor="let s of statuses" [class.active]="filterForm.controls.status.value === s.value" (click)="selectStatus(s.value)">{{ s.label }}</button>
          </div>
        </div>

        <!-- Featured toggle -->
        <div class="filter-toggle-wrap">
          <mat-slide-toggle [formControl]="filterForm.controls.featuredOnly" color="accent" class="featured-toggle">
            Featured only
          </mat-slide-toggle>
        </div>

        <!-- Sort/filter icon -->
        <button class="filter-icon-btn" matTooltip="Reset filters" (click)="resetFilters()">
          <mat-icon>tune</mat-icon>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Grid + Paginator wrapper -->
      <div class="grid-pager-wrap">

      <!-- Project Cards Grid -->
      <div *ngIf="!isLoading()" class="projects-grid"
           cdkDropList (cdkDropListDropped)="onFeaturedReorder($event)">

        <div *ngFor="let project of projects()"
             cdkDrag [cdkDragDisabled]="!project.isFeatured"
             class="project-card" [class.featured]="project.isFeatured">

          <!-- Glass image thumbnail -->
          <div class="card-thumb">
            <img *ngIf="project.imageUrl" [src]="project.imageUrl" [alt]="project.name" class="thumb-img" />
            <div *ngIf="!project.imageUrl" class="thumb-placeholder" [attr.data-status]="project.status">
              <span class="thumb-initials">{{ project.name | slice:0:2 | uppercase }}</span>
            </div>
          </div>

          <!-- Card info -->
          <div class="card-info">
            <div class="card-title-row">
              <span class="card-title">{{ project.name }}</span>
              <mat-icon *ngIf="project.isFeatured" class="star-icon">star</mat-icon>
              <app-status-badge [status]="project.status"></app-status-badge>
            </div>

            <p class="card-desc">{{ project.shortDescription }}</p>

            <!-- Skill chips -->
            <div class="skill-chips" *ngIf="project.skills && project.skills.length > 0">
              <span class="skill-chip" *ngFor="let skill of project.skills | slice:0:5">
                <span class="skill-dot" [style.background]="skillCategoryColor(skill.category)"></span>
                {{ skill.name }}
              </span>
              <span class="skill-chip skill-more" *ngIf="project.skills.length > 5">
                +{{ project.skills.length - 5 }}
              </span>
            </div>

            <!-- Actions -->
            <div class="card-actions">
              <button class="action-btn action-edit" matTooltip="Edit" (click)="openEditDialog(project)">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="action-btn action-delete" matTooltip="Delete" (click)="confirmDelete(project)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>

          <!-- Drag handle for featured -->
          <div *ngIf="project.isFeatured" cdkDragHandle class="drag-handle" matTooltip="Drag to reorder">
            <mat-icon>drag_indicator</mat-icon>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="projects().length === 0" class="empty-state">
          <mat-icon>work_outline</mat-icon>
          <p>No projects yet. Add your first project using the button above.</p>
        </div>
      </div>

      <!-- Paginator -->
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
          {{ currentPage() * pageSize() + 1 }} &ndash; {{ min((currentPage() + 1) * pageSize(), pagination()?.total ?? 0) }} of {{ pagination()?.total ?? 0 }}
        </span>

        <button class="pager-btn" [disabled]="currentPage() <= 0" (click)="goToPage(currentPage() - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button class="pager-btn" [disabled]="(currentPage() + 1) * pageSize() >= (pagination()?.total ?? 0)" (click)="goToPage(currentPage() + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      </div><!-- /grid-pager-wrap -->

    </div>
  `,
  styles: [`
    .projects-list-container {
      padding: 0;
      position: relative;
      padding-bottom: 60px;
    }

    /* ── Grid + paginator wrapper ───────────────────────────── */
    .grid-pager-wrap {
      position: relative;
    }

    /* ── Header ─────────────────────────────────────────────── */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .list-title { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
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
      gap: 0;
      margin-bottom: 24px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 0 14px;
      height: 50px;
    }
    .filter-search {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
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
    .filter-search-icon { color: rgba(255,255,255,0.3); font-size: 18px; width: 18px; height: 18px; }

    /* Status dropdown */
    .filter-dropdown {
      position: relative;
      border-left: 1px solid rgba(255,255,255,0.1);
      padding-left: 16px;
      margin-left: 12px;
    }
    .filter-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      outline: none;
      color: rgba(255,255,255,0.78);
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
      left: 0;
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

    /* Featured toggle */
    .filter-toggle-wrap {
      border-left: 1px solid rgba(255,255,255,0.1);
      padding-left: 16px;
      margin-left: 12px;
      display: flex;
      align-items: center;
    }
    .featured-toggle { font-size: 14px; }
    ::ng-deep .featured-toggle .mdc-label { color: rgba(255,255,255,0.75); font-size: 14px; }

    /* Filter icon btn */
    .filter-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      margin-left: 14px;
      flex-shrink: 0;
    }
    .filter-icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .filter-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

    /* ── Loading ────────────────────────────────────────────── */
    .loading-overlay { display: flex; justify-content: center; padding: 64px; }

    /* ── Project Cards Grid ─────────────────────────────────── */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .project-card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      padding: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
      cursor: default;
    }
    .project-card:hover {
      border-color: rgba(100,160,255,0.25);
      box-shadow: 0 0 28px rgba(80,130,255,0.12);
    }
    .project-card.featured {
      border-color: rgba(0,217,255,0.2);
    }

    /* Thumbnail */
    .card-thumb {
      width: 80px;
      height: 80px;
      min-width: 80px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 217, 255, 0.08);
    }
    .thumb-placeholder[data-status='Planning']    { background: rgba(150,150,150,0.15); }
    .thumb-placeholder[data-status='InProgress']  { background: rgba(255,193,7,0.12); }
    .thumb-placeholder[data-status='Completed']   { background: rgba(33,150,243,0.12); }
    .thumb-placeholder[data-status='Deployed']    { background: rgba(0,217,255,0.12); }
    .thumb-initials {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,0.55);
      user-select: none;
    }

    /* Card info */
    .card-info { flex: 1; min-width: 0; }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .card-title { font-size: 15px; font-weight: 600; color: #fff; }
    .star-icon { color: #F59E0B; font-size: 16px; width: 16px; height: 16px; }
    .card-desc {
      font-size: 13px;
      color: rgba(255,255,255,0.55);
      margin: 0 0 8px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Skill chips */
    .skill-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 10px;
    }
    .skill-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .skill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .skill-more {
      color: rgba(0,217,255,0.75);
      background: rgba(0,217,255,0.07);
      border-color: rgba(0,217,255,0.15);
    }

    /* Action buttons */
    .card-actions { display: flex; gap: 8px; }
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-edit { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }
    .action-edit:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .action-delete { background: rgba(239,68,68,0.12); color: #ef4444; }
    .action-delete:hover { background: rgba(239,68,68,0.22); color: #fca5a5; }

    /* Drag handle */
    .drag-handle { position: absolute; top: 8px; right: 8px; cursor: grab; color: rgba(255,255,255,0.25); }
    .drag-handle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Empty state */
    .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: rgba(255,255,255,0.3);
      gap: 10px;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    /* ── Paginator ───────────────────────────────────────────── */
    .paginator-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      position: absolute;
      bottom: -50px;
      right: 0;
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
export class ProjectsListComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  pagination = signal<PaginationMetadata | null>(null);
  isLoading = signal(false);
  currentPage = signal(0);
  pageSize = signal(9);
  statusDropdownOpen = signal(false);
  sizeDropdownOpen = signal(false);

  readonly pageSizeOptions = [9, 18, 36];

  @HostListener('document:click')
  closeDropdowns(): void {
    this.statusDropdownOpen.set(false);
    this.sizeDropdownOpen.set(false);
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen.update(v => !v);
    this.sizeDropdownOpen.set(false);
  }

  toggleSizeDropdown(): void {
    this.sizeDropdownOpen.update(v => !v);
    this.statusDropdownOpen.set(false);
  }

  selectStatus(value: string): void {
    this.filterForm.controls.status.setValue(value);
    this.statusDropdownOpen.set(false);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
    this.sizeDropdownOpen.set(false);
    this.loadProjects();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadProjects();
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  skillCategoryColor(category?: string): string {
    const map: Record<string, string> = {
      BACKEND: '#818cf8', FRONTEND: '#34d399', DEVOPS: '#fb923c',
      AI: '#f472b6', DATABASE: '#60a5fa', OTHER: '#94a3b8',
    };
    return map[category ?? ''] ?? '#94a3b8';
  }

  get selectedStatusLabel(): string {
    const v = this.filterForm.controls.status.value;
    return this.statuses.find(s => s.value === v)?.label ?? 'Status';
  }

  filterForm = this.fb.nonNullable.group({
    search: [''],
    status: [''],
    featuredOnly: [false],
  });

  readonly statuses = [
    { value: ProjectStatus.PLANNING, label: 'Planning' },
    { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
    { value: ProjectStatus.COMPLETED, label: 'Completed' },
    { value: ProjectStatus.DEPLOYED, label: 'Deployed' },
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.filterForm.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadProjects();
    });
  }

  /** Opens the add project dialog. */
  openAddDialog(): void {
    const dialogRef = this.dialog.open<ProjectFormComponent, ProjectDialogData, Project | null>(
      ProjectFormComponent,
      { data: {}, width: '640px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadProjects();
    });
  }

  /** Opens the edit project dialog. */
  openEditDialog(project: Project): void {
    const dialogRef = this.dialog.open<ProjectFormComponent, ProjectDialogData, Project | null>(
      ProjectFormComponent,
      { data: { project }, width: '640px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadProjects();
    });
  }

  /** Prompts before deleting a project. */
  confirmDelete(project: Project): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete Project',
          message: `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
          confirmText: 'Delete',
        },
      },
    );
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteProject(project);
    });
  }

  /** Resets all filters. */
  resetFilters(): void {
    this.filterForm.reset({ search: '', status: '', featuredOnly: false });
  }

  /**
   * Handles drag-and-drop reordering of featured projects.
   * Updates display order on the backend for each moved item.
   *
   * @param event - CDK drag drop event.
   */
  onFeaturedReorder(event: CdkDragDrop<Project[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.projects.update((list) => {
      const mutable = [...list];
      moveItemInArray(mutable, event.previousIndex, event.currentIndex);
      return mutable;
    });
    // Persist new display order for featured projects
    const featured = this.projects().filter((p) => p.isFeatured);
    featured.forEach((p, idx) => {
      this.projectsService
        .updateProject(p.id, { ...p, skillIds: p.skills?.map((s) => s.id) } as never)
        .subscribe();
    });
  }

  private loadProjects(): void {
    this.isLoading.set(true);
    const { search, status, featuredOnly } = this.filterForm.getRawValue();
    const filters: ProjectFilter = {
      page: this.currentPage() + 1,
      limit: this.pageSize(),
      search: search || undefined,
      status: (status as ProjectStatus) || undefined,
      featured: featuredOnly || undefined,
    };

    this.projectsService.getProjects(filters).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        // Featured projects first, then by display order
        const sorted = [...response.data].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.displayOrder - b.displayOrder;
        });
        this.projects.set(sorted);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load projects.', 'Dismiss', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  private deleteProject(project: Project): void {
    this.projectsService.deleteProject(project.id).subscribe({
      next: () => {
        this.snackBar.open(`"${project.name}" deleted.`, 'OK', { duration: 3000 });
        this.loadProjects();
      },
      error: () => {
        this.snackBar.open('Failed to delete project.', 'Dismiss', { duration: 5000 });
      },
    });
  }
}
