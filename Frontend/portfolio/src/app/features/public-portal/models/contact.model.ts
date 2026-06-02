/**
 * Contact section data model.
 *
 * @file contact.model.ts
 */

import { Contact } from '../../../core/models/contact.model';

/** Display configuration for the contact section. */
export interface ContactData {
  contact: Contact;
  showEmail: boolean;
  showPhone: boolean;
  showSocialLinks: boolean;
}
