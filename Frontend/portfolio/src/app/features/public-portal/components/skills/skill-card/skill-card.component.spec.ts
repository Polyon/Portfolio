import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

import { SkillCardComponent } from './skill-card.component';
import { Skill, SkillCategory } from '../../../../../core/models/skill.model';

const MOCK_SKILL: Skill = {
  id: 's1',
  userId: 'u1',
  name: 'TypeScript',
  category: SkillCategory.BACKEND,
  proficiencyLevel: 5,
  endorsementCount: 12,
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('SkillCardComponent', () => {
  let fixture: ComponentFixture<SkillCardComponent>;
  let component: SkillCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCardComponent);
    component = fixture.componentInstance;
    component.skill = MOCK_SKILL;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should display skill name', () => {
    const nameEl = fixture.debugElement.query(By.css('.skill-name'));
    expect(nameEl.nativeElement.textContent).toContain('TypeScript');
  });

  it('should render category badge with correct label', () => {
    const badge = fixture.debugElement.query(By.css('.category-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('Backend');
  });

  it('should render app-star-rating component', () => {
    const stars = fixture.debugElement.query(By.css('app-star-rating'));
    expect(stars).toBeTruthy();
  });

  it('should render endorsement count when > 0', () => {
    const endorsement = fixture.debugElement.query(By.css('.endorsement-count'));
    expect(endorsement).toBeTruthy();
    expect(endorsement.nativeElement.textContent).toContain('12');
  });

  it('should hide endorsement count when endorsementCount is 0', () => {
    fixture.componentRef.setInput('skill', { ...MOCK_SKILL, endorsementCount: 0 });
    fixture.detectChanges();

    const endorsement = fixture.debugElement.query(By.css('.endorsement-count'));
    expect(endorsement).toBeNull();
  });

  it('should apply category color as CSS custom property', () => {
    const card = fixture.debugElement.query(By.css('.skill-card'));
    const style = card.nativeElement.getAttribute('style');
    expect(style).toContain('--category-color');
  });

  it('should highlight matching search term in skill name', () => {
    fixture.componentRef.setInput('searchTerm', 'Type');
    fixture.detectChanges();

    const nameHtml = fixture.debugElement.query(By.css('.skill-name')).nativeElement.innerHTML;
    expect(nameHtml).toContain('<mark>');
    expect(nameHtml.toLowerCase()).toContain('type');
  });

  it('should be case-insensitive when highlighting search term', () => {
    fixture.componentRef.setInput('searchTerm', 'typescript');
    fixture.detectChanges();

    const nameHtml = fixture.debugElement.query(By.css('.skill-name')).nativeElement.innerHTML;
    expect(nameHtml).toContain('<mark>');
  });

  it('should not highlight when searchTerm is empty', () => {
    component.searchTerm = '';
    fixture.detectChanges();

    const nameHtml = fixture.debugElement.query(By.css('.skill-name')).nativeElement.innerHTML;
    expect(nameHtml).not.toContain('<mark>');
  });

  it('should display correct proficiency label for level 5 (Expert)', () => {
    const label = fixture.debugElement.query(By.css('.proficiency-label'));
    expect(label.nativeElement.textContent.trim()).toBe('Expert');
  });

  it('should display correct proficiency label for level 1 (Beginner)', () => {
    fixture.componentRef.setInput('skill', { ...MOCK_SKILL, proficiencyLevel: 1 });
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('.proficiency-label'));
    expect(label.nativeElement.textContent.trim()).toBe('Beginner');
  });

  it('should escape HTML characters in skill name to prevent XSS', () => {
    component.skill = { ...MOCK_SKILL, name: '<script>alert(1)</script>' };
    fixture.detectChanges();

    const html = fixture.debugElement.query(By.css('.skill-name')).nativeElement.innerHTML;
    expect(html).not.toContain('<script>');
  });
});
