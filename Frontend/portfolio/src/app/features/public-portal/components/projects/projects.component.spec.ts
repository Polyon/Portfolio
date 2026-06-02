import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { ProjectsComponent } from './projects.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Project, ProjectStatus } from '../../../../core/models/project.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> & { id: string }): Project => ({
  userId: 'u1',
  name: 'Test Project',
  description: 'A test project.',
  shortDescription: 'Short description.',
  status: ProjectStatus.COMPLETED,
  startDate: '2023-01-01T00:00:00Z',
  isFeatured: false,
  isPublished: true,
  displayOrder: 1,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-06-01T00:00:00Z',
  skills: [],
  ...overrides,
});

const MOCK_PROJECTS: Project[] = [
  makeProject({ id: 'p1', name: 'Alpha Project', isFeatured: false, displayOrder: 2 }),
  makeProject({ id: 'p2', name: 'Beta Project',  isFeatured: true,  displayOrder: 1 }),
  makeProject({ id: 'p3', name: 'Gamma Project', isFeatured: false, displayOrder: 1 }),
];

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function createComponent(
  projects: Project[] = MOCK_PROJECTS,
  shouldError = false,
): Promise<{ fixture: ComponentFixture<ProjectsComponent>; svcSpy: jasmine.SpyObj<PortfolioService> }> {
  const svcSpy = jasmine.createSpyObj('PortfolioService', ['getProjects']);
  const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);

  svcSpy.getProjects.and.returnValue(
    shouldError
      ? throwError(() => new Error('Network error'))
      : of({ success: true, data: projects }),
  );

  await TestBed.configureTestingModule({
    imports: [ProjectsComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' }, // avoid browser APIs in tests
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProjectsComponent);
  fixture.detectChanges();
  return { fixture, svcSpy };
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('ProjectsComponent', () => {

  // ── Creation ─────────────────────────────────────────────────────────────

  it('should create', async () => {
    const { fixture } = await createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  it('should call getProjects exactly once on init', async () => {
    const { svcSpy } = await createComponent();
    expect(svcSpy.getProjects).toHaveBeenCalledTimes(1);
  });

  it('should render a card for each project returned', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
    expect(cards.length).toBe(MOCK_PROJECTS.length);
  });

  // ── Sorting — featured first ───────────────────────────────────────────────

  it('should render the featured project first', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
    // Beta Project is featured — should be the first card
    const firstCard = cards[0];
    const component = firstCard.componentInstance as any;
    expect(component.project.isFeatured).toBeTrue();
  });

  it('should sort non-featured projects by displayOrder ascending', async () => {
    const projects = [
      makeProject({ id: 'a', name: 'Order 3', isFeatured: false, displayOrder: 3 }),
      makeProject({ id: 'b', name: 'Order 1', isFeatured: false, displayOrder: 1 }),
      makeProject({ id: 'c', name: 'Order 2', isFeatured: false, displayOrder: 2 }),
    ];
    const { fixture } = await createComponent(projects);
    const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
    const order = cards.map((c) => (c.componentInstance as any).project.displayOrder);
    expect(order).toEqual([1, 2, 3]);
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('should show loading spinner while data is loading', async () => {
    const svcSpy = jasmine.createSpyObj('PortfolioService', ['getProjects']);
    const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);
    // Return a never-resolving observable to stay in loading state
    svcSpy.getProjects.and.returnValue(new Subject().asObservable());

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PortfolioService, useValue: svcSpy },
        { provide: SeoService, useValue: seoSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('.projects-loading'));
    expect(spinner).toBeTruthy();
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('should show error message when API throws an error', async () => {
    const { fixture } = await createComponent([], true);
    const errorEl = fixture.debugElement.query(By.css('.projects-error'));
    expect(errorEl).toBeTruthy();
  });

  it('should hide error message on successful load', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS, false);
    const errorEl = fixture.debugElement.query(By.css('.projects-error'));
    expect(errorEl).toBeNull();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it('should show empty state when API returns no projects', async () => {
    const { fixture } = await createComponent([]);
    const emptyEl = fixture.debugElement.query(By.css('.projects-empty'));
    expect(emptyEl).toBeTruthy();
  });

  it('should not show empty state when projects are present', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const emptyEl = fixture.debugElement.query(By.css('.projects-empty'));
    expect(emptyEl).toBeNull();
  });

  // ── API failure response (success: false) ─────────────────────────────────

  it('should show error when API returns success:false', async () => {
    const svcSpy = jasmine.createSpyObj('PortfolioService', ['getProjects']);
    const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);
    svcSpy.getProjects.and.returnValue(
      of({ success: false, data: null, message: 'Not found' }),
    );

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PortfolioService, useValue: svcSpy },
        { provide: SeoService, useValue: seoSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
    const errorEl = fixture.debugElement.query(By.css('.projects-error'));
    expect(errorEl).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('should have a section element with id="projects"', async () => {
    const { fixture } = await createComponent();
    const section = fixture.debugElement.query(By.css('section#projects'));
    expect(section).toBeTruthy();
  });

  it('should have aria-labelledby on section pointing to section heading', async () => {
    const { fixture } = await createComponent();
    const section = fixture.debugElement.query(By.css('section#projects'));
    expect(section.nativeElement.getAttribute('aria-labelledby')).toBe('projects-heading');
  });

  it('should render the section heading with id "projects-heading"', async () => {
    const { fixture } = await createComponent();
    const heading = fixture.debugElement.query(By.css('#projects-heading'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.tagName.toLowerCase()).toBe('h2');
  });

  it('should have role="list" on the projects grid', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const grid = fixture.debugElement.query(By.css('.projects-grid'));
    expect(grid.nativeElement.getAttribute('role')).toBe('list');
  });

  it('should have aria-label on the projects grid', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const grid = fixture.debugElement.query(By.css('.projects-grid'));
    expect(grid.nativeElement.getAttribute('aria-label')).toBeTruthy();
  });

  it('should wrap each card with role="listitem"', async () => {
    const { fixture } = await createComponent(MOCK_PROJECTS);
    const items = fixture.debugElement.queryAll(By.css('[role="listitem"]'));
    expect(items.length).toBe(MOCK_PROJECTS.length);
  });
});
