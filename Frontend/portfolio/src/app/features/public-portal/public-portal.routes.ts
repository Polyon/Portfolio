import { Routes } from '@angular/router';

/** Lazy-loaded routes for the public portfolio portal feature. */
export const PUBLIC_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/layout/public-portal.component').then(
        (m) => m.PublicPortalComponent,
      ),
  },
];
