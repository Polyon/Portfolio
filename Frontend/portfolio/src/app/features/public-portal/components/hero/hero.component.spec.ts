import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { HeroComponent } from './hero.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { ImageOptimizerService } from '../../services/image-optimizer.service';
import { Profile } from '../../../../core/models/profile.model';

const MOCK_PROFILE: Profile = {
  id: 'p1',
  userId: 'u1',
  firstName: 'Jane',
  lastName: 'Doe',
  tagline: 'Full-Stack Developer',
  bio: 'Passionate about building great software.',
  location: { city: 'London', country: 'UK' },
  profileImageUrl: 'https://example.com/photo.jpg',
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('HeroComponent', () => {
  let fixture: ComponentFixture<HeroComponent>;
  let component: HeroComponent;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let imageOptimizerSpy: jasmine.SpyObj<ImageOptimizerService>;

  beforeEach(async () => {
    portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', ['getProfile']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', [
      'setMeta',
      'setOgTags',
      'setCanonicalUrl',
      'setStructuredData',
      'applyPersonSchema',
    ]);
    imageOptimizerSpy = jasmine.createSpyObj('ImageOptimizerService', ['preloadCriticalImages']);

    portfolioServiceSpy.getProfile.and.returnValue(
      of({ success: true, data: MOCK_PROFILE }),
    );

    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PortfolioService, useValue: portfolioServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ImageOptimizerService, useValue: imageOptimizerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call portfolioService.getProfile() on init', () => {
    expect(portfolioServiceSpy.getProfile).toHaveBeenCalledTimes(1);
  });

  it('should render profile name after data loads', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.hero-name')?.textContent).toContain('Jane');
    expect(el.querySelector('.hero-name')?.textContent).toContain('Doe');
  });

  it('should render tagline', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.hero-tagline')?.textContent).toContain('Full-Stack Developer');
  });

  it('should apply SEO meta tags with profile data', () => {
    expect(seoServiceSpy.setMeta).toHaveBeenCalledWith(
      jasmine.stringMatching(/Jane Doe/),
      jasmine.any(String),
      jasmine.any(String),
    );
    expect(seoServiceSpy.setOgTags).toHaveBeenCalled();
    expect(seoServiceSpy.setCanonicalUrl).toHaveBeenCalled();
    expect(seoServiceSpy.setStructuredData).toHaveBeenCalled();
  });

  it('should render CTA buttons', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should render scroll indicator', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-scroll-indicator')).toBeTruthy();
  });

  it('should show error state when API returns failure', async () => {
    portfolioServiceSpy.getProfile.and.returnValue(
      of({ success: false, data: null as unknown as Profile }),
    );

    const errorFixture = TestBed.createComponent(HeroComponent);
    errorFixture.detectChanges();
    await errorFixture.whenStable();
    errorFixture.detectChanges();
    const errorEl: HTMLElement = errorFixture.nativeElement;
    expect(errorEl.querySelector('.hero-error')).toBeTruthy();
  });

  it('should show error state when API throws', async () => {
    portfolioServiceSpy.getProfile.and.returnValue(throwError(() => new Error('Network error')));

    const errFixture = TestBed.createComponent(HeroComponent);
    errFixture.detectChanges();
    await errFixture.whenStable();
    errFixture.detectChanges();
    const errEl: HTMLElement = errFixture.nativeElement;
    expect(errEl.querySelector('.hero-error')).toBeTruthy();
  });
});

// ─── Animation tests ──────────────────────────────────────────────────────────
describe('HeroComponent – animations', () => {
  let fixture: ComponentFixture<HeroComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let imageOptimizerSpy: jasmine.SpyObj<ImageOptimizerService>;

  beforeEach(async () => {
    portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', ['getProfile']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', [
      'setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'applyPersonSchema',
    ]);
    imageOptimizerSpy = jasmine.createSpyObj('ImageOptimizerService', ['preloadCriticalImages']);
    portfolioServiceSpy.getProfile.and.returnValue(of({ success: true, data: MOCK_PROFILE }));

    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PortfolioService, useValue: portfolioServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ImageOptimizerService, useValue: imageOptimizerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
  });

  it('should render hero-container when profile data is available', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.hero-container')).toBeTruthy();
  });

  it('should include hero-stagger-item elements for animation', () => {
    const el: HTMLElement = fixture.nativeElement;
    const staggerItems = el.querySelectorAll('.hero-stagger-item');
    expect(staggerItems.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Integration tests ────────────────────────────────────────────────────────
describe('HeroComponent – integration', () => {
  let fixture: ComponentFixture<HeroComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;
  let seoServiceSpy: jasmine.SpyObj<SeoService>;
  let imageOptimizerSpy: jasmine.SpyObj<ImageOptimizerService>;

  beforeEach(async () => {
    portfolioServiceSpy = jasmine.createSpyObj('PortfolioService', ['getProfile']);
    seoServiceSpy = jasmine.createSpyObj('SeoService', [
      'setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'applyPersonSchema',
    ]);
    imageOptimizerSpy = jasmine.createSpyObj('ImageOptimizerService', ['preloadCriticalImages']);
    portfolioServiceSpy.getProfile.and.returnValue(of({ success: true, data: MOCK_PROFILE }));

    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PortfolioService, useValue: portfolioServiceSpy },
        { provide: SeoService, useValue: seoServiceSpy },
        { provide: ImageOptimizerService, useValue: imageOptimizerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    fixture.detectChanges();
  });

  it('should pass profile image URL to image-fallback component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const imgFallback = el.querySelector('app-image-fallback');
    expect(imgFallback).toBeTruthy();
  });

  it('should contain a "View My Work" CTA button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const ctaBtn = buttons.find((b) => b.textContent?.includes('View My Work'));
    expect(ctaBtn).toBeTruthy();
  });

  it('should contain a "Get In Touch" CTA button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const contactBtn = buttons.find((b) => b.textContent?.includes('Get In Touch'));
    expect(contactBtn).toBeTruthy();
  });

  it('should have section id="hero" for navigation anchor', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#hero')).toBeTruthy();
  });

  it('should preload profile image on browser platform', () => {
    expect(imageOptimizerSpy.preloadCriticalImages).toHaveBeenCalledWith([
      MOCK_PROFILE.profileImageUrl!,
    ]);
  });
});
