import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      @for (crumb of breadcrumbs; track crumb.url; let last = $last) {
        @if (!last) {
          <a [routerLink]="crumb.url" class="breadcrumb-link">{{ crumb.label }}</a>
          <mat-icon class="breadcrumb-sep">chevron_right</mat-icon>
        } @else {
          <span class="breadcrumb-current" aria-current="page">{{ crumb.label }}</span>
        }
      }
    </nav>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .breadcrumb-link {
      color: rgba(255,255,255,0.45);
      text-decoration: none;
      transition: color 0.2s;
      letter-spacing: 0.01em;
    }

    .breadcrumb-link:hover {
      color: rgba(255,255,255,0.72);
    }

    .breadcrumb-sep {
      font-size: 15px;
      width: 15px;
      height: 15px;
      line-height: 15px;
      color: rgba(255,255,255,0.22);
      flex-shrink: 0;
    }

    .breadcrumb-current {
      color: rgba(255,255,255,0.82);
      letter-spacing: 0.01em;
    }
  `],
})
/**
 * Auto-generates breadcrumb navigation from the current router URL.
 * Subscribes to `NavigationEnd` events so the trail stays in sync on route changes.
 */
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  breadcrumbs: Breadcrumb[] = [];

  /** @inheritdoc */
  ngOnInit(): void {
    this.updateBreadcrumbs();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateBreadcrumbs());
  }

  /**
   * Rebuilds the breadcrumb trail from the current URL path segments.
   */
  private updateBreadcrumbs(): void {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];
    let url = '';
    for (const segment of segments) {
      url += `/${segment}`;
      // Skip MongoDB ObjectID-like segments (24 hex chars) — never show raw IDs
      if (/^[0-9a-f]{24}$/i.test(segment)) continue;
      breadcrumbs.push({ label: this.formatLabel(segment), url });
    }
    this.breadcrumbs = breadcrumbs;
  }

  /**
   * Capitalises the first letter and replaces hyphens with spaces in a URL segment.
   *
   * @param segment - A single path segment string.
   * @returns Human-readable label for the breadcrumb.
   */
  private formatLabel(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }
}
