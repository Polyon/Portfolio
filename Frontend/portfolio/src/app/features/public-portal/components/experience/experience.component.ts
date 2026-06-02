import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  ElementRef,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Experience } from '../../../../core/models/experience.model';
import { ExperienceCardComponent } from './experience-card/experience-card.component';
import { environment } from '../../../../../environments/environment';

/**
 * Experience section of the public portfolio portal.
 *
 * Fetches published work-experience entries from the backend, sorts them
 * in reverse-chronological order and renders them as an alternating
 * left-right timeline. Category filter tabs allow narrowing by skill domain.
 */
@Component({
  selector: 'app-experience',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, ExperienceCardComponent],
  animations: [
    trigger('cardStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(24px)' }),
            stagger(90, [
              animate(
                '380ms cubic-bezier(0.35, 0, 0.25, 1)',
                style({ opacity: 1, transform: 'none' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
    trigger('sectionVisible', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <section
      id="experience"
      class="experience-section"
      aria-labelledby="experience-heading"
      [@sectionVisible]="sectionState()"
    >

      <!-- Loading state -->
      @if (loading()) {
        <div class="experience-loading" role="status" aria-label="Loading experience">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error state -->
      @if (error() && !loading()) {
        <div class="experience-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load experience data. Please try again later.</span>
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error()) {
        <div class="experience-container">

          <!-- Section header -->
          <header class="section-header">
            <span class="section-eyebrow">Career Journey</span>
            <h2 class="section-title" id="experience-heading">Work Experience</h2>
            <div class="section-divider" aria-hidden="true"></div>
          </header>

          <!-- Empty state -->
          @if (filteredExperiences().length === 0) {
            <div class="experience-empty" role="status">
              <mat-icon aria-hidden="true">work_outline</mat-icon>
              <p>No experience entries to display yet.</p>
            </div>
          }

          <!-- Alternating timeline -->
          @if (filteredExperiences().length > 0) {
            <div
              class="experience-timeline"
              [@cardStagger]="filteredExperiences().length"
              role="list"
              aria-label="Work experience timeline"
            >
              @for (exp of filteredExperiences(); track exp.id; let i = $index) {
                <div
                  class="timeline-row"
                  [class.row-left]="i % 2 === 0"
                  [class.row-right]="i % 2 !== 0"
                  role="listitem"
                >
                  <!-- Left card slot -->
                  <div class="card-slot slot-left">
                    @if (i % 2 === 0) {
                      <app-experience-card [experience]="exp" />
                    }
                  </div>

                  <!-- Central node -->
                  <div class="node-area" aria-hidden="true">
                    <div class="node-dot" [class.node-current]="exp.isCurrentPosition"></div>
                  </div>

                  <!-- Right card slot -->
                  <div class="card-slot slot-right">
                    @if (i % 2 !== 0) {
                      <app-experience-card [experience]="exp" />
                    }
                  </div>
                </div>
              }
            </div>
          }

        </div>
      }
    </section>
  `,
  styleUrl: './experience.component.scss',
})
export class ExperienceComponent implements OnInit, OnDestroy {
  /** Published experience entries from the API (unsorted). */
  protected readonly experiences = signal<Experience[]>([]);

  /** Whether the API call is in-flight. */
  protected readonly loading = signal<boolean>(true);

  /** Error message if the API call failed. */
  protected readonly error = signal<string | null>(null);

  /** Animation state for the section wrapper. */
  protected readonly sectionState = signal<'hidden' | 'visible'>('hidden');

  private readonly destroy$ = new Subject<void>();
  private intersectionObserver: IntersectionObserver | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService = inject(SeoService);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);

  /** Experiences sorted descending by startDate. */
  protected readonly filteredExperiences = computed<Experience[]>(() =>
    [...this.experiences()].sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    ),
  );

  ngOnInit(): void {
    this.loadExperiences();

    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    } else {
      // SSR: show section immediately
      this.sectionState.set('visible');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  /** Fetch experiences from the backend and apply fallback on error. */
  private loadExperiences(): void {
    this.portfolioService
      .getExperiences()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.experiences.set(res.data);
            this.applySeo(res.data);
          } else {
            this.error.set(res.message ?? 'Failed to load experience');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load experience');
          this.loading.set(false);
        },
      });
  }

  /**
   * Applies page title, meta description, OG tags, and canonical URL
   * for the Experience section.
   *
   * @param experiences - The loaded experience entries.
   */
  private applySeo(experiences: Experience[]): void {
    const totalYears = experiences.length > 0
      ? Math.round(
          experiences.reduce((sum, e) => {
            const start = new Date(e.startDate).getTime();
            const end = e.endDate ? new Date(e.endDate).getTime() : Date.now();
            return sum + (end - start);
          }, 0) / (1000 * 60 * 60 * 24 * 365),
        )
      : 0;
    const title = `${environment.seo.author} - Work Experience`;
    const description = totalYears > 0
      ? `Work history: ${totalYears}+ years of professional experience across ${experiences.length} role${experiences.length !== 1 ? 's' : ''}.`
      : 'Professional work history and career timeline.';
    const keywords = `work experience, career, employment, ${environment.seo.author}, professional history`;

    this.seoService.setMeta(title, description, keywords);
    this.seoService.setOgTags(
      title,
      description,
      '',
      `${environment.seo.siteUrl}#experience`,
    );
    this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#experience`);
  }

  /**
   * Observe section entry into the viewport to trigger the fade-in animation.
   * Uses IntersectionObserver (browser-only).
   */
  private setupIntersectionObserver(): void {
    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.ngZone.run(() => this.sectionState.set('visible'));
            this.intersectionObserver?.disconnect();
          }
        },
        { threshold: 0.08 },
      );

      this.intersectionObserver.observe(this.elementRef.nativeElement);
    });
  }
}
