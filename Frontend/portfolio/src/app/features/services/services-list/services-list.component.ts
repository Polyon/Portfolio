import {
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ServicesService } from '../../../core/services/services.service';
import { Service, ServiceCategory, ServiceFilter } from '../../../core/models/service.model';
import { PaginationMetadata } from '../../../core/models/common.models';
import {
  ServiceFormComponent,
  ServiceDialogData,
} from '../service-form/service-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    DragDropModule,
  ],
  template: `
    <div class="services-list-container">
      <!-- Header -->
      <div class="list-header">
        <h2 class="list-title">Services</h2>
        <button class="add-btn" (click)="openAddDialog()">
          <mat-icon>add</mat-icon> Add Service
        </button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <!-- Search -->
        <div class="filter-search">
          <input class="filter-input" [formControl]="filterForm.controls.search" placeholder="Search" />
          <mat-icon class="filter-search-icon">search</mat-icon>
        </div>

        <!-- Category custom dropdown -->
        <div class="filter-dropdown" (click)="$event.stopPropagation()">
          <button class="filter-trigger" (click)="toggleCategoryDropdown()">
            <span>{{ selectedCategoryLabel }}</span>
            <mat-icon [class.rotated]="categoryDropdownOpen()">keyboard_arrow_down</mat-icon>
          </button>
          <div class="dropdown-panel" *ngIf="categoryDropdownOpen()">
            <button class="dropdown-item" [class.active]="filterForm.controls.category.value === ''" (click)="selectCategory('')">All Categories</button>
            <button class="dropdown-item" *ngFor="let cat of categories" [class.active]="filterForm.controls.category.value === cat.value" (click)="selectCategory(cat.value)">{{ cat.label }}</button>
          </div>
        </div>

        <!-- Reset filters -->
        <button class="filter-icon-btn" matTooltip="Reset filters" (click)="resetFilters()">
          <mat-icon>tune</mat-icon>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- Service Cards -->
      <div
        *ngIf="!isLoading()"
        class="services-grid"
        cdkDropList
        (cdkDropListDropped)="onReorder($event)"
      >
        <div
          *ngFor="let service of services()"
          cdkDrag
          class="service-card"
        >
          <div class="card-body">
            <p class="card-title">{{ service.name }}</p>
            <div class="card-meta">
              <span
                class="category-badge"
                [ngClass]="getCategoryClass(service.category)"
              >{{ service.category }}</span>
              <span
                class="visibility-dot"
                [class.active]="service.isPublished"
                [matTooltip]="service.isPublished ? 'Published' : 'Unpublished'"
              >
                <mat-icon>{{ service.isPublished ? 'visibility' : 'visibility_off' }}</mat-icon>
              </span>
            </div>
            <p class="card-description">{{ service.description }}</p>
          </div>

          <div class="card-actions">
            <button
              class="action-btn edit-btn"
              matTooltip="Edit"
              (click)="openEditDialog(service)"
            >
              <mat-icon>edit</mat-icon>
            </button>
            <button
              class="action-btn delete-btn"
              matTooltip="Delete"
              (click)="confirmDelete(service)"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <div *ngIf="services().length === 0" class="empty-state">
          <mat-icon>build_circle</mat-icon>
          <p>No services yet. Add your first service using the button above.</p>
        </div>
      </div>

      <!-- Pagination bar -->
      <div *ngIf="!isLoading() && (pagination()?.total ?? 0) > 0" class="pagination-bar">
        <span class="page-label">Items per page:</span>
        <mat-select
          class="page-size-select"
          [value]="pageSize()"
          (selectionChange)="onPageSizeChange($event.value)"
          panelClass="dark-select-panel"
        >
          <mat-option [value]="10">10</mat-option>
          <mat-option [value]="20">20</mat-option>
          <mat-option [value]="50">50</mat-option>
        </mat-select>

        <span class="page-range">{{ pageRangeLabel() }}</span>

        <button
          class="page-nav-btn"
          [disabled]="currentPage() === 0"
          (click)="prevPage()"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button
          class="page-nav-btn"
          [disabled]="!hasNextPage()"
          (click)="nextPage()"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── Container ─────────────────────────────────────────────────────────── */
    .services-list-container { padding: 0; display: flex; flex-direction: column; gap: 20px; }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .list-header { display: flex; justify-content: space-between; align-items: center; }
    .list-title { margin: 0; font-size: 26px; font-weight: 600; color: #e0e0e0; }
    .add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: #00D9FF; color: #0D1B2A;
      border: none; border-radius: 8px;
      padding: 8px 18px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .add-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .add-btn:hover { background: #33e4ff; }

    /* ── Filter bar ─────────────────────────────────────────── */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 0;
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

    /* Category dropdown */
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
      min-width: 170px;
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
    .dropdown-item.active { background: rgba(0,217,255,0.1); color: #00D9FF; }

    /* Reset icon btn */
    .filter-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      margin-left: 12px;
      cursor: pointer;
      color: rgba(255,255,255,0.55);
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .filter-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .filter-icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ── Grid ───────────────────────────────────────────────────────────────── */
    .loading-overlay { display: flex; justify-content: center; padding: 48px; }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 1200px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px)  { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .services-grid { grid-template-columns: 1fr; } }

    /* ── Service Card ───────────────────────────────────────────────────────── */
    .service-card {
      background: rgba(10, 20, 38, 0.9);
      border: 1px solid rgba(0, 217, 255, 0.15);
      border-radius: 10px;
      display: flex; flex-direction: column;
      transition: box-shadow 0.2s, border-color 0.2s;
      cursor: default;
    }
    .service-card:hover {
      box-shadow: 0 4px 24px rgba(0, 217, 255, 0.12);
      border-color: rgba(0, 217, 255, 0.3);
    }
    .card-body { flex: 1; padding: 16px 16px 10px; display: flex; flex-direction: column; gap: 8px; }
    .card-title { margin: 0; font-size: 15px; font-weight: 600; color: #e0e0e0; line-height: 1.3; }

    .card-meta { display: flex; align-items: center; gap: 8px; }
    .category-badge {
      border-radius: 4px; padding: 2px 8px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
      white-space: nowrap; text-transform: uppercase;
    }
    /* Category colours */
    .cat-backend  { background: rgba(30,58,100,0.8); color: #60a5fa; }
    .cat-frontend { background: rgba(60,30,90,0.8);  color: #c084fc; }
    .cat-fullstack{ background: rgba(15,50,70,0.8);  color: #38bdf8; }
    .cat-devops   { background: rgba(20,50,30,0.8);  color: #4ade80; }
    .cat-ai       { background: rgba(10,55,45,0.8);  color: #34d399; }
    .cat-consult  { background: rgba(20,60,20,0.8);  color: #86efac; }
    .cat-training { background: rgba(60,35,10,0.8);  color: #fb923c; }
    .cat-other    { background: rgba(35,35,55,0.8);  color: #94a3b8; }

    .visibility-dot {
      display: flex; align-items: center;
      color: rgba(255,255,255,0.25);
      transition: color 0.2s;
    }
    .visibility-dot.active { color: #4ade80; }
    .visibility-dot mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .card-description {
      margin: 0; font-size: 13px; color: rgba(255,255,255,0.55);
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      line-height: 1.5;
    }

    .card-actions {
      padding: 8px 12px 12px;
      display: flex; align-items: center; gap: 4px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .action-btn {
      background: transparent; border: none;
      border-radius: 6px; padding: 6px;
      cursor: pointer; display: flex; align-items: center;
      transition: background 0.2s, color 0.2s;
    }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .edit-btn   { color: #00D9FF; }
    .delete-btn { color: #f87171; }
    .edit-btn:hover   { background: rgba(0,217,255,0.1); }
    .delete-btn:hover { background: rgba(248,113,113,0.1); }

    /* ── Empty state ─────────────────────────────────────────────────────────── */
    .empty-state {
      grid-column: 1/-1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 56px; color: rgba(255,255,255,0.35); gap: 8px;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    /* ── Pagination bar ──────────────────────────────────────────────────────── */
    .pagination-bar {
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 12px 4px;
    }
    .page-label { font-size: 13px; color: rgba(255,255,255,0.5); white-space: nowrap; }
    .page-size-select { width: 60px; font-size: 13px; color: #e0e0e0; }
    ::ng-deep .page-size-select .mat-mdc-select-value { color: #e0e0e0; }
    .page-range { font-size: 13px; color: rgba(255,255,255,0.6); white-space: nowrap; min-width: 80px; text-align: center; }
    .page-nav-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px; width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: rgba(255,255,255,0.7);
      transition: background 0.2s, color 0.2s;
    }
    .page-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-nav-btn:not(:disabled):hover { background: rgba(0,217,255,0.1); color: #00D9FF; }
    .page-nav-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ── CDK drag ────────────────────────────────────────────────────────────── */
    .cdk-drag-preview { box-sizing: border-box; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,217,255,0.2); }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 200ms cubic-bezier(0,0,0.2,1); }
  `],
})
export class ServicesListComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  services = signal<Service[]>([]);
  pagination = signal<PaginationMetadata | null>(null);
  isLoading = signal(false);
  currentPage = signal(0);
  pageSize = signal(10);
  categoryDropdownOpen = signal(false);

  @HostListener('document:click')
  closeDropdowns(): void {
    this.categoryDropdownOpen.set(false);
  }

  filterForm = this.fb.nonNullable.group({
    search: [''],
    category: [''],
  });

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
    this.loadServices();
    this.filterForm.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadServices();
      });
  }

  /** Opens the add service dialog. */
  openAddDialog(): void {
    const dialogRef = this.dialog.open<ServiceFormComponent, ServiceDialogData, Service | null>(
      ServiceFormComponent,
      { data: {}, width: '600px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadServices();
    });
  }

  /** Opens the edit service dialog. */
  openEditDialog(service: Service): void {
    const dialogRef = this.dialog.open<ServiceFormComponent, ServiceDialogData, Service | null>(
      ServiceFormComponent,
      { data: { service }, width: '600px', maxHeight: '90vh', disableClose: true, panelClass: 'glass-dialog' },
    );
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadServices();
    });
  }

  /** Prompts before deleting a service. */
  confirmDelete(service: Service): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete Service',
          message: `Are you sure you want to delete "${service.name}"? This cannot be undone.`,
          confirmText: 'Delete',
        },
      },
    );
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteService(service);
    });
  }

  /** Resets all filters to defaults. */
  resetFilters(): void {
    this.filterForm.reset({ search: '', category: '' });
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update(v => !v);
  }

  selectCategory(value: string): void {
    this.filterForm.controls.category.setValue(value);
    this.categoryDropdownOpen.set(false);
  }

  get selectedCategoryLabel(): string {
    const v = this.filterForm.controls.category.value;
    return this.categories.find(c => c.value === v)?.label ?? 'All Categories';
  }

  /** Returns the CSS class for a category badge. */
  getCategoryClass(category: ServiceCategory): string {
    const map: Record<ServiceCategory, string> = {
      [ServiceCategory.BACKEND_DEV]:  'cat-backend',
      [ServiceCategory.FRONTEND_DEV]: 'cat-frontend',
      [ServiceCategory.FULLSTACK]:    'cat-fullstack',
      [ServiceCategory.DEVOPS]:       'cat-devops',
      [ServiceCategory.AI_INTEGRATION]: 'cat-ai',
      [ServiceCategory.CONSULTING]:   'cat-consult',
      [ServiceCategory.TRAINING]:     'cat-training',
      [ServiceCategory.OTHER]:        'cat-other',
    };
    return map[category] ?? 'cat-other';
  }

  /** Returns the "X - Y of Z" page range label. */
  pageRangeLabel(): string {
    const total = this.pagination()?.total ?? 0;
    const size  = this.pageSize();
    const page  = this.currentPage();
    const start = page * size + 1;
    const end   = Math.min(start + size - 1, total);
    return `${start} - ${end} of ${total}`;
  }

  /** Returns true if there is a next page. */
  hasNextPage(): boolean {
    const total = this.pagination()?.total ?? 0;
    return (this.currentPage() + 1) * this.pageSize() < total;
  }

  /** Navigate to the previous page. */
  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadServices();
    }
  }

  /** Navigate to the next page. */
  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update(p => p + 1);
      this.loadServices();
    }
  }

  /** Updates page size and resets to first page. */
  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
    this.loadServices();
  }

  /**
   * Handles drag-and-drop reordering of services.
   * Persists the new display order to the backend.
   *
   * @param event - CDK drag drop event.
   */
  onReorder(event: CdkDragDrop<Service[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const reordered = [...this.services()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.services.set(reordered);

    const orderedIds = reordered.map((s) => s.id);
    this.servicesService.updateDisplayOrder(orderedIds).subscribe({
      error: () => {
        // Revert on failure
        this.loadServices();
        this.snackBar.open('Failed to save new order.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  /** Loads the services list applying current filters and pagination. */
  private loadServices(): void {
    this.isLoading.set(true);
    const { search, category } = this.filterForm.getRawValue();
    const filters: ServiceFilter = {
      page: this.currentPage() + 1,
      limit: this.pageSize(),
      search: search || undefined,
      category: (category as ServiceCategory) || undefined,
    };

    this.servicesService.getServices(filters).subscribe({
      next: (res) => {
        this.services.set(res.data ?? []);
        this.pagination.set(res.pagination ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load services.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  /** Performs the delete request after confirmation. */
  private deleteService(service: Service): void {
    this.servicesService.deleteService(service.id).subscribe({
      next: () => {
        this.snackBar.open('Service deleted.', 'Dismiss', { duration: 3000 });
        this.loadServices();
      },
      error: () => {
        this.snackBar.open('Failed to delete service.', 'Dismiss', {
          duration: 4000,
          panelClass: 'error-snackbar',
        });
      },
    });
  }
}
