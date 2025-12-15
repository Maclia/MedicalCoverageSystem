describe('Member Onboarding Journey', () => {
  beforeEach(() => {
    cy.cleanupTestData();
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  it('completes full 7-day onboarding journey', () => {
    // Create test member
    cy.createTestMember({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
    }).then((member) => {
      // Visit activation link (mock)
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Day 1: Profile Setup
    cy.get('[data-testid=welcome-title]').should('contain.text', 'Welcome to Your Health Journey!');
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 1 of 7');

    // Complete profile setup
    cy.get('[data-testid=firstName-input]').type('John');
    cy.get('[data-testid=lastName-input]').type('Doe');
    cy.get('[data-testid=phone-input]').type('555-123-4567');
    cy.get('[data-testid=address-input]').type('123 Test Street');
    cy.get('[data-testid=city-input]').type('Test City');
    cy.get('[data-testid=state-select]').select('California');
    cy.get('[data-testid=zip-input]').type('12345');

    // Set security questions
    cy.get('[data-testid=security-question-1]').select('What was your first pet\'s name?');
    cy.get('[data-testid=security-answer-1]').type('Fluffy');
    cy.get('[data-testid=security-question-2]').select('What elementary school did you attend?');
    cy.get('[data-testid=security-answer-2]').type('Lincoln Elementary');

    // Set communication preferences
    cy.get('[data-testid=email-notifications]').check();
    cy.get('[data-testid=sms-notifications]').uncheck();
    cy.get('[data-testid=communication-frequency]').select('Important updates only');

    // Complete Day 1
    cy.get('[data-testid=complete-day-button]').click();
    cy.get('[data-testid=success-message]').should('contain.text', 'Day 1 completed!');
    cy.verifyToast('Profile setup completed successfully!', 'success');

    // Day 2: Benefits Exploration
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 2 of 7');
    cy.get('[data-testid=benefits-title]').should('contain.text', 'Explore Your Benefits');

    // Navigate through benefits sections
    cy.get('[data-testid=medical-benefits]').click();
    cy.get('[data-testid=benefits-details]').should('be.visible');
    cy.get('[data-testid=dental-benefits]').click();
    cy.get('[data-testid=benefits-details]').should('be.visible');
    cy.get('[data-testid=vision-benefits]').click();
    cy.get('[data-testid=benefits-details]').should('be.visible');

    // Complete benefits quiz
    cy.get('[data-testid=benefits-quiz-question]').should('be.visible');
    cy.get('[data-testid=quiz-option-0]').click();
    cy.get('[data-testid=quiz-submit]').click();
    cy.get('[data-testid=quiz-result]').should('contain.text', 'Great job!');

    // Complete Day 2
    cy.completeOnboardingTask('Complete benefits exploration');
    cy.verifyToast('Benefits exploration completed!', 'success');

    // Day 3: Document Upload
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 3 of 7');
    cy.get('[data-testid=documents-title]').should('contain.text', 'Upload Important Documents');

    // Upload insurance card
    cy.uploadDocument('insurance-card.jpg', 'insurance_card');
    cy.get('[data-testid=document-status]').should('contain.text', 'Uploaded');

    // Upload ID card
    cy.uploadDocument('driver-license.pdf', 'id_card');
    cy.get('[data-testid=document-status]').should('contain.text', 'Uploaded');

    // Verify document checklist
    cy.get('[data-testid=document-checklist]').within(() => {
      cy.get('[data-testid=insurance-card-item]').should('have.class', 'completed');
      cy.get('[data-testid=id-card-item]').should('have.class', 'completed');
    });

    // Complete Day 3
    cy.completeOnboardingTask('Complete document upload');
    cy.verifyToast('Documents uploaded successfully!', 'success');

    // Day 4: Provider Selection
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 4 of 7');
    cy.get('[data-testid=provider-title]').should('contain.text', 'Choose Your Healthcare Providers');

    // Select primary care physician
    cy.get('[data-testid=primary-care-search]').type('Dr. Smith');
    cy.get('[data-testid=provider-results]').should('be.visible');
    cy.get('[data-testid=provider-item-0]').click();
    cy.get('[data-testid=select-provider-button]').click();

    // Select pharmacy
    cy.get('[data-testid=pharmacy-search]').type('CVS');
    cy.get('[data-testid=pharmacy-results]').should('be.visible');
    cy.get('[data-testid=pharmacy-item-0]').click();
    cy.get('[data-testid=select-pharmacy-button]').click();

    // Complete Day 4
    cy.completeOnboardingTask('Complete provider selection');
    cy.verifyToast('Providers selected successfully!', 'success');

    // Day 5: Wellness Setup
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 5 of 7');
    cy.get('[data-testid=wellness-title]').should('contain.text', 'Set Up Your Wellness Journey');

    // Set wellness goals
    cy.get('[data-testid=physical-activity-goal]').type('Walk 10,000 steps daily');
    cy.get('[data-testid=mental-health-goal]').type('Practice mindfulness 10 minutes daily');
    cy.get('[data-testid=nutrition-goal]').type('Eat 5 servings of vegetables daily');

    // Join wellness challenges
    cy.get('[data-testid=step-challenge]').click();
    cy.get('[data-testid=join-challenge-button]').click();
    cy.get('[data-testid=challenge-joined]').should('be.visible');

    // Complete Day 5
    cy.completeOnboardingTask('Complete wellness setup');
    cy.verifyToast('Wellness goals set successfully!', 'success');

    // Day 6: Preventive Care
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 6 of 7');
    cy.get('[data-testid=preventive-title]').should('contain.text', 'Schedule Preventive Care');

    // Schedule annual physical
    cy.get('[data-testid=schedule-physical-button]').click();
    cy.get('[data-testid=calendar-widget]').should('be.visible');
    cy.get('[data-testid=available-slot-0]').click();
    cy.get('[data-testid=confirm-appointment-button]').click();

    // Set preventive reminders
    cy.get('[data-testid=preventive-reminders]').check();
    cy.get('[data-testid=reminder-frequency]').select('Monthly');

    // Complete Day 6
    cy.completeOnboardingTask('Complete preventive care setup');
    cy.verifyToast('Preventive care scheduled successfully!', 'success');

    // Day 7: Final Review
    cy.get('[data-testid=next-day-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 7 of 7');
    cy.get('[data-testid=review-title]').should('contain.text', 'Review Your Information');

    // Review profile information
    cy.get('[data-testid=profile-review]').should('contain.text', 'John Doe');
    cy.get('[data-testid=profile-review]').should('contain.text', '123 Test Street');

    // Review benefits selection
    cy.get('[data-testid=benefits-review]').should('contain.text', 'Medical coverage selected');
    cy.get('[data-testid=benefits-review]').should('contain.text', 'Dental coverage selected');

    // Review document uploads
    cy.get('[data-testid=documents-review]').within(() => {
      cy.get('[data-testid=insurance-card-status]').should('contain.text', 'Uploaded');
      cy.get('[data-testid=id-card-status]').should('contain.text', 'Uploaded');
    });

    // Complete onboarding journey
    cy.get('[data-testid=complete-onboarding-button]').click();
    cy.get('[data-testid=celebration-modal]').should('be.visible');
    cy.get('[data-testid=celebration-title]').should('contain.text', 'Congratulations!');
    cy.get('[data-testid=celebration-message]').should('contain.text', 'You\'ve completed your onboarding journey');

    // Navigate to member dashboard
    cy.get('[data-testid=go-to-dashboard-button]').click();
    cy.url().should('include', '/member/dashboard');

    // Verify dashboard shows completed onboarding
    cy.get('[data-testid=onboarding-status]').should('contain.text', 'Completed');
    cy.get('[data-testid=onboarding-progress]').should('contain.text', '100%');
    cy.get('[data-testid=earned-points]').should('contain.text', '350'); // 50 points per day

    // Verify welcome email was sent
    cy.verifyEmailSent('onboarding_completed', 'john.doe@test.com');

    // Take screenshot of completed journey
    cy.screenshotNamed('onboarding-completed-dashboard');
  });

  it('allows pausing and resuming onboarding', () => {
    // Create and start onboarding
    cy.createTestMember().then((member) => {
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Complete Day 1
    cy.get('[data-testid=firstName-input]').type('Jane');
    cy.get('[data-testid=lastName-input]').type('Smith');
    cy.get('[data-testid=complete-day-button]').click();

    // Pause onboarding
    cy.get('[data-testid=pause-onboarding-button]').click();
    cy.get('[data-testid=pause-modal]').should('be.visible');
    cy.get('[data-testid=pause-reason]').type('Need to gather more information');
    cy.get('[data-testid=confirm-pause-button]').click();
    cy.verifyToast('Onboarding paused successfully', 'info');

    // Log out and log back in
    cy.get('[data-testid=logout-button]').click();
    cy.login('jane.smith@test.com', 'password123');

    // Resume onboarding
    cy.visit('/member/onboarding');
    cy.get('[data-testid=resume-onboarding-button]').click();
    cy.get('[data-testid=step-indicator]').should('contain.text', 'Day 2 of 7');

    // Should resume where left off
    cy.get('[data-testid=current-progress]').should('contain.text', '14%'); // 1/7 days completed
  });

  it('handles document upload errors gracefully', () => {
    cy.createTestMember().then((member) => {
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Skip to Day 3 (Documents)
    cy.get('[data-testid=skip-to-day-3]').click();

    // Try to upload invalid file
    cy.get('[data-testid=upload-button]').click();
    cy.get('[data-testid=document-type-select]').select('insurance_card');
    cy.get('[data-testid=file-input]').attachFile('invalid-file.exe');

    // Should show error message
    cy.get('[data-testid=upload-error]').should('contain.text', 'Invalid file type');
    cy.get('[data-testid=upload-status]').should('contain.text', 'Upload failed');

    // Try to upload oversized file
    cy.get('[data-testid=file-input]').attachFile('large-file.pdf'); // Mock large file
    cy.get('[data-testid=upload-error]').should('contain.text', 'File too large');

    // Should provide helpful guidance
    cy.get('[data-testid=upload-guidance]').should('contain.text', 'Accepted file types: PDF, JPG, PNG');
    cy.get('[data-testid=upload-guidance]').should('contain.text', 'Maximum file size: 10MB');
  });

  it('validates email verification before proceeding', () => {
    cy.createTestMember({
      email: 'unverified@test.com',
    }).then((member) => {
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Should show email verification required
    cy.get('[data-testid=email-verification-required]').should('be.visible');
    cy.get('[data-testid=verification-sent-message]').should('contain.text', 'We\'ve sent a verification email');

    // Try to proceed without verification
    cy.get('[data-testid=complete-day-button]').should('be.disabled');
    cy.get('[data-testid=verification-warning]').should('contain.text', 'Please verify your email first');

    // Mock email verification
    cy.get('[data-testid=verification-code-input]').type('123456');
    cy.get('[data-testid=verify-email-button]').click();

    // Should allow proceeding after verification
    cy.get('[data-testid=complete-day-button]').should('not.be.disabled');
    cy.verifyToast('Email verified successfully!', 'success');
  });

  it('provides help and support throughout the journey', () => {
    cy.createTestMember().then((member) => {
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Test help button availability
    cy.get('[data-testid=help-button]').should('be.visible');

    // Open help modal
    cy.get('[data-testid=help-button]').click();
    cy.get('[data-testid=help-modal]').should('be.visible');

    // Test help sections
    cy.get('[data-testid=faq-section]').should('be.visible');
    cy.get('[data-testid=contact-support-section]').should('be.visible');
    cy.get('[data-testid=video-tutorials-section]').should('be.visible');

    // Search help content
    cy.get('[data-testid=help-search]').type('How do I upload documents?');
    cy.get('[data-testid=search-results]').should('be.visible');
    cy.get('[data-testid=search-result-0]').should('contain.text', 'document upload');

    // Contact support
    cy.get('[data-testid=contact-support-button]').click();
    cy.get('[data-testid=support-form]').should('be.visible');
    cy.get('[data-testid=support-topic]').select('Document upload issues');
    cy.get('[data-testid=support-message]').type('I\'m having trouble uploading my insurance card');
    cy.get('[data-testid=send-support-button]').click();
    cy.verifyToast('Support ticket created successfully!', 'success');

    // Close help modal
    cy.get('[data-testid=close-help-button]').click();
    cy.get('[data-testid=help-modal]').should('not.exist');
  });

  it('tracks progress and displays achievements', () => {
    cy.createTestMember().then((member) => {
      cy.visit(`/activate/${member.id}?token=test-token`);
    });

    // Check initial progress
    cy.get('[data-testid=progress-bar]').should('have.attr', 'aria-valuenow', '0');
    cy.get('[data-testid=points-earned]').should('contain.text', '0');

    // Complete Day 1
    cy.completeOnboardingTask('Complete profile setup');

    // Check progress after Day 1
    cy.get('[data-testid=progress-bar]').should('have.attr', 'aria-valuenow', '14'); // 1/7 ≈ 14%
    cy.get('[data-testid=points-earned]').should('contain.text', '50');
    cy.get('[data-testid=achievement-unlocked]').should('contain.text', 'First Steps');

    // Continue to Day 2 and complete
    cy.get('[data-testid=next-day-button]').click();
    cy.completeOnboardingTask('Complete benefits exploration');

    // Check progress after Day 2
    cy.get('[data-testid=progress-bar]').should('have.attr', 'aria-valuenow', '29'); // 2/7 ≈ 29%
    cy.get('[data-testid=points-earned]').should('contain.text', '100');
    cy.get('[data-testid=achievement-unlocked]').should('contain.text', 'Benefits Explorer');

    // Check milestones
    cy.get('[data-testid=milestones-section]').within(() => {
      cy.get('[data-testid=milestone-1]').should('have.class', 'completed');
      cy.get('[data-testid=milestone-2]').should('have.class', 'completed');
      cy.get('[data-testid=milestone-3]').should('not.have.class', 'completed');
    });
  });
});