import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Social media link definition. */
interface SocialLink {
  /** Display label / aria-label for accessibility. */
  label: string;
  /** URL to open. */
  url: string;
  /** Material icon name. */
  icon: string;
}

/** Quick navigation link shown in the footer. */
interface QuickLink {
  /** Display label. */
  label: string;
  /** Target section id for smooth scroll. */
  sectionId: string;
}

/**
 * Public portal footer with copyright notice, social media links,
 * and quick navigation links.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <footer class="portal-footer" role="contentinfo">
      <div class="footer-content">
        <!-- Brand tagline -->
        <div class="footer-brand">
          <span class="brand-accent">&lt;</span>Portfolio<span class="brand-accent">/&gt;</span>
          <p class="footer-tagline">Crafting digital experiences with passion.</p>
        </div>

        <!-- Quick links -->
        <nav class="footer-quick-links" aria-label="Footer navigation">
          <h3 class="footer-section-title">Quick Links</h3>
          @for (link of quickLinks; track link.sectionId) {
            <button
              mat-button
              class="footer-link"
              (click)="scrollToSection(link.sectionId)"
            >
              {{ link.label }}
            </button>
          }
        </nav>

        <!-- Social links -->
        <div class="footer-social" aria-label="Social media links">
          <h3 class="footer-section-title">Connect</h3>
          <div class="social-icons">
            @for (social of socialLinks; track social.label) {
              <a
                [href]="social.url"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="social.label"
                [matTooltip]="social.label"
                class="social-link"
              >
                <mat-icon>{{ social.icon }}</mat-icon>
              </a>
            }
          </div>
        </div>
      </div>

      <mat-divider class="footer-divider" />

      <div class="footer-bottom">
        <span class="copyright">
          &copy; {{ currentYear }} Portfolio. Built with
          <mat-icon class="heart-icon" aria-hidden="true">favorite</mat-icon>
          using Angular &amp; Material.
        </span>
      </div>
    </footer>
  `,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  /** Current calendar year for the copyright notice. */
  readonly currentYear = new Date().getFullYear();

  /** Social media links displayed in the footer. */
  readonly socialLinks: SocialLink[] = [
    { label: 'GitHub',   url: 'https://github.com',   icon: 'code' },
    { label: 'LinkedIn', url: 'https://linkedin.com', icon: 'work' },
    { label: 'Email',    url: 'mailto:hello@portfolio.dev', icon: 'email' },
  ];

  /** Quick navigation links mirroring the header. */
  readonly quickLinks: QuickLink[] = [
    { label: 'About',      sectionId: 'about' },
    { label: 'Skills',     sectionId: 'skills' },
    { label: 'Experience', sectionId: 'experience' },
    { label: 'Projects',   sectionId: 'projects' },
    { label: 'Contact',    sectionId: 'contact' },
  ];

  /**
   * Smooth-scrolls to the given section by id.
   * No-op during SSR where document is not available.
   * @param sectionId - The element id of the target section.
   */
  scrollToSection(sectionId: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
