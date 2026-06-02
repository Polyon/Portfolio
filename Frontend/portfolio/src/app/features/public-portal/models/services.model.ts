/**
 * Services section data model.
 *
 * @file services.model.ts
 */

import { Service, ServiceCategory } from '../../../core/models/service.model';

/** Display configuration for the services section. */
export interface ServicesData {
  services: Service[];
  activeCategory: ServiceCategory | 'ALL';
  displayFormat: 'cards' | 'list';
  itemsPerRow: number;
}
