import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

import { ServiceCardComponent } from './service-card.component';
import { Service, ServiceCategory } from '../../../../../core/models/service.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const makeService = (overrides: Partial<Service> = {}): Service => ({
  id: 's1',
  userId: 'u1',
  name: 'Backend Development',
  description: 'Building scalable REST APIs and microservices.',
  category: ServiceCategory.BACKEND_DEV,
  isPublished: true,
  displayOrder: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
  ...overrides,
});

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function createComponent(
  service: Service,
): Promise<ComponentFixture<ServiceCardComponent>> {
  await TestBed.configureTestingModule({
    imports: [ServiceCardComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ServiceCardComponent);
  fixture.componentRef.setInput('service', service);
  fixture.detectChanges();
  return fixture;
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('ServiceCardComponent', () => {

  // ── Creation ─────────────────────────────────────────────────────────────

  it('should create', async () => {
    const f = await createComponent(makeService());
    expect(f.componentInstance).toBeTruthy();
  });

  // ── Content rendering ─────────────────────────────────────────────────────

  it('should display the service name', async () => {
    const f = await createComponent(makeService({ name: 'Cloud Architecture' }));
    const el = f.debugElement.query(By.css('.service-name'));
    expect(el.nativeElement.textContent.trim()).toBe('Cloud Architecture');
  });

  it('should display the service description', async () => {
    const f = await createComponent(makeService({ description: 'Designing resilient cloud systems.' }));
    const el = f.debugElement.query(By.css('.service-description'));
    expect(el.nativeElement.textContent.trim()).toContain('Designing resilient cloud systems.');
  });

  it('should display the category chip', async () => {
    const f = await createComponent(makeService({ category: ServiceCategory.DEVOPS }));
    const chip = f.debugElement.query(By.css('.category-chip'));
    expect(chip).toBeTruthy();
    expect(chip.nativeElement.textContent.trim()).toContain('DevOps');
  });

  // ── Icon header ───────────────────────────────────────────────────────────

  it('should render the icon wrap element', async () => {
    const f = await createComponent(makeService());
    const iconWrap = f.debugElement.query(By.css('.card-icon-wrap'));
    expect(iconWrap).toBeTruthy();
  });

  it('should set --icon-color CSS variable on the icon wrap', async () => {
    const f = await createComponent(makeService({ category: ServiceCategory.BACKEND_DEV }));
    const iconWrap = f.debugElement.query(By.css('.card-icon-wrap'));
    const styleAttr: string = iconWrap.nativeElement.getAttribute('style') ?? '';
    expect(styleAttr).toContain('--icon-color');
  });

  // ── CTA button ────────────────────────────────────────────────────────────

  it('should render the CTA button', async () => {
    const f = await createComponent(makeService());
    const btn = f.debugElement.query(By.css('.cta-btn'));
    expect(btn).toBeTruthy();
  });

  it('should emit requestService when CTA button is clicked', async () => {
    const f = await createComponent(makeService({ name: 'API Design' }));
    let emitted: Service | undefined;
    f.componentInstance.requestService.subscribe((s: Service) => (emitted = s));

    const btn = f.debugElement.query(By.css('.cta-btn'));
    btn.triggerEventHandler('click', null);

    expect(emitted).toBeDefined();
    expect(emitted!.name).toBe('API Design');
  });

  it('should emit the correct service instance from requestService', async () => {
    const service = makeService({ id: 'custom-id', name: 'Training Workshop' });
    const f = await createComponent(service);
    let emitted: Service | undefined;
    f.componentInstance.requestService.subscribe((s: Service) => (emitted = s));

    f.debugElement.query(By.css('.cta-btn')).triggerEventHandler('click', null);
    expect(emitted!.id).toBe('custom-id');
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('should have aria-label on the article element', async () => {
    const f = await createComponent(makeService({ name: 'My Service', category: ServiceCategory.CONSULTING }));
    const article = f.debugElement.query(By.css('.service-card'));
    const label: string = article.nativeElement.getAttribute('aria-label');
    expect(label).toContain('My Service');
    expect(label).toContain('Consulting');
  });

  it('should have aria-label on the CTA button', async () => {
    const f = await createComponent(makeService({ name: 'DevOps Setup' }));
    const btn = f.debugElement.query(By.css('.cta-btn'));
    expect(btn.nativeElement.getAttribute('aria-label')).toContain('DevOps Setup');
  });

  // ── Category colour helpers ───────────────────────────────────────────────

  it('getCategoryColor should return a non-empty string for every ServiceCategory', async () => {
    const f = await createComponent(makeService());
    const comp = f.componentInstance;
    for (const cat of Object.values(ServiceCategory)) {
      expect(comp.getCategoryColor(cat)).toBeTruthy();
    }
  });

  it('getCategoryIcon should return a non-empty string for every ServiceCategory', async () => {
    const f = await createComponent(makeService());
    const comp = f.componentInstance;
    for (const cat of Object.values(ServiceCategory)) {
      expect(comp.getCategoryIcon(cat)).toBeTruthy();
    }
  });

  // ── Per-category rendering ────────────────────────────────────────────────

  const categoryScenarios: Array<{ category: ServiceCategory; label: string }> = [
    { category: ServiceCategory.BACKEND_DEV,    label: 'Backend Development' },
    { category: ServiceCategory.FRONTEND_DEV,   label: 'Frontend Development' },
    { category: ServiceCategory.FULLSTACK,       label: 'Fullstack' },
    { category: ServiceCategory.DEVOPS,          label: 'DevOps' },
    { category: ServiceCategory.AI_INTEGRATION,  label: 'AI Integration' },
    { category: ServiceCategory.CONSULTING,      label: 'Consulting' },
    { category: ServiceCategory.TRAINING,        label: 'Training' },
    { category: ServiceCategory.OTHER,           label: 'Other' },
  ];

  for (const { category, label } of categoryScenarios) {
    it(`should display category chip text "${label}"`, async () => {
      const f = await createComponent(makeService({ category }));
      const chip = f.debugElement.query(By.css('.category-chip'));
      expect(chip.nativeElement.textContent.trim()).toContain(label);
    });
  }
});
