import {
  Component,
  Input,
  ChangeDetectionStrategy,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Project } from '../../../../../core/models/project.model';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { RichTextComponent } from '../../../../../shared/components/rich-text/rich-text.component';
import { getSkillColor } from '../../../utils/utils';

/**
 * Presentational card for a single portfolio project.
 *
 * Renders project name, short description, status badge, tech chips and
 * corner-pinned action elements. A "View project" button in the bottom-left
 * opens an inline detail popup overlay with full project info and links.
 */
@Component({
  selector: 'app-project-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule, StatusBadgeComponent, RichTextComponent],
  providers: [DatePipe],
  template: `
    <article
      class="project-card"
      [class.featured]="project.isFeatured"
      [attr.aria-label]="project.name + (project.isFeatured ? ' (Featured)' : '')"
    >

      <!-- Status badge — top-right corner -->
      <div class="corner-status" aria-label="Project status">
        <app-status-badge [status]="project.status" />
      </div>

      <!-- Card header row: thumbnail + name -->
      <div class="card-header">
        <div class="card-thumb" aria-hidden="true">
          @if (thumbUrl()) {
            <img
              [src]="thumbUrl()"
              [alt]=""
              class="thumb-img"
              loading="eager"
              (error)="onThumbError()"
            />
          } @else {
            <div class="thumb-placeholder">
              <span class="thumb-initials">{{ projectInitials() }}</span>
            </div>
          }
        </div>

        <div class="card-header-text">
          <h3 class="project-name">{{ project.name }}</h3>
          @if (project.isFeatured) {
            <span class="card-featured-badge" aria-label="Featured project">
              <mat-icon aria-hidden="true">star</mat-icon>
              Featured
            </span>
          }
        </div>
      </div>

      <!-- Description -->
      @if (project.shortDescription) {
        <p class="project-description">{{ project.shortDescription }}</p>
      }

      <!-- Technology chips -->
      @if (project.skills && project.skills.length > 0) {
        <div class="tech-tags" aria-label="Technologies used">
          <mat-chip-set aria-label="Technologies">
            @for (skill of project.skills!.slice(0, MAX_VISIBLE_SKILLS); track skill.id) {
              <mat-chip
                class="tech-chip"
                [style.--chip-color]="getChipColor(skill.category)"
                disableRipple
                [attr.aria-label]="skill.name"
              >{{ skill.name }}</mat-chip>
            }
            @if (project.skills!.length > MAX_VISIBLE_SKILLS) {
              <mat-chip class="tech-chip more-chip" disableRipple
                [matTooltip]="remainingSkillNames()"
                aria-label="More technologies">
                +{{ project.skills!.length - MAX_VISIBLE_SKILLS }}
              </mat-chip>
            }
          </mat-chip-set>
        </div>
      }

      <!-- Secondary action (View Code) — inline, low-prominence -->
      @if (project.repositoryUrl) {
        <a
          [href]="project.repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="code-link"
          [attr.aria-label]="'View source code: ' + project.name"
        >
          <mat-icon aria-hidden="true">code</mat-icon>
          View Code
        </a>
      }

      <div class="card-footer-spacer" aria-hidden="true"></div>

      <!-- Footer: View project button (right-aligned) -->
      <div class="card-footer">
        <button
          class="card-view-btn"
          type="button"
          (click)="openPopup()"
          [attr.aria-label]="'View details: ' + project.name"
          [attr.aria-expanded]="popupOpen()"
          aria-haspopup="dialog"
        >
          <mat-icon aria-hidden="true">open_in_new</mat-icon>
          View project
        </button>
      </div>

    </article>

    <!-- ─── Project detail popup ────────────────────────────────────────────── -->
    @if (popupOpen()) {
      <div
        class="popup-backdrop"
        role="presentation"
        (click)="closePopup()"
      ></div>

      <div
        class="popup-panel"
        role="dialog"
        [attr.aria-label]="project.name + ' details'"
        aria-modal="true"
      >
        <!-- Close button -->
        <button
          mat-icon-button
          class="popup-close-btn"
          type="button"
          (click)="closePopup()"
          aria-label="Close project details"
        >
          <mat-icon>close</mat-icon>
        </button>

        <!-- Image carousel / placeholder -->
        <div class="popup-image-wrap">
          @if (allImages().length > 0) {
            <!-- Sliding carousel track -->
            <div
              class="carousel-track"
              [style.transform]="'translateX(-' + activeImageIndex() * 100 + '%'"
            >
              @for (img of allImages(); track $index) {
                <div class="carousel-slide">
                  @if (!failedImageIndices().has($index)) {
                    <img
                      [src]="img"
                      [alt]="project.name + ' – image ' + ($index + 1)"
                      class="popup-image"
                      loading="eager"
                      (error)="onPopupImageError($index)"
                    />
                  } @else {
                    <div class="popup-image-placeholder">
                      <mat-icon aria-hidden="true">broken_image</mat-icon>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Arrows + dots (only when > 1 image) -->
            @if (allImages().length > 1) {
              <button
                class="carousel-arrow carousel-arrow-prev"
                type="button"
                (click)="prevImage()"
                aria-label="Previous image"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>
              <button
                class="carousel-arrow carousel-arrow-next"
                type="button"
                (click)="nextImage()"
                aria-label="Next image"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>
              <div class="carousel-dots" role="tablist" aria-label="Image navigation">
                @for (img of allImages(); track $index) {
                  <button
                    type="button"
                    role="tab"
                    class="carousel-dot"
                    [class.active]="$index === activeImageIndex()"
                    (click)="goToImage($index)"
                    [attr.aria-label]="'Image ' + ($index + 1)"
                    [attr.aria-selected]="$index === activeImageIndex()"
                  ></button>
                }
              </div>
            }
          } @else {
            <!-- No images: show project name -->
            <div class="popup-image-placeholder popup-no-image">
              <span class="no-image-project-name">{{ project.name }}</span>
            </div>
          }
        </div>

        <!-- Popup content -->
        <div class="popup-body">

          <!-- Title row: name + date range badge -->
          <div class="popup-header">
            <h2 class="popup-title">{{ project.name }}</h2>
            @if (project.startDate) {
              <span class="popup-date-badge" aria-label="Project timeline">
                {{ formatDate(project.startDate) }}
                @if (project.completionDate) {
                  &nbsp;&ndash;&nbsp;{{ formatDate(project.completionDate) }}
                } @else {
                  &nbsp;&ndash;&nbsp;Present
                }
              </span>
            }
          </div>

          <!-- Overview -->
          @if (project.description || project.shortDescription) {
            <div class="popup-section">
              <h3 class="popup-section-label">Overview</h3>
              @if (project.description) {
                <app-rich-text
                  [content]="project.description"
                  ariaLabel="Project description for {{ project.name }}"
                ></app-rich-text>
              } @else {
                <p class="popup-description">{{ project.shortDescription }}</p>
              }
            </div>
          }

          <!-- Tech Stack -->
          @if (project.skills && project.skills.length > 0) {
            <div class="popup-section">
              <h3 class="popup-section-label">Tech Stack</h3>
              <div class="popup-tech-tags" aria-label="Technologies used">
                <mat-chip-set>
                  @for (skill of project.skills; track skill.id) {
                    <mat-chip
                      class="tech-chip"
                      [style.--chip-color]="getChipColor(skill.category)"
                      disableRipple
                      [attr.aria-label]="skill.name"
                    >{{ skill.name }}</mat-chip>
                  }
                </mat-chip-set>
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="popup-actions">
            @if (project.liveUrl) {
              <a
                class="popup-primary-btn"
                [href]="project.liveUrl"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="'View live demo: ' + project.name"
              >
                <mat-icon aria-hidden="true">open_in_new</mat-icon>
                Live Demo
              </a>
            }
            @if (project.repositoryUrl) {
              <a
                class="popup-secondary-btn"
                [href]="project.repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="'View GitHub repository: ' + project.name"
              >
                <svg class="github-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.79 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
            }
          </div>

        </div>
      </div>
    }
  `,
  styleUrl: './project-card.component.scss',
})
export class ProjectCardComponent {
  /** Project record to display. */
  @Input({ required: true }) project!: Project;

  /** Maximum skill chips on the card (all are shown in the popup). */
  readonly MAX_VISIBLE_SKILLS = 4;

  constructor(private readonly datePipe: DatePipe) {}

  /** Whether the detail popup is open. */
  protected readonly popupOpen = signal(false);

  /** Active gallery image index (used by the popup gallery). */
  protected readonly activeImageIndex = signal(0);

  /**
   * Set of image indices that failed to load (per-slot tracking so one bad URL
   * does not hide the rest of the gallery).
   */
  protected readonly failedImageIndices = signal(new Set<number>());

  /**
   * All CDN image URLs for this project, de-duplicated.
   * The backend stores all images in `images[]`; `imageUrl` is a legacy/optional
   * field that is not included in the public API response.
   */
  protected readonly allImages = computed((): string[] => {
    const urls: string[] = [];
    // Prefer images[] (populated by admin gallery upload)
    if (this.project.images?.length) {
      for (const img of this.project.images) {
        if (img && !urls.includes(img)) urls.push(img);
      }
    }
    // Fall back to imageUrl if present (e.g. legacy records)
    if (this.project.imageUrl && !urls.includes(this.project.imageUrl)) {
      urls.push(this.project.imageUrl);
    }
    return urls;
  });

  /** Two-letter initials derived from the project name (used in thumbnail placeholder). */
  protected readonly projectInitials = computed((): string => {
    const words = this.project.name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  });

  /**
   * Index of the image currently shown as the card thumbnail.
   * This advances when an image fails to load, so each failure tries the next.
   */
  protected readonly thumbImageIndex = computed((): number => {
    const imgs = this.allImages();
    const failed = this.failedImageIndices();
    const idx = imgs.findIndex((_, i) => !failed.has(i));
    return idx; // -1 when all failed
  });

  /**
   * URL for the thumbnail shown on the card face.
   * Returns the first non-failed image URL, or null if none available.
   */
  protected readonly thumbUrl = computed((): string | null => {
    const idx = this.thumbImageIndex();
    return idx >= 0 ? this.allImages()[idx] : null;
  });

  openPopup(): void {
    this.activeImageIndex.set(0);
    this.popupOpen.set(true);
  }

  closePopup(): void {
    this.popupOpen.set(false);
  }

  /** Close popup on Escape key press. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.popupOpen()) this.closePopup();
  }

  prevImage(): void {
    const len = this.allImages().length;
    this.activeImageIndex.update((i) => (i - 1 + len) % len);
  }

  nextImage(): void {
    const len = this.allImages().length;
    this.activeImageIndex.update((i) => (i + 1) % len);
  }

  goToImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  /** Mark the card thumbnail as failed so thumbUrl() advances to the next image. */
  onThumbError(): void {
    const idx = this.thumbImageIndex();
    if (idx >= 0) {
      this.failedImageIndices.update((s) => new Set([...s, idx]));
    }
  }

  /** Mark a specific popup gallery image index as failed. */
  onPopupImageError(index: number): void {
    this.failedImageIndices.update((s) => new Set([...s, index]));
  }

  remainingSkillNames(): string {
    if (!this.project.skills) return '';
    return this.project.skills
      .slice(this.MAX_VISIBLE_SKILLS)
      .map((s) => s.name)
      .join(', ');
  }

  getChipColor(category: string): string {
    return getSkillColor(category as any);
  }

  /** Format an ISO date string to "MMM yyyy" (e.g. "Jan 2023"). */
  formatDate(dateStr: string): string {
    return this.datePipe.transform(dateStr, 'MMM yyyy') ?? dateStr;
  }
}
