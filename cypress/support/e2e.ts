// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add global Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as a test user
       */
      login(email?: string, password?: string): Chainable<Element>

      /**
       * Login as admin user
       */
      loginAsAdmin(): Chainable<Element>

      /**
       * Create test member
       */
      createTestMember(data?: Partial<MemberData>): Chainable<MemberData>

      /**
       * Clean up test data
       */
      cleanupTestData(): Chainable<void>

      /**
       * Mock API responses
       */
      mockApiResponse(endpoint: string, response: any): Chainable<void>

      /**
       * Wait for API response
       */
      waitForApiResponse(endpoint: string): Chainable<void>
    }
  }
}

// Global test setup
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Mock console methods to avoid cluttering test output
before(() => {
  cy.intercept('GET', '**/api/admin/onboarding/**', { fixture: 'onboarding-overview.json' });
  cy.intercept('POST', '**/api/auth/login', { fixture: 'login-response.json' });
});

// Test data interfaces
interface MemberData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
}

// Custom error handling for uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions from third-party scripts
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});