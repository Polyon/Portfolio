import {
  Component,
  Input,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';

import { Contact } from '../../../../../core/models/contact.model';

/** A single clickable channel tile (icon + label + tagline + link). */
export interface ContactChannelTile {
  /** Unique channel identifier used for CSS accent colouring. */
  type: 'email' | 'phone' | 'linkedin' | 'github' | 'twitter' | 'website';
  /** Human-readable channel name shown as the card title. */
  label: string;
  /** Short descriptor shown below the label. */
  tagline: string;
  /** Material icon name. */
  icon: string;
  /** Resolved href (mailto:, tel:, or absolute URL). */
  href: string;
  /** Whether to open in a new tab. */
  external: boolean;
}

/**
 * Derives the list of non-clickable informational channel tiles from a
 * Contact API response.  Only channels where the corresponding field is
 * present in the response (server has already applied visibility filtering)
 * produce a tile.
 *
 * @param c - Public contact data from the portfolio API.
 * @returns Ordered array of ContactChannelTile items.
 */
export function buildChannelTiles(c: Contact): ContactChannelTile[] {
  const tiles: (ContactChannelTile | null)[] = [
    c.email       ? { type: 'email',    label: 'Email',       tagline: 'Drop me a message anytime',      icon: 'email',    href: `mailto:${c.email}`,  external: false } : null,
    c.phone       ? { type: 'phone',    label: 'Phone',       tagline: 'Call or text me directly',       icon: 'phone',    href: `tel:${c.phone}`,     external: false } : null,
    c.linkedinUrl ? { type: 'linkedin', label: 'LinkedIn',    tagline: 'Connect with me professionally', icon: 'work',     href: c.linkedinUrl,        external: true  } : null,
    c.githubUrl   ? { type: 'github',   label: 'GitHub',      tagline: 'Browse my open-source work',    icon: 'code',     href: c.githubUrl,          external: true  } : null,
    c.twitterUrl  ? { type: 'twitter',  label: 'Twitter / X', tagline: 'Follow my latest updates',      icon: 'tag',      href: c.twitterUrl,         external: true  } : null,
    c.websiteUrl  ? { type: 'website',  label: 'Website',     tagline: 'Visit my personal site',         icon: 'language', href: c.websiteUrl,         external: true  } : null,
  ];
  return tiles.filter((t): t is ContactChannelTile => t !== null);
}

/**
 * Presentational component that displays the portfolio owner's available
 * contact channels as non-clickable informational tiles.
 *
 * Each tile shows an icon and a channel-type label only.  No actual contact
 * values (email address, phone number, URLs) are rendered in the template,
 * tooltips, aria-labels, or data attributes — this is by design to
 * prevent automated scraping.
 *
 * Visibility is determined server-side: only fields present in the Contact
 * API response are shown.  Tiles are `<div>` elements — NOT `<a>` links.
 */
@Component({
  selector: 'app-contact-tiles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (tiles().length > 0) {
      <div class="channels-list" role="list" aria-label="Available contact channels">
        @for (tile of tiles(); track tile.type) {
          <a
            class="channel-card"
            [class]="'channel-card--' + tile.type"
            role="listitem"
            [href]="tile.href"
            [target]="tile.external ? '_blank' : '_self'"
            [attr.rel]="tile.external ? 'noopener noreferrer' : null"
            [attr.aria-label]="tile.label + ' — ' + tile.tagline"
          >
            <div class="card-icon-wrap" aria-hidden="true">
              <mat-icon>{{ tile.icon }}</mat-icon>
            </div>
            <div class="card-text">
              <span class="card-title">{{ tile.label }}</span>
              <span class="card-tagline">{{ tile.tagline }}</span>
            </div>
          </a>
        }
      </div>
    }

    @if (locationText) {
      <div class="location-card" aria-label="Location">
        @if (mapUrl()) {
          <iframe
            class="location-map"
            [src]="mapUrl()!"
            frameborder="0"
            scrolling="no"
            loading="lazy"
            title="Map showing location"
            aria-hidden="true"
          ></iframe>
        }
        <div class="location-overlay">
          <mat-icon aria-hidden="true" class="location-pin">location_on</mat-icon>
          <span class="location-text">Based in {{ locationText }}</span>
        </div>
      </div>
    }
  `,
  styleUrl: './contact-tiles.component.scss',
})
export class ContactTilesComponent {
  /** Contact data from the public portfolio API.  May be null before load. */
  @Input({ required: true })
  set contact(value: Contact | null) {
    this._contact.set(value);
  }

  /**
   * Optional location string derived from profile data (e.g. "London, UK").
   * When present, a location card with an embedded map is rendered below the channel tiles.
   */
  @Input()
  set locationText(value: string | null) {
    this._locationText.set(value);
  }
  get locationText(): string | null { return this._locationText(); }

  private readonly _contact = signal<Contact | null>(null);
  private readonly _locationText = signal<string | null>(null);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly tiles = computed<ContactChannelTile[]>(() => {
    const c = this._contact();
    return c ? buildChannelTiles(c) : [];
  });

  /** Builds a sanitized OpenStreetMap embed URL from the locationText. */
  protected readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const loc = this._locationText();
    if (!loc) return null;
    // Kolkata, India coordinates — bbox gives a city-level zoom
    // lat=22.5726, lon=88.3639; bbox offsets ~0.15deg for ~city-block zoom
    const lat = 22.5726;
    const lon = 88.3639;
    const offset = 0.12;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
