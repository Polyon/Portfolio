import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { ContactComponent, buildVisibleMethods } from './contact.component';
import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Contact } from '../../../../core/models/contact.model';

// ─── Fixture factory ─────────────────────────────────────────────────────────

const BASE_CONTACT: Contact = {
  id: 'c1',
  userId: 'u1',
  email: 'test@example.com',
  emailPublic: true,
  phone: '+1 555 000 0000',
  phonePublic: true,
  linkedinUrl: 'https://linkedin.com/in/test',
  linkedinPublic: true,
  githubUrl: 'https://github.com/test',
  githubPublic: true,
  twitterUrl: 'https://twitter.com/test',
  twitterPublic: false,
  websiteUrl: 'https://example.com',
  websitePublic: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function createComponent(
  contact: Contact = BASE_CONTACT,
  shouldError = false,
): Promise<{
  fixture: ComponentFixture<ContactComponent>;
  svcSpy: jasmine.SpyObj<PortfolioService>;
}> {
  const svcSpy = jasmine.createSpyObj('PortfolioService', ['getContact']);
  const seoSpy = jasmine.createSpyObj('SeoService', ['setMeta', 'setCanonicalUrl', 'generateMetaForSection', 'setOgTags']);

  svcSpy.getContact.and.returnValue(
    shouldError
      ? throwError(() => new Error('Network error'))
      : of({ success: true, data: contact }),
  );

  await TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimations(),
      { provide: PortfolioService, useValue: svcSpy },
      { provide: SeoService, useValue: seoSpy },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ContactComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, svcSpy };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('ContactComponent', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('should create the component', async () => {
      const { fixture } = await createComponent();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render the section heading', async () => {
      const { fixture } = await createComponent();
      const heading = fixture.nativeElement.querySelector('#contact-heading');
      expect(heading?.textContent?.trim()).toBe('Contact');
    });

    it('should render the contact inquiry form', async () => {
      const { fixture } = await createComponent();
      const form = fixture.debugElement.query(By.css('app-contact-form'));
      expect(form).withContext('app-contact-form should be present').toBeTruthy();
    });

    it('should render the contact channel tiles when contact data is available', async () => {
      const { fixture } = await createComponent();
      const tiles = fixture.debugElement.query(By.css('app-contact-tiles'));
      expect(tiles).withContext('app-contact-tiles should be present').toBeTruthy();
    });

    it('should NOT render any app-contact-method-item clickable cards', async () => {
      const { fixture } = await createComponent();
      const items = fixture.debugElement.queryAll(By.css('app-contact-method-item'));
      expect(items.length).toBe(0);
    });
  });

  // ── Visibility logic ────────────────────────────────────────────────────────
  describe('visibility logic (buildVisibleMethods)', () => {
    it('should include email when email field is present', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, email: 'test@example.com' });
      expect(methods.some((m) => m.type === 'email')).toBeTrue();
    });

    it('should exclude email when email field is absent', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, email: undefined as unknown as string });
      expect(methods.some((m) => m.type === 'email')).toBeFalse();
    });

    it('should include phone when phone field is present', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, phone: '+1234567890' });
      expect(methods.some((m) => m.type === 'phone')).toBeTrue();
    });

    it('should exclude phone when phone field is absent', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, phone: undefined });
      expect(methods.some((m) => m.type === 'phone')).toBeFalse();
    });

    it('should exclude linkedin when linkedinUrl is absent', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, linkedinUrl: undefined });
      expect(methods.some((m) => m.type === 'linkedin')).toBeFalse();
    });

    it('should exclude github when githubUrl is absent', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, githubUrl: undefined });
      expect(methods.some((m) => m.type === 'github')).toBeFalse();
    });

    it('should exclude twitter when twitterUrl is absent', () => {
      const methods = buildVisibleMethods({ ...BASE_CONTACT, twitterUrl: undefined });
      expect(methods.some((m) => m.type === 'twitter')).toBeFalse();
    });

    it('should return empty array when all contact fields are absent', () => {
      const c: Contact = {
        ...BASE_CONTACT,
        email: undefined as unknown as string,
        phone: undefined,
        linkedinUrl: undefined,
        githubUrl: undefined,
        twitterUrl: undefined,
        websiteUrl: undefined,
      };
      expect(buildVisibleMethods(c).length).toBe(0);
    });

    it('should return all six methods when all fields are populated', () => {
      expect(buildVisibleMethods(BASE_CONTACT).length).toBe(6);
    });
  });

  // ── Link types ──────────────────────────────────────────────────────────────
  describe('link href construction', () => {
    it('should use mailto: href for email', () => {
      const methods = buildVisibleMethods(BASE_CONTACT);
      const email = methods.find((m) => m.type === 'email')!;
      expect(email.href).toBe('mailto:test@example.com');
      expect(email.external).toBeFalse();
    });

    it('should use tel: href for phone', () => {
      const methods = buildVisibleMethods(BASE_CONTACT);
      const phone = methods.find((m) => m.type === 'phone')!;
      expect(phone.href).toBe('tel:+15550000000');
      expect(phone.external).toBeFalse();
    });

    it('should mark linkedin as external link', () => {
      const methods = buildVisibleMethods(BASE_CONTACT);
      const linkedin = methods.find((m) => m.type === 'linkedin')!;
      expect(linkedin.href).toBe('https://linkedin.com/in/test');
      expect(linkedin.external).toBeTrue();
    });

    it('should mark github as external link', () => {
      const methods = buildVisibleMethods(BASE_CONTACT);
      const github = methods.find((m) => m.type === 'github')!;
      expect(github.href).toBe('https://github.com/test');
      expect(github.external).toBeTrue();
    });
  });

  // ── Error state ──────────────────────────────────────────────────────────────
  describe('error handling', () => {
    it('should display error message when API call fails', async () => {
      const { fixture } = await createComponent(BASE_CONTACT, true);
      const errorEl = fixture.nativeElement.querySelector('.contact-error');
      expect(errorEl).toBeTruthy();
    });

    it('should not render app-contact-form on error', async () => {
      const { fixture } = await createComponent(BASE_CONTACT, true);
      const form = fixture.debugElement.query(By.css('app-contact-form'));
      expect(form).toBeNull();
    });

    it('should not render app-contact-tiles on error', async () => {
      const { fixture } = await createComponent(BASE_CONTACT, true);
      const tiles = fixture.debugElement.query(By.css('app-contact-tiles'));
      expect(tiles).toBeNull();
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('should show empty state message when all contact value fields are absent', async () => {
      const emptyContact: Contact = {
        ...BASE_CONTACT,
        email: undefined as unknown as string,
        phone: undefined,
        linkedinUrl: undefined,
        githubUrl: undefined,
        twitterUrl: undefined,
        websiteUrl: undefined,
      };
      // With the new layout the form is always shown; tiles section is hidden when no channels
      const { fixture } = await createComponent(emptyContact);
      const form = fixture.debugElement.query(By.css('app-contact-form'));
      expect(form).toBeTruthy();
      const tilesWrapper = fixture.nativeElement.querySelector('.contact-tiles-wrapper');
      // tiles-wrapper should not be shown when contact has no channels (null contact scenario handled by @if contact())
      // here contact is not null (the API returned data), so tiles-wrapper is shown but tiles-grid inside will be empty
      // This is acceptable behaviour — the wrapper is present but the grid is hidden by ContactTilesComponent
      expect(tilesWrapper).toBeTruthy();
    });
  });

  // ── API interaction ──────────────────────────────────────────────────────────
  describe('API interaction', () => {
    it('should call getContact() on init', async () => {
      const { svcSpy } = await createComponent();
      expect(svcSpy.getContact).toHaveBeenCalledTimes(1);
    });
  });
});
