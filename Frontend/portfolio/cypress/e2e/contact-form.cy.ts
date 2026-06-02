/**
 * E2E — Contact Form (SC-003, SC-006)
 *
 * Verifies:
 * - "General Inquiry" is the default selection on page load.
 * - Selecting "Service Inquiry" updates the form value.
 * - Submitting with queryType: SERVICE sends the correct payload.
 * - Success confirmation message references the word "service".
 *
 * Prerequisites: `ng serve` running on http://localhost:4200
 */

describe('Contact Form', () => {
  beforeEach(() => {
    cy.visit('/#contact');
  });

  it('pre-selects General Inquiry by default (SC-003)', () => {
    cy.get('[aria-label="Inquiry type"]')
      .find('.mat-button-toggle-checked')
      .should('contain.text', 'General Inquiry');
  });

  it('selecting Service Inquiry updates the toggle (SC-003)', () => {
    cy.contains('mat-button-toggle', 'Service Inquiry').click();

    cy.get('[aria-label="Inquiry type"]')
      .find('.mat-button-toggle-checked')
      .should('contain.text', 'Service Inquiry');
  });

  it('submits with queryType SERVICE and shows service success message (SC-003, SC-006)', () => {
    // Intercept the POST request so we can assert the payload without a real backend.
    cy.intercept('POST', '**/contact/messages', (req) => {
      expect(req.body).to.have.property('queryType', 'SERVICE');
      req.reply({ statusCode: 201, body: { success: true } });
    }).as('sendMessage');

    // Select Service Inquiry
    cy.contains('mat-button-toggle', 'Service Inquiry').click();

    // Fill in all required fields
    cy.get('input[formControlName="name"]').type('Jane Doe');
    cy.get('input[formControlName="email"]').type('jane@example.com');
    cy.get('input[formControlName="subject"]').type('Test Service Enquiry');
    cy.get('textarea[formControlName="message"]').type('I would like to discuss a project.');

    // Submit
    cy.get('button[aria-label="Send message"]').click();

    // Wait for the intercepted request
    cy.wait('@sendMessage');

    // Success confirmation should reference "service"
    cy.contains(/service enquiry|service inquiry/i).should('be.visible');
  });

  it('submits with queryType GENERAL when General Inquiry is selected (SC-003)', () => {
    cy.intercept('POST', '**/contact/messages', (req) => {
      expect(req.body).to.have.property('queryType', 'GENERAL');
      req.reply({ statusCode: 201, body: { success: true } });
    }).as('sendGeneral');

    // General is pre-selected — fill fields and submit
    cy.get('input[formControlName="name"]').type('John Smith');
    cy.get('input[formControlName="email"]').type('john@example.com');
    cy.get('input[formControlName="subject"]').type('General Question');
    cy.get('textarea[formControlName="message"]').type('Just a general question.');

    cy.get('button[aria-label="Send message"]').click();
    cy.wait('@sendGeneral');

    cy.contains(/message has been received|your message/i).should('be.visible');
  });
});
