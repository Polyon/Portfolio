import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ContactFormComponent } from './contact-form.component';
import { ContactService } from '../../../core/services/contact.service';
import { Contact } from '../../../core/models/contact.model';
import { ApiResponse } from '../../../core/models/common.models';

const mockContact: Contact = {
  id: 'c1',
  userId: 'u1',
  email: 'admin@example.com',
  emailPublic: true,
  phone: '+1 555 000 0000',
  phonePublic: false,
  linkedinUrl: 'https://linkedin.com/in/admin',
  linkedinPublic: true,
  githubUrl: 'https://github.com/admin',
  githubPublic: true,
  twitterUrl: '',
  twitterPublic: false,
  websiteUrl: 'https://adminsite.com',
  websitePublic: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockApiResponse: ApiResponse<Contact> = { data: mockContact, success: true };

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let contactServiceSpy: jasmine.SpyObj<ContactService>;
  let snackBarOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    contactServiceSpy = jasmine.createSpyObj('ContactService', ['getContact', 'updateContact'], {
      contact$: of(null),
    });
    contactServiceSpy.getContact.and.returnValue(of(mockApiResponse));

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContactService, useValue: contactServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    // Spy on the component's own MatSnackBar instance (providedIn: MatSnackBarModule creates
    // a module-scoped instance that differs from TestBed.inject(MatSnackBar)).
    snackBarOpenSpy = spyOn((component as any).snackBar as MatSnackBar, 'open');
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call getContact on init and populate the form', () => {
    expect(contactServiceSpy.getContact).toHaveBeenCalled();
    expect(component.form.get('email')?.value).toBe(mockContact.email);
    expect(component.form.get('emailPublic')?.value).toBe(mockContact.emailPublic);
    expect(component.form.get('linkedinUrl')?.value).toBe(mockContact.linkedinUrl);
  });

  it('should mark form as pristine after loading data', () => {
    expect(component.form.pristine).toBeTrue();
  });

  describe('form validation', () => {
    it('should be invalid when email is empty', () => {
      component.form.get('email')?.setValue('');
      expect(component.form.invalid).toBeTrue();
    });

    it('should be invalid when email format is wrong', () => {
      component.form.get('email')?.setValue('not-an-email');
      expect(component.form.get('email')?.hasError('email')).toBeTrue();
    });

    it('should be valid with a correct email', () => {
      component.form.get('email')?.setValue('valid@example.com');
      expect(component.form.get('email')?.valid).toBeTrue();
    });

    it('should validate phone number pattern', () => {
      component.form.get('phone')?.setValue('not-a-phone!!!');
      expect(component.form.get('phone')?.hasError('pattern')).toBeTrue();
    });

    it('should accept a valid phone number', () => {
      component.form.get('phone')?.setValue('+1 555 000 0000');
      expect(component.form.get('phone')?.valid).toBeTrue();
    });

    it('should validate LinkedIn URL format', () => {
      component.form.get('linkedinUrl')?.setValue('not-a-url');
      expect(component.form.get('linkedinUrl')?.hasError('url')).toBeTrue();
    });

    it('should accept a valid LinkedIn URL', () => {
      component.form.get('linkedinUrl')?.setValue('https://linkedin.com/in/user');
      expect(component.form.get('linkedinUrl')?.valid).toBeTrue();
    });

    it('should accept empty optional URL fields', () => {
      component.form.get('twitterUrl')?.setValue('');
      expect(component.form.get('twitterUrl')?.valid).toBeTrue();
    });
  });

  describe('visibility toggles', () => {
    it('should default emailPublic based on loaded contact', () => {
      expect(component.form.get('emailPublic')?.value).toBe(true);
    });

    it('should default phonePublic based on loaded contact', () => {
      expect(component.form.get('phonePublic')?.value).toBe(false);
    });

    it('should mark form dirty when visibility toggle changes', () => {
      component.form.get('emailPublic')?.setValue(false);
      component.form.markAsDirty();
      expect(component.form.dirty).toBeTrue();
    });
  });

  describe('save()', () => {
    it('should call updateContact with form values', () => {
      contactServiceSpy.updateContact.and.returnValue(of(mockApiResponse));
      component.form.markAsDirty();
      component.save();
      expect(contactServiceSpy.updateContact).toHaveBeenCalledWith(component.form.value);
    });

    it('should show success snackbar after save', () => {
      contactServiceSpy.updateContact.and.returnValue(of(mockApiResponse));
      component.form.markAsDirty();
      component.save();
      expect(snackBarOpenSpy).toHaveBeenCalledWith('Contact information saved', 'Dismiss', { duration: 3000 });
    });

    it('should mark form pristine after successful save', () => {
      contactServiceSpy.updateContact.and.returnValue(of(mockApiResponse));
      component.form.markAsDirty();
      component.save();
      expect(component.form.pristine).toBeTrue();
    });

    it('should show error snackbar on save failure', () => {
      contactServiceSpy.updateContact.and.returnValue(throwError(() => new Error('Network error')));
      component.form.markAsDirty();
      component.save();
      expect(snackBarOpenSpy).toHaveBeenCalledWith('Failed to save contact information', 'Dismiss', { duration: 4000 });
    });

    it('should not call updateContact when form is invalid', () => {
      component.form.get('email')?.setValue('');
      component.form.markAsDirty();
      component.save();
      expect(contactServiceSpy.updateContact).not.toHaveBeenCalled();
    });
  });

  describe('resetForm()', () => {
    it('should restore form to loaded values and mark pristine', () => {
      component.form.get('email')?.setValue('changed@example.com');
      component.form.markAsDirty();
      component.resetForm();
      expect(component.form.get('email')?.value).toBe(mockContact.email);
      expect(component.form.pristine).toBeTrue();
    });
  });

  describe('getContact failure', () => {
    it('should show error snackbar when loading contact fails', () => {
      contactServiceSpy.getContact.and.returnValue(throwError(() => new Error('Server error')));
      snackBarOpenSpy.calls.reset();
      const errorFixture = TestBed.createComponent(ContactFormComponent);
      errorFixture.detectChanges();
      expect(snackBarOpenSpy).toHaveBeenCalledWith('Failed to load contact information', 'Dismiss', { duration: 4000 });
    });
  });
});
