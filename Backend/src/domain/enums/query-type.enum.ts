/**
 * Classifies a contact form submission as a service inquiry or a general inquiry.
 * Drives email template selection (sender, receiver, reply) and admin inbox filtering.
 */
export enum QueryType {
  SERVICE = 'SERVICE',
  GENERAL = 'GENERAL',
}
