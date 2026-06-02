/**
 * Experience section data model.
 *
 * @file experience.model.ts
 */

import { Experience } from '../../../core/models/experience.model';

/** Display configuration for the experience section. */
export interface ExperienceData {
  experiences: Experience[];
  displayFormat: 'timeline' | 'cards' | 'list';
  showCompanyLogo: boolean;
  showTenure: boolean;
}
