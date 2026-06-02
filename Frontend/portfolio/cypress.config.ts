import type { defineConfig } from 'cypress';

export default {
  e2e: {
    /**
     * Base URL for both the public portal and admin portal.
     * Override with CYPRESS_BASE_URL environment variable for CI.
     */
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
  },
} satisfies ReturnType<typeof defineConfig>;
