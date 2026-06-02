import {
  Component,
  Input,
  ChangeDetectionStrategy,
  signal,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * Image component that displays a placeholder avatar with initials when the
 * source image fails to load or is not provided.
 *
 * Features:
 * - Native `loading="lazy"` for browser-native lazy loading.
 * - IntersectionObserver fallback for environments that do not support native lazy loading.
 * - Progressive blur-up technique: renders at full quality once the image is loaded.
 * - `<picture>` element with WebP source and JPEG/PNG fallback (T106).
 * - `srcset` + `sizes` support for responsive images (T105).
 *
 * @example
 * ```html
 * <app-image-fallback
 *   [src]="profile.profileImageUrl"
 *   [webpSrc]="profile.profileImageUrl + '?fmt=webp'"
 *   [srcset]="'profile-320w.webp 320w, profile-768w.webp 768w'"
 *   sizes="(max-width: 768px) 100vw, 50vw"
 *   [alt]="profile.firstName + ' ' + profile.lastName"
 *   [size]="180" />
 * ```
 */
@Component({
  selector: 'app-image-fallback',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!hasError() && src) {
      <!-- T106: <picture> element for WebP + fallback (T104: lazy via IntersectionObserver/native) -->
      <picture class="fallback-picture">
        @if (webpSrc) {
          <source
            [attr.srcset]="webpSrcset || webpSrc"
            [attr.sizes]="sizes"
            type="image/webp" />
        }
        <img
          #imgEl
          class="fallback-img"
          [class.loaded]="loaded()"
          [class.blur-up]="!loaded()"
          [src]="activeSrc()"
          [attr.srcset]="srcset || null"
          [attr.sizes]="sizes || null"
          [alt]="alt"
          [style.width.px]="size"
          [style.height.px]="size"
          loading="lazy"
          decoding="async"
          (load)="onLoad()"
          (error)="onError()" />
      </picture>
    } @else {
      <div
        class="fallback-placeholder"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.font-size.px]="size * 0.32"
        role="img"
        [attr.aria-label]="alt">
        {{ initials }}
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-block;
      line-height: 0;
    }

    .fallback-picture {
      display: block;
      line-height: 0;
    }

    /* T104: blur-up progressive loading technique */
    .fallback-img {
      display: block;
      border-radius: 50%;
      object-fit: cover;
      opacity: 0;
      /* transition handles both fade-in and blur removal */
      transition: opacity 350ms ease-in, filter 350ms ease-in;

      &.blur-up {
        filter: blur(8px);
        transform: scale(1.02); /* prevent layout shift from blur edge */
      }

      &.loaded {
        opacity: 1;
        filter: none;
        transform: scale(1);
      }
    }

    .fallback-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(13, 27, 42, 0.8));
      border: 2px solid rgba(0, 217, 255, 0.3);
      color: #00D9FF;
      font-weight: 700;
      letter-spacing: 0.05em;
      user-select: none;
    }
  `],
})
export class ImageFallbackComponent implements AfterViewInit, OnDestroy {
  /** URL of the primary image (JPEG or PNG). When absent or on error, shows initials. */
  @Input() src?: string | null;
  /**
   * Optional WebP version of the image.
   * Rendered as `<source type="image/webp">` inside a `<picture>` element.
   */
  @Input() webpSrc?: string | null;
  /**
   * Optional srcset string for WebP sources, e.g.
   * `"profile-320w.webp 320w, profile-768w.webp 768w, profile-1280w.webp 1280w"`.
   */
  @Input() webpSrcset?: string | null;
  /**
   * Optional srcset string for the fallback `<img>` element, e.g.
   * `"profile-320w.jpg 320w, profile-768w.jpg 768w"`.
   */
  @Input() srcset?: string | null;
  /**
   * The `sizes` attribute shared between the WebP `<source>` and `<img>`.
   * Defaults to `100vw` when not set.
   */
  @Input() sizes?: string | null;
  /** Alt text for accessibility and initials derivation. */
  @Input({ required: true }) alt!: string;
  /** Pixel size (width and height) of the circular image/placeholder. */
  @Input() size = 160;

  protected loaded = signal(false);
  protected hasError = signal(false);
  /** The src actually rendered — starts as placeholder, swapped to real src by IntersectionObserver. */
  protected activeSrc = signal<string>('');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly elRef = inject(ElementRef);
  private intersectionObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.src) {
      // SSR or no src — immediately show the real URL so server renders it
      this.activeSrc.set(this.src ?? '');
      return;
    }

    // Check for native lazy loading support
    const img = this.elRef.nativeElement.querySelector('img');
    if (!img) {
      this.activeSrc.set(this.src);
      return;
    }

    // T104: IntersectionObserver fallback for environments without native lazy loading
    if (!('loading' in HTMLImageElement.prototype) && typeof IntersectionObserver !== 'undefined') {
      // Native lazy loading not supported — use IntersectionObserver
      this.activeSrc.set(''); // start with empty src to prevent immediate load
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            this.activeSrc.set(this.src!);
            this.intersectionObserver?.disconnect();
          }
        },
        { rootMargin: '200px' }, // start loading 200px before viewport
      );
      this.intersectionObserver.observe(img);
    } else {
      // Native lazy loading available — set src immediately
      this.activeSrc.set(this.src);
    }
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  /** Two-character initials derived from the alt text. */
  get initials(): string {
    return this.alt
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  }

  /** @internal */
  protected onLoad(): void {
    this.loaded.set(true);
    this.hasError.set(false);
  }

  /** @internal */
  protected onError(): void {
    this.hasError.set(true);
  }
}
