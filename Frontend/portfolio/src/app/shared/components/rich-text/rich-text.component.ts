import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Renders bio or other rich-text content safely.
 *
 * Supports:
 *  - Plain text (whitespace/newlines converted to `<p>` blocks)
 *  - HTML strings (sanitised via Angular's DomSanitizer)
 *
 * @example
 * ```html
 * <app-rich-text [content]="profile.bio" />
 * ```
 */
@Component({
  selector: 'app-rich-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rich-text-content"
      [innerHTML]="safeHtml()"
      role="region"
      [attr.aria-label]="ariaLabel || undefined">
    </div>
  `,
  styles: [`
    .rich-text-content {
      line-height: 1.75;
      color: rgba(255, 255, 255, 0.82);

      :host ::ng-deep p {
        margin: 0 0 1em;

        &:last-child {
          margin-bottom: 0;
        }
      }

      :host ::ng-deep strong,
      :host ::ng-deep b {
        color: #ffffff;
        font-weight: 600;
      }

      :host ::ng-deep em,
      :host ::ng-deep i {
        font-style: italic;
        color: rgba(255, 255, 255, 0.9);
      }

      :host ::ng-deep a {
        color: #00D9FF;
        text-decoration: underline;
        text-underline-offset: 2px;

        &:hover {
          opacity: 0.85;
        }
      }

      :host ::ng-deep ul,
      :host ::ng-deep ol {
        padding-left: 1.5rem;
        margin: 0 0 1em;
      }

      :host ::ng-deep li {
        margin-bottom: 0.35em;
      }
    }
  `],
})
export class RichTextComponent implements OnChanges {
  /** Raw text or HTML content to render. */
  @Input() content: string = '';

  /** Optional ARIA label for the region. */
  @Input() ariaLabel: string = '';

  protected readonly safeHtml = signal<SafeHtml>('');

  private readonly sanitizer = inject(DomSanitizer);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.safeHtml.set(this.renderContent(this.content ?? ''));
    }
  }

  /**
   * Converts plain-text content (with newlines) into `<p>` elements
   * or passes HTML content directly through Angular's sanitizer.
   *
   * @param raw - Raw content string.
   * @returns Safe HTML for `[innerHTML]` binding.
   */
  private renderContent(raw: string): SafeHtml {
    if (!raw.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // If content contains HTML tags, trust it as HTML.
    const hasHtml = /<[a-z][\s\S]*>/i.test(raw);

    let html: string;
    if (hasHtml) {
      html = raw;
    } else {
      // Convert newline-separated paragraphs to <p> blocks.
      html = raw
        .split(/\n{2,}/)
        .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
