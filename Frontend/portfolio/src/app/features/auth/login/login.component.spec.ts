import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { of, throwError } from 'rxjs';
import { TokenResponse } from '../../../core/models/jwt.model';

const MOCK_TOKEN_RESPONSE: TokenResponse = {
  token: 'header.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJBRE1JTiIsImV4cCI6OTk5OTk5OTk5OX0.sig',
  refreshToken: 'refresh-token',
  expiresIn: 86400,
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'logout', 'isAuthenticated', 'getToken', 'getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form validation', () => {
    it('should initialize with an invalid form', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('should require email field', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('');
      emailControl?.markAsTouched();
      expect(emailControl?.hasError('required')).toBeTrue();
    });

    it('should reject malformed email', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('not-an-email');
      emailControl?.markAsTouched();
      expect(emailControl?.hasError('email')).toBeTrue();
    });

    it('should accept a valid email', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('admin@example.com');
      expect(emailControl?.hasError('email')).toBeFalse();
      expect(emailControl?.hasError('required')).toBeFalse();
    });

    it('should require password field', () => {
      const passControl = component.loginForm.get('password');
      passControl?.setValue('');
      passControl?.markAsTouched();
      expect(passControl?.hasError('required')).toBeTrue();
    });

    it('should be valid when email and password are provided correctly', () => {
      component.loginForm.setValue({ email: 'admin@example.com', password: 'secret123' });
      expect(component.loginForm.valid).toBeTrue();
    });
  });

  describe('Form submission', () => {
    it('should not call login when form is invalid', () => {
      component.loginForm.setValue({ email: '', password: '' });
      component.onSubmit();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should call auth.login with correct credentials on valid form', () => {
      authServiceSpy.login.and.returnValue(of(MOCK_TOKEN_RESPONSE));
      component.loginForm.setValue({ email: 'admin@example.com', password: 'secret123' });

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith('admin@example.com', 'secret123');
    });

    it('should show loading spinner while request is in progress', () => {
      authServiceSpy.login.and.returnValue(of(MOCK_TOKEN_RESPONSE));
      component.loginForm.setValue({ email: 'admin@example.com', password: 'secret123' });

      // isLoading set to true on submit before observable resolves
      const originalLogin = authServiceSpy.login;
      authServiceSpy.login.and.callFake(() => {
        expect(component.isLoading).toBeTrue();
        return of(MOCK_TOKEN_RESPONSE);
      });

      component.onSubmit();
    });

    it('should set errorMessage on failed login', () => {
      authServiceSpy.login.and.returnValue(throwError(() => ({ error: { message: 'Invalid credentials.' } })));
      component.loginForm.setValue({ email: 'admin@example.com', password: 'wrongpwd' });

      component.onSubmit();

      expect(component.errorMessage).toBe('Invalid credentials.');
    });

    it('should clear errorMessage on new submit', () => {
      component.errorMessage = 'Previous error';
      authServiceSpy.login.and.returnValue(of(MOCK_TOKEN_RESPONSE));
      component.loginForm.setValue({ email: 'admin@example.com', password: 'secret123' });

      component.onSubmit();

      expect(component.errorMessage).toBeNull();
    });

    it('should set isLoading to false after error', () => {
      authServiceSpy.login.and.returnValue(throwError(() => new Error('Network error')));
      component.loginForm.setValue({ email: 'admin@example.com', password: 'secret' });

      component.onSubmit();

      expect(component.isLoading).toBeFalse();
    });
  });
});
