import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

/**
 * Reusable loading spinner overlay component backed by Angular Material.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (show) {
      <div class="spinner-overlay">
        <mat-spinner [diameter]="diameter" color="accent"></mat-spinner>
      </div>
    }
  `,
  styles: [`
    .spinner-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
  `],
})
export class LoadingSpinnerComponent {
  /** Whether the spinner is visible. Defaults to `true`. */
  @Input() show = true;
  /** Diameter of the spinner in pixels. Defaults to `48`. */
  @Input() diameter = 48;
}
