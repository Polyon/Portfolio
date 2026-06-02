import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that allows access only to authenticated users with the ADMIN role.
 * Unauthenticated or unauthorised users are redirected to the login page.
 *
 * @returns `true` when access is permitted; a `UrlTree` redirect otherwise.
 */
export const AuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    if (user?.role === 'ADMIN') {
      return true;
    }
    // Authenticated but not ADMIN — clear session and redirect
    authService.logout();
  }

  return router.createUrlTree(['/login']);
};
