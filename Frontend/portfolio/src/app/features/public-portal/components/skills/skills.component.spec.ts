import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';

import { SkillsComponent } from './skills.component';
import { PortfolioService } from '../../services/portfolio.service';
import { Skill, SkillCategory } from '../../../../core/models/skill.model';

const makeSkill = (
  overrides: Partial<Skill> & { id: string; name: string; category: SkillCategory },
): Skill => ({
  userId: 'u1',
  proficiencyLevel: 3,
  endorsementCount: 0,
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const MOCK_SKILLS: Skill[] = [
  makeSkill({ id: 's1', name: 'TypeScript', category: SkillCategory.BACKEND, proficiencyLevel: 5 }),
  makeSkill({ id: 's2', name: 'Angular', category: SkillCategory.FRONTEND, proficiencyLevel: 4 }),
  makeSkill({ id: 's3', name: 'Docker', category: SkillCategory.DEVOPS, proficiencyLevel: 3 }),
  makeSkill({ id: 's4', name: 'PostgreSQL', category: SkillCategory.DATABASE, proficiencyLevel: 4 }),
  makeSkill({ id: 's5', name: 'TensorFlow', category: SkillCategory.AI, proficiencyLevel: 2 }),
  makeSkill({ id: 's6', name: 'Node.js', category: SkillCategory.BACKEND, proficiencyLevel: 5 }),
];

describe('SkillsComponent', () => {
  let fixture: ComponentFixture<SkillsComponent>;
  let component: SkillsComponent;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', ['getSkills']);
    portfolioServiceSpy.getSkills.and.returnValue(
      of({ success: true, data: MOCK_SKILLS }),
    );

    await TestBed.configureTestingModule({
      imports: [SkillsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: PortfolioService, useValue: portfolioServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the section heading', () => {
    const heading = fixture.debugElement.query(By.css('#skills-heading'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.textContent).toContain('Skills');
  });

  it('should render all skill cards from API data', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(MOCK_SKILLS.length);
  });

  it('should display correct skills count text', () => {
    const countEl = fixture.debugElement.query(By.css('.skills-count'));
    expect(countEl.nativeElement.textContent).toContain(`${MOCK_SKILLS.length} of ${MOCK_SKILLS.length}`);
  });

  it('should render category filter toggle buttons', () => {
    const toggles = fixture.debugElement.queryAll(By.css('mat-button-toggle'));
    expect(toggles.length).toBeGreaterThanOrEqual(7); // All + 6 categories
  });

  it('should render a search input', () => {
    const input = fixture.debugElement.query(By.css('input[type="search"]'));
    expect(input).toBeTruthy();
  });

  // ── Loading / Error ────────────────────────────────────────────────────────

  it('should show loading spinner while data loads', () => {
    portfolioServiceSpy.getSkills.and.returnValue(new Subject<any>().asObservable());
    fixture = TestBed.createComponent(SkillsComponent);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('should show error message when API fails', async () => {
    portfolioServiceSpy.getSkills.and.returnValue(throwError(() => new Error('Network error')));
    fixture = TestBed.createComponent(SkillsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('.skills-error'));
    expect(error).toBeTruthy();
    expect(error.nativeElement.textContent).toContain('Could not load');
  });

  it('should show error when API returns success=false', async () => {
    portfolioServiceSpy.getSkills.and.returnValue(
      of({ success: false, data: null as any, message: 'error' }),
    );
    fixture = TestBed.createComponent(SkillsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('.skills-error'));
    expect(error).toBeTruthy();
  });

  it('should show empty state when API returns an empty array', async () => {
    portfolioServiceSpy.getSkills.and.returnValue(of({ success: true, data: [] }));
    fixture = TestBed.createComponent(SkillsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.skills-empty'));
    expect(empty).toBeTruthy();
  });

  // ── Category filtering ────────────────────────────────────────────────────

  it('should filter to only Backend skills when Backend category selected', () => {
    (component as any).selectedCategory.set(SkillCategory.BACKEND);
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    const backendCount = MOCK_SKILLS.filter((s) => s.category === SkillCategory.BACKEND).length;
    expect(cards.length).toBe(backendCount);
  });

  it('should show all skills when "All" category selected', () => {
    (component as any).selectedCategory.set(SkillCategory.FRONTEND);
    fixture.detectChanges();

    (component as any).selectedCategory.set('ALL');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(MOCK_SKILLS.length);
  });

  it('should return zero results for a category with no skills', async () => {
    (component as any).selectedCategory.set(SkillCategory.OTHER);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    const otherCount = MOCK_SKILLS.filter((s) => s.category === SkillCategory.OTHER).length;
    expect(cards.length).toBe(otherCount);
  });

  // ── Search filtering ───────────────────────────────────────────────────────

  it('should filter skills by name after debounce', () => {
    (component as any).searchQuery.set('Angular');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(1);
  });

  it('should be case-insensitive in search', () => {
    (component as any).searchQuery.set('typescript');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(1);
  });

  it('should show empty state when search yields no matches', () => {
    (component as any).searchQuery.set('ZZZNOTEXIST');
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.skills-empty'));
    expect(empty).toBeTruthy();
  });

  it('should combine category filter and search', () => {
    (component as any).selectedCategory.set(SkillCategory.BACKEND);
    (component as any).searchQuery.set('Node');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(1);
  });

  it('should update count text after filtering', () => {
    (component as any).selectedCategory.set(SkillCategory.FRONTEND);
    fixture.detectChanges();

    const countEl = fixture.debugElement.query(By.css('.skills-count'));
    const frontendCount = MOCK_SKILLS.filter((s) => s.category === SkillCategory.FRONTEND).length;
    expect(countEl.nativeElement.textContent).toContain(`${frontendCount} of ${MOCK_SKILLS.length}`);
  });

  // ── Performance ───────────────────────────────────────────────────────────

  it('should render 25 skills in under 500ms', async () => {
    const largeList: Skill[] = Array.from({ length: 25 }, (_, i) =>
      makeSkill({ id: `s${i}`, name: `Skill ${i}`, category: SkillCategory.BACKEND }),
    );
    portfolioServiceSpy.getSkills.and.returnValue(of({ success: true, data: largeList }));

    fixture = TestBed.createComponent(SkillsComponent);
    const start = performance.now();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const elapsed = performance.now() - start;

    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(25);
    expect(elapsed).toBeLessThan(500);
  });
});
