import {
  Component,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * Thin accent-colored progress bar fixed at the very top of the viewport
 * that fills as the user scrolls down the page.
 */
@Component({
  selector: 'app-scroll-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="scroll-progress-bar"
      role="progressbar"
      [attr.aria-valuenow]="progress()"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Page scroll progress"
      [style.width.%]="progress()"
    ></div>
  `,
  styleUrl: './scroll-progress.component.scss',
})
export class ScrollProgressComponent {
  /** Current scroll progress as a percentage (0–100). */
  protected readonly progress = signal<number>(0);

  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Recalculates scroll progress on every window scroll event.
   */
  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) { return; }
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    this.progress.set(pct);
  }
}
