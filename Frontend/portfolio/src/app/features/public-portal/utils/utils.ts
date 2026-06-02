/**
 * Shared utility functions for the public portal.
 *
 * @file utils.ts
 */

import { SkillCategory } from '../../../core/models/skill.model';

/**
 * Formats a date string or Date object for display in portfolio sections.
 * Returns "Present" when the input is null/undefined (current role).
 *
 * @param date - ISO date string, Date object, or null/undefined.
 * @returns Human-readable date string (e.g. "Jan 2022" or "Present").
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Present';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Truncates a string to a maximum character count and appends an ellipsis.
 *
 * @param text   - Source text.
 * @param length - Maximum number of characters before truncation.
 * @returns Truncated string with "…" appended, or the original if short enough.
 */
export function truncateText(text: string, length: number): string {
  if (!text || text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}\u2026`;
}

/**
 * Calculates the human-readable tenure between two dates.
 *
 * @param startDate - Employment start date (ISO string or Date).
 * @param endDate   - Employment end date (ISO string, Date, or null for current).
 * @returns Duration string (e.g. "2 yrs 3 mos" or "8 mos").
 */
export function calculateTenure(
  startDate: string | Date,
  endDate: string | Date | null | undefined,
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : new Date();

  const totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' ') : '< 1 mo';
}

/** Material color tokens mapped to each skill category. */
const SKILL_COLOR_MAP: Record<SkillCategory | 'DEFAULT', string> = {
  [SkillCategory.BACKEND]: '#7C4DFF',    // deep purple
  [SkillCategory.FRONTEND]: '#00BCD4',   // cyan
  [SkillCategory.DEVOPS]: '#FF9800',     // amber
  [SkillCategory.AI]: '#E91E63',         // pink
  [SkillCategory.DATABASE]: '#60a5fa',   // blue
  [SkillCategory.OTHER]: '#9E9E9E',      // grey
  DEFAULT: '#9E9E9E',
};

/**
 * Returns a consistent display color hex code for the given skill category.
 *
 * @param category - Skill category enum value.
 * @returns CSS hex color string.
 */
export function getSkillColor(category: SkillCategory): string {
  return SKILL_COLOR_MAP[category] ?? SKILL_COLOR_MAP.DEFAULT;
}
