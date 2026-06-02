import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth/auth.guard';

/**
 * Lazy-loaded child routes for the Email Templates feature.
 *
 * Registered under `email-templates` inside the admin layout route in app.routes.ts.
 *
 *   /admin/email-templates   → TemplateListComponent (template list + preview panel)
 */
export const EMAIL_TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/template-list/template-list.component').then(
        (m) => m.TemplateListComponent,
      ),
  },
];
