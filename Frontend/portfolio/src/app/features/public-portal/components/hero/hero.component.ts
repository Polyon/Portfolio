import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  PLATFORM_ID,
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
  query,
  stagger,
  keyframes,
  sequence,
} from '@angular/animations';

import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { ImageOptimizerService } from '../../services/image-optimizer.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';
import { buildPersonSchema, buildWebSiteSchema } from '../../schemas';
import { ImageFallbackComponent } from '../../../../shared/components/image-fallback/image-fallback.component';
import { ScrollIndicatorComponent } from '../../../../shared/components/scroll-indicator/scroll-indicator.component';

/**
 * Hero section of the public portfolio portal.
 * Displays the portfolio owner's name, tagline, profile image, and a CTA button.
 * Includes fade-in stagger animations, responsive two-column layout, and SEO meta tags.
 */
@Component({
  selector: 'app-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ImageFallbackComponent,
    ScrollIndicatorComponent,
  ],
  animations: [
    // Staggered entrance for hero text elements
    trigger('heroContent', [
      transition(':enter', [
        query('.hero-stagger-item', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(120, [
            animate(
              '500ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({ opacity: 1, transform: 'none' }),
            ),
          ]),
        ], { optional: true }),
      ]),
    ]),
    // Slide-in for the profile image column
    trigger('imageSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(50px) scale(0.9)' }),
        animate(
          '600ms 200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateX(0) scale(1)' }),
        ),
      ]),
    ]),
    // Subtle infinite pulse on the profile image
    trigger('imagePulse', [
      transition('* => pulse', [
        animate(
          '3s ease-in-out',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.03)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ]),
        ),
      ]),
    ]),
  ],
  template: `
    <section id="hero" class="hero-section" aria-label="Hero">
      <!-- Loading state -->
      @if (loading()) {
        <div class="hero-loading" role="status" aria-label="Loading portfolio data">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Error state -->
      @if (error() && !loading()) {
        <div class="hero-error" role="alert">
          <span>Could not load portfolio data. Please refresh.</span>
        </div>
      }

      <!-- Hero content -->
      @if (profile() && !loading()) {
        <div class="hero-container" @heroContent>
          <!-- Text column -->
          <div class="hero-text-col">
            <p class="hero-greeting hero-stagger-item">Hello, I'm</p>

            <h1 class="hero-name hero-stagger-item">
              {{ profile()!.firstName }}
              <span class="hero-name-accent">{{ profile()!.lastName }}</span>
            </h1>

            <p class="hero-tagline hero-stagger-item">{{ profile()!.tagline }}</p>

            <div class="hero-actions hero-stagger-item">
              <button
                mat-flat-button
                class="cta-primary"
                (click)="scrollToSection('projects')"
                aria-label="View my projects">
                View My Work
                <mat-icon iconPositionEnd>arrow_forward</mat-icon>
              </button>

              <button
                mat-stroked-button
                class="cta-secondary"
                (click)="scrollToSection('contact')"
                aria-label="Get in touch">
                Get In Touch
              </button>
            </div>
          </div>

          <!-- Image column -->
          <div class="hero-image-col" @imageSlideIn>
            <div class="hero-image-wrapper"
                 [@imagePulse]="pulseState()"
                 (@imagePulse.done)="onPulseDone()">
              <app-image-fallback
                [src]="profile()!.profileImageUrl"
                [alt]="profile()!.firstName + ' ' + profile()!.lastName"
                [size]="profileImageSize" />
            </div>
          </div>
        </div>

        <!-- Scroll indicator at bottom of hero -->
        <div class="hero-scroll-indicator">
          <app-scroll-indicator />
        </div>
      }
    </section>
  `,
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnInit, OnDestroy {
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly profile = signal<Profile | null>(null);
  protected readonly pulseState = signal<'idle' | 'pulse'>('idle');

  /** Responsive profile image size (set based on viewport in ngOnInit). */
  protected profileImageSize = 280;

  private readonly destroy$ = new Subject<void>();
  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService = inject(SeoService);
  private readonly imageOptimizer = inject(ImageOptimizerService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.loadProfile();
    if (isPlatformBrowser(this.platformId)) {
      this.updateImageSize();
      this.startPulseLoop();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Smooth-scrolls the viewport to the section with the given id.
   *
   * @param sectionId - The target section element id.
   */
  protected scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /** Called when the imagePulse animation finishes – loops the animation. */
  protected onPulseDone(): void {
    this.pulseState.set('idle');
    setTimeout(() => this.pulseState.set('pulse'), 100);
  }

  /**
   * Fetches profile data from the backend and applies SEO meta tags.
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
            if (isPlatformBrowser(this.platformId) && response.data.profileImageUrl) {
              this.imageOptimizer.preloadCriticalImages([response.data.profileImageUrl]);
            }
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
   * Applies page title, meta description, OG tags, canonical URL and Person schema.
   *
   * @param profile - The loaded public profile.
   */
  private applySeo(profile: Profile): void {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const title = `${fullName} – ${profile.tagline}`;
    const description = profile.bio
      ? profile.bio.slice(0, 160).trimEnd()
      : environment.seo.defaultDescription;

    this.seoService.setMeta(title, description, [profile.tagline, fullName].join(', '));
    this.seoService.setOgTags(
      title,
      description,
      profile.profileImageUrl ?? '',
      environment.seo.siteUrl,
    );
    this.seoService.setCanonicalUrl(environment.seo.siteUrl);
    // Inject a combined @graph schema with Person + WebSite
    const personSchema = buildPersonSchema(profile);
    const websiteSchema = buildWebSiteSchema();
    this.seoService.setStructuredData({
      '@context': 'https://schema.org',
      '@graph': [personSchema, websiteSchema],
    });
  }

  /**
   * Sets the profile image size based on the current viewport width.
   */
  private updateImageSize(): void {
    const w = window.innerWidth;
    if (w >= 1280) this.profileImageSize = 320;
    else if (w >= 768) this.profileImageSize = 240;
    else this.profileImageSize = 180;
  }

  /** Begins the infinite image pulse loop after a short initial delay. */
  private startPulseLoop(): void {
    setTimeout(() => this.pulseState.set('pulse'), 1200);
  }
}
