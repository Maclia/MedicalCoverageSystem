import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trophy,
  Flame,
  Star,
  Target,
  Zap,
  Heart,
  Shield,
  FileText,
  Users,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Award,
  TrendingUp
} from 'lucide-react';

interface OnboardingTask {
  id: number;
  dayNumber: number;
  taskType: 'profile_completion' | 'document_upload' | 'benefits_education' | 'dependent_registration' | 'wellness_setup' | 'emergency_setup' | 'completion';
  title: string;
  description: string;
  completionStatus: boolean;
  completedAt?: string;
  pointsEarned: number;
  taskData?: string;
}

interface OnboardingSession {
  id: number;
  memberId: number;
  currentDay: number;
  status: 'pending' | 'active' | 'completed' | 'paused' | 'cancelled';
  activationCompleted: boolean;
  startDate: string;
  completionDate?: string;
  totalPointsEarned: number;
  streakDays: number;
}

interface MemberDocument {
  id: number;
  documentType: 'government_id' | 'proof_of_address' | 'insurance_card' | 'dependent_document';
  originalFileName: string;
  uploadDate: string;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'expired';
}

interface OnboardingDashboardProps {
  memberId: number;
}

export const OnboardingDashboard: React.FC<OnboardingDashboardProps> = ({ memberId }) => {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboardingData();
  }, [memberId]);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);

      // Fetch onboarding status
      const sessionResponse = await fetch(`/api/onboarding/${memberId}/status`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch onboarding status');
      }

      const sessionData = await sessionResponse.json();
      setSession(sessionData.session);
      setTasks(sessionData.tasks);
      setDocuments(sessionData.documents);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNextDay = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/onboarding/${memberId}/next-day`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to advance to next day');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        setSession(prev => prev ? { ...prev, status: 'completed', completionDate: new Date().toISOString() } : null);
      } else {
        // Refresh the session data
        await fetchOnboardingData();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSkipDay = async () => {
    if (!session) return;

    const reason = prompt('Why are you skipping this day? (optional)');

    try {
      const response = await fetch(`/api/onboarding/${memberId}/skip-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Skipped by user' }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip day');
      }

      await fetchOnboardingData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleTaskClick = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const taskData = task.taskData ? JSON.parse(task.taskData) : {};

      // Navigate to appropriate component based on task type
      switch (task.taskType) {
        case 'profile_completion':
          navigate(`/member/profile/${memberId}`);
          break;
        case 'document_upload':
          navigate(`/member/documents/${memberId}`);
          break;
        case 'benefits_education':
          navigate(`/member/benefits/${memberId}`);
          break;
        case 'dependent_registration':
          navigate(`/member/dependents/${memberId}`);
          break;
        case 'wellness_setup':
          navigate(`/member/wellness/${memberId}`);
          break;
        case 'emergency_setup':
          navigate(`/member/emergency/${memberId}`);
          break;
        default:
          // For other tasks, just mark as completed
          await toggleTask(taskId);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open task');
    }
  };

  const toggleTask = async (taskId: number) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await fetch(`/api/onboarding/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completionStatus: !task.completionStatus,
          taskData: task.taskData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

      // Update session points if task was completed
      if (!task.completionStatus && updatedTask.completionStatus) {
        setSession(prev => prev ? {
          ...prev,
          totalPointsEarned: prev.totalPointsEarned + updatedTask.pointsEarned
        } : null);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'profile_completion':
        return <Users className="h-5 w-5" />;
      case 'document_upload':
        return <FileText className="h-5 w-5" />;
      case 'benefits_education':
        return <Shield className="h-5 w-5" />;
      case 'dependent_registration':
        return <Users className="h-5 w-5" />;
      case 'wellness_setup':
        return <Heart className="h-5 w-5" />;
      case 'emergency_setup':
        return <Shield className="h-5 w-5" />;
      case 'completion':
        return <Trophy className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const getTaskColor = (taskType: string) => {
    switch (taskType) {
      case 'profile_completion':
        return 'text-blue-600 bg-blue-100';
      case 'document_upload':
        return 'text-purple-600 bg-purple-100';
      case 'benefits_education':
        return 'text-green-600 bg-green-100';
      case 'dependent_registration':
        return 'text-orange-600 bg-orange-100';
      case 'wellness_setup':
        return 'text-red-600 bg-red-100';
      case 'emergency_setup':
        return 'text-yellow-600 bg-yellow-100';
      case 'completion':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding progress...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>
            Onboarding session not found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-center">
              <div className="bg-green-100 p-4 rounded-full">
                <Trophy className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h1>
            <p className="text-gray-600 mb-4">
              You've completed your onboarding journey
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Points Earned:</span>
                <span className="font-semibold">{session.totalPointsEarned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Streak Days:</span>
                <span className="font-semibold">{session.streakDays}</span>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/member/dashboard/${memberId}`)}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentDayTasks = tasks.filter(task => task.dayNumber === session.currentDay);
  const completedCurrentDayTasks = currentDayTasks.filter(task => task.completionStatus);
  const dayProgress = currentDayTasks.length > 0 ? (completedCurrentDayTasks.length / currentDayTasks.length) * 100 : 0;
  const overallProgress = (session.currentDay - 1 + dayProgress / 100) / 7 * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Onboarding Journey</h1>
              <p className="text-gray-600">Welcome back! Let's continue your progress</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="text-xl font-bold text-blue-600">{session.totalPointsEarned}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Day</p>
                <p className="text-xl font-bold text-green-600">{session.currentDay}/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-medium">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Day {session.currentDay} of 7</span>
                  <span>{Math.round(dayProgress)}% of current day</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Current Streak</span>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    {session.streakDays} days
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Points Earned</span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {session.totalPointsEarned}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Status</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  onClick={handleNextDay}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={dayProgress < 100 && session.currentDay > 1}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Next Day
                </Button>
                <Button
                  onClick={handleSkipDay}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Skip Day
                </Button>
                <Button
                  onClick={() => navigate(`/member/dashboard/${memberId}`)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Day Tasks */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Day {session.currentDay} Tasks</span>
                </CardTitle>
                <CardDescription>
                  Complete today's tasks to advance your onboarding journey
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Progress value={dayProgress} className="w-24 h-2" />
                <span className="text-sm font-medium">{Math.round(dayProgress)}%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {currentDayTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tasks available for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentDayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      task.completionStatus
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                    }`}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 ${task.completionStatus ? 'text-green-600' : 'text-gray-400'}`}>
                          {task.completionStatus ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <Badge
                              className={`text-xs ${getTaskColor(task.taskType)}`}
                              variant="secondary"
                            >
                              <div className="flex items-center space-x-1">
                                {getTaskIcon(task.taskType)}
                                <span>{task.taskType.replace('_', ' ')}</span>
                              </div>
                            </Badge>
                            {task.completionStatus && (
                              <Badge className="text-xs bg-green-100 text-green-800" variant="secondary">
                                +{task.pointsEarned} pts
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          {task.completionStatus && task.completedAt && (
                            <p className="text-xs text-gray-500">
                              Completed {new Date(task.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dayProgress === 100 && session.currentDay < 7 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Ready for Day {session.currentDay + 1}!</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      You've completed all tasks for today. Let's continue your journey.
                    </p>
                  </div>
                  <Button onClick={handleNextDay} className="bg-blue-600 hover:bg-blue-700">
                    Next Day
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Journey Overview */}
        <Card>
          <CardHeader>
            <CardTitle>7-Day Journey Overview</CardTitle>
            <CardDescription>
              Track your progress through the entire onboarding experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const dayTasks = tasks.filter(task => task.dayNumber === day);
                const completedTasks = dayTasks.filter(task => task.completionStatus);
                const isCompleted = day < session.currentDay;
                const isCurrent = day === session.currentDay;
                const isFuture = day > session.currentDay;
                const progress = dayTasks.length > 0 ? (completedTasks.length / dayTasks.length) * 100 : 0;

                return (
                  <div
                    key={day}
                    className={`text-center p-3 rounded-lg border-2 transition-all duration-200 ${
                      isCompleted
                        ? 'border-green-300 bg-green-50'
                        : isCurrent
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
                        : isFuture
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="text-lg font-bold mb-1">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                      ) : isCurrent ? (
                        <Target className="h-6 w-6 text-blue-600 mx-auto" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 mx-auto" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Day {day}</p>
                    {dayTasks.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-1">
                          {completedTasks.length}/{dayTasks.length}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full ${
                              isCompleted
                                ? 'bg-green-500'
                                : isCurrent
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Award className="h-8 w-8 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">You're doing great!</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Keep up the momentum to complete your onboarding and unlock all benefits.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};