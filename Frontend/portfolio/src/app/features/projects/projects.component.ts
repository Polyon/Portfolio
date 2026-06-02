import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectsListComponent } from './projects-list/projects-list.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ProjectsListComponent],
  template: `
    <div class="page-container">
      <app-projects-list></app-projects-list>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
  `],
})
/** Projects page container. Wraps the projects list in a max-width layout. */
export class ProjectsComponent {}
