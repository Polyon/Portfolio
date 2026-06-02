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
import { Service } from '../../../../core/models/service.model';
import { ServiceCardComponent } from './service-card/service-card.component';
import { environment } from '../../../../../environments/environment';

/**
 * Services section of the public portfolio portal.
 *
 * Fetches published service offerings from the backend, sorts them by
 * displayOrder, and renders them in a responsive CSS Grid with stagger
 * entry animation and scroll-triggered fade-in.
 *
 * The "Request Service" CTA on each card triggers a smooth scroll to the
 * contact section (`#contact`).
 */
@Component({
  selector: 'app-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, ServiceCardComponent],
  animations: [
    trigger('cardStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(24px)' }),
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
    trigger('sectionVisible', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <section
      id="services"
      class="services-section"
      aria-labelledby="services-heading"
      [@sectionVisible]="sectionState()"
    >

      <!-- Loading -->
      @if (loading()) {
        <div class="services-loading" role="status" aria-label="Loading services">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error -->
      @if (error() && !loading()) {
        <div class="services-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load services. Please try again later.</span>
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error()) {
        <div class="services-container">

          <!-- Section header -->
          <header class="section-header">
            <span class="section-eyebrow">What I offer</span>
            <h2 class="section-title" id="services-heading">Services</h2>
            <div class="section-divider" aria-hidden="true"></div>
          </header>

          <!-- Empty state -->
          @if (sortedServices().length === 0) {
            <div class="services-empty" role="status">
              <mat-icon aria-hidden="true">build_circle</mat-icon>
              <p>No services to display yet.</p>
            </div>
          }

          <!-- Services grid -->
          @if (sortedServices().length > 0) {
            <div
              class="services-grid"
              role="list"
              aria-label="Services offered"
              [@cardStagger]="sortedServices().length"
            >
              @for (service of sortedServices(); track service.id) {
                <div role="listitem">
                  <app-service-card
                    [service]="service"
                    (requestService)="onRequestService()"
                  />
                </div>
              }
            </div>
          }

        </div>
      }
    </section>
  `,
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit, OnDestroy {
  /** Published services from the API (unsorted). */
  protected readonly services = signal<Service[]>([]);

  /** Whether the API call is in-flight. */
  protected readonly loading = signal(true);

  /** Error message when API call fails. */
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

  /** Services sorted by displayOrder ascending. */
  protected readonly sortedServices = computed(() =>
    [...this.services()].sort((a, b) => a.displayOrder - b.displayOrder),
  );

  ngOnInit(): void {
    this.loadServices();

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

  /** Fetch published services from the backend. */
  private loadServices(): void {
    this.portfolioService
      .getServices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.services.set(res.data);
            this.applySeo(res.data);
          } else {
            this.error.set(res.message ?? 'Failed to load services');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load services');
          this.loading.set(false);
        },
      });
  }

  /**
   * Applies page title, meta description, OG tags, and canonical URL
   * for the Services section.
   *
   * @param services - The loaded services array.
   */
  private applySeo(services: Service[]): void {
    const categories = [...new Set(services.map((s) => s.category))].slice(0, 4).join(', ');
    const title = `${environment.seo.author} - Services`;
    const description = categories
      ? `Services offered: ${categories}. ${services.length} professional service${services.length !== 1 ? 's' : ''} available.`
      : 'Professional services and offerings.';
    const keywords = `services, ${categories}, consulting, development, ${environment.seo.author}`;

    this.seoService.setMeta(title, description, keywords);
    this.seoService.setOgTags(
      title,
      description,
      '',
      `${environment.seo.siteUrl}#services`,
    );
    this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#services`);
  }

  /**
   * Handles "Request Service" CTA — smoothly scrolls to the contact section.
   * Wrapped in `isPlatformBrowser` guard for SSR safety.
   */
  onRequestService(): void {
    if (isPlatformBrowser(this.platformId)) {
      const contactEl = document.getElementById('contact');
      if (contactEl) {
        contactEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
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
