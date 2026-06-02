import { Component, OnInit, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplateDescriptor,
  QueryType,
} from '../../../../shared/models/contact-inbox.models';
import { TemplatePreviewComponent } from '../template-preview/template-preview.component';

/**
 * Admin page listing all email template descriptors.
 *
 * On initialisation the component fetches all templates from
 * `EmailTemplateService.listTemplates()` and renders them in a `MatTable`.
 *
 * Clicking a row selects that template and opens the embedded
 * `TemplatePreviewComponent` panel beneath the table.
 */
@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    TemplatePreviewComponent,
  ],
  template: `
    <div class="tl-page">

      <!-- Repository card -->
      <div class="tl-card">

        <!-- Card header -->
        <div class="tl-card__header">
          <h2 class="tl-card__title">Template Repository</h2>
          <div class="tl-header-right">
            <!-- Query type filter dropdown -->
            <div class="tl-filter">
              <button
                class="tl-filter__btn"
                type="button"
                (click)="filterOpen = !filterOpen"
                [class.tl-filter__btn--active]="queryTypeFilter() !== ''"
                aria-haspopup="listbox"
                [attr.aria-expanded]="filterOpen"
              >
                <mat-icon class="tl-filter__icon">filter_list</mat-icon>
                <span class="tl-filter__label">{{ queryTypeFilter() === '' ? 'All types' : queryTypeFilter() === 'SERVICE' ? 'Service' : 'General' }}</span>
                <mat-icon class="tl-filter__chevron" [class.tl-filter__chevron--open]="filterOpen">expand_more</mat-icon>
              </button>
              <div class="tl-filter__menu" *ngIf="filterOpen" role="listbox">
                <button class="tl-filter__option" [class.tl-filter__option--active]="queryTypeFilter() === ''"        type="button" (click)="queryTypeFilter.set('');        filterOpen = false" role="option">All types</button>
                <button class="tl-filter__option" [class.tl-filter__option--active]="queryTypeFilter() === 'SERVICE'" type="button" (click)="queryTypeFilter.set('SERVICE'); filterOpen = false" role="option">Service</button>
                <button class="tl-filter__option" [class.tl-filter__option--active]="queryTypeFilter() === 'GENERAL'" type="button" (click)="queryTypeFilter.set('GENERAL'); filterOpen = false" role="option">General</button>
              </div>
            </div>
            <div class="tl-badges">
              <span class="tl-badge tl-badge--active">{{ activeCount() }} ACTIVE</span>
              <span class="tl-badge tl-badge--draft">{{ draftCount() }} DRAFTS</span>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="tl-state">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Loading templates…</span>
        </div>

        <!-- Error -->
        <div *ngIf="loadError()" class="tl-state tl-state--error" role="alert">
          <mat-icon>error_outline</mat-icon>
          <span>{{ loadError() }}</span>
        </div>

        <!-- Table -->
        <div *ngIf="!isLoading() && !loadError()" class="tl-table-wrap" role="region" aria-label="Email templates">
          <table class="tl-table" role="table">
            <thead>
              <tr>
                <th class="tl-th">Template Name</th>
                <th class="tl-th">Query Type</th>
                <th class="tl-th">Recipient</th>
                <th class="tl-th">Description</th>
                <th class="tl-th tl-th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let row of filteredTemplates()"
                class="tl-tr"
                [class.tl-tr--selected]="selectedTemplate() === row"
                (click)="selectTemplate(row)"
                tabindex="0"
                (keydown.enter)="selectTemplate(row)"
                (keydown.space)="$event.preventDefault(); selectTemplate(row)"
                [attr.aria-selected]="selectedTemplate() === row"
                role="row"
              >
                <td class="tl-td tl-td--name">{{ row.name }}</td>
                <td class="tl-td">
                  <span
                    class="tl-chip"
                    [class.tl-chip--service]="row.queryType === QueryType.SERVICE"
                    [class.tl-chip--general]="row.queryType === QueryType.GENERAL"
                  >{{ row.queryType === QueryType.SERVICE ? 'Service' : 'General' }}</span>
                </td>
                <td class="tl-td tl-td--role">{{ row.recipientRole }}</td>
                <td class="tl-td tl-td--desc">{{ row.description }}</td>
                <td class="tl-td tl-td--actions">
                  <button
                    class="tl-action-btn"
                    [class.tl-action-btn--active]="selectedTemplate() === row"
                    (click)="$event.stopPropagation(); selectTemplate(row)"
                    [matTooltip]="selectedTemplate() === row ? 'Viewing' : 'Preview'"
                    aria-label="Preview template"
                    type="button"
                  >
                    <mat-icon>{{ selectedTemplate() === row ? 'visibility' : 'edit' }}</mat-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredTemplates().length === 0">
                <td class="tl-td tl-td--empty" colspan="5">No templates match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Configuration + Preview split -->
      <app-template-preview
        [template]="selectedTemplate()"
      ></app-template-preview>

    </div>
  `,
  styles: [`
    /* ── Page shell ─────────────────────────────────────────────────── */
    .tl-page {
      padding: 0 0 48px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Repository card ────────────────────────────────────────────── */
    .tl-card {
      margin: 0 28px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      overflow: hidden;
    }

    .tl-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
      gap: 12px;
    }

    .tl-card__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
    }

    .tl-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* ── Query type filter dropdown ─────────────────────────────────── */
    .tl-filter {
      position: relative;
    }

    .tl-filter__btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 6px 10px 6px 10px;
      color: rgba(255,255,255,0.65);
      font-size: 0.83rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
      white-space: nowrap;

      &:hover {
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.9);
      }
    }

    .tl-filter__btn--active {
      background: rgba(67,97,238,0.12) !important;
      border-color: rgba(67,97,238,0.35) !important;
      color: #818cf8 !important;
    }

    .tl-filter__icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.6;
      flex-shrink: 0;
    }

    .tl-filter__label {
      font-size: 0.83rem;
    }

    .tl-filter__chevron {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.45;
      transition: transform 150ms ease;
      flex-shrink: 0;
    }

    .tl-filter__chevron--open {
      transform: rotate(180deg);
    }

    .tl-filter__menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 130px;
      background: #1c1e2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      overflow: hidden;
      z-index: 100;
    }

    .tl-filter__option {
      display: block;
      width: 100%;
      padding: 9px 16px;
      background: transparent;
      border: none;
      text-align: left;
      color: rgba(255,255,255,0.65);
      font-size: 0.83rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;

      &:hover {
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.95);
      }
    }

    .tl-filter__option--active {
      color: #818cf8;
      background: rgba(67,97,238,0.12);
      font-weight: 600;
    }

    .tl-badges { display: flex; gap: 8px; }

    .tl-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 3px 10px;
      border-radius: 20px;
    }

    .tl-badge--active {
      background: rgba(0,217,255,0.12);
      color: #00d9ff;
      border: 1px solid rgba(0,217,255,0.25);
    }

    .tl-badge--draft {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.5);
      border: 1px solid rgba(255,255,255,0.12);
    }

    /* ── Loading / Error ───────────────────────────────────────────── */
    .tl-state {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 32px 24px;
      color: rgba(255,255,255,0.45);
      font-size: 0.9rem;
    }

    .tl-state--error { color: #f87171; }

    /* ── Table ──────────────────────────────────────────────────────── */
    .tl-table-wrap { overflow-x: auto; }

    .tl-table {
      width: 100%;
      border-collapse: collapse;
    }

    .tl-th {
      padding: 10px 20px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      white-space: nowrap;
    }

    .tl-th--actions { text-align: right; }

    .tl-tr {
      cursor: pointer;
      transition: background 120ms ease;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      &:last-child { border-bottom: none; }

      &:hover { background: rgba(255,255,255,0.04); }

      &:focus-visible {
        outline: 2px solid rgba(0,217,255,0.5);
        outline-offset: -2px;
      }
    }

    .tl-tr--selected {
      background: rgba(67,97,238,0.1) !important;
      border-left: 3px solid #4361ee;
    }

    .tl-td {
      padding: 14px 20px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.7);
      vertical-align: middle;
    }

    .tl-td--name {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.88);
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .tl-td--role {
      font-weight: 600;
      font-size: 0.78rem;
      letter-spacing: 0.05em;
      color: rgba(255,255,255,0.55);
    }

    .tl-td--desc { color: rgba(255,255,255,0.45); font-size: 0.82rem; }

    .tl-td--actions { text-align: right; }

    .tl-td--empty {
      text-align: center;
      padding: 32px;
      color: rgba(255,255,255,0.25);
      font-style: italic;
    }

    /* ── Chip ───────────────────────────────────────────────────────── */
    .tl-chip {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .tl-chip--service {
      background: rgba(0,209,255,0.15);
      color: #38bdf8;
      border: 1px solid rgba(56,189,248,0.25);
    }

    .tl-chip--general {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.55);
      border: 1px solid rgba(255,255,255,0.12);
    }

    /* ── Action button ──────────────────────────────────────────────── */
    .tl-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: background 150ms ease, color 150ms ease;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &:hover {
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.9);
      }
    }

    .tl-action-btn--active {
      background: rgba(67,97,238,0.25) !important;
      color: #818cf8 !important;
      border-color: rgba(67,97,238,0.4) !important;
    }
  `],
})
export class TemplateListComponent implements OnInit {
  private readonly templateService = inject(EmailTemplateService);
  private readonly el = inject(ElementRef);

  /** Close the filter menu when clicking outside the component. */
  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!target || !this.el.nativeElement.contains(target as Node)) {
      this.filterOpen = false;
    }
  }

  /** Expose enum to template. */
  readonly QueryType = QueryType;

  /** Table column identifiers. */
  readonly displayedColumns: string[] = ['name', 'queryType', 'recipientRole', 'description'];

  /** Reactive: the fetched template descriptors. */
  readonly templates = signal<EmailTemplateDescriptor[]>([]);

  /** Reactive: true while fetching. */
  readonly isLoading = signal<boolean>(false);

  /**
   * Reactive: error message from a failed fetch.
   * Null when no error has occurred.
   */
  readonly loadError = signal<string | null>(null);

  /**
   * Reactive: currently selected template descriptor shown in the preview panel.
   * Null when no row has been selected.
   */
  readonly selectedTemplate = signal<EmailTemplateDescriptor | null>(null);

  /** Whether the query-type filter menu is open. */
  filterOpen = false;

  /** Query type filter — signal so filteredTemplates() computed reacts to changes. */
  readonly queryTypeFilter = signal<'' | 'SERVICE' | 'GENERAL'>('');

  /** Filtered templates based on queryTypeFilter. */
  readonly filteredTemplates = computed(() => {
    const q = this.queryTypeFilter();
    if (!q) return this.templates();
    return this.templates().filter(t => t.queryType === q);
  });

  /** Count of non-draft templates. */
  readonly activeCount = computed(() => this.templates().length);

  /** Placeholder draft count — 0 until drafts are supported by the API. */
  readonly draftCount = computed(() => 0);

  /** @inheritdoc */
  ngOnInit(): void {
    this.isLoading.set(true);
    this.templateService.listTemplates().subscribe({
      next: res => {
        this.templates.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Failed to load email templates. Please refresh and try again.');
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Selects a template row and opens it in the preview panel.
   *
   * @param template - The descriptor of the row that was clicked.
   */
  selectTemplate(template: EmailTemplateDescriptor): void {
    this.selectedTemplate.set(template);
  }
}

