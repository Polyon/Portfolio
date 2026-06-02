/**
 * Skills section data model.
 *
 * @file skills.model.ts
 */

import { Skill, SkillCategory } from '../../../core/models/skill.model';

/** Display configuration for the skills section. */
export interface SkillsData {
  skills: Skill[];
  activeCategory: SkillCategory | 'ALL';
  searchQuery: string;
  showProficiency: boolean;
  showEndorsementCount: boolean;
}
