import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ExperienceCardComponent } from './experience-card.component';
import { Experience, EmploymentType } from '../../../../../core/models/experience.model';
import { SkillCategory } from '../../../../../core/models/skill.model';
import { formatDate, calculateTenure } from '../../../utils/utils';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeExp = (overrides: Partial<Experience> = {}): Experience => ({
  id: 'e1',
  userId: 'u1',
  company: 'Acme Corp',
  title: 'Senior Engineer',
  description: 'Worked on many things.',
  startDate: '2021-03-01T00:00:00Z',
  endDate: '2023-09-01T00:00:00Z',
  isCurrentRole: false,
  isPublished: true,
  displayOrder: 0,
  createdAt: '2021-03-01T00:00:00Z',
  updatedAt: '2023-09-01T00:00:00Z',
  ...overrides,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createComponent(
  exp: Experience,
): Promise<ComponentFixture<ExperienceCardComponent>> {
  await TestBed.configureTestingModule({
    imports: [ExperienceCardComponent],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(ExperienceCardComponent);
  fixture.componentRef.setInput('experience', exp);
  fixture.detectChanges();
  return fixture;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ExperienceCardComponent', () => {

  // ── Creation ───────────────────────────────────────────────────────────────

  it('should create', async () => {
    const fixture = await createComponent(makeExp());
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── Content rendering ──────────────────────────────────────────────────────

  it('should display job title', async () => {
    const fixture = await createComponent(makeExp({ title: 'Lead Developer' }));
    const el = fixture.debugElement.query(By.css('.job-title'));
    expect(el.nativeElement.textContent.trim()).toBe('Lead Developer');
  });

  it('should display company name', async () => {
    const fixture = await createComponent(makeExp({ company: 'TechCorp' }));
    const el = fixture.debugElement.query(By.css('.company-name'));
    expect(el.nativeElement.textContent.trim()).toBe('TechCorp');
  });

  it('should display description text', async () => {
    const fixture = await createComponent(makeExp({ description: 'Awesome work done here.' }));
    const el = fixture.debugElement.query(By.css('.description'));
    expect(el.nativeElement.textContent.trim()).toContain('Awesome work done here.');
  });

  it('should display employment type when provided', async () => {
    const fixture = await createComponent(makeExp({ employmentType: EmploymentType.FULL_TIME }));
    const el = fixture.debugElement.query(By.css('.employment-type'));
    expect(el).toBeTruthy();
    expect(el.nativeElement.textContent.trim()).toBe('Full-time');
  });

  it('should display location when provided', async () => {
    const fixture = await createComponent(makeExp({ location: 'Remote' }));
    const el = fixture.debugElement.query(By.css('.location'));
    expect(el).toBeTruthy();
    expect(el.nativeElement.textContent).toContain('Remote');
  });

  // ── Date formatting ────────────────────────────────────────────────────────

  it('should show "Present" as end date for current role', async () => {
    const fixture = await createComponent(makeExp({ isCurrentRole: true, endDate: undefined }));
    const el = fixture.debugElement.query(By.css('.date-range'));
    expect(el.nativeElement.textContent).toContain('Present');
  });

  it('should format startDate correctly', async () => {
    const exp = makeExp({ startDate: '2021-03-01T00:00:00Z' });
    const fixture = await createComponent(exp);
    const el = fixture.debugElement.query(By.css('.date-range'));
    expect(el.nativeElement.textContent).toContain(formatDate(exp.startDate));
  });

  it('should format endDate correctly', async () => {
    const exp = makeExp({ endDate: '2023-09-01T00:00:00Z', isCurrentRole: false });
    const fixture = await createComponent(exp);
    const el = fixture.debugElement.query(By.css('.date-range'));
    expect(el.nativeElement.textContent).toContain(formatDate(exp.endDate));
  });

  it('should display tenure duration', async () => {
    const exp = makeExp({ startDate: '2021-03-01T00:00:00Z', endDate: '2023-09-01T00:00:00Z' });
    const fixture = await createComponent(exp);
    const el = fixture.debugElement.query(By.css('.tenure'));
    const expected = calculateTenure(exp.startDate, exp.endDate!);
    expect(el.nativeElement.textContent.trim()).toBe(expected);
  });

  // ── Current role ───────────────────────────────────────────────────────────

  it('should show "Current" badge for current role', async () => {
    const fixture = await createComponent(makeExp({ isCurrentRole: true, endDate: undefined }));
    const badge = fixture.debugElement.query(By.css('.current-badge'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent.trim()).toBe('Current');
  });

  it('should NOT show "Current" badge for past role', async () => {
    const fixture = await createComponent(makeExp({ isCurrentRole: false }));
    const badge = fixture.debugElement.query(By.css('.current-badge'));
    expect(badge).toBeNull();
  });

  it('should apply "current-role" CSS class to the card for current role', async () => {
    const fixture = await createComponent(makeExp({ isCurrentRole: true }));
    const card = fixture.debugElement.query(By.css('.experience-card'));
    expect(card.classes['current-role']).toBeTrue();
  });

  // ── Skill chips ────────────────────────────────────────────────────────────

  it('should render skill chips when skills are provided', async () => {
    const exp = makeExp({
      skills: [
        { id: 'sk1', userId: 'u1', name: 'Angular', category: SkillCategory.FRONTEND,
          proficiencyLevel: 4, endorsementCount: 0, isPublished: true,
          createdAt: '', updatedAt: '' },
        { id: 'sk2', userId: 'u1', name: 'TypeScript', category: SkillCategory.BACKEND,
          proficiencyLevel: 5, endorsementCount: 0, isPublished: true,
          createdAt: '', updatedAt: '' },
      ],
    });
    const fixture = await createComponent(exp);
    const chips = fixture.debugElement.queryAll(By.css('mat-chip'));
    expect(chips.length).toBe(2);
  });

  it('should NOT render the skills section when no skills provided', async () => {
    const fixture = await createComponent(makeExp({ skills: [] }));
    const chipsSection = fixture.debugElement.query(By.css('.skills-chips'));
    expect(chipsSection).toBeNull();
  });

  // ── Company logo ───────────────────────────────────────────────────────────

  it('should render company logo when companyLogoUrl is set', async () => {
    const fixture = await createComponent(makeExp({ companyLogoUrl: 'https://example.com/logo.png' }));
    const img = fixture.debugElement.query(By.css('img.company-logo'));
    expect(img).toBeTruthy();
    expect(img.attributes['src']).toBe('https://example.com/logo.png');
  });

  it('should render fallback icon when no companyLogoUrl', async () => {
    const fixture = await createComponent(makeExp({ companyLogoUrl: undefined }));
    const icon = fixture.debugElement.query(By.css('mat-icon.company-logo-fallback'));
    expect(icon).toBeTruthy();
  });
});
