import { Component, ViewChild, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { AuthService } from '../../core/auth/auth.service';
import { ContactInboxStateService } from '../../features/contact/contact-inbox/services/contact-inbox-state.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exactMatch?: boolean;
  /** Optional reactive badge count. Emits the count to display on this nav item. */
  badge$?: Observable<number>;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    UserMenuComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  private inboxState = inject(ContactInboxStateService);

  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset);

  currentUser = this.authService.getCurrentUser();

  get userInitial(): string {
    return (this.currentUser?.email?.charAt(0) ?? 'A').toUpperCase();
  }

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',     route: '/admin/dashboard' },
    { label: 'Profile',         icon: 'person',        route: '/admin/profile' },
    { label: 'Skills',          icon: 'psychology',    route: '/admin/skills' },
    { label: 'Experience',      icon: 'work',          route: '/admin/experience' },
    { label: 'Projects',        icon: 'rocket_launch', route: '/admin/projects' },
    { label: 'Services',        icon: 'build',         route: '/admin/services' },
    { label: 'Contact',         icon: 'contacts',      route: '/admin/contact',       exactMatch: true },
    {
      label: 'Contact Inbox',
      icon: 'inbox',
      route: '/admin/contact/inbox',
      badge$: this.inboxState.unreadCount$,
    },
    { label: 'Email Templates', icon: 'email',         route: '/admin/email-templates' },
  ];

  collapsed = false;

  toggleSidenav(): void {
    if (this.breakpointObserver.isMatched(Breakpoints.Handset)) {
      this.sidenav.toggle();
    } else {
      this.collapsed = !this.collapsed;
    }
  }

  closeSidenavOnMobile(): void {
    if (this.breakpointObserver.isMatched(Breakpoints.Handset)) {
      this.sidenav.close();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
