import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';

import { ScrollProgressComponent } from './scroll-progress.component';

describe('ScrollProgressComponent', () => {
  let fixture: ComponentFixture<ScrollProgressComponent>;
  let component: ScrollProgressComponent;

  function createComponent(platformId: string = 'browser'): void {
    TestBed.configureTestingModule({
      imports: [ScrollProgressComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScrollProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create the component', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should render the progress bar element', () => {
    createComponent();
    const bar = fixture.nativeElement.querySelector('.scroll-progress-bar');
    expect(bar).not.toBeNull();
  });

  it('should have role="progressbar" with aria attributes', () => {
    createComponent();
    const bar: HTMLElement = fixture.nativeElement.querySelector('.scroll-progress-bar');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should start at 0% progress', () => {
    createComponent();
    const bar: HTMLElement = fixture.nativeElement.querySelector('.scroll-progress-bar');
    expect(bar.style.width).toBe('0%');
  });

  it('should update progress on scroll (browser only)', () => {
    createComponent('browser');

    // Simulate a scrollable page
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight',  { value: 1000, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });

    component.onScroll();
    fixture.detectChanges();

    const bar: HTMLElement = fixture.nativeElement.querySelector('.scroll-progress-bar');
    // scrollTop=500, docHeight=1000 → 50%
    expect(bar.style.width).toBe('50%');
  });

  it('should not update progress when running in SSR (server platform)', () => {
    createComponent('server');
    // onScroll should be a no-op on server
    expect(() => component.onScroll()).not.toThrow();
  });
});
