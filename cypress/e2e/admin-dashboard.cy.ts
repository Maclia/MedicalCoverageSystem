describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.navigateToAdmin('dashboard');
  });

  it('displays correct overview statistics', () => {
    // Check main statistics
    cy.checkAdminStats({
      'total-members': '150',
      'active-sessions': '45',
      'completion-rate': '85.5%',
      'average-completion': '6.2 days',
    });

    // Verify charts are rendered
    cy.get('[data-testid=onboarding-chart]').should('be.visible');
    cy.get('[data-testid=engagement-chart]').should('be.visible');
    cy.get('[data-testid=completion-rate-chart]').should('be.visible');

    // Check recent activity feed
    cy.get('[data-testid=recent-activity]').should('be.visible');
    cy.get('[data-testid=activity-item-0]').should('contain.text', 'New member onboarded');
  });

  it('allows filtering and searching members', () => {
    cy.navigateToAdmin('onboarding');

    // Test status filter
    cy.get('[data-testid=status-filter]').select('in_progress');
    cy.get('[data-testid=filtered-results]').should('be.visible');
    cy.get('[data-testid=member-count]').should('contain.text', 'members found');

    // Test search functionality
    cy.get('[data-testid=search-input]').type('John Doe');
    cy.waitForApiResponse('/admin/onboarding/sessions?search=John%20Doe');
    cy.get('[data-testid=search-results]').should('contain.text', 'John Doe');

    // Test company filter
    cy.get('[data-testid=company-filter]').select('Tech Corp');
    cy.get('[data-testid=filtered-results]').should('be.visible');

    // Clear filters
    cy.get('[data-testid=clear-filters]').click();
    cy.get('[data-testid=all-results]').should('be.visible');
  });

  it('allows managing member onboarding sessions', () => {
    cy.navigateToAdmin('onboarding');

    // Select a member
    cy.get('[data-testid=member-row-0]').click();
    cy.get('[data-testid=member-details]').should('be.visible');

    // Test advancing day
    cy.get('[data-testid=advance-day-button]').click();
    cy.get('[data-testid=advance-modal]').should('be.visible');
    cy.get('[data-testid=advance-reason]').type('Member requested to skip ahead');
    cy.get('[data-testid=confirm-advance]').click();
    cy.verifyToast('Onboarding day advanced successfully', 'success');

    // Test pausing session
    cy.get('[data-testid=pause-session-button]').click();
    cy.get('[data-testid=pause-modal]').should('be.visible');
    cy.get('[data-testid=pause-reason]').type('Member requested temporary pause');
    cy.get('[data-testid=confirm-pause]').click();
    cy.verifyToast('Onboarding session paused', 'info');

    // Test resuming session
    cy.get('[data-testid=resume-session-button]').click();
    cy.verifyToast('Onboarding session resumed', 'success');

    // Test sending reminder
    cy.get('[data-testid=send-reminder-button]').click();
    cy.get('[data-testid=reminder-modal]').should('be.visible');
    cy.get('[data-testid=reminder-template]').select('onboarding_reminder');
    cy.get('[data-testid=send-reminder]').click();
    cy.verifyToast('Reminder email sent', 'success');
  });

  it('provides bulk operations for multiple members', () => {
    cy.navigateToAdmin('onboarding');

    // Select multiple members
    cy.get('[data-testid=member-checkbox-0]').check();
    cy.get('[data-testid=member-checkbox-1]').check();
    cy.get('[data-testid=member-checkbox-2]').check();

    // Test bulk action dropdown
    cy.get('[data-testid=bulk-actions]').click();
    cy.get('[data-testid=bulk-advance-days]').click();
    cy.get('[data-testid=bulk-advance-modal]').should('be.visible');
    cy.get('[data-testid=bulk-advance-count]').should('contain.text', '3 members');

    // Test bulk reminder
    cy.get('[data-testid=bulk-actions]').click();
    cy.get('[data-testid=bulk-send-reminders]').click();
    cy.get('[data-testid=bulk-reminder-modal]').should('be.visible');
    cy.get('[data-testid=send-bulk-reminders]').click();
    cy.verifyToast('Reminders sent to 3 members', 'success');

    // Test bulk pause
    cy.get('[data-testid=bulk-actions]').click();
    cy.get('[data-testid=bulk-pause-sessions]').click();
    cy.get('[data-testid=bulk-pause-modal]').should('be.visible');
    cy.get('[data-testid=bulk-pause-reason]').type('System maintenance');
    cy.get('[data-testid=confirm-bulk-pause]').click();
    cy.verifyToast('3 sessions paused', 'info');
  });

  it('handles document review queue efficiently', () => {
    cy.navigateToAdmin('documents');

    // Check document queue statistics
    cy.checkAdminStats({
      'pending-documents': '12',
      'urgent-documents': '3',
      'processing-time': '2.5 hours',
    });

    // Filter by priority
    cy.get('[data-testid=priority-filter]').select('urgent');
    cy.get('[data-testid=urgent-documents]').should('be.visible');

    // Review a document
    cy.get('[data-testid=document-item-0]').click();
    cy.get('[data-testid=document-preview]').should('be.visible');

    // Test document approval
    cy.get('[data-testid=approve-document]').click();
    cy.get('[data-testid=approval-notes]').type('Document verified and approved');
    cy.get('[data-testid=confirm-approval]').click();
    cy.verifyToast('Document approved', 'success');

    // Test document rejection
    cy.get('[data-testid=document-item-1]').click();
    cy.get('[data-testid=reject-document]').click();
    cy.get('[data-testid=rejection-reason]').type('Document is blurry and unreadable');
    cy.get('[data-testid=confirm-rejection]').click();
    cy.verifyToast('Document rejected', 'warning');

    // Test request more info
    cy.get('[data-testid=document-item-2]').click();
    cy.get('[data-testid=request-more-info]').click();
    cy.get('[data-testid=info-request]').type('Please provide clear photo of the front and back');
    cy.get('[data-testid=confirm-info-request]').click();
    cy.verifyToast('Information request sent', 'info');

    // Test bulk document actions
    cy.get('[data-testid=document-checkbox-0]').check();
    cy.get('[data-testid=document-checkbox-1]').check();
    cy.get('[data-testid=bulk-document-actions]').click();
    cy.get('[data-testid=bulk-approve]').click();
    cy.get('[data-testid=bulk-approve-modal]').should('be.visible');
    cy.get('[data-testid=confirm-bulk-approve]').click();
    cy.verifyToast('2 documents approved', 'success');
  });

  it('manages email templates and campaigns', () => {
    cy.navigateToAdmin('email');

    // Browse email templates
    cy.get('[data-testid=template-list]').should('be.visible');
    cy.get('[data-testid=template-welcome]').click();
    cy.get('[data-testid=template-preview]').should('be.visible');

    // Test sending test email
    cy.get('[data-testid=send-test-email]').click();
    cy.get('[data-testid=test-email-recipient]').type('admin@test.com');
    cy.get('[data-testid=send-test]').click();
    cy.verifyToast('Test email sent successfully', 'success');

    // Create email campaign
    cy.get('[data-testid=create-campaign]').click();
    cy.get('[data-testid=campaign-name]').type('Onboarding Reminder Campaign');
    cy.get('[data-testid=campaign-template]').select('onboarding_reminder');
    cy.get('[data-testid=campaign-audience]').select('Inactive members - Day 3');
    cy.get('[data-testid=campaign-schedule]').select('Send immediately');
    cy.get('[data-testid=create-campaign]').click();
    cy.verifyToast('Campaign created successfully', 'success');

    // Track email statistics
    cy.get('[data-testid=email-stats]').should('be.visible');
    cy.checkAdminStats({
      'emails-sent': '245',
      'open-rate': '78%',
      'click-rate': '12%',
    });

    // Test email template editing
    cy.get('[data-testid=edit-template]').click();
    cy.get('[data-testid=template-editor]').should('be.visible');
    cy.get('[data-testid=subject-line]').type('[Updated] ');
    cy.get('[data-testid=save-template]').click();
    cy.verifyToast('Template saved successfully', 'success');
  });

  it('exports and analyzes data', () => {
    cy.navigateToAdmin('onboarding');

    // Test data export
    cy.get('[data-testid=export-data]').click();
    cy.get('[data-testid=export-options]').should('be.visible');
    cy.get('[data-testid=export-format]').select('CSV');
    cy.get('[data-testid=export-date-range]').select('Last 30 days');
    cy.get('[data-testid=export-including]').check('completed_sessions');
    cy.get('[data-testid=export-excluding]').check('cancelled_sessions');
    cy.get('[data-testid=generate-export]').click();
    cy.get('[data-testid=export-download]').should('be.visible');

    // Test analytics dashboard
    cy.get('[data-testid=analytics-tab]').click();
    cy.get('[data-testid=engagement-metrics]').should('be.visible');
    cy.get('[data-testid=drop-off-analysis]').should('be.visible');
    cy.get('[data-testid=time-to-completion]').should('be.visible');

    // Check specific analytics
    cy.get('[data-testid=high-engagement-rate]').should('contain.text', '45%');
    cy.get('[data-testid-average-time-to-complete]').should('contain.text', '6.2 days');
    cy.get('[data-testid=day-3-drop-off-rate]').should('contain.text', '15%');
  });

  it('handles admin permissions and security', () => {
    // Test role-based access
    cy.get('[data-testid=admin-settings]').click();
    cy.get('[data-testid=user-management]').should('be.visible');

    // Test user creation
    cy.get('[data-testid=create-user]').click();
    cy.get('[data-testid=user-email]').type('new-admin@test.com');
    cy.get('[data-testid=user-role]').select('insurance');
    cy.get('[data-testid-user-permissions]').check('onboarding_management');
    cy.get('[data-testid-user-permissions]').check('document_review');
    cy.get('[data-testid=create-user-button]').click();
    cy.verifyToast('User created successfully', 'success');

    // Test session timeout
    cy.wait(30 * 60 * 1000); // Wait 30 minutes
    cy.get('[data-testid=session-timeout]').should('be.visible');
    cy.get('[data-testid=extend-session]').click();
    cy.get('[data-testid=session-extended-message]').should('be.visible');

    // Test audit log
    cy.get('[data-testid=audit-log]').should('be.visible');
    cy.get('[data-testid=audit-entry-0]').should('contain.text', 'User created: new-admin@test.com');
    cy.get('[data-testid=audit-timestamp]').should('be.visible');
    cy.get('[data-testid=audit-user]').should('contain.text', 'Current Admin');
  });

  it('provides comprehensive search and filtering', () => {
    cy.navigateToAdmin('onboarding');

    // Test advanced search
    cy.get('[data-testid=advanced-search]').click();
    cy.get('[data-testid=search-filters]').should('be.visible');

    // Search by multiple criteria
    cy.get('[data-testid=search-name]').type('John');
    cy.get('[data-testid=search-email]').type('john@');
    cy.get('[data-testid=search-company]').select('Tech Corp');
    cy.get('[data-testid=search-status]').select('in_progress');
    cy.get('[data-testid=search-date-from]').type('2024-11-01');
    cy.get('[data-testid=search-date-to]').type('2024-11-30');
    cy.get('[data-testid-apply-search]').click();

    // Verify search results
    cy.get('[data-testid=search-results]').should('be.visible');
    cy.get('[data-testid-search-filters-applied]').should('be.visible');
    cy.get('[data-testid-clear-search]').should('be.visible');

    // Save search query
    cy.get('[data-testid=save-search]').click();
    cy.get('[data-testid=search-name-input]').type('Active Tech Corp Members');
    cy.get('[data-testid-save-search-query']).click();
    cy.verifyToast('Search saved successfully', 'success');

    // Test saved searches
    cy.get('[data-testid=saved-searches]').click();
    cy.get('[data-testid=saved-search-0]').should('contain.text', 'Active Tech Corp Members');
    cy.get('[data-testid-load-search-0]').click();
    cy.get('[data-testid=search-results').should('be.visible');
  });

  it('displays real-time updates and notifications', () => {
    cy.navigateToAdmin('dashboard');

    // Test real-time member activity
    cy.mockApiResponse('/admin/members/activity', {
      type: 'new_member',
      member: { name: 'New User', email: 'newuser@test.com' },
      timestamp: new Date().toISOString()
    });

    // Should show real-time notification
    cy.get('[data-testid=real-time-notification]').should('be.visible');
    cy.get('[data-testid=notification-content]').should('contain.text', 'New member registered');

    // Test live onboarding progress
    cy.mockApiResponse('/admin/onboarding/live-progress', {
      memberId: '123',
      memberName: 'Active User',
      currentDay: 4,
      justCompleted: 'Document Upload'
    });

    cy.get('[data-testid=live-progress-update]').should('be.visible');
    cy.get('[data-testid=progress-update-content]').should('contain.text', 'Active User just completed Day 4');

    // Test system health monitoring
    cy.get('[data-testid=system-health]').should('be.visible');
    cy.checkAdminStats({
      'server-status': 'Healthy',
      'database-status': 'Connected',
      'email-queue': 'Clear',
    });
  });
});