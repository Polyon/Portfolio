import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { ServicesComponent } from './services.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Service, ServiceCategory } from '../../../../core/models/service.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeService = (overrides: Partial<Service> & { id: string }): Service => ({
  userId: 'u1',
  name: 'Backend Development',
  description: 'Building scalable REST APIs.',
  category: ServiceCategory.BACKEND_DEV,
  isPublished: true,
  displayOrder: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
  ...overrides,
});

const MOCK_SERVICES: Service[] = [
  makeService({ id: 's1', name: 'Backend Dev',  displayOrder: 2, category: ServiceCategory.BACKEND_DEV }),
  makeService({ id: 's2', name: 'Frontend Dev', displayOrder: 1, category: ServiceCategory.FRONTEND_DEV }),
  makeService({ id: 's3', name: 'Consulting',   displayOrder: 3, category: ServiceCategory.CONSULTING }),
];

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function createComponent(
  services: Service[] = MOCK_SERVICES,
  shouldError = false,
): Promise<{ fixture: ComponentFixture<ServicesComponent>; svcSpy: jasmine.SpyObj<PortfolioService> }> {
  const svcSpy = jasmine.createSpyObj('PortfolioService', ['getServices']);
  const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);

  svcSpy.getServices.and.returnValue(
    shouldError
      ? throwError(() => new Error('Network error'))
      : of({ success: true, data: services }),
  );

  await TestBed.configureTestingModule({
    imports: [ServicesComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ServicesComponent);
  fixture.detectChanges();
  return { fixture, svcSpy };
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('ServicesComponent', () => {

  // ── Creation ─────────────────────────────────────────────────────────────

  it('should create', async () => {
    const { fixture } = await createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  it('should call getServices exactly once on init', async () => {
    const { svcSpy } = await createComponent();
    expect(svcSpy.getServices).toHaveBeenCalledTimes(1);
  });

  it('should render a card for each service returned', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const cards = fixture.debugElement.queryAll(By.css('app-service-card'));
    expect(cards.length).toBe(MOCK_SERVICES.length);
  });

  // ── Sorting by displayOrder ───────────────────────────────────────────────

  it('should render services sorted by displayOrder ascending', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const cards = fixture.debugElement.queryAll(By.css('app-service-card'));
    const orders = cards.map((c) => (c.componentInstance as any).service.displayOrder as number);
    expect(orders).toEqual([1, 2, 3]);
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('should show loading spinner while data is loading', async () => {
    const svcSpy = jasmine.createSpyObj('PortfolioService', ['getServices']);
    const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);
    svcSpy.getServices.and.returnValue(new Subject().asObservable());

    await TestBed.configureTestingModule({
      imports: [ServicesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PortfolioService, useValue: svcSpy },
        { provide: SeoService, useValue: seoSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServicesComponent);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('.services-loading'));
    expect(spinner).toBeTruthy();
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('should show error message when API throws an error', async () => {
    const { fixture } = await createComponent([], true);
    const errorEl = fixture.debugElement.query(By.css('.services-error'));
    expect(errorEl).toBeTruthy();
  });

  it('should not show error when load is successful', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const errorEl = fixture.debugElement.query(By.css('.services-error'));
    expect(errorEl).toBeNull();
  });

  it('should show error when API returns success:false', async () => {
    const svcSpy = jasmine.createSpyObj('PortfolioService', ['getServices']);
    const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setOgTags', 'setCanonicalUrl', 'setStructuredData', 'generateMetaForSection', 'applyPersonSchema']);
    svcSpy.getServices.and.returnValue(of({ success: false, data: null, message: 'Not found' }));

    await TestBed.configureTestingModule({
      imports: [ServicesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PortfolioService, useValue: svcSpy },
        { provide: SeoService, useValue: seoSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServicesComponent);
    fixture.detectChanges();
    const errorEl = fixture.debugElement.query(By.css('.services-error'));
    expect(errorEl).toBeTruthy();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it('should show empty state when no services are returned', async () => {
    const { fixture } = await createComponent([]);
    const emptyEl = fixture.debugElement.query(By.css('.services-empty'));
    expect(emptyEl).toBeTruthy();
  });

  it('should not show empty state when services are present', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const emptyEl = fixture.debugElement.query(By.css('.services-empty'));
    expect(emptyEl).toBeNull();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('should have section element with id="services"', async () => {
    const { fixture } = await createComponent();
    const section = fixture.debugElement.query(By.css('section#services'));
    expect(section).toBeTruthy();
  });

  it('should have aria-labelledby on section pointing to "services-heading"', async () => {
    const { fixture } = await createComponent();
    const section = fixture.debugElement.query(By.css('section#services'));
    expect(section.nativeElement.getAttribute('aria-labelledby')).toBe('services-heading');
  });

  it('should render section heading with id "services-heading"', async () => {
    const { fixture } = await createComponent();
    const heading = fixture.debugElement.query(By.css('#services-heading'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.tagName.toLowerCase()).toBe('h2');
  });

  it('should have role="list" on the services grid', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const grid = fixture.debugElement.query(By.css('.services-grid'));
    expect(grid.nativeElement.getAttribute('role')).toBe('list');
  });

  it('should wrap each card with role="listitem"', async () => {
    const { fixture } = await createComponent(MOCK_SERVICES);
    const items = fixture.debugElement.queryAll(By.css('[role="listitem"]'));
    expect(items.length).toBe(MOCK_SERVICES.length);
  });

  // ── CTA → scroll to contact ───────────────────────────────────────────────

  it('should call onRequestService when requestService is emitted by a card', async () => {
    const { fixture } = await createComponent([makeService({ id: 's1' })]);
    const comp = fixture.componentInstance as any;
    spyOn(comp, 'onRequestService').and.callThrough();
    const card = fixture.debugElement.query(By.css('app-service-card'));
    card.triggerEventHandler('requestService', makeService({ id: 's1' }));
    expect(comp.onRequestService).toHaveBeenCalled();
  });
});
