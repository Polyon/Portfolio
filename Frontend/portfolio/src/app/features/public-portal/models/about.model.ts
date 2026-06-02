/**
 * About section data model.
 *
 * @file about.model.ts
 */

import { Profile } from '../../../core/models/profile.model';

/** Data contract for the about / biography section of the public portfolio portal. */
export interface AboutData {
  profile: Profile;
  showResume: boolean;
  resumeUrl?: string;
  uniqueValueProposition?: string;
}
