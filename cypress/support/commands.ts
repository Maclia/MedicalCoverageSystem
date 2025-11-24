// Custom Cypress commands for Member Engagement Hub testing

// Login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('[data-testid=email-input]').type(email);
  cy.get('[data-testid=password-input]').type(password);
  cy.get('[data-testid=login-button]').click();
  cy.url().should('not.include', '/login');
});

// Admin login command
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@test.com', 'admin123');
});

// Create test member command
Cypress.Commands.add('createTestMember', (memberData = {}) => {
  const defaultMember = {
    firstName: 'Test',
    lastName: 'Member',
    email: `test-member-${Date.now()}@example.com`,
    companyId: '1',
    ...memberData,
  };

  cy.request({
    method: 'POST',
    url: '/api/members',
    body: defaultMember,
  }).then((response) => {
    cy.wrap(response.body);
  });
});

// Clean up test data command
Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: '/api/test/cleanup',
    failOnStatusCode: false,
  });
});

// Mock API response command
Cypress.Commands.add('mockApiResponse', (endpoint: string, response: any) => {
  cy.intercept('GET', `**/api${endpoint}`, response).as(endpoint);
});

// Wait for API response command
Cypress.Commands.add('waitForApiResponse', (endpoint: string) => {
  cy.wait(`@${endpoint}`);
});

// Check if element is visible and has correct text
Cypress.Commands.add('isVisibleAndContains', { prevSubject: true }, (subject, text: string) => {
  cy.wrap(subject)
    .should('be.visible')
    .and('contain.text', text);
});

// Check if element is clickable
Cypress.Commands.add('isClickable', { prevSubject: true }, (subject) => {
  cy.wrap(subject)
    .should('be.visible')
    .and('not.be.disabled');
});

// Wait for loading to complete
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid=loading]').should('not.exist');
  cy.get('[data-testid=skeleton]').should('not.exist');
});

// Complete onboarding task
Cypress.Commands.add('completeOnboardingTask', (taskTitle: string) => {
  cy.contains(taskTitle).parents('[data-testid=task-card]').within(() => {
    cy.get('[data-testid=complete-button]').click();
  });
});

// Upload document
Cypress.Commands.add('uploadDocument', (fileName: string, documentType: string) => {
  cy.get('[data-testid=upload-button]').click();
  cy.get('[data-testid=document-type-select]').select(documentType);
  cy.get('[data-testid=file-input]').attachFile(fileName);
  cy.get('[data-testid=upload-submit]').click();
});

// Navigate to admin section
Cypress.Commands.add('navigateToAdmin', (section: string) => {
  cy.loginAsAdmin();
  cy.visit('/admin');
  cy.get(`[data-testid=${section}-tab]`).click();
});

// Check admin statistics
Cypress.Commands.add('checkAdminStats', (stats: Record<string, string>) => {
  Object.entries(stats).forEach(([key, value]) => {
    cy.get(`[data-testid=${key}-stat]`).should('contain.text', value);
  });
});

// Verify email sent
Cypress.Commands.add('verifyEmailSent', (template: string, recipient: string) => {
  cy.request({
    method: 'GET',
    url: `/api/test/emails?template=${template}&recipient=${recipient}`,
  }).then((response) => {
    expect(response.body).to.have.property('sent', true);
  });
});

// Test responsive design
Cypress.Commands.add('testResponsive', (breakpoints: string[]) => {
  breakpoints.forEach((breakpoint) => {
    cy.viewport(breakpoint as any);
    cy.get('[data-testid=main-content]').should('be.visible');
  });
});

// Wait for animation to complete
Cypress.Commands.add('waitForAnimation', () => {
  cy.get('[data-testid=animating]').should('not.exist');
  cy.wait(300); // Wait for any CSS animations to complete
});

// Check accessibility
Cypress.Commands.add('checkAccessibility', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Fill form with test data
Cypress.Commands.add('fillForm', (formData: Record<string, string>) => {
  Object.entries(formData).forEach(([field, value]) => {
    cy.get(`[data-testid=${field}]`).type(value);
  });
});

// Take screenshot with custom name
Cypress.Commands.add('screenshotNamed', (name: string) => {
  cy.screenshot(name, { capture: 'viewport' });
});

// Verify toast notification
Cypress.Commands.add('verifyToast', (message: string, type = 'success') => {
  cy.get(`[data-testid=${type}-toast]`)
    .should('be.visible')
    .and('contain.text', message);
});