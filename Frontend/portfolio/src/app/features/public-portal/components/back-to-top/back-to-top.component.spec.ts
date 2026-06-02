import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { BackToTopComponent } from './back-to-top.component';

describe('BackToTopComponent', () => {
  let fixture: ComponentFixture<BackToTopComponent>;
  let component: BackToTopComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackToTopComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BackToTopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the back-to-top button', () => {
    const btn = fixture.nativeElement.querySelector('.back-to-top-btn');
    expect(btn).not.toBeNull();
  });

  it('should have aria-label "Scroll back to top"', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.back-to-top-btn');
    expect(btn.getAttribute('aria-label')).toBe('Scroll back to top');
  });

  it('should have visible=false by default', () => {
    expect(component.visible).toBeFalse();
  });

  it('should accept visible=true input', () => {
    component.visible = true;
    fixture.detectChanges();
    expect(component.visible).toBeTrue();
  });

  it('should call window.scrollTo when button is clicked (browser context)', () => {
    spyOn(window, 'scrollTo');
    component.scrollToTop();
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
