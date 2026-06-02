import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You are not authorized to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The item may already exist.',
  422: 'Validation failed. Please check your data.',
  500: 'A server error occurred. Please try again later.',
  503: 'Service is temporarily unavailable.',
};

/**
 * HTTP interceptor that catches all error responses and displays a user-friendly
 * snackbar notification with a localised error message.
 *
 * For 5xx server errors a "Retry" action is offered; clicking it re-executes the
 * original request exactly once so the user can recover from transient failures
 * without a full page reload.
 *
 * @param req - The outgoing HTTP request.
 * @param next - The next handler in the chain.
 * @returns Observable of the HTTP event stream.
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error) => {
      const status  = error.status as number;
      const message =
        ERROR_MESSAGES[status] ??
        (error.error?.message as string | undefined) ??
        'An unexpected error occurred.';

      console.error(`[HTTP Error ${status}]`, error);

      // 5xx — show a "Retry" action that re-executes the original request once.
      if (status >= 500) {
        const snackRef = snackBar.open(message, 'Retry', {
          duration:           8000,
          panelClass:         ['error-snackbar'],
          horizontalPosition: 'right',
          verticalPosition:   'top',
        });

        return snackRef.onAction().pipe(
          switchMap(() => next(req)),
        );
      }

      // All other errors — show dismissible snackbar and re-throw.
      snackBar.open(message, 'Close', {
        duration:           5000,
        panelClass:         ['error-snackbar'],
        horizontalPosition: 'right',
        verticalPosition:   'top',
      });

      return throwError(() => error);
    }),
  );
};

