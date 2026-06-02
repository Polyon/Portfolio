import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesListComponent } from './services-list/services-list.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ServicesListComponent],
  template: `
    <div class="page-container">
      <app-services-list></app-services-list>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
  `],
})
/** Services page container. Wraps the services list in a max-width layout. */
export class ServicesComponent {}
