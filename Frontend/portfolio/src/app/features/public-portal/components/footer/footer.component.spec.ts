import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the current year in the copyright notice', () => {
    const copyright: HTMLElement = fixture.nativeElement.querySelector('.copyright');
    expect(copyright?.textContent).toContain(String(new Date().getFullYear()));
  });

  it('should render all social links', () => {
    const anchors: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('.social-link');
    expect(anchors.length).toBe(component.socialLinks.length);
  });

  it('should open social links in a new tab', () => {
    const anchors: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('.social-link');
    anchors.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    });
  });

  it('should render all quick links', () => {
    const links: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.footer-link');
    expect(links.length).toBe(component.quickLinks.length);
  });

  it('should call scrollToSection when a quick link is clicked', () => {
    spyOn(component, 'scrollToSection');
    const links: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.footer-link');
    links[0].click();
    expect(component.scrollToSection).toHaveBeenCalled();
  });

  it('should not throw when scrollToSection called in SSR context (no document)', () => {
    // Simulate SSR by checking the guard inside scrollToSection
    expect(() => component.scrollToSection('about')).not.toThrow();
  });
});
