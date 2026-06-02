import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ContactMethodDisplay } from '../contact.component';

/**
 * Presentational card for a single contact method (email, phone, social link,
 * website).  Renders the method icon, label, a truncated display value, and a
 * link styled as a Material button.  Links that are external open in a new tab
 * with `rel="noopener noreferrer"` for security.
 */
@Component({
  selector: 'app-contact-method-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <article
      class="contact-item"
      [attr.aria-label]="method.label + ': ' + method.value"
    >
      <!-- Icon wrapper -->
      <div
        class="item-icon-wrap"
        [class]="'item-icon-wrap--' + method.type"
        aria-hidden="true"
      >
        <mat-icon>{{ method.icon }}</mat-icon>
      </div>

      <!-- Text content -->
      <div class="item-content">
        <span class="item-label">{{ method.label }}</span>
        <span class="item-value" [title]="method.value">{{ method.value }}</span>
      </div>

      <!-- Link button -->
      <a
        [href]="method.href"
        [target]="method.external ? '_blank' : '_self'"
        [attr.rel]="method.external ? 'noopener noreferrer' : null"
        mat-icon-button
        class="item-action"
        [attr.aria-label]="'Open ' + method.label"
      >
        <mat-icon>{{ method.external ? 'open_in_new' : 'arrow_forward' }}</mat-icon>
      </a>
    </article>
  `,
  styleUrl: './contact-method-item.component.scss',
})
export class ContactMethodItemComponent {
  /** Contact method data to display. */
  @Input({ required: true }) method!: ContactMethodDisplay;
}
