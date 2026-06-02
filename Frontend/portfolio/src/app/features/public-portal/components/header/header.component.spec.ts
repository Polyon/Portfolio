import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all nav links in desktop nav', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('.desktop-nav .nav-link');
    expect(navLinks.length).toBe(component.navLinks.length);
  });

  it('should mark the active section link with .active class', () => {
    fixture.componentRef.setInput('activeSection', 'about');
    fixture.detectChanges();
    const activeBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.nav-link.active');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn?.textContent?.trim()).toBe('About');
  });

  it('should emit sectionNav event when a nav link is clicked', () => {
    const emitted: string[] = [];
    component.sectionNav.subscribe((id: string) => emitted.push(id));

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.desktop-nav .nav-link');
    buttons[1].click(); // "About" link (index 1)
    expect(emitted.length).toBeGreaterThan(0);
  });

  it('should emit sectionNav when brand logo is clicked', () => {
    const emitted: string[] = [];
    component.sectionNav.subscribe((id: string) => emitted.push(id));

    const brand: HTMLElement = fixture.nativeElement.querySelector('.brand');
    brand.click();
    expect(emitted).toContain('hero');
  });

  it('should emit sectionNav when brand logo receives Enter keydown', () => {
    const emitted: string[] = [];
    component.sectionNav.subscribe((id: string) => emitted.push(id));

    const brand: HTMLElement = fixture.nativeElement.querySelector('.brand');
    brand.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(emitted).toContain('hero');
  });

  it('should set aria-current on the active nav link', () => {
    fixture.componentRef.setInput('activeSection', 'skills');
    fixture.detectChanges();
    const activeBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.nav-link[aria-current="true"]');
    expect(activeBtn).not.toBeNull();
  });

  it('should render a hamburger mobile menu button', () => {
    const menuBtn = fixture.nativeElement.querySelector('.mobile-menu-btn');
    expect(menuBtn).not.toBeNull();
    expect(menuBtn.getAttribute('aria-label')).toContain('navigation menu');
  });
});
