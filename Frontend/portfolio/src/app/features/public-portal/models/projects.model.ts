/**
 * Projects section data model.
 *
 * @file projects.model.ts
 */

import { Project, ProjectStatus } from '../../../core/models/project.model';

/** Display configuration for the projects section. */
export interface ProjectsData {
  projects: Project[];
  activeStatus: ProjectStatus | 'ALL';
  sortByFeatured: boolean;
  showStatusBadges: boolean;
  showTechnologyTags: boolean;
}
