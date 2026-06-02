import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';

import { publicErrorInterceptor } from './public-error.interceptor';

describe('publicErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAnimations(),
        provideHttpClient(withInterceptors([publicErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should pass through successful 2xx responses without opening snackbar', () => {
    http.get('/api/skills').subscribe();
    httpTesting.expectOne('/api/skills').flush([]);
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('should show a friendly message and rethrow on 404', () => {
    let errorCaught = false;
    http.get('/api/missing').subscribe({ error: () => (errorCaught = true) });
    httpTesting.expectOne('/api/missing').flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('not available yet'),
      'Dismiss',
      jasmine.any(Object),
    );
    expect(errorCaught).toBeTrue();
  });

  it('should show a soft server-error message on 500', () => {
    let errorCaught = false;
    http.get('/api/error').subscribe({ error: () => (errorCaught = true) });
    httpTesting.expectOne('/api/error').flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('could not be loaded'),
      'Dismiss',
      jasmine.any(Object),
    );
    expect(errorCaught).toBeTrue();
  });

  it('should show a connection error message on status 0', () => {
    let errorCaught = false;
    http.get('/api/offline').subscribe({ error: () => (errorCaught = true) });
    httpTesting.expectOne('/api/offline').flush('', { status: 0, statusText: 'Unknown Error' });

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('reach the server'),
      'Dismiss',
      jasmine.any(Object),
    );
    expect(errorCaught).toBeTrue();
  });

  it('should show a generic message for other 4xx errors (e.g. 403)', () => {
    let errorCaught = false;
    http.get('/api/forbidden').subscribe({ error: () => (errorCaught = true) });
    httpTesting.expectOne('/api/forbidden').flush('', { status: 403, statusText: 'Forbidden' });

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('unexpected error'),
      'Dismiss',
      jasmine.any(Object),
    );
    expect(errorCaught).toBeTrue();
  });
});
