import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  ElementRef,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';

import { PortfolioService } from '../../services/portfolio.service';
import { SeoService } from '../../services/seo.service';
import { Contact } from '../../../../core/models/contact.model';
import { Profile } from '../../../../core/models/profile.model';
import { ContactFormComponent } from './contact-form/contact-form.component';
import { ContactTilesComponent } from './contact-tiles/contact-tiles.component';
import { environment } from '../../../../../environments/environment';

/**
 * A contact method item ready for display (kept for ContactMethodItemComponent compatibility).
 * @deprecated Use ContactChannelTile from contact-tiles for new display logic.
 */
export interface ContactMethodDisplay {
  type: 'email' | 'phone' | 'linkedin' | 'github' | 'twitter' | 'website';
  label: string;
  value: string;
  href: string;
  icon: string;
  external: boolean;
}

/**
 * Converts a raw Contact API object into a list of contact method display items.
 * Kept for ContactMethodItemComponent and existing test compatibility.
 * @deprecated Use buildChannelTiles from ContactTilesComponent for display.
 */
export function buildVisibleMethods(c: Contact): ContactMethodDisplay[] {
  const candidates: (ContactMethodDisplay | null)[] = [
    c.email       ? { type: 'email',    label: 'Email',       value: c.email,       href: `mailto:${c.email}`,                       icon: 'email',    external: false } : null,
    c.phone       ? { type: 'phone',    label: 'Phone',       value: c.phone,       href: `tel:${c.phone.replace(/\s/g, '')}`,        icon: 'phone',    external: false } : null,
    c.linkedinUrl ? { type: 'linkedin', label: 'LinkedIn',    value: c.linkedinUrl, href: c.linkedinUrl,                             icon: 'work',     external: true  } : null,
    c.githubUrl   ? { type: 'github',   label: 'GitHub',      value: c.githubUrl,   href: c.githubUrl,                               icon: 'code',     external: true  } : null,
    c.twitterUrl  ? { type: 'twitter',  label: 'Twitter / X', value: c.twitterUrl,  href: c.twitterUrl,                              icon: 'tag',      external: true  } : null,
    c.websiteUrl  ? { type: 'website',  label: 'Website',     value: c.websiteUrl,  href: c.websiteUrl,                              icon: 'language', external: true  } : null,
  ];
  return candidates.filter((m): m is ContactMethodDisplay => m !== null);
}

/**
 * Contact section of the public portfolio portal.
 *
 * Layout (top → bottom):
 *  1. Section header
 *  2. Contact inquiry form (ContactFormComponent)
 *  3. Informational channel tiles (ContactTilesComponent) — icon + label only,
 *     no actual contact values or clickable links
 *
 * The section is omitted entirely when no contact record is published.
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ContactFormComponent,
    ContactTilesComponent,
  ],
  animations: [
    trigger('sectionVisible', [
      transition('hidden => visible', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    @if (!noData()) {
    <section
      id="contact"
      class="contact-section"
      aria-labelledby="contact-heading"
      [@sectionVisible]="sectionState()"
    >

      <!-- Loading -->
      @if (loading()) {
        <div class="contact-loading" role="status" aria-label="Loading contact information">
          <mat-spinner diameter="40" />
        </div>
      }

      <!-- API error -->
      @if (error() && !loading()) {
        <div class="contact-error" role="alert">
          <mat-icon aria-hidden="true">warning_amber</mat-icon>
          <span>Could not load contact information. Please try again later.</span>
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error()) {
        <div class="contact-container">

          <!-- Section header — full width above the two columns -->
          <header class="section-header">
            <span class="section-eyebrow">Get in touch</span>
            <h2 class="section-title" id="contact-heading">Contact</h2>
            <div class="section-divider" aria-hidden="true"></div>
            <p class="section-subtitle">
              Have a project in mind or want to discuss opportunities?
              Fill in the form and I'll get back to you.
            </p>
          </header>

          <!-- Two-column grid: form card (left) | channel tiles (right) -->
          <div class="contact-layout">

            <!-- LEFT: form card only -->
            <div class="contact-form-wrapper">
              <h3 class="form-heading">Drop me a line</h3>
              <app-contact-form />
            </div>

            <!-- RIGHT: channel tiles -->
            @if (contact()) {
              <div class="contact-right">
                <p class="tiles-eyebrow">Or check out these channels</p>
                <app-contact-tiles [contact]="contact()" [locationText]="locationText()" />
              </div>
            }

          </div>
        </div>
      }

    </section>
    }
  `,
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit, OnDestroy {
  protected readonly loading = signal<boolean>(true);
  protected readonly error   = signal<boolean>(false);

  /**
   * `false`  = section has data (render normally)
   * `true`   = API succeeded but no contact record is published → hide section
   */
  protected readonly noData  = signal<boolean>(false);

  /** Raw contact data from the API (null until loaded). */
  protected readonly contact = signal<Contact | null>(null);

  /** Raw profile data loaded for location display (null until loaded). */
  private readonly profile = signal<Profile | null>(null);

  /** Derived location string ("City, Country") for the location card. */
  protected readonly locationText = computed<string | null>(() => {
    const loc = this.profile()?.location;
    if (!loc) return null;
    const parts = [loc.city, loc.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  });

  protected readonly sectionState = signal<'hidden' | 'visible'>('hidden');

  private readonly destroy$ = new Subject<void>();
  private sectionObserver: IntersectionObserver | null = null;

  private readonly portfolioService = inject(PortfolioService);
  private readonly seoService       = inject(SeoService);
  private readonly el               = inject(ElementRef);
  private readonly zone             = inject(NgZone);
  private readonly platformId       = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.loadContact();
    this.loadProfile();
    if (isPlatformBrowser(this.platformId)) {
      this.initIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sectionObserver?.disconnect();
  }

  private loadProfile(): void {
    this.portfolioService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.profile.set(res.data);
          }
        },
        error: () => { /* non-critical — location card simply won't render */ },
      });
  }

  private loadContact(): void {
    this.portfolioService
      .getContact()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.contact.set(res.data);
            const title = `${environment.seo.author} - Contact`;
            const description = 'Get in touch — send me a message or find me on social media.';
            const keywords = 'contact, message, linkedin, github, get in touch';
            this.seoService.setMeta(title, description, keywords);
            this.seoService.setOgTags(title, description, '', `${environment.seo.siteUrl}#contact`);
            this.seoService.setCanonicalUrl(`${environment.seo.siteUrl}#contact`);
          } else if (res.success && !res.data) {
            // API responded successfully but no contact record is published — hide section entirely
            this.noData.set(true);
          } else {
            this.error.set(true);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private initIntersectionObserver(): void {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.zone.run(() => this.sectionState.set('visible'));
            this.sectionObserver?.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    this.sectionObserver.observe(this.el.nativeElement);
  }
}

