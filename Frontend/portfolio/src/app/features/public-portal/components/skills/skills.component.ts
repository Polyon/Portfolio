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
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { Skill, SkillCategory } from '../../../../core/models/skill.model';
import { environment } from '../../../../../environments/environment';
import { SkillCardComponent } from './skill-card/skill-card.component';

/** "All" sentinel used in the filter dropdowns. */
const FILTER_ALL = 'ALL';

/** Category dropdown options. */
const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: FILTER_ALL, label: 'All categories' },
  { value: SkillCategory.BACKEND,   label: 'Backend'   },
  { value: SkillCategory.FRONTEND,  label: 'Frontend'  },
  { value: SkillCategory.DEVOPS,    label: 'DevOps'    },
  { value: SkillCategory.AI,        label: 'AI / ML'   },
  { value: SkillCategory.DATABASE,  label: 'Database'  },
  { value: SkillCategory.OTHER,     label: 'Other'     },
];

/** Experience-level dropdown options (maps to proficiencyLevel 1–5). */
const LEVEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: FILTER_ALL,  label: 'Experience level' },
  { value: '5', label: 'Expert (5★)'       },
  { value: '4', label: 'Advanced (4★)'     },
  { value: '3', label: 'Intermediate (3★)' },
  { value: '2', label: 'Beginner (2★)'     },
  { value: '1', label: 'Novice (1★)'       },
];

/**
 * Skills section of the public portfolio portal.
 *
 * Fetches published skills from the backend and renders them in a responsive
 * CSS Grid with category filtering, real-time search (debounced 300ms),
 * proficiency star ratings, and staggered entry animations.
 */
@Component({
  selector: 'app-skills',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SkillCardComponent,
  ],
  animations: [
    // Stagger grid items on list change
    trigger('gridStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(18px)' }),
            stagger(80, [
              animate(
                '320ms cubic-bezier(0.35, 0, 0.25, 1)',
                style({ opacity: 1, transform: 'none' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
    // Section fade-in on scroll into view
    trigger('sectionFade', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <section
      id="skills"
      class="skills-section"
      aria-labelledby="skills-heading"
      [@sectionFade]="sectionVisible()">

      <!-- Loading -->
      @if (loading()) {
        <div class="skills-loading" role="status" aria-label="Loading skills">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- Error -->
      @if (error() && !loading()) {
        <div class="skills-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load skills. Please try again later.</span>
        </div>
      }

      @if (!loading()) {
        <div class="skills-container">
          <!-- Section header -->
          <div class="section-header">
            <span class="section-eyebrow">What I know</span>
            <h2 id="skills-heading" class="section-title">Skills &amp; Technologies</h2>
            <div class="section-divider" aria-hidden="true"></div>
          </div>

          <!-- ── Filter bar ───────────────────────────────────────────────── -->
          <div class="filter-bar" role="search" aria-label="Filter skills">

            <!-- Search -->
            <div class="filter-search">
              <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
              <input
                class="filter-input"
                type="search"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Search skills"
                aria-label="Search skills by name" />
              @if (searchQuery()) {
                <button
                  class="clear-btn"
                  aria-label="Clear search"
                  (click)="onSearchChange('')">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>

            <div class="filter-divider" aria-hidden="true"></div>

            <!-- Category dropdown -->
            <div class="filter-dropdown" [class.open]="categoryOpen()">
              <button
                class="dropdown-trigger"
                type="button"
                [attr.aria-expanded]="categoryOpen()"
                aria-haspopup="listbox"
                (click)="toggleCategory($event)">
                <span>{{ selectedCategoryLabel() }}</span>
                <mat-icon class="chevron">expand_more</mat-icon>
              </button>
              @if (categoryOpen()) {
                <ul class="dropdown-menu" role="listbox" aria-label="Category">
                  @for (opt of categoryOptions; track opt.value) {
                    <li
                      class="dropdown-item"
                      [class.active]="selectedCategory() === opt.value"
                      role="option"
                      [attr.aria-selected]="selectedCategory() === opt.value"
                      (click)="selectCategory(opt.value)">
                      {{ opt.label }}
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="filter-divider" aria-hidden="true"></div>

            <!-- Experience level dropdown -->
            <div class="filter-dropdown" [class.open]="levelOpen()">
              <button
                class="dropdown-trigger"
                type="button"
                [attr.aria-expanded]="levelOpen()"
                aria-haspopup="listbox"
                (click)="toggleLevel($event)">
                <span>{{ selectedLevelLabel() }}</span>
                <mat-icon class="chevron">expand_more</mat-icon>
              </button>
              @if (levelOpen()) {
                <ul class="dropdown-menu" role="listbox" aria-label="Experience level">
                  @for (opt of levelOptions; track opt.value) {
                    <li
                      class="dropdown-item"
                      [class.active]="selectedLevel() === opt.value"
                      role="option"
                      [attr.aria-selected]="selectedLevel() === opt.value"
                      (click)="selectLevel(opt.value)">
                      {{ opt.label }}
                    </li>
                  }
                </ul>
              }
            </div>

          </div>
          <!-- ── /Filter bar ─────────────────────────────────────────────── -->

          <!-- Results count -->
          <p class="skills-count" aria-live="polite" aria-atomic="true">
            Showing {{ filteredSkills().length }} of {{ allSkills().length }} skills
          </p>

          <!-- Skills grid -->
          @if (filteredSkills().length > 0) {
            <div
              class="skills-grid"
              [@gridStagger]="filteredSkills().length"
              role="list"
              aria-label="Skills list">
              @for (skill of filteredSkills(); track skill.id) {
                <div role="listitem">
                  <app-skill-card
                    [skill]="skill"
                    [searchTerm]="searchQuery()" />
                </div>
              }
            </div>
          } @else if (!loading()) {
            <!-- Empty state -->
            <div class="skills-empty" role="status">
              <mat-icon aria-hidden="true">search_off</mat-icon>
              <p>No skills match your filter. Try adjusting your search.</p>
            </div>
          }
        </div>
      }
    </section>
  `,
  styleUrl: './skills.component.scss',
})
export class SkillsComponent implements OnInit, OnDestroy {
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<boolean>(false);
  protected readonly allSkills = signal<Skill[]>([]);
  protected readonly selectedCategory = signal<string>(FILTER_ALL);
  protected readonly selectedLevel = signal<string>(FILTER_ALL);
  protected readonly searchQuery = signal<string>('');
  protected readonly sectionVisible = signal<'hidden' | 'visible'>('hidden');
  protected readonly categoryOpen = signal<boolean>(false);
  protected readonly levelOpen = signal<boolean>(false);

  /** Dropdown option lists exposed to the template. */
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly levelOptions = LEVEL_OPTIONS;

  /** Label for the category trigger button. */
  protected readonly selectedCategoryLabel = computed(() =>
    CATEGORY_OPTIONS.find(o => o.value === this.selectedCategory())?.label ?? 'All categories'
  );

  /** Label for the level trigger button. */
  protected readonly selectedLevelLabel = computed(() =>
    LEVEL_OPTIONS.find(o => o.value === this.selectedLevel())?.label ?? 'Experience level'
  );

  /** Skills after applying all filters. */
  protected readonly filteredSkills = computed(() => {
    let skills = this.allSkills();
    const cat = this.selectedCategory();
    const lvl = this.selectedLevel();
    const query = this.searchQuery().trim().toLowerCase();

    if (cat !== FILTER_ALL) {
      skills = skills.filter((s) => s.category === cat);
    }
    if (lvl !== FILTER_ALL) {
      skills = skills.filter((s) => s.proficiencyLevel === Number(lvl));
    }
    if (query) {
      skills = skills.filter((s) => s.name.toLowerCase().includes(query));
    }
    return skills;
  });

  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();
  private intersectionObserver: IntersectionObserver | null = null;

  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService = inject(SeoService);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.loadSkills();
    this.setupDebouncedSearch();
    if (isPlatformBrowser(this.platformId)) {
      this.setupScrollAnimation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  /** Closes all dropdowns when user clicks outside the filter bar. */
  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.categoryOpen.set(false);
    this.levelOpen.set(false);
  }

  protected toggleCategory(event: Event): void {
    event.stopPropagation();
    const next = !this.categoryOpen();
    this.categoryOpen.set(next);
    this.levelOpen.set(false);
  }

  protected toggleLevel(event: Event): void {
    event.stopPropagation();
    const next = !this.levelOpen();
    this.levelOpen.set(next);
    this.categoryOpen.set(false);
  }

  protected selectCategory(value: string): void {
    this.selectedCategory.set(value);
    this.categoryOpen.set(false);
  }

  protected selectLevel(value: string): void {
    this.selectedLevel.set(value);
    this.levelOpen.set(false);
  }

  /**
   * Pushes the raw search value into the debounce pipeline.
   * The signal is updated 300ms after the last keystroke.
   */
  protected onSearchChange(value: string): void {
    this.searchSubject$.next(value);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  private loadSkills(): void {
    this.portfolioService
      .getSkills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.allSkills.set(response.data);
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
   * for the Skills section.
   *
   * @param skills - The loaded skills array.
   */
  private applySeo(skills: Skill[]): void {
    const topSkills = skills
      .slice(0, 5)
      .map((s) => s.name)
      .join(', ');
    const title = `${environment.seo.author} - Skills & Technologies`;
    const description = topSkills
      ? `Technical skills: ${topSkills}. Explore the full skill set and proficiency levels.`
      : 'Explore technical skills and proficiency levels across frontend, backend, and DevOps.';
    const keywords = `skills, technologies, ${topSkills}, programming, development`;

    this.seoService.setMeta(title, description, keywords);
    this.seoService.setOgTags(
      title,
      description,
      '',
      `${environment.seo.siteUrl}#skills`,
    );
    this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#skills`);
  }

  /**
   * Debounces search input at 300ms, then updates the `searchQuery` signal.
   * Prevents excessive re-renders while typing.
   */
  private setupDebouncedSearch(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.searchQuery.set(value));
  }

  /**
   * Sets up an IntersectionObserver to trigger the section fade-in animation
   * once the section enters the viewport at 10% visibility.
   */
  private setupScrollAnimation(): void {
    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.ngZone.run(() => this.sectionVisible.set('visible'));
            this.intersectionObserver?.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      this.intersectionObserver.observe(this.elementRef.nativeElement);
    });
  }
}
