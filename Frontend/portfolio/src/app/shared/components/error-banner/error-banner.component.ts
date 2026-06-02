import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

/**
 * Inline error banner component.
 * Renders a dismissible error message with an icon when `message` is non-null.
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (message) {
      <div class="error-banner">
        <mat-icon>error_outline</mat-icon>
        <span>{{ message }}</span>
      </div>
    }
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(244, 67, 54, 0.15);
      border: 1px solid rgba(244, 67, 54, 0.4);
      border-radius: 8px;
      color: #ef9a9a;
      margin-bottom: 16px;
    }
  `],
})
export class ErrorBannerComponent {
  /** The error message to display. When `null` the banner is hidden. */
  @Input() message: string | null = null;
}
