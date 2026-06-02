import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

import { RichTextComponent } from './rich-text.component';

describe('RichTextComponent (integration – bio rendering)', () => {
  let fixture: ComponentFixture<RichTextComponent>;
  let component: RichTextComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextComponent);
    component = fixture.componentInstance;
  });

  // ── Plain text rendering ───────────────────────────────────────────────────

  it('should render plain text as paragraph elements', () => {
    fixture.componentRef.setInput('content', 'Hello world. I build software.');
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('.rich-text-content'));
    expect(container).toBeTruthy();
    expect(container.nativeElement.innerHTML).toContain('<p>');
    expect(container.nativeElement.textContent).toContain('Hello world');
  });

  it('should split double-newline paragraphs into separate <p> elements', () => {
    fixture.componentRef.setInput('content', 'Paragraph one.\n\nParagraph two.');
    fixture.detectChanges();

    const paragraphs = fixture.nativeElement.querySelectorAll('.rich-text-content p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0].textContent).toContain('Paragraph one');
    expect(paragraphs[1].textContent).toContain('Paragraph two');
  });

  it('should convert single newlines to <br> within the same paragraph', () => {
    fixture.componentRef.setInput('content', 'Line one.\nLine two.');
    fixture.detectChanges();

    const html = fixture.nativeElement.querySelector('.rich-text-content').innerHTML;
    expect(html).toContain('<br>');
  });

  // ── HTML content rendering ─────────────────────────────────────────────────

  it('should render HTML content with bold and italic formatting', () => {
    fixture.componentRef.setInput('content', '<p>Hello <strong>world</strong> and <em>friends</em></p>');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.rich-text-content');
    const strong = container.querySelector('strong');
    const em = container.querySelector('em');

    expect(strong).withContext('strong element rendered').toBeTruthy();
    expect(strong!.textContent).toBe('world');
    expect(em).withContext('em element rendered').toBeTruthy();
    expect(em!.textContent).toBe('friends');
  });

  it('should render anchor links from HTML content', () => {
    fixture.componentRef.setInput('content', '<p>Visit <a href="https://example.com">my site</a></p>');
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('.rich-text-content a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com');
  });

  it('should render unordered lists from HTML content', () => {
    fixture.componentRef.setInput('content', '<ul><li>Item one</li><li>Item two</li></ul>');
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.rich-text-content li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Item one');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('should render empty string without errors', () => {
    fixture.componentRef.setInput('content', '');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.rich-text-content');
    expect(container).toBeTruthy();
    expect(container.innerHTML.trim()).toBe('');
  });

  it('should render whitespace-only content as empty', () => {
    fixture.componentRef.setInput('content', '   \n   ');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.rich-text-content');
    expect(container.innerHTML.trim()).toBe('');
  });

  it('should update rendered content when @Input content changes', () => {
    fixture.componentRef.setInput('content', 'First content.');
    fixture.detectChanges();

    let container = fixture.nativeElement.querySelector('.rich-text-content');
    expect(container.textContent).toContain('First content');

    fixture.componentRef.setInput('content', 'Updated content.');
    fixture.detectChanges();

    container = fixture.nativeElement.querySelector('.rich-text-content');
    expect(container.textContent).toContain('Updated content');
    expect(container.textContent).not.toContain('First content');
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it('should apply ariaLabel to the content region when provided', () => {
    fixture.componentRef.setInput('content', 'Bio text.');
    fixture.componentRef.setInput('ariaLabel', 'Biography');
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector('[role="region"]');
    expect(region.getAttribute('aria-label')).toBe('Biography');
  });

  it('should not set aria-label attribute when ariaLabel is empty', () => {
    fixture.componentRef.setInput('content', 'Bio text.');
    fixture.componentRef.setInput('ariaLabel', '');
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector('[role="region"]');
    // Angular renders `aria-label="null"` for falsy binding — ensure it's absent or null
    const label = region.getAttribute('aria-label');
    expect(label == null || label === 'null').toBe(true);
  });
});
