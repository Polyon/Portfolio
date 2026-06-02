/**
 * Hero section data model.
 *
 * @file hero.model.ts
 */

import { Profile } from '../../../core/models/profile.model';

/** Data contract for the hero section of the public portfolio portal. */
export interface HeroData {
  profile: Profile;
  ctaButtonText: string;
  ctaTarget: 'projects' | 'contact' | 'skills';
  backgroundImageUrl?: string;
  showScrollIndicator: boolean;
}
