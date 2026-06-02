import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * HTTP interceptor for the public portfolio portal.
 * Catches 4xx/5xx responses, logs them for debugging,
 * and shows brief user-friendly notifications via MatSnackBar.
 * On 5xx server errors a softer message is shown to avoid alarming visitors.
 *
 * @param req  - The outgoing HTTP request.
 * @param next - The next handler in the interceptor chain.
 * @returns Observable of the HTTP event stream.
 */
export const publicErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message: string;

      if (error.status >= 500) {
        message = 'Some content could not be loaded. Please refresh the page.';
      } else if (error.status === 404) {
        message = 'Portfolio content is not available yet.';
      } else if (error.status === 0) {
        message = 'Unable to reach the server. Please check your connection.';
      } else {
        message = 'An unexpected error occurred while loading portfolio data.';
      }

      console.error(`[Public Portal HTTP ${error.status}]`, req.url, error);

      snackBar.open(message, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });

      return throwError(() => error);
    }),
  );
};
