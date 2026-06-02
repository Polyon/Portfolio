import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Experience } from '../../../../../core/models/experience.model';
import { formatDate, getSkillColor } from '../../../utils/utils';

/** Avatar background palette — deterministic per company name. */
const AVATAR_PALETTE = [
  '#7C3AED', '#2563EB', '#DC2626', '#059669',
  '#D97706', '#DB2777', '#0891B2', '#65A30D',
];

@Component({
  selector: 'app-experience-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="dialog-container">

      <!-- ── Header ── -->
      <div class="dialog-header">
        <div class="header-left">
          @if (data.companyLogoUrl && !logoError) {
            <img
              [src]="data.companyLogoUrl"
              [alt]="data.company + ' logo'"
              class="company-avatar company-avatar--img"
              loading="lazy"
              (error)="logoError = true"
            />
          } @else {
            <div class="company-avatar" [style.background]="avatarColor" aria-hidden="true">
              {{ companyInitial }}
            </div>
          }
          <div class="company-info">
            <span class="company-name">{{ data.company }}</span>
            @if (data.location) {
              <span class="company-location">
                <mat-icon inline aria-hidden="true">location_on</mat-icon>
                {{ data.location }}
              </span>
            }
          </div>
        </div>
        <button mat-icon-button class="close-btn" (click)="close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── Job title + meta ── -->
      <div class="job-section">
        <h2 class="job-title">{{ data.jobTitle }}</h2>
        <div class="meta-row">
          @if (data.employmentType) {
            <span class="meta-chip">
              <mat-icon inline aria-hidden="true">work_outline</mat-icon>
              {{ data.employmentType | titlecase }}
            </span>
          }
          @if (data.isCurrentPosition) {
            <span class="current-badge">Current</span>
          }
          <span class="date-range">
            <mat-icon inline aria-hidden="true">calendar_today</mat-icon>
            {{ startDateFormatted }} – {{ endDateFormatted }}
          </span>
        </div>
      </div>

      <hr class="divider" />

      <!-- ── Description ── -->
      @if (data.description) {
        <div class="section">
          <h4 class="section-label">Responsibilities</h4>
          <div class="description" [innerHTML]="data.description"></div>
        </div>
      }

      <!-- ── Skills ── -->
      @if (data.skills && data.skills.length > 0) {
        <div class="section">
          <h4 class="section-label">Skills</h4>
          <mat-chip-set>
            @for (skill of data.skills; track skill.id) {
              <mat-chip
                class="skill-chip"
                [style.--chip-color]="getChipColor(skill.category)"
                disableRipple
                [attr.aria-label]="skill.name"
              >
                {{ skill.name }}
              </mat-chip>
            }
          </mat-chip-set>
        </div>
      }

    </div>
  `,
  styles: [`
    .dialog-container {
      background: transparent;
      padding: 1.5rem;
      color: rgba(255, 255, 255, 0.88);
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .company-avatar {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      user-select: none;

      &--img {
        object-fit: contain;
        background: rgba(255, 255, 255, 0.08);
      }
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      padding-top: 2px;
    }

    .company-name {
      font-size: 1rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.2;
    }

    .company-location {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.42);

      mat-icon {
        font-size: 0.85rem;
        width: 0.85rem;
        height: 0.85rem;
      }
    }

    .close-btn {
      flex-shrink: 0;
      margin: -6px -8px 0 0;
      color: rgba(255, 255, 255, 0.35) !important;

      &:hover {
        color: rgba(255, 255, 255, 0.8) !important;
        background: rgba(255, 255, 255, 0.07) !important;
      }
    }

    .job-section {
      margin-bottom: 1.25rem;
    }

    .job-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.6rem;
      line-height: 1.3;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.38);

      mat-icon {
        font-size: 0.85rem;
        width: 0.85rem;
        height: 0.85rem;
      }
    }

    .current-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.12em 0.55em;
      border-radius: 20px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(0, 217, 255, 0.12);
      color: #00d9ff;
      border: 1px solid rgba(0, 217, 255, 0.28);
    }

    .date-range {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.74rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #e8570a;
      margin-left: auto;

      mat-icon {
        font-size: 0.85rem;
        width: 0.85rem;
        height: 0.85rem;
      }
    }

    mat-divider {
      border-color: rgba(255, 255, 255, 0.08) !important;
      margin-bottom: 1.25rem;
    }

    .divider {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin: 0 0 1.25rem;
    }

    .section {
      margin-bottom: 1.25rem;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .section-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.35);
      margin: 0 0 0.65rem;
    }

    .description {
      font-size: 0.875rem;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.65);

      ::ng-deep p { margin: 0; }
      ::ng-deep br { display: block; content: ''; margin-top: 0.35rem; }
    }

    .skill-chip {
      font-size: 0.72rem !important;
      height: 24px !important;
      min-height: 24px !important;
      background: color-mix(in srgb, var(--chip-color, #00d9ff) 12%, transparent) !important;
      color: var(--chip-color, #00d9ff) !important;
      border: 1px solid color-mix(in srgb, var(--chip-color, #00d9ff) 30%, transparent) !important;
    }
  `],
})
export class ExperienceDetailDialogComponent {
  logoError = false;

  constructor(
    private dialogRef: MatDialogRef<ExperienceDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Experience,
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  get companyInitial(): string {
    return this.data.company?.charAt(0).toUpperCase() ?? '?';
  }

  get avatarColor(): string {
    const hash = this.data.company
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  get startDateFormatted(): string {
    return formatDate(this.data.startDate);
  }

  get endDateFormatted(): string {
    return this.data.isCurrentPosition ? 'Present' : formatDate(this.data.endDate);
  }

  getChipColor(category: string): string {
    return getSkillColor(category as any);
  }
}
