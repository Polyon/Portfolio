import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import { TokenResponse } from '../models/jwt.model';

/** Generates a JWT with a real Base64-encoded payload for testing */
function makeToken(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${encoded}.sig`;
}

const MOCK_TOKEN_RESPONSE: TokenResponse = {
  token: makeToken({ sub: '123', email: 'admin@test.com', role: 'ADMIN', iat: 1000, exp: 9999999999 }),
  refreshToken: 'refresh-token-abc',
  expiresIn: 86400,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login()', () => {
    it('should POST credentials to auth/login', () => {
      service.login('admin@test.com', 'secret').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'admin@test.com', password: 'secret' });
      req.flush({ data: MOCK_TOKEN_RESPONSE });
    });

    it('should store access token in sessionStorage after login', () => {
      service.login('admin@test.com', 'secret').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      req.flush({ data: MOCK_TOKEN_RESPONSE });

      expect(sessionStorage.getItem('access_token')).toBe(MOCK_TOKEN_RESPONSE.token);
    });

    it('should store refresh token in sessionStorage after login', () => {
      service.login('admin@test.com', 'secret').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      req.flush({ data: MOCK_TOKEN_RESPONSE });

      expect(sessionStorage.getItem('refresh_token')).toBe(MOCK_TOKEN_RESPONSE.refreshToken);
    });
  });

  describe('logout()', () => {
    it('should remove tokens from sessionStorage', () => {
      sessionStorage.setItem('access_token', 'token');
      sessionStorage.setItem('refresh_token', 'refresh');

      service.logout();

      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('isAuthenticated()', () => {
    it('should return false when no token is stored', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return false for an expired token', () => {
      const expired = makeToken({ exp: Math.floor(Date.now() / 1000) - 100 });
      sessionStorage.setItem('access_token', expired);

      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true for a valid non-expired token', () => {
      const valid = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
      sessionStorage.setItem('access_token', valid);

      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('getToken()', () => {
    it('should return stored access token', () => {
      sessionStorage.setItem('access_token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('getCurrentUser()', () => {
    it('should decode and return user info from token', () => {
      sessionStorage.setItem('access_token', MOCK_TOKEN_RESPONSE.token);
      const user = service.getCurrentUser();

      expect(user?.userId).toBe('123');
      expect(user?.email).toBe('admin@test.com');
      expect(user?.role).toBe('ADMIN');
    });

    it('should return null when no token is stored', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('refreshToken()', () => {
    it('should POST refresh token to auth/refresh', () => {
      sessionStorage.setItem('refresh_token', 'old-refresh');

      service.refreshToken().subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
      req.flush({ data: MOCK_TOKEN_RESPONSE });
    });

    it('should update stored access token after refresh', () => {
      sessionStorage.setItem('refresh_token', 'old-refresh');

      service.refreshToken().subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      req.flush({ data: MOCK_TOKEN_RESPONSE });

      expect(sessionStorage.getItem('access_token')).toBe(MOCK_TOKEN_RESPONSE.token);
    });
  });
});
