import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { ContactMethodItemComponent } from './contact-method-item.component';
import { ContactMethodDisplay } from '../contact.component';

const EMAIL_METHOD: ContactMethodDisplay = {
  type: 'email',
  label: 'Email',
  value: 'hello@example.com',
  href: 'mailto:hello@example.com',
  icon: 'email',
  external: false,
};

const GITHUB_METHOD: ContactMethodDisplay = {
  type: 'github',
  label: 'GitHub',
  value: 'github.com/user',
  href: 'https://github.com/user',
  icon: 'code',
  external: true,
};

describe('ContactMethodItemComponent', () => {
  let fixture: ComponentFixture<ContactMethodItemComponent>;
  let component: ContactMethodItemComponent;

  async function createWithMethod(method: ContactMethodDisplay): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ContactMethodItemComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactMethodItemComponent);
    component = fixture.componentInstance;
    component.method = method;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create the component', async () => {
    await createWithMethod(EMAIL_METHOD);
    expect(component).toBeTruthy();
  });

  it('should display the method label', async () => {
    await createWithMethod(EMAIL_METHOD);
    const label: HTMLElement = fixture.nativeElement.querySelector('.item-label');
    expect(label.textContent?.trim()).toBe('Email');
  });

  it('should display the method value', async () => {
    await createWithMethod(EMAIL_METHOD);
    const value: HTMLElement = fixture.nativeElement.querySelector('.item-value');
    expect(value.textContent?.trim()).toBe('hello@example.com');
  });

  it('should render a mailto: link for email methods', async () => {
    await createWithMethod(EMAIL_METHOD);
    const anchor: HTMLAnchorElement = fixture.nativeElement.querySelector('.item-action');
    expect(anchor.getAttribute('href')).toBe('mailto:hello@example.com');
  });

  it('should not add rel="noopener noreferrer" for internal links', async () => {
    await createWithMethod(EMAIL_METHOD);
    const anchor: HTMLAnchorElement = fixture.nativeElement.querySelector('.item-action');
    expect(anchor.getAttribute('target')).toBe('_self');
    expect(anchor.getAttribute('rel')).toBeNull();
  });

  it('should open external links in a new tab', async () => {
    await createWithMethod(GITHUB_METHOD);
    const anchor: HTMLAnchorElement = fixture.nativeElement.querySelector('.item-action');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toContain('noopener');
    expect(anchor.getAttribute('rel')).toContain('noreferrer');
  });

  it('should set aria-label on the article element', async () => {
    await createWithMethod(EMAIL_METHOD);
    const article: HTMLElement = fixture.nativeElement.querySelector('.contact-item');
    expect(article.getAttribute('aria-label')).toContain('Email');
    expect(article.getAttribute('aria-label')).toContain('hello@example.com');
  });

  it('should apply type-specific icon-wrap class', async () => {
    await createWithMethod(GITHUB_METHOD);
    const wrap: HTMLElement = fixture.nativeElement.querySelector('.item-icon-wrap');
    expect(wrap.classList).toContain('item-icon-wrap--github');
  });
});
