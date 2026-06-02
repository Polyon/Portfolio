import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ScrollProgressComponent } from '../scroll-progress/scroll-progress.component';
import { BackToTopComponent } from '../back-to-top/back-to-top.component';
import { HeroComponent } from '../hero/hero.component';
import { AboutComponent } from '../about/about.component';
import { SkillsComponent } from '../skills/skills.component';
import { ExperienceComponent } from '../experience/experience.component';
import { ProjectsComponent } from '../projects/projects.component';
import { ServicesComponent } from '../services/services.component';
import { ContactComponent } from '../contact/contact.component';
import { PerformanceService } from '../../services/performance.service';

/**
 * Root layout container for the public portfolio portal.
 * Hosts the sticky header, main content area, scroll progress bar,
 * back-to-top button, and footer.
 *
 * T111: On init, starts Core Web Vitals tracking (FCP, LCP, CLS) via PerformanceService
 * and tracks section visibility for analytics.
 */
@Component({
  selector: 'app-public-portal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    ScrollProgressComponent,
    BackToTopComponent,
    HeroComponent,
    AboutComponent,
    SkillsComponent,
    ExperienceComponent,
    ProjectsComponent,
    ServicesComponent,
    ContactComponent,
  ],
  template: `
    <app-scroll-progress />

    <app-header
      [activeSection]="activeSection()"
      (sectionNav)="scrollToSection($event)"
    />

    <main class="portal-main" id="main-content" role="main">
      <app-hero />
      <app-about />
      <app-skills />
      <app-experience />
      <app-projects />
      <app-services />
      <app-contact />
    </main>

    <app-footer />

    <app-back-to-top [visible]="showBackToTop()" />
  `,
  styleUrl: './public-portal.component.scss',
})
export class PublicPortalComponent implements OnInit, OnDestroy {
  /** Signal tracking which section is currently in the viewport for nav highlighting. */
  protected readonly activeSection = signal<string>('hero');

  /** Signal controlling back-to-top button visibility. */
  protected readonly showBackToTop = signal<boolean>(false);

  private readonly SCROLL_THRESHOLD = 300;
  private intersectionObserver: IntersectionObserver | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly performanceService = inject(PerformanceService);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
      // T111: Start Core Web Vitals tracking (FCP, LCP, CLS)
      this.performanceService.trackPageLoad();
      // T111: Track section visibility for performance analytics
      const sectionIds = ['hero', 'about', 'skills', 'experience', 'projects', 'services', 'contact'];
      this.performanceService.trackSectionVisibility(sectionIds);
    }
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  /**
   * Listens to window scroll events to toggle back-to-top button visibility.
   */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showBackToTop.set(window.scrollY > this.SCROLL_THRESHOLD);
    }
  }

  /**
   * Smooth-scrolls to the section with the given element id.
   * @param sectionId - The target section element id.
   */
  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /** Sets up IntersectionObserver to track which portal section is currently active. */
  private setupIntersectionObserver(): void {
    const sectionIds = ['hero', 'about', 'skills', 'experience', 'projects', 'services', 'contact'];
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSection.set(entry.target.id);
          }
        }
      },
      { threshold: 0.4 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        this.intersectionObserver.observe(el);
      }
    }
  }
}
