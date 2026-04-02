import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OnboardingDashboard } from '../OnboardingDashboard';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  }),
}));

// Mock the API calls
const mockOnboardingSession = {
  id: 1,
  memberId: '1',
  currentDay: 3,
  status: 'in_progress' as const,
  activationDate: new Date(),
  completionDate: null,
};

const mockOnboardingTasks = [
  {
    id: 1,
    sessionId: 1,
    dayNumber: 3,
    title: 'Upload Insurance Documents',
    description: 'Upload your insurance card and ID',
    type: 'document_upload' as const,
    status: 'pending' as const,
    points: 50,
    dueDate: new Date(),
  },
  {
    id: 2,
    sessionId: 1,
    dayNumber: 3,
    title: 'Set Communication Preferences',
    description: 'Choose how you want to receive updates',
    type: 'profile_setup' as const,
    status: 'completed' as const,
    points: 25,
    dueDate: new Date(),
  },
];

// Mock fetch for API calls
global.fetch = vi.fn();

describe('OnboardingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/onboarding/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingSession),
        });
      }
      if (url.includes('/onboarding/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingTasks),
        });
      }
      if (url.includes('/member/progress')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalPoints: 75,
            currentStreak: 3,
            level: 2,
            completedTasks: 5,
            totalTasks: 28,
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  it('renders onboarding dashboard with session information', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/Day 3 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Continue Your Journey/i)).toBeInTheDocument();
    });
  });

  it('displays current progress correctly', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument(); // Total points
      expect(screen.getByText('3')).toBeInTheDocument(); // Current streak
      expect(screen.getByText('2')).toBeInTheDocument(); // Level
    });
  });

  it('shows onboarding tasks for current day', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Upload Insurance Documents')).toBeInTheDocument();
      expect(screen.getByText('Set Communication Preferences')).toBeInTheDocument();
    });
  });

  it('displays task status correctly', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      // Pending task
      const pendingTask = screen.getByText('Upload Insurance Documents');
      const pendingStatus = pendingTask.closest('[data-testid*="task"]')?.querySelector('.text-yellow-600');
      expect(pendingStatus?.textContent).toBe('Pending');

      // Completed task
      const completedTask = screen.getByText('Set Communication Preferences');
      const completedStatus = completedTask.closest('[data-testid*="task"]')?.querySelector('.text-green-600');
      expect(completedStatus?.textContent).toBe('Completed');
    });
  });

  it('allows navigation between different onboarding days', async () => {
    const user = userEvent.setup();
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      // Click on Day 1 tab
      const day1Tab = screen.getByRole('tab', { name: /Day 1/i });
      user.click(day1Tab);
    });

    // Should fetch Day 1 tasks
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/tasks?day=1'),
        expect.any(Object)
      );
    });
  });

  it('handles task completion', async () => {
    const user = userEvent.setup();
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      const completeButton = screen.getByRole('button', { name: /complete/i });
      user.click(completeButton);
    });

    // Should call API to update task status
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/tasks/1/complete'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('displays milestones and achievements', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/Milestones/i)).toBeInTheDocument();
      expect(screen.getByText(/First Steps/i)).toBeInTheDocument();
      expect(screen.getByText(/Getting Started/i)).toBeInTheDocument();
    });
  });

  it('shows celebration modal when milestone is achieved', async () => {
    // Mock a task completion that triggers a milestone
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/complete')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            task: { ...mockOnboardingTasks[0], status: 'completed' },
            milestoneAchieved: true,
            milestone: {
              id: 1,
              title: 'First Steps',
              description: 'Complete your first onboarding task',
              points: 25,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOnboardingSession),
      });
    });

    const user = userEvent.setup();
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      const completeButton = screen.getByRole('button', { name: /complete/i });
      user.click(completeButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Milestone Achieved!/i)).toBeInTheDocument();
      expect(screen.getByText('First Steps')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    (fetch as any).mockRejectedValue(new Error('API Error'));

    render(<OnboardingDashboard memberId="1" />);

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
        json: () => Promise.resolve(mockOnboardingSession),
      });
    });

    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /retry/i });
      user.click(retryButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial call + retry
      expect(screen.getByText(/Day 3 of 7/i)).toBeInTheDocument();
    });
  });

  it('displays proper loading states', async () => {
    // Mock delayed API response
    (fetch as any).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingSession),
        }), 100)
      )
    );

    render(<OnboardingDashboard memberId="1" />);

    // Should show loading skeleton
    expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Day 3 of 7/i)).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('handles onboarding completion', async () => {
    // Mock completed session
    const completedSession = { ...mockOnboardingSession, status: 'completed', currentDay: 7 };
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/onboarding/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(completedSession),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/Onboarding Complete!/i)).toBeInTheDocument();
      expect(screen.getByText(/Congratulations/i)).toBeInTheDocument();
    });
  });

  it('tracks time spent on each day', async () => {
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      // Should show time tracking component
      expect(screen.getByText(/Time spent today:/i)).toBeInTheDocument();
      expect(screen.getByText(/0m 0s/i)).toBeInTheDocument();
    });

    // After 30 seconds, should update time display
    await new Promise(resolve => setTimeout(resolve, 100));

    // In real implementation, would update with actual time spent
    // For testing, we verify the component structure exists
    expect(screen.getByTestId('time-tracker')).toBeInTheDocument();
  });

  it('provides help and support resources', async () => {
    const user = userEvent.setup();
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      const helpButton = screen.getByRole('button', { name: /help/i });
      user.click(helpButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Need Help?/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact Support/i)).toBeInTheDocument();
      expect(screen.getByText(/FAQ/i)).toBeInTheDocument();
    });
  });

  it('updates progress when tasks are completed', async () => {
    const user = userEvent.setup();

    // Mock API responses for task completion and progress update
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/onboarding/session')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingSession),
        });
      }
      if (url.includes('/onboarding/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOnboardingTasks),
        });
      }
      if (url.includes('/member/progress')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalPoints: 100, // Updated points
            currentStreak: 4,  // Updated streak
            level: 2,
            completedTasks: 6,
            totalTasks: 28,
          }),
        });
      }
      if (url.includes('/complete')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            task: { ...mockOnboardingTasks[0], status: 'completed' },
            newPoints: 125,
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });

    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      // Initial progress
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    const completeButton = screen.getByRole('button', { name: /complete/i });
    user.click(completeButton);

    await waitFor(() => {
      // Updated progress after task completion
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('handles onboarding pausing and resuming', async () => {
    const user = userEvent.setup();
    render(<OnboardingDashboard memberId="1" />);

    await waitFor(() => {
      const pauseButton = screen.getByRole('button', { name: /pause onboarding/i });
      user.click(pauseButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Onboarding Paused/i)).toBeInTheDocument();
      expect(screen.getByText(/You can resume anytime/i)).toBeInTheDocument();

      const resumeButton = screen.getByRole('button', { name: /resume onboarding/i });
      user.click(resumeButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/session/1/resume'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });
});