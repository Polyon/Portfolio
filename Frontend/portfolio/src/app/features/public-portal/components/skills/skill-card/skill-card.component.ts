import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skill, SkillCategory } from '../../../../../core/models/skill.model';
import { getSkillColor } from '../../../utils/utils';

/**
 * Presentational card for a single skill entry.
 *
 * Displays skill name, category badge, star-based proficiency rating,
 * and an optional endorsement count badge.
 */
@Component({
  selector: 'app-skill-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="skill-card"
      [style.--category-color]="categoryColor"
      [attr.aria-label]="skill.name + ' – ' + categoryLabel + ', ' + proficiencyLabel">

      <!-- Category badge — top-right -->      
      <span class="category-badge">{{ categoryLabel }}</span>

      <!-- Icon + name row -->
      <div class="skill-main">
        <div class="skill-icon" aria-hidden="true">{{ skillInitials }}</div>
        <h3 class="skill-name">
          <span [innerHTML]="highlightedName"></span>
        </h3>
      </div>

      <!-- Progress bar -->
      <div class="skill-progress" [attr.aria-label]="proficiencyPercent + '% proficiency'">
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="proficiencyPercent"></div>
        </div>
        <span class="progress-value">{{ proficiencyPercent }}%</span>
      </div>

      <!-- Proficiency label -->
      <span class="proficiency-label">{{ proficiencyLabel }}</span>
    </article>
  `,
  styleUrl: './skill-card.component.scss',
})
export class SkillCardComponent {
  /** Skill data to display. */
  @Input({ required: true }) skill!: Skill;

  /**
   * Optional search term — when provided, matching text in the skill name
   * is wrapped in a `<mark>` element for visual highlighting.
   */
  @Input() searchTerm: string = '';

  /** CSS custom property value for the category accent colour. */
  get categoryColor(): string {
    return getSkillColor(this.skill.category);
  }

  /** Human-readable category label. */
  get categoryLabel(): string {
    return CATEGORY_LABELS[this.skill.category] ?? this.skill.category;
  }

  /** Human-readable proficiency text (e.g. "Advanced"). */
  get proficiencyLabel(): string {
    return PROFICIENCY_LABELS[this.skill.proficiencyLevel] ?? '';
  }

  /** 1–2 uppercase initials derived from the skill name. */
  get skillInitials(): string {
    const words = this.skill.name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return this.skill.name.slice(0, 2).toUpperCase();
  }

  /** Proficiency as a percentage (proficiencyLevel / 5 × 100). */
  get proficiencyPercent(): number {
    return Math.round((this.skill.proficiencyLevel / 5) * 100);
  }

  /**
   * Skill name with the search term highlighted via `<mark>` tags.
   * Safe — only the exact search-term substring is wrapped; no raw HTML
   * is taken from external data.
   */
  get highlightedName(): string {
    const name = this.skill.name;
    const term = this.searchTerm?.trim();
    if (!term) return this.escapeHtml(name);

    const escaped = this.escapeHtml(name);
    const escapedTerm = this.escapeHtml(term);
    const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  [SkillCategory.BACKEND]: 'Backend',
  [SkillCategory.FRONTEND]: 'Frontend',
  [SkillCategory.DEVOPS]: 'DevOps',
  [SkillCategory.AI]: 'AI / ML',
  [SkillCategory.DATABASE]: 'Database',
  [SkillCategory.OTHER]: 'Other',
};

const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};
