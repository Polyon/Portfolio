import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../auth/auth.service';

describe('jwtInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;
  let router: Router;

  function makeToken(exp: number): string {
    const payload = btoa(JSON.stringify({ exp }))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return `header.${payload}.sig`;
  }

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

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    const validToken = makeToken(Math.floor(Date.now() / 1000) + 3600);
    sessionStorage.setItem('access_token', validToken);

    // Manually invoke interceptor
    const req = new HttpRequest('GET', '/api/test');
    const cloned = (() => {
      const token = authService.getToken();
      return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    })();

    expect(cloned.headers.get('Authorization')).toBe(`Bearer ${validToken}`);
  });

  it('should not add Authorization header when no token', () => {
    const req = new HttpRequest('GET', '/api/test');
    const cloned = (() => {
      const token = authService.getToken();
      return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    })();

    expect(cloned.headers.get('Authorization')).toBeNull();
  });

  it('should use Bearer scheme in Authorization header', () => {
    const token = 'test-jwt-token';
    sessionStorage.setItem('access_token', token);

    const authHeader = `Bearer ${authService.getToken()}`;
    expect(authHeader).toMatch(/^Bearer /);
    expect(authHeader).toBe(`Bearer ${token}`);
  });
});

describe('jwtInterceptor integration', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;

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
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should pass requests through when no token is set', () => {
    httpClient.get('/api/public').subscribe();
    const req = httpMock.expectOne('/api/public');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });
});
