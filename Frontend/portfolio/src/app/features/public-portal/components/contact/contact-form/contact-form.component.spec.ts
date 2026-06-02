import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { ContactFormComponent } from './contact-form.component';
import { ContactMessageService } from '../../../services/contact-message.service';
import { ApiResponse } from '../../../../../core/models/common.models';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fillForm(
  fixture: ComponentFixture<ContactFormComponent>,
  data: { name?: string; email?: string; message?: string; subject?: string },
): void {
  const set = (selector: string, value: string) => {
    const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input'));
    }
  };
  if (data.name    !== undefined) set('input[formcontrolname="name"]',    data.name);
  if (data.email   !== undefined) set('input[formcontrolname="email"]',   data.email);
  if (data.subject !== undefined) set('input[formcontrolname="subject"]', data.subject);
  if (data.message !== undefined) set('textarea[formcontrolname="message"]', data.message);
  fixture.detectChanges();
}

function getSubmitButton(fixture: ComponentFixture<ContactFormComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let mockContactMessageService: jasmine.SpyObj<ContactMessageService>;

  beforeEach(async () => {
    mockContactMessageService = jasmine.createSpyObj<ContactMessageService>(
      'ContactMessageService',
      ['sendMessage'],
    );

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, ReactiveFormsModule],
      providers: [
        provideAnimations(),
        { provide: ContactMessageService, useValue: mockContactMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Form rendering ─────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the form with all required fields', () => {
    const form = fixture.nativeElement.querySelector('form');
    expect(form).withContext('form element').toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="name"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="email"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="subject"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('textarea[formcontrolname="message"]')).toBeTruthy();
  });

  it('should NOT render the success panel initially', () => {
    expect(fixture.nativeElement.querySelector('.form-success')).toBeNull();
  });

  // ── Validation: submit button disabled state ───────────────────────────────

  it('should disable the submit button when required fields are empty', () => {
    const btn = getSubmitButton(fixture);
    expect(btn.disabled).toBeTrue();
  });

  it('should disable the submit button when form is invalid', () => {
    fillForm(fixture, { name: 'Bob', email: 'not-an-email', message: 'Valid message text' });
    fixture.detectChanges();
    const btn = getSubmitButton(fixture);
    expect(btn.disabled).toBeTrue();
  });

  it('should enable the submit button when all required fields are valid', () => {
    fillForm(fixture, { name: 'Bob', email: 'bob@example.com', message: 'Hello there, world!' });
    fixture.detectChanges();
    const btn = getSubmitButton(fixture);
    expect(btn.disabled).toBeFalse();
  });

  // ── Validation: MatError messages ─────────────────────────────────────────

  it('should show name error when name is empty and field is touched', fakeAsync(() => {
    const nameInput = fixture.nativeElement.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
    nameInput.dispatchEvent(new Event('focus'));
    nameInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const errors = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errors.length).toBeGreaterThan(0);
  }));

  it('should show email validation error for invalid email format', fakeAsync(() => {
    fillForm(fixture, { name: 'Bob', email: 'bad-email', message: 'Long enough message here' });
    const emailInput = fixture.nativeElement.querySelector('input[formcontrolname="email"]') as HTMLInputElement;
    emailInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const errorText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(errorText).toContain('valid email');
  }));

  // ── Submission flow ───────────────────────────────────────────────────────

  it('should call sendMessage with correct payload on valid form submit', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    fillForm(fixture, {
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'Hello',
      message: 'This is my message text',
    });
    fixture.detectChanges();

    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    expect(mockContactMessageService.sendMessage).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Hello',
        message: 'This is my message text',
      }),
    );
  }));

  it('should show success panel after successful submission', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-success')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  }));

  it('should emit messageSent output after successful submission', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    let emitted = false;
    component.messageSent.subscribe(() => (emitted = true));

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    tick();

    expect(emitted).toBeTrue();
  }));

  it('should disable submit button while submitting', fakeAsync(() => {
    // Return a never-completing observable to keep submitting = true
    mockContactMessageService.sendMessage.and.returnValue(
      new Observable(() => { /* never completes */ }),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    fixture.detectChanges();

    expect(getSubmitButton(fixture).disabled).toBeTrue();
  }));

  // ── Error handling ─────────────────────────────────────────────────────────

  it('should show error banner on server error', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      throwError(() => ({ error: { message: 'Service unavailable' } })),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.form-error-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Service unavailable');
  }));

  it('should preserve form values after server error', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      throwError(() => ({ error: { message: 'Error' } })),
    );

    fillForm(fixture, { name: 'Bob', email: 'bob@example.com', message: 'Preserved message text' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const messageInput = fixture.nativeElement.querySelector(
      'textarea[formcontrolname="message"]',
    ) as HTMLTextAreaElement;
    expect(messageInput.value).toBe('Preserved message text');
  }));

  it('should dismiss error banner when close button is clicked', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      throwError(() => ({ error: { message: 'Error' } })),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const dismissBtn = fixture.nativeElement.querySelector('.dismiss-error-btn') as HTMLButtonElement;
    dismissBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error-banner')).toBeNull();
  }));

  // ── Reset flow ─────────────────────────────────────────────────────────────

  it('should show form again after clicking "Send another message"', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'Test message body here' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const resetBtn = fixture.nativeElement.querySelector('.success-reset-btn') as HTMLButtonElement;
    resetBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.form-success')).toBeNull();
  }));
});

// ─── T018 — Query type selection tests ───────────────────────────────────────

describe('ContactFormComponent — query type (T018)', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let mockContactMessageService: jasmine.SpyObj<ContactMessageService>;

  beforeEach(async () => {
    mockContactMessageService = jasmine.createSpyObj<ContactMessageService>(
      'ContactMessageService',
      ['sendMessage'],
    );

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, ReactiveFormsModule],
      providers: [
        provideAnimations(),
        { provide: ContactMessageService, useValue: mockContactMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // (a) Default queryType is GENERAL ─────────────────────────────────────────

  it('(a) should default queryType FormControl to GENERAL', () => {
    const ctrl = component['form'].controls['queryType'];
    expect(ctrl.value).toBe('GENERAL');
  });

  it('(a) should render the query-type toggle group with GENERAL pre-selected', () => {
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      'mat-button-toggle-group[formcontrolname="queryType"]',
    );
    expect(group).withContext('toggle group present').toBeTruthy();

    const selected = fixture.nativeElement.querySelector(
      'mat-button-toggle[aria-checked="true"], mat-button-toggle.mat-button-toggle-checked',
    );
    expect(selected?.textContent?.trim()).toContain('General Inquiry');
  });

  // (b) Toggling to SERVICE updates form value ────────────────────────────────

  it('(b) should update queryType to SERVICE when the SERVICE toggle is clicked', fakeAsync(() => {
    const serviceBtn = (fixture.nativeElement.querySelectorAll(
      'mat-button-toggle button',
    ) as NodeListOf<HTMLButtonElement>)[1]; // second button = SERVICE
    serviceBtn?.click();
    tick();
    fixture.detectChanges();

    const ctrl = component['form'].controls['queryType'];
    expect(ctrl.value).toBe('SERVICE');
  }));

  it('(b) should include queryType SERVICE in the sendMessage payload', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    // Select SERVICE
    const serviceBtn = (fixture.nativeElement.querySelectorAll(
      'mat-button-toggle button',
    ) as NodeListOf<HTMLButtonElement>)[1];
    serviceBtn?.click();
    tick();
    fixture.detectChanges();

    fillForm(fixture, {
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Service related question here',
    });
    getSubmitButton(fixture).click();
    tick();

    expect(mockContactMessageService.sendMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ queryType: 'SERVICE' }),
    );
  }));

  // (c) Success message reflects selected query type ─────────────────────────

  it('(c) should show "service enquiry" in success message after SERVICE submission', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    const serviceBtn = (fixture.nativeElement.querySelectorAll(
      'mat-button-toggle button',
    ) as NodeListOf<HTMLButtonElement>)[1];
    serviceBtn?.click();
    tick();
    fixture.detectChanges();

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'A question about services.' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const successBody = fixture.nativeElement.querySelector('.success-body') as HTMLElement;
    expect(successBody?.textContent?.toLowerCase()).toContain('service enquiry');
  }));

  it('(c) should show generic success message after GENERAL submission (default)', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      of({ success: true, data: null } as ApiResponse<null>),
    );

    fillForm(fixture, { name: 'Alice', email: 'alice@example.com', message: 'A general question here.' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    const successBody = fixture.nativeElement.querySelector('.success-body') as HTMLElement;
    expect(successBody?.textContent?.toLowerCase()).toContain('message has been received');
    expect(successBody?.textContent?.toLowerCase()).not.toContain('service enquiry');
  }));

  // (d) Form data preserved on error — including queryType ───────────────────

  it('(d) should preserve queryType value after a server error', fakeAsync(() => {
    mockContactMessageService.sendMessage.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } })),
    );

    // Select SERVICE before submitting
    const serviceBtn = (fixture.nativeElement.querySelectorAll(
      'mat-button-toggle button',
    ) as NodeListOf<HTMLButtonElement>)[1];
    serviceBtn?.click();
    tick();
    fixture.detectChanges();

    fillForm(fixture, { name: 'Bob', email: 'bob@example.com', message: 'Preserved query type.' });
    getSubmitButton(fixture).click();
    tick();
    fixture.detectChanges();

    // The form should still be visible (not reset)
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    // queryType FormControl should still hold SERVICE
    const ctrl = component['form'].controls['queryType'];
    expect(ctrl.value).toBe('SERVICE');
  }));

  // (e) Existing validators remain intact after queryType FormControl was added

  it('(e) should still require name field to be non-empty', () => {
    const nameCtrl = component['form'].controls['name'];
    expect(nameCtrl.hasValidator(jasmine.anything())).toBeTrue();
    nameCtrl.setValue('');
    nameCtrl.markAsTouched();
    expect(nameCtrl.hasError('required')).toBeTrue();
  });

  it('(e) should still require email field to be a valid email address', () => {
    const emailCtrl = component['form'].controls['email'];
    emailCtrl.setValue('not-an-email');
    emailCtrl.markAsTouched();
    expect(emailCtrl.hasError('email')).toBeTrue();
  });

  it('(e) should still require message field to have at least 10 characters', () => {
    const msgCtrl = component['form'].controls['message'];
    msgCtrl.setValue('short');
    msgCtrl.markAsTouched();
    expect(msgCtrl.hasError('minlength')).toBeTrue();
  });

  it('(e) should still require message field to be non-empty', () => {
    const msgCtrl = component['form'].controls['message'];
    msgCtrl.setValue('');
    msgCtrl.markAsTouched();
    expect(msgCtrl.hasError('required')).toBeTrue();
  });
});

// Needed because fakeAsync closes over Observable
import { Observable } from 'rxjs';
