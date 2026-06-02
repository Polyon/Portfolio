import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';

import { AboutComponent } from './about.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Profile } from '../../../../core/models/profile.model';

const MOCK_PROFILE: Profile = {
  id: 'p1',
  userId: 'u1',
  firstName: 'Jane',
  lastName: 'Doe',
  tagline: 'Full-Stack Developer',
  bio: 'Passionate about building great software.\n\nI love clean code.',
  location: { city: 'London', state: '', country: 'UK' },
  profileImageUrl: 'https://example.com/photo.jpg',
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('AboutComponent', () => {
  let fixture: ComponentFixture<AboutComponent>;
  let component: AboutComponent;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;

  beforeEach(async () => {
    portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', ['getProfile']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', [
      'setMeta',
      'setOgTags',
      'setCanonicalUrl',
    ]);

    portfolioServiceSpy.getProfile.and.returnValue(
      of({ success: true, data: MOCK_PROFILE }),
    );

    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PortfolioService, useValue: portfolioServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the About Me section heading', () => {
    const heading = fixture.debugElement.query(By.css('#about-heading'));
    expect(heading).withContext('h2#about-heading').toBeTruthy();
    expect(heading.nativeElement.textContent).toContain('About Me');
  });

  it('should display the profile image via app-image-fallback', () => {
    const imageFallback = fixture.debugElement.query(
      By.css('app-image-fallback'),
    );
    expect(imageFallback).withContext('app-image-fallback present').toBeTruthy();
  });

  it('should render biography via app-rich-text', () => {
    const richText = fixture.debugElement.query(By.css('app-rich-text'));
    expect(richText).withContext('app-rich-text present').toBeTruthy();
  });

  it('should display location when profile has location data', () => {
    const locationEl = fixture.debugElement.query(By.css('.about-location'));
    expect(locationEl).withContext('.about-location present').toBeTruthy();
    expect(locationEl.nativeElement.textContent).toContain('London');
  });

  it('should NOT show CV download button when cvUrl is absent', () => {
    const cvBtn = fixture.debugElement.query(By.css('.cv-button'));
    expect(cvBtn).withContext('no CV button when cvUrl absent').toBeNull();
  });

  it('should show CV download button when cvUrl is present', async () => {
    const profileWithCv: Profile = { ...(MOCK_PROFILE as any), cvUrl: 'https://example.com/cv.pdf' };
    portfolioServiceSpy.getProfile.and.returnValue(
      of({ success: true, data: profileWithCv }),
    );

    fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cvBtn = fixture.debugElement.query(By.css('.cv-button'));
    expect(cvBtn).withContext('CV button present when cvUrl provided').toBeTruthy();
    expect(cvBtn.attributes['href']).toBe('https://example.com/cv.pdf');
    expect(cvBtn.attributes['target']).toBe('_blank');
    expect(cvBtn.attributes['rel']).toContain('noopener');
  });

  // ── Loading / Error states ───────────────────────────────────────────────────

  it('should show loading spinner before data arrives', async () => {
    portfolioServiceSpy.getProfile.and.returnValue(new Subject<any>().asObservable());

    fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).withContext('spinner visible during load').toBeTruthy();
  });

  it('should show error message when API call fails', async () => {
    portfolioServiceSpy.getProfile.and.returnValue(throwError(() => new Error('Network error')));

    fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.about-error'));
    expect(errorEl).withContext('.about-error present on failure').toBeTruthy();
    expect(errorEl.nativeElement.textContent).toContain('Could not load');
  });

  it('should show error when API returns success=false', async () => {
    portfolioServiceSpy.getProfile.and.returnValue(
      of({ success: false, data: null as any, message: 'Not found' }),
    );

    fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.about-error'));
    expect(errorEl).withContext('.about-error present on API failure').toBeTruthy();
  });

  // ── SEO ─────────────────────────────────────────────────────────────────────

  it('should call seoService.setMeta with About section title', () => {
    expect(seoServiceSpy.setMeta).toHaveBeenCalledWith(
      'About Jane Doe',
      jasmine.any(String),
      jasmine.any(String),
    );
  });

  it('should call seoService.setOgTags with OG image URL', () => {
    expect(seoServiceSpy.setOgTags).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.any(String),
      MOCK_PROFILE.profileImageUrl!,
      jasmine.stringContaining('#about'),
    );
  });

  it('should call seoService.setCanonicalUrl with #about hash', () => {
    expect(seoServiceSpy.setCanonicalUrl).toHaveBeenCalledWith(
      jasmine.stringContaining('#about'),
    );
  });

  // ── Data flow ────────────────────────────────────────────────────────────────

  it('should call portfolioService.getProfile on init', () => {
    expect(portfolioServiceSpy.getProfile).toHaveBeenCalled();
  });

  it('should not render about content while loading', () => {
    portfolioServiceSpy.getProfile.and.returnValue(new Subject<any>().asObservable());

    fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();

    const grid = fixture.debugElement.query(By.css('.about-grid'));
    expect(grid).withContext('about-grid hidden during load').toBeNull();
  });
});
