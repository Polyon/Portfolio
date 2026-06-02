import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceListComponent } from './experience-list/experience-list.component';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule, ExperienceListComponent],
  template: `
    <div class="page-container">
      <app-experience-list></app-experience-list>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
  `],
})
/** Experience page container. Wraps the experience list in a max-width layout. */
export class ExperienceComponent {}
