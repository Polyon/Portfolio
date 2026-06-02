import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, animate, transition } from '@angular/animations';

/**
 * Sticky circular button that smoothly scrolls the user back to the top
 * of the page. Visibility is controlled by the parent layout via `[visible]`.
 */
@Component({
  selector: 'app-back-to-top',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  animations: [
    trigger('fadeInOut', [
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      state('hidden',  style({ opacity: 0, transform: 'translateY(16px)' })),
      transition('hidden => visible', animate('200ms ease-out')),
      transition('visible => hidden', animate('150ms ease-in')),
    ]),
  ],
  template: `
    <button
      mat-fab
      class="back-to-top-btn"
      color="accent"
      aria-label="Scroll back to top"
      matTooltip="Back to top"
      matTooltipPosition="left"
      [@fadeInOut]="visible ? 'visible' : 'hidden'"
      (click)="scrollToTop()"
    >
      <mat-icon>keyboard_arrow_up</mat-icon>
    </button>
  `,
  styleUrl: './back-to-top.component.scss',
})
export class BackToTopComponent {
  /** When true, the button is visible; when false it fades out. */
  @Input() visible: boolean = false;

  /**
   * Smoothly scrolls the page back to the very top.
   * No-op during SSR where window is not available.
   */
  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
