import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth/auth.guard';

/**
 * Lazy-loaded child routes for the Contact Inbox feature.
 *
 * Registered under `contact/inbox` inside the admin layout route in app.routes.ts.
 *
 *   /admin/contact/inbox       → InboxListComponent  (message list + filters)
 *   /admin/contact/inbox/:id   → InboxDetailComponent (single message detail)
 */
export const CONTACT_INBOX_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inbox-list/inbox-list.component').then(
        (m) => m.InboxListComponent,
      ),
  },
  {
    path: ':id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/inbox-detail/inbox-detail.component').then(
        (m) => m.InboxDetailComponent,
      ),
  },
];
