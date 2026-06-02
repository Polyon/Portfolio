import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillsListComponent } from './skills-list/skills-list.component';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, SkillsListComponent],
  template: `
    <div class="page-container">
      <app-skills-list></app-skills-list>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
  `],
})
/**
 * Skills page container.
 * Wraps the skills list component inside a max-width page layout.
 */
export class SkillsComponent {}
