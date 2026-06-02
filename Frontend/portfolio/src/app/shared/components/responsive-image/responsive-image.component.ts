import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

/**
 * A standalone responsive image component that:
 * - Lazy-loads using the native `loading="lazy"` attribute.
 * - Falls back to IntersectionObserver for environments without native lazy loading (T104).
 * - Provides a WebP source with JPEG/PNG fallback via `<picture>` (T106).
 * - Supports srcset + sizes for responsive images (T105).
 * - Progressive blur-up: blurred placeholder clears on image load (T104).
 * - Falls back to a placeholder when the image fails to load.
 *
 * @example
 * ```html
 * <app-responsive-image
 *   src="/assets/profile.jpg"
 *   webpSrc="/assets/profile.webp"
 *   alt="Profile photo"
 *   width="400"
 *   height="400" />
 * ```
 */
@Component({
  selector: 'app-responsive-image',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <picture class="responsive-image-wrapper" [class.loaded]="loaded()">
      @if (webpSrc) {
        <source [attr.srcset]="webpSrc" type="image/webp" />
      }
      @if (!hasError()) {
        <img
          #imgEl
          [src]="activeSrc()"
          [alt]="alt"
          [attr.width]="width"
          [attr.height]="height"
          [attr.srcset]="srcset"
          [attr.sizes]="sizes"
          loading="lazy"
          decoding="async"
          (load)="onLoad()"
          (error)="onError()"
          class="responsive-image" />
      } @else {
        <div
          class="responsive-image-placeholder"
          [style.width.px]="width"
          [style.height.px]="height"
          role="img"
          [attr.aria-label]="alt">
          <span class="placeholder-initials">{{ initials }}</span>
        </div>
      }
    </picture>
  `,
  styles: [`
    .responsive-image-wrapper {
      display: block;
      overflow: hidden;
    }
    /* T104: blur-up progressive loading technique */
    .responsive-image {
      display: block;
      width: 100%;
      height: auto;
      opacity: 0;
      filter: blur(8px);
      transform: scale(1.02);
      transition: opacity 300ms ease-in, filter 300ms ease-in, transform 300ms ease-in;
    }
    .responsive-image-wrapper.loaded .responsive-image {
      opacity: 1;
      filter: none;
      transform: scale(1);
    }
    .responsive-image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      color: var(--mat-sys-on-surface, #ccc);
      font-size: 2rem;
      font-weight: 600;
    }
  `],
})
export class ResponsiveImageComponent implements AfterViewInit, OnDestroy {
  /** URL of the primary image (JPEG or PNG). */
  @Input({ required: true }) src!: string;
  /** Optional WebP version of the same image. */
  @Input() webpSrc?: string;
  /** Alt text for accessibility. */
  @Input({ required: true }) alt!: string;
  /** Intrinsic image width (pixels). Helps browser reserve layout space. */
  @Input() width?: number;
  /** Intrinsic image height (pixels). Helps browser reserve layout space. */
  @Input() height?: number;
  /** Responsive srcset descriptor (e.g. "image-400.jpg 400w, image-800.jpg 800w"). */
  @Input() srcset?: string;
  /** Responsive sizes attribute (e.g. "(max-width: 768px) 100vw, 50vw"). */
  @Input() sizes?: string;

  protected loaded = signal(false);
  protected hasError = signal(false);
  /** Active src — starts empty then set by IntersectionObserver or directly on init. */
  protected activeSrc = signal<string>('');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly elRef = inject(ElementRef);
  private intersectionObserver?: IntersectionObserver;

  /** Initials derived from the alt text, used in the placeholder. */
  get initials(): string {
    return this.alt
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR — set src directly for server rendering
      this.activeSrc.set(this.src);
      return;
    }

    const img: HTMLImageElement | null = this.elRef.nativeElement.querySelector('img');

    // T104: IntersectionObserver fallback for environments without native lazy loading
    if (img && !('loading' in HTMLImageElement.prototype) && typeof IntersectionObserver !== 'undefined') {
      this.activeSrc.set('');
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.activeSrc.set(this.src);
            this.intersectionObserver?.disconnect();
          }
        },
        { rootMargin: '200px' },
      );
      this.intersectionObserver.observe(img);
    } else {
      this.activeSrc.set(this.src);
    }
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  /** @internal */
  protected onLoad(): void {
    this.loaded.set(true);
  }

  /** @internal */
  protected onError(): void {
    this.hasError.set(true);
  }
}
