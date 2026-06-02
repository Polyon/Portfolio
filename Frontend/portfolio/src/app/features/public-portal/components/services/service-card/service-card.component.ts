import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Service, ServiceCategory } from '../../../../../core/models/service.model';

/** Map from ServiceCategory to display color (hex). */
const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  [ServiceCategory.BACKEND_DEV]:    '#4A9EFF',
  [ServiceCategory.FRONTEND_DEV]:   '#00D9FF',
  [ServiceCategory.FULLSTACK]:      '#9C6BFF',
  [ServiceCategory.DEVOPS]:         '#FF8C42',
  [ServiceCategory.AI_INTEGRATION]: '#FF4DC4',
  [ServiceCategory.CONSULTING]:     '#4AFF91',
  [ServiceCategory.TRAINING]:       '#FFD94A',
  [ServiceCategory.OTHER]:          '#94A3B8',
};

/** Map from ServiceCategory to a Material icon name. */
const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  [ServiceCategory.BACKEND_DEV]:    'dns',
  [ServiceCategory.FRONTEND_DEV]:   'web',
  [ServiceCategory.FULLSTACK]:      'code',
  [ServiceCategory.DEVOPS]:         'cloud_sync',
  [ServiceCategory.AI_INTEGRATION]: 'psychology',
  [ServiceCategory.CONSULTING]:     'handshake',
  [ServiceCategory.TRAINING]:       'school',
  [ServiceCategory.OTHER]:          'build',
};

/**
 * Presentational card for a single service offering.
 *
 * Displays the service category icon, name, description, a colour-coded
 * category chip, and a "Request Service" CTA button.  Emitting the
 * `requestService` output lets parent components handle the scroll-to-contact
 * interaction without coupling this component to the router or DOM.
 */
@Component({
  selector: 'app-service-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule],
  template: `
    <article
      class="service-card"
      [attr.aria-label]="service.name + ' — ' + service.category"
    >

      <!-- Icon header -->
      <div
        class="card-icon-wrap"
        [style.--icon-color]="getCategoryColor(service.category)"
        aria-hidden="true"
      >
        <mat-icon>{{ getCategoryIcon(service.category) }}</mat-icon>
      </div>

      <!-- Body -->
      <div class="card-body">

        <!-- Category chip -->
        <div class="card-category" aria-label="Category">
          <mat-chip-set>
            <mat-chip
              class="category-chip"
              [style.--chip-color]="getCategoryColor(service.category)"
              disableRipple
            >{{ service.category }}</mat-chip>
          </mat-chip-set>
        </div>

        <!-- Service name -->
        <h3 class="service-name">{{ service.name }}</h3>

        <!-- Description -->
        <p class="service-description">{{ service.description }}</p>

      </div>

      <!-- CTA -->
      <div class="card-cta">
        <button
          mat-stroked-button
          class="cta-btn"
          (click)="onRequestService()"
          [attr.aria-label]="'Request service: ' + service.name"
        >
          <mat-icon aria-hidden="true">send</mat-icon>
          Request Service
        </button>
      </div>

    </article>
  `,
  styleUrl: './service-card.component.scss',
})
export class ServiceCardComponent {
  /** Service record to display. */
  @Input({ required: true }) service!: Service;

  /**
   * Emitted when the user clicks "Request Service".
   * Parent should scroll to the contact section.
   */
  @Output() readonly requestService = new EventEmitter<Service>();

  /** Returns the accent colour for the given service category. */
  getCategoryColor(category: ServiceCategory): string {
    return CATEGORY_COLORS[category] ?? '#94A3B8';
  }

  /** Returns a Material icon name for the given service category. */
  getCategoryIcon(category: ServiceCategory): string {
    return CATEGORY_ICONS[category] ?? 'build';
  }

  /** Handles the CTA click — emits the service to the parent. */
  onRequestService(): void {
    this.requestService.emit(this.service);
  }
}
