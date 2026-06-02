import {
  Component,
  Input,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Renders a 1–5 star proficiency indicator using Material icons.
 *
 * Filled stars represent the proficiency level; remaining stars are outlined.
 * Screen-reader accessible via an `aria-label` attribute.
 *
 * @example
 * ```html
 * <app-star-rating [value]="skill.proficiencyLevel" [max]="5" />
 * ```
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="star-rating"
      role="img"
      [attr.aria-label]="ariaLabel()">
      @for (star of stars(); track $index) {
        <mat-icon
          class="star-icon"
          [class.filled]="star.filled"
          [class.outlined]="!star.filled"
          aria-hidden="true">
          {{ star.filled ? 'star' : 'star_border' }}
        </mat-icon>
      }
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 1px;
    }

    .star-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      line-height: 1;

      &.filled {
        color: #00D9FF;
      }

      &.outlined {
        color: rgba(255, 255, 255, 0.25);
      }
    }
  `],
})
export class StarRatingComponent {
  /** Proficiency value (1–5). Values outside range are clamped. */
  @Input() set value(v: number) { this._value.set(Math.min(Math.max(Math.round(v), 0), this._max())); }
  /** Maximum star count (default: 5). */
  @Input() set max(m: number) { this._max.set(m > 0 ? m : 5); }

  private readonly _value = signal<number>(0);
  private readonly _max = signal<number>(5);

  /** Computed array of star descriptor objects. */
  protected readonly stars = computed(() =>
    Array.from({ length: this._max() }, (_, i) => ({ filled: i < this._value() })),
  );

  /** Accessible label summarising the rating. */
  protected readonly ariaLabel = computed(
    () => `Proficiency: ${this._value()} out of ${this._max()} stars`,
  );
}
