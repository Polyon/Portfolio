/**
 * Integration / interaction tests for the Projects section.
 *
 * These tests cover user-observable behaviour from the outside:
 *  - Featured project sorting
 *  - Card action link attributes (href, target, rel)
 *  - Image lazy-loading attribute
 *  - Gallery navigation interactions
 *  - Accessibility (ARIA roles, labels, landmark)
 *  - Loading / error / empty states
 *
 * NOTE: We have only Jasmine/Karma in this project — there is no Cypress or
 * Playwright. "Integration" tests are Angular TestBed component tests that
 * verify the fully-composed component tree including child components.
 */
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { ProjectsComponent } from './projects.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Project, ProjectStatus, ProjectImage } from '../../../../core/models/project.model';
import { SkillCategory } from '../../../../core/models/skill.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> & { id: string }): Project => ({
  userId: 'u1',
  name: 'Test Project',
  description: 'Full description of the project.',
  shortDescription: 'Short summary.',
  status: ProjectStatus.DEPLOYED,
  startDate: '2023-01-01T00:00:00Z',
  isFeatured: false,
  isPublished: true,
  displayOrder: 1,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-06-01T00:00:00Z',
  skills: [],
  ...overrides,
});

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function setup(projects: Project[], shouldError = false) {
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
      { provide: PLATFORM_ID, useValue: 'server' }, // skip IntersectionObserver in tests
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProjectsComponent);
  fixture.detectChanges();
  return { fixture, svcSpy };
}

// ─── Interaction / integration specs ─────────────────────────────────────────

describe('Projects — integration', () => {

  // ── Featured sorting ──────────────────────────────────────────────────────

  describe('featured sorting', () => {

    it('should place the featured project before non-featured ones', async () => {
      const projects = [
        makeProject({ id: 'a', name: 'Plain A',    isFeatured: false, displayOrder: 1 }),
        makeProject({ id: 'b', name: 'Featured B', isFeatured: true,  displayOrder: 2 }),
        makeProject({ id: 'c', name: 'Plain C',    isFeatured: false, displayOrder: 3 }),
      ];
      const { fixture } = await setup(projects);
      const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
      expect(cards.length).toBe(3);
      const firstProject = (cards[0].componentInstance as any).project as Project;
      expect(firstProject.isFeatured).toBeTrue();
    });

    it('should preserve displayOrder order among non-featured projects', async () => {
      const projects = [
        makeProject({ id: 'a', name: 'Order 3', isFeatured: false, displayOrder: 3 }),
        makeProject({ id: 'b', name: 'Order 1', isFeatured: false, displayOrder: 1 }),
        makeProject({ id: 'c', name: 'Order 2', isFeatured: false, displayOrder: 2 }),
      ];
      const { fixture } = await setup(projects);
      const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
      const displayOrders = cards.map((c) => (c.componentInstance as any).project.displayOrder as number);
      expect(displayOrders).toEqual([1, 2, 3]);
    });

  });

  // ── Action button attributes ───────────────────────────────────────────────

  describe('action button links', () => {

    it('should set correct href on "View Live" anchor', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', name: 'Live App', liveUrl: 'https://example.com/live' }),
      ]);
      const link = fixture.debugElement.query(By.css('.live-btn'));
      expect(link).toBeTruthy();
      expect(link.nativeElement.getAttribute('href')).toBe('https://example.com/live');
    });

    it('should set correct href on "View Code" anchor', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', name: 'Open Source', repositoryUrl: 'https://github.com/user/repo' }),
      ]);
      const link = fixture.debugElement.query(By.css('.code-btn'));
      expect(link).toBeTruthy();
      expect(link.nativeElement.getAttribute('href')).toBe('https://github.com/user/repo');
    });

    it('should open action links in a new tab (target="_blank")', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', liveUrl: 'https://example.com', repositoryUrl: 'https://github.com/x' }),
      ]);
      const links = fixture.debugElement.queryAll(By.css('.action-btn'));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.nativeElement.getAttribute('target')).toBe('_blank');
      }
    });

    it('should have rel="noopener noreferrer" on all action links', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', liveUrl: 'https://example.com', repositoryUrl: 'https://github.com/x' }),
      ]);
      const links = fixture.debugElement.queryAll(By.css('.action-btn'));
      for (const link of links) {
        expect(link.nativeElement.getAttribute('rel')).toBe('noopener noreferrer');
      }
    });

    it('should not render live button when liveUrl is absent', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1', liveUrl: undefined })]);
      const btn = fixture.debugElement.query(By.css('.live-btn'));
      expect(btn).toBeNull();
    });

    it('should not render code button when repositoryUrl is absent', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1', repositoryUrl: undefined })]);
      const btn = fixture.debugElement.query(By.css('.code-btn'));
      expect(btn).toBeNull();
    });

  });

  // ── Image lazy loading ────────────────────────────────────────────────────

  describe('image lazy loading', () => {

    it('should set loading="lazy" on project images', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', imageUrl: 'https://example.com/img.png' }),
      ]);
      const img = fixture.debugElement.query(By.css('.card-image'));
      expect(img).toBeTruthy();
      expect(img.nativeElement.getAttribute('loading')).toBe('lazy');
    });

    it('should show placeholder when no imageUrl is provided', async () => {
      const { fixture } = await setup([
        makeProject({ id: 'p1', imageUrl: undefined, images: [] }),
      ]);
      const placeholder = fixture.debugElement.query(By.css('.image-placeholder'));
      expect(placeholder).toBeTruthy();
    });

  });

  // ── Gallery navigation interaction ────────────────────────────────────────

  describe('gallery navigation', () => {

    it('should show gallery nav buttons when project has multiple images', async () => {
      const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
      const { fixture } = await setup([
        makeProject({ id: 'p1', imageUrl: 'https://example.com/img1.png', images }),
      ]);
      const nav = fixture.debugElement.query(By.css('.gallery-nav'));
      expect(nav).toBeTruthy();
    });

    it('should advance to next image when next button is clicked', async () => {
      const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
      const { fixture } = await setup([
        makeProject({ id: 'p1', imageUrl: 'https://example.com/img1.png', images }),
      ]);
      const nextBtn = fixture.debugElement.query(By.css('.gallery-btn.next'));
      nextBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      const cardComp = fixture.debugElement.query(By.css('app-project-card')).componentInstance as any;
      expect(cardComp.activeImageIndex()).toBe(1);
    });

    it('should go back to previous image when prev button is clicked', async () => {
      const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
      const { fixture } = await setup([
        makeProject({ id: 'p1', imageUrl: 'https://example.com/img1.png', images }),
      ]);
      const cardComp = fixture.debugElement.query(By.css('app-project-card')).componentInstance as any;
      // Start on image 1
      cardComp.activeImageIndex.set(1);
      fixture.detectChanges();

      const prevBtn = fixture.debugElement.query(By.css('.gallery-btn.prev'));
      prevBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(cardComp.activeImageIndex()).toBe(0);
    });

  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('accessibility', () => {

    it('should render a <section> landmark with id="projects"', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1' })]);
      const section = fixture.debugElement.query(By.css('section#projects'));
      expect(section).toBeTruthy();
    });

    it('should have aria-labelledby on section pointing to "projects-heading"', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1' })]);
      const section = fixture.debugElement.query(By.css('section#projects'));
      expect(section.nativeElement.getAttribute('aria-labelledby')).toBe('projects-heading');
    });

    it('should have an h2 with id "projects-heading"', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1' })]);
      const heading = fixture.debugElement.query(By.css('h2#projects-heading'));
      expect(heading).toBeTruthy();
    });

    it('should render projects as a list with role="list"', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1' })]);
      const list = fixture.debugElement.query(By.css('[role="list"]'));
      expect(list).toBeTruthy();
    });

    it('should have aria-label on project cards', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1', name: 'Accessible Project' })]);
      const card = fixture.debugElement.query(By.css('.project-card'));
      const label = card.nativeElement.getAttribute('aria-label');
      expect(label).toContain('Accessible Project');
    });

    it('should include "(Featured)" in aria-label for featured projects', async () => {
      const { fixture } = await setup([makeProject({ id: 'p1', name: 'Star Project', isFeatured: true })]);
      const card = fixture.debugElement.query(By.css('.project-card.featured'));
      expect(card.nativeElement.getAttribute('aria-label')).toContain('(Featured)');
    });

  });

  // ── Empty state ───────────────────────────────────────────────────────────

  describe('empty state', () => {

    it('should display empty state message when no projects are returned', async () => {
      const { fixture } = await setup([]);
      const empty = fixture.debugElement.query(By.css('.projects-empty'));
      expect(empty).toBeTruthy();
    });

    it('should not render any cards when projects list is empty', async () => {
      const { fixture } = await setup([]);
      const cards = fixture.debugElement.queryAll(By.css('app-project-card'));
      expect(cards.length).toBe(0);
    });

  });

  // ── Error state ───────────────────────────────────────────────────────────

  describe('error state', () => {

    it('should show the error element when the API request fails', async () => {
      const { fixture } = await setup([], true);
      const errorEl = fixture.debugElement.query(By.css('.projects-error'));
      expect(errorEl).toBeTruthy();
    });

    it('should not show the grid when the API request fails', async () => {
      const { fixture } = await setup([], true);
      const grid = fixture.debugElement.query(By.css('.projects-grid'));
      expect(grid).toBeNull();
    });

  });

  // ── Tech chips ────────────────────────────────────────────────────────────

  describe('tech chips', () => {

    it('should render skill chips on project cards', async () => {
      const skills = [
        { id: 's1', name: 'TypeScript', category: SkillCategory.BACKEND },
        { id: 's2', name: 'Angular',    category: SkillCategory.FRONTEND },
      ];
      const { fixture } = await setup([
        makeProject({ id: 'p1', skills: skills as any }),
      ]);
      const chips = fixture.debugElement.queryAll(By.css('.tech-chip:not(.more-chip)'));
      expect(chips.length).toBe(2);
    });

    it('should show overflow chip when project has more than 4 skills', async () => {
      const skills = Array.from({ length: 6 }, (_, i) => ({
        id: `s${i}`,
        name: `Skill${i}`,
        category: SkillCategory.BACKEND,
      }));
      const { fixture } = await setup([makeProject({ id: 'p1', skills: skills as any })]);
      const moreChip = fixture.debugElement.query(By.css('.more-chip'));
      expect(moreChip).toBeTruthy();
      expect(moreChip.nativeElement.textContent).toContain('+2');
    });

  });

});
