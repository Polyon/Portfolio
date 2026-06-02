import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

import { ProjectCardComponent } from './project-card.component';
import { Project, ProjectStatus, ProjectImage } from '../../../../../core/models/project.model';
import { SkillCategory } from '../../../../../core/models/skill.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  userId: 'u1',
  name: 'My Awesome Project',
  description: 'A longer description of the project.',
  shortDescription: 'Short and sweet description.',
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

async function createComponent(
  project: Project,
): Promise<ComponentFixture<ProjectCardComponent>> {
  await TestBed.configureTestingModule({
    imports: [ProjectCardComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProjectCardComponent);
  fixture.componentRef.setInput('project', project);
  fixture.detectChanges();
  return fixture;
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('ProjectCardComponent', () => {

  // ── Creation ─────────────────────────────────────────────────────────────

  it('should create', async () => {
    const f = await createComponent(makeProject());
    expect(f.componentInstance).toBeTruthy();
  });

  // ── Basic content ─────────────────────────────────────────────────────────

  it('should display the project name', async () => {
    const f = await createComponent(makeProject({ name: 'Portfolio Site' }));
    const el = f.debugElement.query(By.css('.project-name'));
    expect(el.nativeElement.textContent.trim()).toBe('Portfolio Site');
  });

  it('should display the short description', async () => {
    const f = await createComponent(makeProject({ shortDescription: 'Quick summary here' }));
    const el = f.debugElement.query(By.css('.project-description'));
    expect(el.nativeElement.textContent.trim()).toBe('Quick summary here');
  });

  it('should not render description element when shortDescription is empty', async () => {
    const f = await createComponent(makeProject({ shortDescription: undefined }));
    const el = f.debugElement.query(By.css('.project-description'));
    expect(el).toBeNull();
  });

  it('should render the status badge', async () => {
    const f = await createComponent(makeProject({ status: ProjectStatus.IN_PROGRESS }));
    const badge = f.debugElement.query(By.css('app-status-badge'));
    expect(badge).toBeTruthy();
  });

  // ── Featured indicator ────────────────────────────────────────────────────

  it('should show the featured badge when isFeatured is true', async () => {
    const f = await createComponent(makeProject({ isFeatured: true }));
    const badge = f.debugElement.query(By.css('.featured-badge'));
    expect(badge).toBeTruthy();
  });

  it('should not show the featured badge when isFeatured is false', async () => {
    const f = await createComponent(makeProject({ isFeatured: false }));
    const badge = f.debugElement.query(By.css('.featured-badge'));
    expect(badge).toBeNull();
  });

  it('should apply the .featured CSS class when isFeatured is true', async () => {
    const f = await createComponent(makeProject({ isFeatured: true }));
    const card = f.debugElement.query(By.css('.project-card'));
    expect(card.nativeElement.classList.contains('featured')).toBeTrue();
  });

  // ── Image gallery ─────────────────────────────────────────────────────────

  it('should display the image when imageUrl is provided', async () => {
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img.png' }));
    const img = f.debugElement.query(By.css('.card-image'));
    expect(img).toBeTruthy();
    expect(img.nativeElement.getAttribute('src')).toBe('https://example.com/img.png');
  });

  it('should show the placeholder when no imageUrl is provided', async () => {
    const f = await createComponent(makeProject({ imageUrl: undefined, images: [] }));
    const placeholder = f.debugElement.query(By.css('.image-placeholder'));
    expect(placeholder).toBeTruthy();
  });

  it('should not show gallery nav when there is only one image', async () => {
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img.png', images: [] }));
    const nav = f.debugElement.query(By.css('.gallery-nav'));
    expect(nav).toBeNull();
  });

  it('should show gallery nav when there are multiple images', async () => {
    const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img1.png', images }));
    const nav = f.debugElement.query(By.css('.gallery-nav'));
    expect(nav).toBeTruthy();
  });

  it('should advance to next image when nextImage() is called', async () => {
    const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img1.png', images }));
    const comp = f.componentInstance as any;
    comp.nextImage();
    f.detectChanges();
    expect(comp.activeImageIndex()).toBe(1);
  });

  it('should wrap to first image from last on nextImage()', async () => {
    const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img1.png', images }));
    const comp = f.componentInstance as any;
    comp.activeImageIndex.set(1); // already last
    comp.nextImage();
    f.detectChanges();
    expect(comp.activeImageIndex()).toBe(0);
  });

  it('should advance to prev image when prevImage() is called', async () => {
    const images: ProjectImage[] = [{ url: 'https://example.com/img2.png', order: 1 }];
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img1.png', images }));
    const comp = f.componentInstance as any;
    comp.activeImageIndex.set(1);
    comp.prevImage();
    f.detectChanges();
    expect(comp.activeImageIndex()).toBe(0);
  });

  it('should set imageLoadFailed and remove primary image on image error', async () => {
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img.png' }));
    const comp = f.componentInstance as any;
    comp.onImageError();
    f.detectChanges();
    expect(comp.imageLoadFailed()).toBeTrue();
    expect(comp.allImages().length).toBe(0);
  });

  // ── Tech skill chips ──────────────────────────────────────────────────────

  it('should render skill chips up to MAX_VISIBLE_SKILLS', async () => {
    const skills = [
      { id: 's1', name: 'TypeScript', category: SkillCategory.BACKEND },
      { id: 's2', name: 'Angular', category: SkillCategory.FRONTEND },
      { id: 's3', name: 'Node.js', category: SkillCategory.BACKEND },
      { id: 's4', name: 'RxJS', category: SkillCategory.FRONTEND },
    ];
    const f = await createComponent(makeProject({ skills: skills as any }));
    const chips = f.debugElement.queryAll(By.css('.tech-chip:not(.more-chip)'));
    expect(chips.length).toBe(4);
  });

  it('should render overflow chip when more than MAX_VISIBLE_SKILLS are present', async () => {
    const skills = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      name: `Skill${i}`,
      category: SkillCategory.BACKEND,
    }));
    const f = await createComponent(makeProject({ skills: skills as any }));
    const moreChip = f.debugElement.query(By.css('.more-chip'));
    expect(moreChip).toBeTruthy();
    expect(moreChip.nativeElement.textContent.trim()).toContain('+2');
  });

  it('should not render the tech-tags section when skills array is empty', async () => {
    const f = await createComponent(makeProject({ skills: [] }));
    const tagsEl = f.debugElement.query(By.css('.tech-tags'));
    expect(tagsEl).toBeNull();
  });

  // ── Action buttons ────────────────────────────────────────────────────────

  it('should render "View Live" button when liveUrl is provided', async () => {
    const f = await createComponent(makeProject({ liveUrl: 'https://example.com' }));
    const btn = f.debugElement.query(By.css('.live-btn'));
    expect(btn).toBeTruthy();
    expect(btn.nativeElement.getAttribute('href')).toBe('https://example.com');
  });

  it('should not render "View Live" button when liveUrl is absent', async () => {
    const f = await createComponent(makeProject({ liveUrl: undefined }));
    const btn = f.debugElement.query(By.css('.live-btn'));
    expect(btn).toBeNull();
  });

  it('should render "View Code" button when repositoryUrl is provided', async () => {
    const f = await createComponent(makeProject({ repositoryUrl: 'https://github.com/user/repo' }));
    const btn = f.debugElement.query(By.css('.code-btn'));
    expect(btn).toBeTruthy();
    expect(btn.nativeElement.getAttribute('href')).toBe('https://github.com/user/repo');
  });

  it('should not render "View Code" button when repositoryUrl is absent', async () => {
    const f = await createComponent(makeProject({ repositoryUrl: undefined }));
    const btn = f.debugElement.query(By.css('.code-btn'));
    expect(btn).toBeNull();
  });

  it('should set rel="noopener noreferrer" on action links', async () => {
    const f = await createComponent(makeProject({
      liveUrl: 'https://example.com',
      repositoryUrl: 'https://github.com/user/repo',
    }));
    const links = f.debugElement.queryAll(By.css('.action-btn'));
    for (const link of links) {
      expect(link.nativeElement.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('should set target="_blank" on action links', async () => {
    const f = await createComponent(makeProject({
      liveUrl: 'https://example.com',
      repositoryUrl: 'https://github.com/user/repo',
    }));
    const links = f.debugElement.queryAll(By.css('.action-btn'));
    for (const link of links) {
      expect(link.nativeElement.getAttribute('target')).toBe('_blank');
    }
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('should have aria-label on the article element', async () => {
    const f = await createComponent(makeProject({ name: 'Test Project' }));
    const article = f.debugElement.query(By.css('.project-card'));
    expect(article.nativeElement.getAttribute('aria-label')).toContain('Test Project');
  });

  it('should include "(Featured)" in aria-label when isFeatured is true', async () => {
    const f = await createComponent(makeProject({ name: 'Feature Thing', isFeatured: true }));
    const article = f.debugElement.query(By.css('.project-card'));
    expect(article.nativeElement.getAttribute('aria-label')).toContain('(Featured)');
  });

  it('should have lazy loading attribute on card image', async () => {
    const f = await createComponent(makeProject({ imageUrl: 'https://example.com/img.png' }));
    const img = f.debugElement.query(By.css('.card-image'));
    expect(img.nativeElement.getAttribute('loading')).toBe('lazy');
  });

  // ── remainingSkillNames() ─────────────────────────────────────────────────

  it('should return comma-separated names for skills beyond MAX_VISIBLE_SKILLS', async () => {
    const skills = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      name: `Skill${i}`,
      category: SkillCategory.BACKEND,
    }));
    const f = await createComponent(makeProject({ skills: skills as any }));
    const comp = f.componentInstance;
    const names = (comp as any).remainingSkillNames();
    expect(names).toBe('Skill4, Skill5');
  });

  it('should return empty string from remainingSkillNames() when no skills', async () => {
    const f = await createComponent(makeProject({ skills: undefined }));
    const names = (f.componentInstance as any).remainingSkillNames();
    expect(names).toBe('');
  });
});
