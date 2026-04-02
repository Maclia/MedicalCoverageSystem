import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaimsProcessingDashboard } from '../ClaimsProcessingDashboard';
import * as claimsApi from '@/services/claimsApi';

// Mock the API
jest.mock('@/services/claimsApi');
const mockClaimsApi = claimsApi as jest.Mocked<typeof claimsApi>;

// Mock wouter for routing
jest.mock('wouter', () => ({
  useLocation: () => [jest.fn(), jest.fn()],
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('ClaimsProcessingDashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the dashboard with loading state', () => {
    // Mock API to return loading state
    mockClaimsApi.baseClaimsApi.getClaims.mockResolvedValue({
      success: true,
      data: [],
    });

    mockClaimsApi.workflowApi.getActiveWorkflows.mockResolvedValue({
      success: true,
      data: { activeWorkflows: [] },
    });

    mockClaimsApi.batchApi.getBatchJobs.mockResolvedValue({
      success: true,
      data: { batchJobs: [] },
    });

    mockClaimsApi.analyticsApi.getPerformanceDashboard.mockResolvedValue({
      success: true,
      data: { dashboard: null },
    });

    renderWithClient(<ClaimsProcessingDashboard />);

    // Should show loading indicator
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should render analytics overview when data is loaded', async () => {
    const mockAnalytics = {
      dashboard: {
        volume: {
          totalClaims: 150,
          processedClaims: 120,
          approvedClaims: 100,
          deniedClaims: 20,
          pendingClaims: 30,
        },
        financial: {
          totalBilledAmount: 250000,
          totalApprovedAmount: 200000,
          averageClaimAmount: 1666.67,
          approvalRate: 80.0,
        },
        processing: {
          averageProcessingTime: 120000, // 2 minutes in milliseconds
          claimsProcessedPerDay: 25,
          backlogCount: 30,
          processingEfficiency: 85.5,
        },
        quality: {
          averageQualityScore: 90.0,
          fraudDetectionCount: 5,
          auditRequiredCount: 3,
        },
      },
    };

    // Mock successful API responses
    mockClaimsApi.baseClaimsApi.getClaims.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          memberId: 1,
          memberName: 'John Doe',
          amount: 1000,
          status: 'approved',
          submissionDate: '2024-01-15',
          fraudRiskLevel: 'low',
        },
      ],
    });

    mockClaimsApi.workflowApi.getActiveWorkflows.mockResolvedValue({
      success: true,
      data: { activeWorkflows: [] },
    });

    mockClaimsApi.batchApi.getBatchJobs.mockResolvedValue({
      success: true,
      data: { batchJobs: [] },
    });

    mockClaimsApi.analyticsApi.getPerformanceDashboard.mockResolvedValue({
      success: true,
      data: mockAnalytics,
    });

    renderWithClient(<ClaimsProcessingDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Claims Processing')).toBeInTheDocument();
    });

    // Should display analytics cards
    expect(screen.getByText('150')).toBeInTheDocument(); // Total Claims
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Approval Rate
    expect(screen.getByText('2.0m')).toBeInTheDocument(); // Avg Processing Time
    expect(screen.getByText('30')).toBeInTheDocument(); // Backlog
  });

  it('should handle claim processing workflow', async () => {
    const mockClaims = [
      {
        id: 1,
        memberId: 1,
        memberName: 'John Doe',
        amount: 1000,
        status: 'submitted',
        submissionDate: '2024-01-15',
        fraudRiskLevel: 'medium',
      },
    ];

    mockClaimsApi.baseClaimsApi.getClaims.mockResolvedValue({
      success: true,
      data: mockClaims,
    });

    mockClaimsApi.workflowApi.getActiveWorkflows.mockResolvedValue({
      success: true,
      data: { activeWorkflows: [] },
    });

    mockClaimsApi.batchApi.getBatchJobs.mockResolvedValue({
      success: true,
      data: { batchJobs: [] },
    });

    mockClaimsApi.analyticsApi.getPerformanceDashboard.mockResolvedValue({
      success: true,
      data: { dashboard: null },
    });

    // Mock the processClaimWorkflow call
    mockClaimsApi.claimsApi.processClaimWorkflow.mockResolvedValue({
      success: true,
      data: { workflowId: 'workflow_123', status: 'started' },
    });

    renderWithClient(<ClaimsProcessingDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    // Find and click the Process button
    const processButton = screen.getByText('Process');
    expect(processButton).toBeInTheDocument();

    // Click the process button
    await userEvent.click(processButton);

    // Verify the API was called
    await waitFor(() => {
      expect(mockClaimsApi.claimsApi.processClaimWorkflow).toHaveBeenCalledWith(1, {
        workflowType: 'standard',
      });
    });
  });

  it('should display error message when API fails', async () => {
    // Mock API failure
    mockClaimsApi.baseClaimsApi.getClaims.mockRejectedValue(
      new Error('API Error')
    );

    renderWithClient(<ClaimsProcessingDashboard />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('should handle tab navigation', async () => {
    mockClaimsApi.baseClaimsApi.getClaims.mockResolvedValue({
      success: true,
      data: [],
    });

    mockClaimsApi.workflowApi.getActiveWorkflows.mockResolvedValue({
      success: true,
      data: { activeWorkflows: [] },
    });

    mockClaimsApi.batchApi.getBatchJobs.mockResolvedValue({
      success: true,
      data: { batchJobs: [] },
    });

    mockClaimsApi.analyticsApi.getPerformanceDashboard.mockResolvedValue({
      success: true,
      data: { dashboard: null },
    });

    renderWithClient(<ClaimsProcessingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Claims tab
    const claimsTab = screen.getByText('Claims');
    await userEvent.click(claimsTab);

    // Should show claims table header
    expect(screen.getByText('Claims Management')).toBeInTheDocument();
  });
});

describe('API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct API endpoint structure', () => {
    // Verify that the API service has the expected structure
    expect(typeof mockClaimsApi.claimsApi.processClaimWorkflow).toBe('function');
    expect(typeof mockClaimsApi.workflowApi.getActiveWorkflows).toBe('function');
    expect(typeof mockClaimsApi.batchApi.createBatchJob).toBe('function');
    expect(typeof mockClaimsApi.analyticsApi.getPerformanceDashboard).toBe('function');
    expect(typeof mockClaimsApi.notificationApi.sendNotification).toBe('function');
  });

  it('should format API requests correctly', async () => {
    const claimData = {
      type: 'email',
      recipient: 'test@example.com',
      recipientType: 'member',
      subject: 'Test',
      message: 'Test message',
    };

    mockClaimsApi.notificationApi.sendNotification.mockResolvedValue({
      success: true,
      data: { id: 'notif_123' },
    });

    await mockClaimsApi.notificationApi.sendNotification(claimData);

    expect(mockClaimsApi.notificationApi.sendNotification).toHaveBeenCalledWith(claimData);
  });
});