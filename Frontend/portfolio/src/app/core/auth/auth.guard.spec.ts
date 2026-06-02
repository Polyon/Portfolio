import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  function runGuard() {
    return TestBed.runInInjectionContext(() => AuthGuard({} as never, {} as never));
  }

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['isAuthenticated', 'getCurrentUser', 'logout', 'getToken'],
    );

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should allow access when user is authenticated and has ADMIN role', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue({ userId: '1', email: 'admin@test.com', role: 'ADMIN' });

    const result = runGuard();

    expect(result).toBeTrue();
  });

  it('should redirect to /login when user is not authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should call logout and redirect when authenticated but not ADMIN', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue({ userId: '1', email: 'user@test.com', role: 'USER' as 'ADMIN' });

    const result = runGuard();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should redirect to /login when getCurrentUser returns null', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue(null);

    const result = runGuard();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(result).toBeInstanceOf(UrlTree);
  });
});
