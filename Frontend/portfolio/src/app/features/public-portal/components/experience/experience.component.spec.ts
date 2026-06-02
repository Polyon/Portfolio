import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { ExperienceComponent } from './experience.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Experience, EmploymentType } from '../../../../core/models/experience.model';

// ─── Test fixtures ───────────────────────────────────────────────────────────

const makeExp = (overrides: Partial<Experience> & { id: string }): Experience => ({
  userId: 'u1',
  company: 'Acme Corp',
  title: 'Software Engineer',
  description: 'Built cool things.',
  startDate: '2022-01-01T00:00:00Z',
  endDate: '2023-06-01T00:00:00Z',
  isCurrentRole: false,
  isPublished: true,
  displayOrder: 0,
  createdAt: '2022-01-01T00:00:00Z',
  updatedAt: '2023-06-01T00:00:00Z',
  ...overrides,
});

const MOCK_EXPERIENCES: Experience[] = [
  makeExp({ id: 'e1', company: 'Alpha Ltd',   startDate: '2020-03-01T00:00:00Z', endDate: '2021-08-01T00:00:00Z' }),
  makeExp({ id: 'e2', company: 'Beta Inc',    startDate: '2021-09-01T00:00:00Z', endDate: '2022-12-01T00:00:00Z' }),
  makeExp({ id: 'e3', company: 'Gamma Corp',  startDate: '2023-01-01T00:00:00Z', isCurrentRole: true, endDate: undefined }),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createComponent(
  experiences: Experience[] = MOCK_EXPERIENCES,
  shouldError = false,
): Promise<{ fixture: ComponentFixture<ExperienceComponent>; svcSpy: jasmine.SpyObj<PortfolioService> }> {
  const svcSpy = jasmine.createSpyObj('PortfolioService', ['getExperiences']);
  const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);

  svcSpy.getExperiences.and.returnValue(
    shouldError
      ? throwError(() => new Error('Network error'))
      : of({ success: true, data: experiences }),
  );

  await TestBed.configureTestingModule({
    imports: [ExperienceComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' }, // avoid browser APIs in tests
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ExperienceComponent);
  fixture.detectChanges();

  return { fixture, svcSpy };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ExperienceComponent', () => {

  // ── Creation ───────────────────────────────────────────────────────────────

  it('should create', async () => {
    const { fixture } = await createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('should render the section heading', async () => {
    const { fixture } = await createComponent();
    const heading = fixture.debugElement.query(By.css('#experience-heading'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.textContent).toContain('Work Experience');
  });

  it('should render an experience-card for each experience', async () => {
    const { fixture } = await createComponent();
    const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
    expect(cards.length).toBe(MOCK_EXPERIENCES.length);
  });

  it('should NOT render the loading spinner after data loads', async () => {
    const { fixture } = await createComponent();
    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeNull();
  });

  it('should show empty state when no experiences are returned', async () => {
    const { fixture } = await createComponent([]);
    const empty = fixture.debugElement.query(By.css('.experience-empty'));
    expect(empty).toBeTruthy();
  });

  // ── Sorting ────────────────────────────────────────────────────────────────

  it('should display experiences in reverse-chronological order (most recent first)', async () => {
    const { fixture } = await createComponent();
    const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));

    // Gamma Corp (2023) should be first, Alpha Ltd (2020) last
    const firstCard = cards[0].componentInstance as { experience: Experience };
    const lastCard  = cards[cards.length - 1].componentInstance as { experience: Experience };

    expect(firstCard.experience.company).toBe('Gamma Corp');
    expect(lastCard.experience.company).toBe('Alpha Ltd');
  });

  it('should place the current role at the top when it has the latest startDate', async () => {
    const { fixture } = await createComponent();
    const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
    const first = (cards[0].componentInstance as { experience: Experience }).experience;
    expect(first.isCurrentRole).toBeTrue();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('should show error message when API throws', async () => {
    const { fixture } = await createComponent([], true);
    const errorEl = fixture.debugElement.query(By.css('.experience-error'));
    expect(errorEl).toBeTruthy();
  });

  it('should not render experience cards when API throws', async () => {
    const { fixture } = await createComponent([], true);
    const cards = fixture.debugElement.queryAll(By.css('app-experience-card'));
    expect(cards.length).toBe(0);
  });

  // ── API integration ────────────────────────────────────────────────────────

  it('should call portfolioService.getExperiences() once on init', async () => {
    const { svcSpy } = await createComponent();
    expect(svcSpy.getExperiences).toHaveBeenCalledTimes(1);
  });
});
