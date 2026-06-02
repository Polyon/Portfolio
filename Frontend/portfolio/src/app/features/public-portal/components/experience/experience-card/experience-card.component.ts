import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Experience } from '../../../../../core/models/experience.model';
import { formatDate, calculateTenure } from '../../../utils/utils';
import { ExperienceDetailDialogComponent } from './experience-detail-dialog.component';

/** Avatar background palette — deterministic per company name. */
const AVATAR_PALETTE = [
  '#7C3AED', '#2563EB', '#DC2626', '#059669',
  '#D97706', '#DB2777', '#0891B2', '#65A30D',
];

/**
 * Presentational card for a single work-experience entry.
 *
 * Layout mirrors a job-listing card: colored company avatar → company name +
 * location → three-dot menu → job title → description → employment type.
 */
@Component({
  selector: 'app-experience-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  template: `
    <article class="experience-card" [class.current-role]="experience.isCurrentPosition">

      <!-- ── Header: avatar + company info + menu ── -->
      <div class="card-header">

        <!-- Company avatar -->
        @if (experience.companyLogoUrl && !logoError) {
          <img
            [src]="experience.companyLogoUrl"
            [alt]="experience.company + ' logo'"
            class="company-avatar company-avatar--img"
            loading="lazy"
            (error)="logoError = true"
          />
        } @else {
          <div class="company-avatar" [style.background]="avatarColor" aria-hidden="true">
            {{ companyInitial }}
          </div>
        }

        <!-- Company name + location -->
        <div class="company-info">
          <span class="company-name">{{ experience.company }}</span>
          @if (experience.location) {
            <span class="company-location">
              <mat-icon inline aria-hidden="true">location_on</mat-icon>
              {{ experience.location }}
            </span>
          }
        </div>

        <!-- Details button -->
        <button
          mat-icon-button
          class="details-btn"
          (click)="openDetails()"
          aria-label="View full details"
          title="Details"
        >
          <mat-icon>open_in_new</mat-icon>
        </button>
      </div>

      <!-- ── Job title ── -->
      <h3 class="job-title">{{ experience.jobTitle }}</h3>

      <!-- ── Footer: employment type + current badge + tenure ── -->
      <div class="card-footer">
        @if (experience.employmentType) {
          <span class="employment-type">{{ experience.employmentType }}</span>
        }
        @if (experience.isCurrentPosition) {
          <span class="current-badge" aria-label="Current position">Current</span>
        }
        <span class="date-range" aria-label="Employment period">
          {{ startDateFormatted }} – {{ endDateFormatted }}
        </span>
      </div>

    </article>
  `,
  styleUrl: './experience-card.component.scss',
})
export class ExperienceCardComponent {
  /** Full experience record to display. */
  @Input({ required: true }) experience!: Experience;

  /** Track logo load errors to fall back to initial avatar. */
  logoError = false;

  constructor(private dialog: MatDialog) {}

  /** Opens the full-detail dialog for this experience entry. */
  openDetails(): void {
    this.dialog.open(ExperienceDetailDialogComponent, {
      data: this.experience,
      panelClass: 'glass-dialog',
      backdropClass: 'glass-dialog-backdrop',
      maxWidth: '600px',
      width: '90vw',
    });
  }

  /** First letter of the company name for the avatar. */
  get companyInitial(): string {
    return this.experience.company?.charAt(0).toUpperCase() ?? '?';
  }

  /** Deterministic avatar background color derived from the company name. */
  get avatarColor(): string {
    const hash = this.experience.company
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  /** Formatted start date string. */
  get startDateFormatted(): string {
    return formatDate(this.experience.startDate);
  }

  /** Formatted end date string — "Present" when it is the current role. */
  get endDateFormatted(): string {
    return this.experience.isCurrentPosition ? 'Present' : formatDate(this.experience.endDate);
  }

}
