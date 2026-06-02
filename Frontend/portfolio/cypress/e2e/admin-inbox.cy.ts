/**
 * E2E — Admin Contact Inbox (SC-004, SC-005)
 *
 * Verifies:
 * - Admin authenticates and navigates to Contact Inbox.
 * - Filter by "Unread" shows only unread messages.
 * - Opening a message loads the detail view.
 * - Mark as Read decrements the nav badge (SC-004).
 * - Reply compose dialog opens; typing and sending a reply appends to history without reload (SC-005).
 * - Clicking Cancel on the reply dialog closes it without sending (SC-005).
 *
 * Prerequisites:
 * - `ng serve` running on http://localhost:4200
 * - Seed data present with at least one unread message
 * - Admin credentials available via Cypress env vars:
 *     CYPRESS_ADMIN_EMAIL, CYPRESS_ADMIN_PASSWORD
 */

describe('Admin Contact Inbox', () => {
  const adminEmail    = Cypress.env('ADMIN_EMAIL') as string    || 'admin@example.com';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') as string || 'Admin1234!';

  /** Authenticate and navigate to the admin inbox. */
  function loginAndGoToInbox(): void {
    cy.visit('/login');
    cy.get('input[formControlName="email"], input[type="email"]').type(adminEmail);
    cy.get('input[formControlName="password"], input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin');
    cy.visit('/admin/contact/inbox');
    cy.url().should('include', '/admin/contact/inbox');
  }

  beforeEach(() => {
    loginAndGoToInbox();
  });

  // ── SC-004: Mark as Read decrements nav badge ───────────────────────────────

  it('filters inbox by Unread and opens first message (SC-004)', () => {
    // Apply unread filter
    cy.get('[aria-label="Filter by read status"]')
      .contains('Unread')
      .click();

    // At least one unread row should be visible
    cy.get('tr.mat-mdc-row').should('have.length.greaterThan', 0);

    // Open the first message
    cy.get('tr.mat-mdc-row').first().click();
    cy.url().should('match', /\/admin\/contact\/inbox\/.+/);
  });

  it('Mark as Read decrements the unread nav badge (SC-004)', () => {
    // Read initial badge count
    cy.get('[data-testid="inbox-badge"], .mat-badge-content')
      .first()
      .invoke('text')
      .then((initialCount) => {
        const before = parseInt(initialCount, 10);

        // Open an unread message
        cy.get('[aria-label="Filter by read status"]').contains('Unread').click();
        cy.get('tr.mat-mdc-row').first().click();

        // Mark as read
        cy.contains('button', /mark as read/i).click();

        // Nav badge should decrement
        cy.get('[data-testid="inbox-badge"], .mat-badge-content')
          .first()
          .invoke('text')
          .then((newCount) => {
            expect(parseInt(newCount, 10)).to.be.lessThan(before);
          });
      });
  });

  // ── SC-005: Reply compose, send, cancel ─────────────────────────────────────

  it('opens reply dialog, sends reply, reply appears in history without page reload (SC-005)', () => {
    // Intercept the reply POST
    cy.intercept('POST', '**/contact/messages/*/reply').as('sendReply');

    // Open any message
    cy.get('tr.mat-mdc-row').first().click();

    // Count existing replies before sending
    cy.get('[data-testid="reply-history"], .reply-item')
      .its('length')
      .then((initialReplies: number) => {
        // Click "Reply"
        cy.contains('button', /reply/i).click();

        // Dialog should appear
        cy.get('mat-dialog-container').should('be.visible');

        // Type a reply body
        cy.get('textarea[formControlName="body"]')
          .clear()
          .type('Thank you for reaching out. I will get back to you shortly.');

        // Click "Send Reply"
        cy.contains('button', /send reply/i).click();

        // Wait for the API call
        cy.wait('@sendReply').its('response.statusCode').should('eq', 201);

        // Dialog should close
        cy.get('mat-dialog-container').should('not.exist');

        // Reply should appear in history — no page reload
        cy.get('[data-testid="reply-history"], .reply-item')
          .should('have.length', initialReplies + 1);
      });
  });

  it('Cancel on reply dialog closes it without sending (SC-005)', () => {
    cy.intercept('POST', '**/contact/messages/*/reply').as('sendReply');

    cy.get('tr.mat-mdc-row').first().click();
    cy.contains('button', /reply/i).click();

    cy.get('mat-dialog-container').should('be.visible');

    // Type something but then cancel
    cy.get('textarea[formControlName="body"]').type('Draft that will not be sent');

    cy.contains('button', /cancel/i).click();

    // Dialog should close
    cy.get('mat-dialog-container').should('not.exist');

    // No POST should have been made
    cy.get('@sendReply.all').should('have.length', 0);
  });

  it('deletes a message and navigates back to inbox (SC-004)', () => {
    cy.get('tr.mat-mdc-row').first().click();
    cy.url().should('match', /\/admin\/contact\/inbox\/.+/);

    // Click Delete
    cy.contains('button', /delete/i).click();

    // Confirmation dialog
    cy.get('mat-dialog-container').should('be.visible');
    cy.contains('button', /confirm|delete|yes/i).last().click();

    // Navigate back to inbox
    cy.url().should('include', '/admin/contact/inbox');
  });
});
