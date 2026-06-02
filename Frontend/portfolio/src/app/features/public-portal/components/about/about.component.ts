import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  PLATFORM_ID,
  ElementRef,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  trigger,
  style,
  animate,
  transition,
} from '@angular/animations';

import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';
import { ImageFallbackComponent } from '../../../../shared/components/image-fallback/image-fallback.component';
import { RichTextComponent } from '../../../../shared/components/rich-text/rich-text.component';

/** Extends Profile to include an optional CV URL not yet in the base model. */
interface PublicProfile extends Profile {
  cvUrl?: string;
}

/**
 * About Me section of the public portfolio portal.
 *
 * Displays biography text, a professional profile image, location info,
 * and an optional CV download button. Includes scroll-triggered slide-in
 * animations for both the text and image columns.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackComponent,
    RichTextComponent,
  ],
  animations: [
    // Text column slides in from the left on viewport entry
    trigger('slideInLeft', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateX(-50px)' }),
        animate(
          '600ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
    ]),
    // Image column slides in from the right on viewport entry
    trigger('slideInRight', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateX(50px)' }),
        animate(
          '600ms 150ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
    ]),
  ],
  template: `
    <section id="about" class="about-section" aria-labelledby="about-heading">

      <!-- Loading state -->
      @if (loading()) {
        <div class="about-loading" role="status" aria-label="Loading about information">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error state -->
      @if (error() && !loading()) {
        <div class="about-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load profile information. Please try again later.</span>
        </div>
      }

      <!-- About content -->
      @if (profile() && !loading()) {
        <div class="about-container">
          <!-- Section header -->
          <div class="about-header">
            <span class="section-eyebrow">Get to know me</span>
            <h2 id="about-heading" class="section-title">About Me</h2>
            <div class="section-divider" aria-hidden="true"></div>
          </div>

          <!-- Two-column content grid -->
          <div class="about-grid">

            <!-- Text column (left) -->
            <div
              class="about-text-col"
              [@slideInLeft]="animationState()"
              aria-live="polite">

              <app-rich-text
                [content]="profile()!.bio"
                ariaLabel="Biography" />

              <!-- Location row -->
              @if (locationText()) {
                <div class="about-location">
                  <mat-icon aria-hidden="true">location_on</mat-icon>
                  <span>{{ locationText() }}</span>
                </div>
              }

              <!-- CV download button (only when cvUrl exists) -->
              @if (profile()!.cvUrl) {
                <a
                  class="cv-button"
                  mat-stroked-button
                  [href]="profile()!.cvUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download CV (opens in new tab)">
                  <mat-icon aria-hidden="true">download</mat-icon>
                  Download CV
                </a>
              }
            </div>

            <!-- Image column (right) -->
            <div
              class="about-image-col"
              [@slideInRight]="animationState()">
              <div class="about-image-wrapper">
                <app-image-fallback
                  [src]="profile()!.profileImageUrl ?? ''"
                  [alt]="fullName() + ' professional photo'"
                  [size]="imageSize()" />
              </div>
            </div>

          </div>
        </div>
      }
    </section>
  `,
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnInit, OnDestroy {
  /** Current profile data loaded from the API. */
  protected readonly profile = signal<PublicProfile | null>(null);

  /** Loading state — true while the API call is in-flight. */
  protected readonly loading = signal<boolean>(true);

  /** Error state — true when the API call fails. */
  protected readonly error = signal<boolean>(false);

  /** Animation trigger value: 'hidden' → 'visible' on viewport entry. */
  protected readonly animationState = signal<'hidden' | 'visible'>('hidden');

  /** Responsive image size derived from viewport width. */
  protected readonly imageSize = signal<number>(280);

  private readonly destroy$ = new Subject<void>();
  private intersectionObserver: IntersectionObserver | null = null;

  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService = inject(SeoService);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.loadProfile();
    if (isPlatformBrowser(this.platformId)) {
      this.updateImageSize();
      this.setupScrollAnimation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  /**
   * Derived full name for use in image alt text and SEO.
   */
  protected fullName(): string {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  /**
   * Derived location string composed from the profile's location object.
   */
  protected locationText(): string {
    const loc = this.profile()?.location;
    if (!loc) return '';
    return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fetches the public profile from the backend API and applies SEO meta tags.
   */
  private loadProfile(): void {
    this.portfolioService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.profile.set(response.data);
            this.applySeo(response.data);
          } else {
            this.error.set(true);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /**
   * Applies page title, meta description, OG tags, and canonical URL
   * for the About section.
   *
   * @param profile - The loaded public profile.
   */
  private applySeo(profile: PublicProfile): void {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const title = `About ${fullName}`;
    const description = profile.bio
      ? profile.bio.slice(0, 160).trimEnd()
      : `Learn more about ${fullName} – professional background and expertise.`;

    this.seoService.setMeta(
      title,
      description,
      `${fullName}, about, biography, background`,
    );
    this.seoService.setOgTags(
      title,
      description,
      profile.profileImageUrl ?? '',
      `${environment.seo.siteUrl}#about`,
    );
    this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#about`);
  }

  /**
   * Sets up an IntersectionObserver to trigger the slide-in animation
   * once the section enters the viewport.
   */
  private setupScrollAnimation(): void {
    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            this.ngZone.run(() => this.animationState.set('visible'));
            this.intersectionObserver?.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      this.intersectionObserver.observe(this.elementRef.nativeElement);
    });
  }

  /**
   * Sets the profile image size responsively based on the current viewport width.
   */
  private updateImageSize(): void {
    const width = window.innerWidth;
    if (width < 480) {
      this.imageSize.set(200);
    } else if (width < 1024) {
      this.imageSize.set(240);
    } else {
      this.imageSize.set(280);
    }
  }
}
