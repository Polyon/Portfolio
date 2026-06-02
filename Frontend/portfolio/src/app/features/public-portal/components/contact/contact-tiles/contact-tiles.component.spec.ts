import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ContactTilesComponent, buildChannelTiles } from './contact-tiles.component';
import { Contact } from '../../../../../core/models/contact.model';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const BASE_CONTACT: Contact = {
  email: 'hello@example.com',
  phone: '+1 555 0100',
  linkedinUrl: 'https://linkedin.com/in/test',
  githubUrl: 'https://github.com/test',
  twitterUrl: 'https://twitter.com/test',
  websiteUrl: 'https://example.com',
};

function setContact(
  fixture: ComponentFixture<ContactTilesComponent>,
  contact: Contact | null,
): void {
  fixture.componentRef.setInput('contact', contact);
  fixture.detectChanges();
}

// ─── buildChannelTiles pure-function tests ────────────────────────────────────

describe('buildChannelTiles()', () => {
  it('returns a tile for every present channel field', () => {
    const tiles = buildChannelTiles(BASE_CONTACT);
    expect(tiles.length).toBe(6);
    const types = tiles.map((t) => t.type);
    expect(types).toContain('email');
    expect(types).toContain('phone');
    expect(types).toContain('linkedin');
    expect(types).toContain('github');
    expect(types).toContain('twitter');
    expect(types).toContain('website');
  });

  it('omits tiles for absent fields', () => {
    const contact: Contact = { email: 'hi@example.com' };
    const tiles = buildChannelTiles(contact);
    expect(tiles.length).toBe(1);
    expect(tiles[0].type).toBe('email');
  });

  it('returns empty array for contact with no fields', () => {
    const tiles = buildChannelTiles({} as Contact);
    expect(tiles.length).toBe(0);
  });

  it('each tile has type, label, tagline, and icon properties', () => {
    const tiles = buildChannelTiles(BASE_CONTACT);
    for (const tile of tiles) {
      expect(tile.type).toBeTruthy();
      expect(tile.label).toBeTruthy();
      expect(tile.tagline).toBeTruthy();
      expect(tile.icon).toBeTruthy();
    }
  });
});

// ─── ContactTilesComponent tests ─────────────────────────────────────────────

describe('ContactTilesComponent', () => {
  let fixture: ComponentFixture<ContactTilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactTilesComponent],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactTilesComponent);
    setContact(fixture, BASE_CONTACT);
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one tile for each visible channel (6 tiles for full contact)', () => {
    const tiles = fixture.nativeElement.querySelectorAll('.channel-card');
    expect(tiles.length).toBe(6);
  });

  it('renders only tiles for present channels', () => {
    setContact(fixture, { email: 'hi@example.com', githubUrl: 'https://github.com/x' });
    const tiles = fixture.nativeElement.querySelectorAll('.channel-card');
    expect(tiles.length).toBe(2);
  });

  it('renders no tiles when contact is null', () => {
    setContact(fixture, null);
    const list = fixture.nativeElement.querySelector('.channels-list');
    expect(list).toBeNull();
  });

  it('renders no tiles when contact has no visible fields', () => {
    setContact(fixture, {} as Contact);
    const list = fixture.nativeElement.querySelector('.channels-list');
    expect(list).toBeNull();
  });

  // ── Security: no href or actual values rendered ────────────────────────────

  it('should NOT render any <a> elements (tiles are not clickable)', () => {
    const anchors = fixture.nativeElement.querySelectorAll('a');
    expect(anchors.length).toBe(0);
  });

  it('should NOT render any href attribute anywhere in the tile list', () => {
    const list = fixture.nativeElement.querySelector('.channels-list') as HTMLElement;
    if (!list) { return; }
    const allElements = list.querySelectorAll('[href]');
    expect(allElements.length).toBe(0);
  });

  it('should NOT render any contact value (email address, URL, phone) in the DOM', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('hello@example.com');
    expect(text).not.toContain('+1 555 0100');
    expect(text).not.toContain('linkedin.com');
    expect(text).not.toContain('github.com');
    expect(text).not.toContain('twitter.com');
    expect(text).not.toContain('example.com');
  });

  // ── Labels ────────────────────────────────────────────────────────────────

  it('should render channel labels (not actual values)', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Email');
    expect(text).toContain('Phone');
    expect(text).toContain('LinkedIn');
    expect(text).toContain('GitHub');
  });

  it('should apply the correct CSS modifier class for each tile type', () => {
    const emailTile = fixture.nativeElement.querySelector('.channel-card--email');
    const githubTile = fixture.nativeElement.querySelector('.channel-card--github');
    expect(emailTile).toBeTruthy();
    expect(githubTile).toBeTruthy();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('should have role="list" on the list container', () => {
    const list = fixture.nativeElement.querySelector('.channels-list');
    expect(list?.getAttribute('role')).toBe('list');
  });

  it('each tile should have role="listitem"', () => {
    const tiles = fixture.nativeElement.querySelectorAll('[role="listitem"]');
    expect(tiles.length).toBe(6);
  });

  it('should display a tagline for each rendered card', () => {
    const taglines = fixture.nativeElement.querySelectorAll('.card-tagline');
    expect(taglines.length).toBe(6);
    (taglines as NodeListOf<HTMLElement>).forEach((el) => {
      expect(el.textContent?.trim().length).toBeGreaterThan(0);
    });
  });
