describe('Hello World Test', () => {
    it('should display hello world message', () => {
        cy.visit('http://localhost:3000');
        cy.contains('Hello World');
    });
});