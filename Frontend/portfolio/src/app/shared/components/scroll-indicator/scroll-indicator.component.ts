import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Animated scroll-down indicator displayed at the bottom of the hero section.
 * Shows a bouncing chevron arrow and hint text to guide users.
 */
@Component({
  selector: 'app-scroll-indicator',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scroll-indicator" aria-hidden="true">
      <span class="scroll-hint-text">Scroll to explore</span>
      <mat-icon class="scroll-arrow">expand_more</mat-icon>
    </div>
  `,
  styles: [`
    .scroll-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      animation: bounce 2s ease-in-out infinite;
      cursor: default;
    }

    .scroll-hint-text {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
    }

    .scroll-arrow {
      color: rgba(0, 217, 255, 0.7);
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(10px); }
    }
  `],
})
export class ScrollIndicatorComponent {}
