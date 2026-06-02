import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    // Public portfolio portal — default root route
    path: '',
    loadChildren: () =>
      import('./features/public-portal/public-portal.routes').then(
        (m) => m.PUBLIC_PORTAL_ROUTES,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'skills',
        loadComponent: () =>
          import('./features/skills/skills.component').then((m) => m.SkillsComponent),
      },
      {
        path: 'experience',
        loadComponent: () =>
          import('./features/experience/experience.component').then(
            (m) => m.ExperienceComponent,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./features/services/services.component').then((m) => m.ServicesComponent),
      },
      {
        path: 'contact/inbox',
        loadChildren: () =>
          import('./features/contact/contact-inbox/contact-inbox.routes').then(
            (m) => m.CONTACT_INBOX_ROUTES,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'email-templates',
        loadChildren: () =>
          import('./features/email-templates/email-templates.routes').then(
            (m) => m.EMAIL_TEMPLATES_ROUTES,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
