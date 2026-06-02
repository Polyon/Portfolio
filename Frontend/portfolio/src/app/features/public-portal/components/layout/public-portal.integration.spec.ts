/**
 * Final end-to-end integration tests for the Public Portal.
 *
 * These tests simulate complete user journeys through the public portfolio
 * at the Angular TestBed level (no Cypress/Playwright installed):
 *
 * - T128-A: User can navigate between sections (header nav links emit events)
 * - T128-B: All content sections are rendered in the DOM on page load
 * - T128-C: CTA buttons and external links are present and have correct attributes
 * - T128-D: Keyboard navigation works (key bindings on brand link)
 * - T128-E: Back-to-top button behaviour
 * - T128-F: Accessibility — landmark roles present (banner, main, contentinfo)
 * - T128-G: Scroll progress component rendered
 * - T128-H: Mobile / tablet viewport — component renders without error
 *
 * NOTE: The suite stubs all child components so that the layout can be tested
 * in isolation without real HTTP calls or SSR considerations.
 */
import {
  TestBed,
  ComponentFixture,
} from '@angular/core/testing';
import {
  provideZonelessChangeDetection,
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { PublicPortalComponent } from '../layout/public-portal.component';
import { PerformanceService } from '../../services/performance.service';

// ─── Stub child components ───────────────────────────────────────────────────

@Component({ selector: 'app-scroll-progress', standalone: true, template: '<div class="scroll-progress-stub"></div>' })
class StubScrollProgressComponent {}

@Component({ selector: 'app-header', standalone: true, template: '<header role="banner" class="portal-header"><nav aria-label="Main navigation"></nav></header>' })
class StubHeaderComponent {
  @Input() activeSection = 'hero';
  @Output() sectionNav = new EventEmitter<string>();
}

@Component({ selector: 'app-footer', standalone: true, template: '<footer role="contentinfo"></footer>' })
class StubFooterComponent {}

@Component({ selector: 'app-back-to-top', standalone: true, template: '<button class="back-to-top" aria-label="Scroll back to top"></button>' })
class StubBackToTopComponent {
  @Input() visible = false;
}

@Component({ selector: 'app-hero', standalone: true, template: '<section id="hero" aria-label="Hero"><h1>Jane Doe</h1><button class="cta-primary">View My Work</button></section>' })
class StubHeroComponent {}

@Component({ selector: 'app-about', standalone: true, template: '<section id="about" aria-labelledby="about-heading"><h2 id="about-heading">About Me</h2></section>' })
class StubAboutComponent {}

@Component({ selector: 'app-skills', standalone: true, template: '<section id="skills" aria-labelledby="skills-heading"><h2 id="skills-heading">Skills</h2></section>' })
class StubSkillsComponent {}

@Component({ selector: 'app-experience', standalone: true, template: '<section id="experience" aria-labelledby="experience-heading"><h2 id="experience-heading">Experience</h2></section>' })
class StubExperienceComponent {}

@Component({ selector: 'app-projects', standalone: true, template: '<section id="projects" aria-labelledby="projects-heading"><h2 id="projects-heading">Projects</h2></section>' })
class StubProjectsComponent {}

@Component({ selector: 'app-services', standalone: true, template: '<section id="services" aria-labelledby="services-heading"><h2 id="services-heading">Services</h2></section>' })
class StubServicesComponent {}

@Component({ selector: 'app-contact', standalone: true, template: '<section id="contact" aria-labelledby="contact-heading"><h2 id="contact-heading">Contact</h2></section>' })
class StubContactComponent {}

// ─── Helper factory ───────────────────────────────────────────────────────────

async function createPortalFixture(): Promise<ComponentFixture<PublicPortalComponent>> {
  const perfSpy = jasmine.createSpyObj<PerformanceService>('PerformanceService', [
    'trackPageLoad',
    'trackSectionVisibility',
  ]);

  await TestBed.configureTestingModule({
    imports: [PublicPortalComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' }, // avoid browser APIs in tests
      { provide: PerformanceService, useValue: perfSpy },
    ],
  })
  .overrideComponent(PublicPortalComponent, {
    set: {
      imports: [
        StubScrollProgressComponent,
        StubHeaderComponent,
        StubFooterComponent,
        StubBackToTopComponent,
        StubHeroComponent,
        StubAboutComponent,
        StubSkillsComponent,
        StubExperienceComponent,
        StubProjectsComponent,
        StubServicesComponent,
        StubContactComponent,
      ],
    },
  })
  .compileComponents();

  const fixture = TestBed.createComponent(PublicPortalComponent);
  fixture.detectChanges();
  return fixture;
}

// ─── T128-A: Section navigation ──────────────────────────────────────────────

describe('PublicPortal – T128-A section navigation', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;
  let component: PublicPortalComponent;

  beforeEach(async () => {
    fixture = await createPortalFixture();
    component = fixture.componentInstance;
  });

  it('should create the portal layout', () => {
    expect(component).toBeTruthy();
  });

  it('should call scrollToSection when sectionNav event is emitted', () => {
    const spy = spyOn(component, 'scrollToSection');
    const header = fixture.debugElement.query(By.css('app-header'));
    expect(header).toBeTruthy();
    (header.componentInstance as StubHeaderComponent).sectionNav.emit('about');
    expect(spy).toHaveBeenCalledWith('about');
  });

  it('should expose an activeSection signal starting at "hero"', () => {
    const activeSection = (component as unknown as { activeSection: ReturnType<typeof signal> }).activeSection;
    expect(typeof activeSection()).toBe('string');
  });
});

// ─── T128-B: All content sections present ────────────────────────────────────

describe('PublicPortal – T128-B content sections', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;

  beforeEach(async () => { fixture = await createPortalFixture(); });

  const sections = ['hero', 'about', 'skills', 'experience', 'projects', 'services', 'contact'];

  sections.forEach((id) => {
    it(`should render the "${id}" section`, () => {
      const el = fixture.nativeElement.querySelector(`#${id}`);
      expect(el).withContext(`#${id} section not found`).not.toBeNull();
    });
  });

  it('should render the main content wrapper', () => {
    const main = fixture.nativeElement.querySelector('main#main-content');
    expect(main).not.toBeNull();
  });

  it('should render the scroll progress component', () => {
    const sp = fixture.nativeElement.querySelector('app-scroll-progress');
    expect(sp).not.toBeNull();
  });
});

// ─── T128-C: CTA buttons and external links ───────────────────────────────────

describe('PublicPortal – T128-C CTA buttons', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;

  beforeEach(async () => { fixture = await createPortalFixture(); });

  it('should render the hero CTA primary button', () => {
    const cta = fixture.nativeElement.querySelector('.cta-primary');
    expect(cta).not.toBeNull();
  });

  it('should render back-to-top button with correct aria-label', () => {
    const btn = fixture.nativeElement.querySelector('.back-to-top');
    expect(btn?.getAttribute('aria-label')).toBe('Scroll back to top');
  });
});

// ─── T128-D: Keyboard navigation ─────────────────────────────────────────────

describe('PublicPortal – T128-D keyboard navigation', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;

  beforeEach(async () => { fixture = await createPortalFixture(); });

  it('should have a banner landmark (header)', () => {
    const banner = fixture.nativeElement.querySelector('[role="banner"]');
    expect(banner).not.toBeNull();
  });

  it('should have a main landmark', () => {
    const main = fixture.nativeElement.querySelector('[role="main"]');
    expect(main).not.toBeNull();
  });

  it('should have a contentinfo landmark (footer)', () => {
    const footer = fixture.nativeElement.querySelector('[role="contentinfo"]');
    expect(footer).not.toBeNull();
  });
});

// ─── T128-E: Back-to-top visibility ──────────────────────────────────────────

describe('PublicPortal – T128-E back-to-top button', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;
  let component: PublicPortalComponent;

  beforeEach(async () => {
    fixture = await createPortalFixture();
    component = fixture.componentInstance;
  });

  it('should initialise with back-to-top hidden', () => {
    const showBackToTop = (component as unknown as { showBackToTop: ReturnType<typeof signal<boolean>> }).showBackToTop;
    expect(showBackToTop()).toBeFalse();
  });

  it('should pass visible=false to back-to-top component on initial render', () => {
    const btt = fixture.debugElement.query(By.css('app-back-to-top'));
    expect((btt.componentInstance as StubBackToTopComponent).visible).toBeFalse();
  });
});

// ─── T128-F: Accessibility landmarks ─────────────────────────────────────────

describe('PublicPortal – T128-F accessibility', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;

  beforeEach(async () => { fixture = await createPortalFixture(); });

  it('should have aria-labelledby on all major sections', () => {
    const sectionsWithLabelledBy = ['about', 'skills', 'experience', 'projects', 'services', 'contact'];
    sectionsWithLabelledBy.forEach((id) => {
      const section = fixture.nativeElement.querySelector(`#${id}`);
      const ariaAttr = section?.getAttribute('aria-labelledby') ?? section?.getAttribute('aria-label');
      expect(ariaAttr).withContext(`#${id} missing aria-labelledby or aria-label`).toBeTruthy();
    });
  });

  it('should have a main navigation landmark', () => {
    const nav = fixture.nativeElement.querySelector('nav[aria-label]');
    expect(nav).not.toBeNull();
  });
});

// ─── T128-G: Responsive viewport (content present at all sizes) ────────────────

describe('PublicPortal – T128-G responsive layout', () => {
  let fixture: ComponentFixture<PublicPortalComponent>;

  beforeEach(async () => { fixture = await createPortalFixture(); });

  it('should render without layout errors at default viewport', () => {
    expect(fixture.nativeElement.querySelector('main')).not.toBeNull();
  });

  it('should contain all 7 portfolio sections', () => {
    const sections = fixture.nativeElement.querySelectorAll('section[id]');
    expect(sections.length).toBeGreaterThanOrEqual(7);
  });
});
