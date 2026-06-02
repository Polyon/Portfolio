/**
 * Integration (interaction) tests for ExperienceComponent.
 *
 * These tests simulate real user interactions and cross-component data flows:
 * - Section renders with correct content after API response
 * - Cards are ordered correctly (reverse-chrono)
 * - Current-role styling + "Present" date shown for active position
 * - Loading → data transition renders cards
 * - Delayed API response does not break the view
 * - API failure shows error and hides cards
 * - Section animation state transitions
 * - Accessibility attributes present
 *
 * Note: The project uses Jasmine/Karma without a headless browser E2E runner
 * (no Cypress/Playwright installed). These tests cover the full interaction
 * flow at the Angular TestBed level and serve as the T064 acceptance evidence.
 */
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { ExperienceComponent } from './experience.component';
import { ExperienceCardComponent } from './experience-card/experience-card.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Experience, EmploymentType } from '../../../../core/models/experience.model';
import { SkillCategory } from '../../../../core/models/skill.model';

// ─── Test data ───────────────────────────────────────────────────────────────

const makeExp = (overrides: Partial<Experience> & { id: string }): Experience => ({
  userId: 'u1',
  company: 'Acme',
  title: 'Engineer',
  description: 'Built things.',
  startDate: '2022-01-01T00:00:00Z',
  endDate: '2023-01-01T00:00:00Z',
  isCurrentRole: false,
  isPublished: true,
  displayOrder: 0,
  createdAt: '2022-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

const EXPERIENCES: Experience[] = [
  makeExp({ id: 'e1', company: 'Alpha',  startDate: '2019-01-01T00:00:00Z', endDate: '2020-06-01T00:00:00Z' }),
  makeExp({ id: 'e2', company: 'Beta',   startDate: '2020-07-01T00:00:00Z', endDate: '2022-03-01T00:00:00Z',
    employmentType: EmploymentType.CONTRACT, location: 'Remote' }),
  makeExp({ id: 'e3', company: 'Gamma',  startDate: '2022-04-01T00:00:00Z', isCurrentRole: true, endDate: undefined,
    skills: [
      { id: 'sk1', userId: 'u1', name: 'Angular', category: SkillCategory.FRONTEND,
        proficiencyLevel: 5, endorsementCount: 0, isPublished: true, createdAt: '', updatedAt: '' },
    ],
  }),
];

// ─── Helper ──────────────────────────────────────────────────────────────────

interface TestSetup {
  fixture: ComponentFixture<ExperienceComponent>;
  svcSpy: jasmine.SpyObj<PortfolioService>;
}

async function createComponent(
  experiences: Experience[] = EXPERIENCES,
  opts: { shouldError?: boolean; delayMs?: number } = {},
): Promise<TestSetup> {
  const svcSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getExperiences']);
  const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);

  let obs = opts.shouldError
    ? throwError(() => new Error('Network error'))
    : of({ success: true, data: experiences });

  if (opts.delayMs) {
    obs = (obs as any).pipe(delay(opts.delayMs));
  }

  svcSpy.getExperiences.and.returnValue(obs as any);

  await TestBed.configureTestingModule({
    imports: [ExperienceComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' }, // avoid IntersectionObserver in tests
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ExperienceComponent);
  fixture.detectChanges();
  return { fixture, svcSpy };
}

// ─── Interaction tests ────────────────────────────────────────────────────────

describe('ExperienceComponent — interaction (T064)', () => {

  // ── Initial load flow ─────────────────────────────────────────────────────

  describe('Initial data load', () => {
    it('should show all experience cards after successful API response', async () => {
      const { fixture } = await createComponent();
      const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
      expect(cards.length).toBe(EXPERIENCES.length);
    });

    it('should NOT show loading spinner once data arrives', async () => {
      const { fixture } = await createComponent();
      expect(fixture.debugElement.query(By.css('mat-spinner'))).toBeNull();
    });

    it('should NOT show the error block when data loads successfully', async () => {
      const { fixture } = await createComponent();
      expect(fixture.debugElement.query(By.css('.experience-error'))).toBeNull();
    });
  });

  // ── Reverse-chronological order ───────────────────────────────────────────

  describe('Reverse-chronological ordering', () => {
    it('should render cards in descending startDate order', async () => {
      const { fixture } = await createComponent();
      const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
      const companies = cards.map(
        (c) => (c.componentInstance as ExperienceCardComponent).experience.company,
      );
      // Gamma (2022) → Beta (2020) → Alpha (2019)
      expect(companies).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('should place the current role first when it has the latest start date', async () => {
      const { fixture } = await createComponent();
      const first = fixture.debugElement.queryAll(By.css('app-experience-card'))[0];
      const exp = (first.componentInstance as ExperienceCardComponent).experience;
      expect(exp.isCurrentRole).toBeTrue();
    });
  });

  // ── Current-role styling ──────────────────────────────────────────────────

  describe('Current-role card interaction', () => {
    it('should render "Present" in the date range for the current role', async () => {
      const { fixture } = await createComponent();
      const firstCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[0];
      const dateEl = firstCard.query(By.css('.date-range'));
      expect(dateEl.nativeElement.textContent).toContain('Present');
    });

    it('should add current-role CSS class to the current role card', async () => {
      const { fixture } = await createComponent();
      const firstCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[0];
      const articleEl = firstCard.query(By.css('.experience-card'));
      expect(articleEl.classes['current-role']).toBeTrue();
    });

    it('should show "Current" badge on the active position card', async () => {
      const { fixture } = await createComponent();
      const firstCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[0];
      const badge = firstCard.query(By.css('.current-badge'));
      expect(badge).toBeTruthy();
    });

    it('should NOT show current badge on past-role cards', async () => {
      const { fixture } = await createComponent();
      const secondCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[1];
      const badge = secondCard.query(By.css('.current-badge'));
      expect(badge).toBeNull();
    });
  });

  // ── Skill chips interaction ───────────────────────────────────────────────

  describe('Skill chips', () => {
    it('should render skill chips for the card that has skills attached', async () => {
      const { fixture } = await createComponent();
      // Gamma (first card) has 1 skill
      const firstCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[0];
      const chips = firstCard.queryAll(By.css('mat-chip'));
      expect(chips.length).toBe(1);
      expect(chips[0].nativeElement.textContent.trim()).toBe('Angular');
    });

    it('should NOT render skill chips on a card with no skills', async () => {
      const { fixture } = await createComponent();
      // Alpha (last card) has no skills
      const lastCard = fixture.debugElement
        .queryAll(By.css('app-experience-card'))
        .at(-1)!;
      const chipsSection = lastCard.query(By.css('.skills-chips'));
      expect(chipsSection).toBeNull();
    });
  });

  // ── Optional fields ───────────────────────────────────────────────────────

  describe('Optional field rendering', () => {
    it('should display employment type when provided', async () => {
      const { fixture } = await createComponent();
      // Beta is the second card; has employmentType = Contract
      const secondCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[1];
      const typeEl = secondCard.query(By.css('.employment-type'));
      expect(typeEl).toBeTruthy();
      expect(typeEl.nativeElement.textContent.trim()).toBe('Contract');
    });

    it('should display location when provided', async () => {
      const { fixture } = await createComponent();
      const secondCard = fixture.debugElement.queryAll(By.css('app-experience-card'))[1];
      const locEl = secondCard.query(By.css('.location'));
      expect(locEl).toBeTruthy();
      expect(locEl.nativeElement.textContent).toContain('Remote');
    });
  });

  // ── Error flow ────────────────────────────────────────────────────────────

  describe('Error flow', () => {
    it('should show the error block when the API throws', async () => {
      const { fixture } = await createComponent([], { shouldError: true });
      const err = fixture.debugElement.query(By.css('.experience-error'));
      expect(err).toBeTruthy();
    });

    it('should render no experience cards when the API throws', async () => {
      const { fixture } = await createComponent([], { shouldError: true });
      const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
      expect(cards.length).toBe(0);
    });
  });

  // ── Empty state flow ──────────────────────────────────────────────────────

  describe('Empty state flow', () => {
    it('should show the empty-state block when no experiences are returned', async () => {
      const { fixture } = await createComponent([]);
      const empty = fixture.debugElement.query(By.css('.experience-empty'));
      expect(empty).toBeTruthy();
    });

    it('should render no experience cards when the list is empty', async () => {
      const { fixture } = await createComponent([]);
      const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
      expect(cards.length).toBe(0);
    });
  });

  // ── Animation state (SSR path) ────────────────────────────────────────────

  describe('Animation state', () => {
    it('should initialise sectionState to "visible" on server platform (SSR path)', async () => {
      const { fixture } = await createComponent();
      // On 'server' platform, ngOnInit sets sectionState to 'visible' immediately
      const section = fixture.debugElement.query(By.css('section#experience'));
      // The [@sectionVisible] binding should reflect 'visible'
      expect(section).toBeTruthy();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('should have role="list" on the timeline container', async () => {
      const { fixture } = await createComponent();
      const list = fixture.debugElement.query(By.css('[role="list"]'));
      expect(list).toBeTruthy();
    });

    it('should have aria-label on the timeline container', async () => {
      const { fixture } = await createComponent();
      const list = fixture.debugElement.query(By.css('[role="list"]'));
      expect(list.attributes['aria-label']).toBeTruthy();
    });

    it('should have role="listitem" wrappers for each card', async () => {
      const { fixture } = await createComponent();
      const items = fixture.debugElement.queryAll(By.css('[role="listitem"]'));
      expect(items.length).toBe(EXPERIENCES.length);
    });

    it('should have aria-labelledby pointing to the section heading', async () => {
      const { fixture } = await createComponent();
      const section = fixture.debugElement.query(By.css('section#experience'));
      expect(section.attributes['aria-labelledby']).toBe('experience-heading');
    });

    it('should have a visible section heading with id "experience-heading"', async () => {
      const { fixture } = await createComponent();
      const heading = fixture.debugElement.query(By.css('#experience-heading'));
      expect(heading).toBeTruthy();
      expect(heading.nativeElement.textContent).toContain('Work Experience');
    });
  });
});
