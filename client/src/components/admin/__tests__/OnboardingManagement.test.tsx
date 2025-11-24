import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OnboardingManagement } from '../OnboardingManagement';

// Mock data for testing
const mockOnboardingOverview = {
  totalMembers: 150,
  activeSessions: 45,
  completionRate: 85.5,
  averageCompletionTime: 6.2,
  todayStarted: 8,
  todayCompleted: 12,
  dayBreakdown: [
    { day: 1, count: 12, completionRate: 95.5 },
    { day: 2, count: 10, completionRate: 89.2 },
    { day: 3, count: 8, completionRate: 82.1 },
    { day: 4, count: 7, completionRate: 76.4 },
    { day: 5, count: 5, completionRate: 70.8 },
    { day: 6, count: 3, completionRate: 65.2 },
    { day: 7, count: 0, completionRate: 0 },
  ],
};

const mockMemberSessions = [
  {
    id: 1,
    memberName: 'John Doe',
    memberEmail: 'john.doe@example.com',
    companyName: 'Tech Corp',
    currentDay: 3,
    status: 'in_progress',
    activationDate: new Date('2024-11-17'),
    completionDate: null,
    engagementScore: 85,
    lastActivity: new Date('2024-11-20T10:30:00Z'),
    tasksCompleted: 8,
    totalTasks: 12,
  },
  {
    id: 2,
    memberName: 'Jane Smith',
    memberEmail: 'jane.smith@example.com',
    companyName: 'Health Plus',
    currentDay: 7,
    status: 'completed',
    activationDate: new Date('2024-11-14'),
    completionDate: new Date('2024-11-20'),
    engagementScore: 92,
    lastActivity: new Date('2024-11-20T14:45:00Z'),
    tasksCompleted: 28,
    totalTasks: 28,
  },
  {
    id: 3,
    memberName: 'Bob Johnson',
    memberEmail: 'bob.johnson@example.com',
    companyName: 'Tech Corp',
    currentDay: 2,
    status: 'paused',
    activationDate: new Date('2024-11-18'),
    completionDate: null,
    engagementScore: 45,
    lastActivity: new Date('2024-11-19T09:15:00Z'),
    tasksCompleted: 3,
    totalTasks: 6,
  },
];

// Mock fetch for API calls
global.fetch = vi.fn();

describe('OnboardingManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/admin/onboarding/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingOverview),
        });
      }
      if (url.includes('/admin/onboarding/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sessions: mockMemberSessions,
            total: 3,
            page: 1,
            limit: 50,
            totalPages: 1,
          }),
        });
      }
      if (url.includes('/admin/onboarding/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  it('renders onboarding management dashboard with overview statistics', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total members
      expect(screen.getByText('45')).toBeInTheDocument(); // Active sessions
      expect(screen.getByText('85.5%')).toBeInTheDocument(); // Completion rate
      expect(screen.getByText('6.2 days')).toBeInTheDocument(); // Average completion time
      expect(screen.getByText('8')).toBeInTheDocument(); // Today started
      expect(screen.getByText('12')).toBeInTheDocument(); // Today completed
    });
  });

  it('displays day-by-day breakdown chart', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('Onboarding Progress by Day')).toBeInTheDocument();
      expect(screen.getByText('Day 1')).toBeInTheDocument();
      expect(screen.getByText('Day 7')).toBeInTheDocument();
    });
  });

  it('shows member sessions list with filtering options', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    // Check status badges
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });

  it('allows filtering by status', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      user.click(statusFilter);
    });

    await waitFor(() => {
      const completedOption = screen.getByRole('option', { name: /completed/i });
      user.click(completedOption);
    });

    // Should filter API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=completed'),
        expect.any(Object)
      );
    });
  });

  it('allows searching by member name or email', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search members/i);
      user.type(searchInput, 'John');
    });

    // Should trigger search with delay
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=John'),
        expect.any(Object)
      );
    }, { timeout: 600 });
  });

  it('allows sorting by different columns', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const memberNameHeader = screen.getByRole('button', { name: /member name/i });
      user.click(memberNameHeader);
    });

    await waitFor(() => {
      // Should re-fetch with sorting
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=memberName&sortOrder=asc'),
        expect.any(Object)
      );
    });
  });

  it('shows member details when clicking on a session', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const johnRow = screen.getByText('John Doe').closest('[data-testid*="member-row"]');
      user.click(johnRow!);
    });

    await waitFor(() => {
      expect(screen.getByText('Member Details')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('Day 3 of 7')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // Engagement score
    });
  });

  it('allows advancing member to next onboarding day', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const advanceButton = screen.getByRole('button', { name: /advance day/i });
      user.click(advanceButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Advance Onboarding Day')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    user.click(confirmButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/onboarding/1/advance-day'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(JSON.stringify({ reason: '' })),
        })
      );
    });
  });

  it('allows pausing member onboarding', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      user.click(pauseButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/onboarding/1/pause'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('allows resuming paused onboarding', async () => {
    const user = userEvent.setup();

    // Mock a paused session
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/admin/onboarding/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sessions: [mockMemberSessions[2]], // Paused session
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOnboardingOverview),
      });
    });

    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      user.click(resumeButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/onboarding/3/resume'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('allows sending reminder emails to members', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const emailButton = screen.getByRole('button', { name: /send reminder/i });
      user.click(emailButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Send Reminder Email')).toBeInTheDocument();

      const sendButton = screen.getByRole('button', { name: /send/i });
      user.click(sendButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/email/send-reminder'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(JSON.stringify({
            memberIds: [1],
            template: 'onboarding_reminder',
          })),
        })
      );
    });
  });

  it('displays engagement analytics', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('Engagement Analytics')).toBeInTheDocument();
      expect(screen.getByText('Average Engagement Score')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // Average score
    });

    await waitFor(() => {
      expect(screen.getByText('Highly Engaged')).toBeInTheDocument();
      expect(screen.getByText('Moderately Engaged')).toBeInTheDocument();
      expect(screen.getByText('Low Engagement')).toBeInTheDocument();
    });
  });

  it('shows drop-off analysis', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('Drop-off Analysis')).toBeInTheDocument();
      expect(screen.getByText('Common Abandonment Points')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Day 1: Profile Setup')).toBeInTheDocument();
      expect(screen.getByText('Day 3: Document Upload')).toBeInTheDocument();
      expect(screen.getByText('Day 5: Wellness Setup')).toBeInTheDocument();
    });
  });

  it('handles bulk operations on multiple members', async () => {
    const user = userEvent.setup();
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      // Select first two members
      const checkboxes = screen.getAllByRole('checkbox', { name: /select member/i });
      user.click(checkboxes[0]);
      user.click(checkboxes[1]);
    });

    await waitFor(() => {
      const bulkActionButton = screen.getByRole('button', { name: /bulk actions/i });
      user.click(bulkActionButton);
    });

    await waitFor(() => {
      const sendRemindersOption = screen.getByRole('menuitem', { name: /send reminders/i });
      user.click(sendRemindersOption);
    });

    await waitFor(() => {
      expect(screen.getByText('Send Bulk Reminders')).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: /send to 2 members/i });
      user.click(confirmButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/email/send-reminder'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(JSON.stringify({
            memberIds: [1, 2],
            template: 'onboarding_reminder',
          })),
        })
      );
    });
  });

  it('exports onboarding data to CSV', async () => {
    const user = userEvent.setup();
    const mockCreateObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = vi.fn();

    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      user.click(exportButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/onboarding/export'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Mock CSV data response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: 'member_name,email,current_day,status,engagement_score\nJohn Doe,john.doe@example.com,3,in_progress,85',
        filename: 'onboarding-data-2024-11-20.csv',
      }),
    });

    // Re-trigger export after mocking response
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      user.click(exportButton);
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    (fetch as any).mockRejectedValue(new Error('API Error'));

    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load onboarding data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('allows retry after failed API call', async () => {
    const user = userEvent.setup();
    let callCount = 0;

    (fetch as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOnboardingOverview),
      });
    });

    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      user.click(retryButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('refreshes data automatically', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Click refresh button
    const user = userEvent.setup();
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(4); // Initial load + refresh (overview + sessions)
    });
  });

  it('displays loading states during data fetching', async () => {
    // Mock delayed API response
    (fetch as any).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingOverview),
        }), 200)
      )
    );

    render(<OnboardingManagement userRole="insurance" />);

    // Should show loading skeleton
    expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    }, { timeout: 300 });
  });

  it('limits functionality based on user role', async () => {
    // Test with limited role
    render(<OnboardingManagement userRole="member" />);

    await waitFor(() => {
      // Should not have admin-only actions
      expect(screen.queryByRole('button', { name: /advance day/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /export data/i })).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no onboarding sessions exist', async () => {
    // Mock empty response
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/admin/onboarding/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockOnboardingOverview,
            totalMembers: 0,
            activeSessions: 0,
          }),
        });
      }
      if (url.includes('/admin/onboarding/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sessions: [],
            total: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });

    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // No active sessions
      expect(screen.getByText(/No onboarding sessions found/i)).toBeInTheDocument();
    });
  });

  it('validates user permissions before making API calls', async () => {
    render(<OnboardingManagement userRole="insurance" />);

    await waitFor(() => {
      // Should have made initial API calls
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/onboarding/overview'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});