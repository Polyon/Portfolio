import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';

/** Navigation link definition for the public portal header. */
export interface NavLink {
  /** Display label shown in the navigation. */
  label: string;
  /** DOM element id of the corresponding section. */
  sectionId: string;
  /** Material icon name used in mobile menu. */
  icon: string;
}

/**
 * Sticky top navigation header for the public portfolio portal.
 * Renders a Material Toolbar with navigation links on desktop and
 * a hamburger menu on mobile viewports.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatRippleModule,
  ],
  template: `
    <mat-toolbar class="portal-header" role="banner">
      <!-- Logo / Brand -->
      <a class="brand" (click)="onNav('hero')" (keydown.enter)="onNav('hero')" tabindex="0"
         aria-label="Scroll to top">
        <span class="brand-accent">&lt;</span>Portfolio<span class="brand-accent">/&gt;</span>
      </a>

      <span class="spacer"></span>

      <!-- Desktop navigation links -->
      <nav class="desktop-nav" aria-label="Main navigation">
        @for (link of navLinks; track link.sectionId) {
          <button
            mat-button
            class="nav-link"
            [class.active]="activeSection === link.sectionId"
            (click)="onNav(link.sectionId)"
            [attr.aria-current]="activeSection === link.sectionId ? 'true' : null"
          >
            {{ link.label }}
          </button>
        }
      </nav>

      <!-- Mobile hamburger menu -->
      <button
        mat-icon-button
        class="mobile-menu-btn"
        [matMenuTriggerFor]="mobileMenu"
        aria-label="Open navigation menu"
      >
        <mat-icon>menu</mat-icon>
      </button>
    </mat-toolbar>

    <mat-menu #mobileMenu="matMenu" class="mobile-nav-menu">
      @for (link of navLinks; track link.sectionId) {
        <button mat-menu-item (click)="onNav(link.sectionId)">
          <mat-icon>{{ link.icon }}</mat-icon>
          <span>{{ link.label }}</span>
        </button>
      }
    </mat-menu>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  /** The currently active section id, used to highlight the matching nav link. */
  @Input() activeSection: string = 'hero';

  /** Emits the target section id when a navigation link is clicked. */
  @Output() sectionNav = new EventEmitter<string>();

  /** Navigation link configuration for all public portal sections. */
  readonly navLinks: NavLink[] = [
    { label: 'Home',       sectionId: 'hero',       icon: 'home' },
    { label: 'About',      sectionId: 'about',      icon: 'person' },
    { label: 'Skills',     sectionId: 'skills',     icon: 'code' },
    { label: 'Experience', sectionId: 'experience', icon: 'work' },
    { label: 'Projects',   sectionId: 'projects',   icon: 'folder' },
    { label: 'Services',   sectionId: 'services',   icon: 'miscellaneous_services' },
    { label: 'Contact',    sectionId: 'contact',    icon: 'mail' },
  ];

  /**
   * Handles navigation link clicks by emitting the target section id.
   * @param sectionId - The id of the section to scroll to.
   */
  onNav(sectionId: string): void {
    this.sectionNav.emit(sectionId);
  }
}
