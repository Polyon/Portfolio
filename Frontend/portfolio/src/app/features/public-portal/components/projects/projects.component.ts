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
import { Project } from '../../../../core/models/project.model';
import { ProjectCardComponent } from './project-card/project-card.component';
import { environment } from '../../../../../environments/environment';

/**
 * Projects section of the public portfolio portal.
 *
 * Fetches published projects from the backend, sorts them with featured
 * projects first (then by displayOrder), and renders them in a responsive
 * CSS Grid with staggered entry animation and a scroll-triggered fade-in.
 */
@Component({
  selector: 'app-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, ProjectCardComponent],
  animations: [
    // Stagger each card on list render
    trigger('cardStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(28px)' }),
            stagger(70, [
              animate(
                '360ms cubic-bezier(0.35, 0, 0.25, 1)',
                style({ opacity: 1, transform: 'none' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
    // Section fade-in on viewport entry
    trigger('sectionVisible', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <section
      id="projects"
      class="projects-section"
      aria-labelledby="projects-heading"
      [@sectionVisible]="sectionState()"
    >

      <!-- Loading -->
      @if (loading()) {
        <div class="projects-loading" role="status" aria-label="Loading projects">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error -->
      @if (error() && !loading()) {
        <div class="projects-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load projects. Please try again later.</span>
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error()) {
        <div class="projects-container">

          <!-- Section header -->
          <header class="section-header">
            <span class="section-eyebrow">What I've built</span>
            <h2 class="section-title" id="projects-heading">Projects</h2>
            <div class="section-divider" aria-hidden="true"></div>
          </header>

          <!-- Empty state -->
          @if (sortedProjects().length === 0) {
            <div class="projects-empty" role="status">
              <mat-icon aria-hidden="true">folder_open</mat-icon>
              <p>No projects to display yet.</p>
            </div>
          }

          <!-- Project grid -->
          @if (sortedProjects().length > 0) {
            <div
              class="projects-grid"
              role="list"
              aria-label="Portfolio projects"
              [@cardStagger]="sortedProjects().length"
            >
              @for (project of sortedProjects(); track project.id) {
                <div role="listitem">
                  <app-project-card [project]="project" />
                </div>
              }
            </div>
          }

        </div>
      }
    </section>
  `,
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit, OnDestroy {
  /** Published projects from the API (unsorted). */
  protected readonly projects = signal<Project[]>([]);

  /** Whether the API call is in-flight. */
  protected readonly loading = signal(true);

  /** Error message if the API call failed. */
  protected readonly error = signal<string | null>(null);

  /** Scroll-triggered section animation state. */
  protected readonly sectionState = signal<'hidden' | 'visible'>('hidden');

  private readonly destroy$ = new Subject<void>();
  private intersectionObserver: IntersectionObserver | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService = inject(SeoService);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);

  /**
   * Projects sorted: featured first, then by displayOrder ascending.
   */
  protected readonly sortedProjects = computed(() =>
    [...this.projects()].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    }),
  );

  ngOnInit(): void {
    this.loadProjects();

    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    } else {
      this.sectionState.set('visible');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  /** Fetch projects from the backend. */
  private loadProjects(): void {
    this.portfolioService
      .getProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.projects.set(res.data);
            this.applySeo(res.data);
          } else {
            this.error.set(res.message ?? 'Failed to load projects');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load projects');
          this.loading.set(false);
        },
      });
  }

  /**
   * Applies page title, meta description, OG tags, and canonical URL
   * for the Projects section.
   *
   * @param projects - The loaded projects array.
   */
  private applySeo(projects: Project[]): void {
    const featuredCount = projects.filter((p) => p.isFeatured).length;
    const title = `${environment.seo.author} - Project Portfolio`;
    const description = projects.length > 0
      ? `Featured projects: ${featuredCount} featured work${featuredCount !== 1 ? 's' : ''} out of ${projects.length} projects. Explore the full portfolio.`
      : 'Explore the complete project portfolio and featured works.';
    const techKeywords = projects
      .flatMap((p) => p.skills?.map((s) => s.name) ?? [])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8)
      .join(', ');
    const keywords = `projects, portfolio, ${techKeywords}, ${environment.seo.author}`;
    const ogImage = projects.find((p) => p.isFeatured && p.imageUrl)?.imageUrl ?? '';

    this.seoService.setMeta(title, description, keywords);
    this.seoService.setOgTags(
      title,
      description,
      ogImage,
      `${environment.seo.siteUrl}#projects`,
    );
    this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#projects`);
  }

  /** Observe section entry into the viewport to trigger fade-in animation. */
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
