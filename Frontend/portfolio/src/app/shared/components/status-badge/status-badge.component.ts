import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProjectStatus } from '../../../core/models/project.model';

interface BadgeConfig {
  label: string;
  color: string;
  icon: string;
}

const STATUS_CONFIG: Record<ProjectStatus, BadgeConfig> = {
  [ProjectStatus.PLANNING]:    { label: 'Planning',     color: '#6B7280', icon: 'pending' },
  [ProjectStatus.IN_PROGRESS]: { label: 'In Progress',  color: '#F59E0B', icon: 'sync' },
  [ProjectStatus.COMPLETED]:   { label: 'Completed',    color: '#3B82F6', icon: 'check_circle' },
  [ProjectStatus.DEPLOYED]:    { label: 'Deployed',     color: '#10B981', icon: 'rocket_launch' },
};

/**
 * Displays a colour-coded status badge for a project.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span class="status-badge" [style.background-color]="config.color + '22'" [style.color]="config.color" [style.border-color]="config.color + '66'">
      <mat-icon class="badge-icon">{{ config.icon }}</mat-icon>
      {{ config.label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    .badge-icon { font-size: 14px; width: 14px; height: 14px; }
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: ProjectStatus;

  get config(): BadgeConfig {
    return STATUS_CONFIG[this.status] ?? { label: this.status, color: '#9CA3AF', icon: 'help' };
  }
}
