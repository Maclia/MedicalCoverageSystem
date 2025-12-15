import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Trophy,
  Target,
  Flame,
  Star,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  Lock,
  Unlock,
  Zap,
  Gift,
  Medal,
  Crown,
  Rocket,
  Heart,
  Shield,
  Users,
  Sparkles,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface ProgressTrackerProps {
  memberId: number;
  compact?: boolean;
  showDetailedStats?: boolean;
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

interface OnboardingTask {
  id: number;
  dayNumber: number;
  taskType: string;
  title: string;
  description: string;
  completionStatus: boolean;
  completedAt?: string;
  pointsEarned: number;
  taskData?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'speed' | 'consistency' | 'completion' | 'engagement' | 'milestone';
}

interface Milestone {
  day: number;
  title: string;
  description: string;
  pointsReward: number;
  unlocked: boolean;
  icon: React.ReactNode;
  benefits: string[];
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  memberId,
  compact = false,
  showDetailedStats = false
}) => {
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievementCategory, setSelectedAchievementCategory] = useState<string>('all');

  useEffect(() => {
    fetchProgressData();
  }, [memberId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      // Fetch onboarding session and tasks
      const sessionResponse = await fetch(`/api/onboarding/${memberId}/status`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch onboarding status');
      }

      const sessionData = await sessionResponse.json();
      setSession(sessionData.session);
      setTasks(sessionData.tasks || []);

      // Generate achievements and milestones based on session data
      generateAchievements(sessionData.session, sessionData.tasks || []);
      generateMilestones(sessionData.session);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const generateAchievements = (session: OnboardingSession, tasks: OnboardingTask[]) => {
    const achievementsList: Achievement[] = [];

    // Speed Achievements
    achievementsList.push({
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Complete onboarding in 5 days or less',
      icon: <Zap className="h-6 w-6" />,
      points: 50,
      unlocked: session.currentDay <= 5 && tasks.filter(t => t.completionStatus).length >= 10,
      progress: Math.min((7 - session.currentDay) * 20, 100),
      maxProgress: 100,
      category: 'speed'
    });

    // Consistency Achievements
    achievementsList.push({
      id: 'consistency_champion',
      title: 'Consistency Champion',
      description: 'Maintain a 7-day streak',
      icon: <Flame className="h-6 w-6" />,
      points: 30,
      unlocked: session.streakDays >= 7,
      progress: Math.min((session.streakDays / 7) * 100, 100),
      maxProgress: 100,
      category: 'consistency'
    });

    // Completion Achievements
    achievementsList.push({
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Complete all Day 1 tasks',
      icon: <Rocket className="h-6 w-6" />,
      points: 25,
      unlocked: tasks.filter(t => t.dayNumber === 1 && t.completionStatus).length >= 2,
      progress: (tasks.filter(t => t.dayNumber === 1 && t.completionStatus).length / 2) * 100,
      maxProgress: 100,
      category: 'completion'
    });

    achievementsList.push({
      id: 'task_master',
      title: 'Task Master',
      description: 'Complete 10 tasks',
      icon: <CheckCircle className="h-6 w-6" />,
      points: 40,
      unlocked: tasks.filter(t => t.completionStatus).length >= 10,
      progress: Math.min((tasks.filter(t => t.completionStatus).length / 10) * 100, 100),
      maxProgress: 100,
      category: 'completion'
    });

    // Engagement Achievements
    achievementsList.push({
      id: 'point_collector',
      title: 'Point Collector',
      description: 'Earn 100 points',
      icon: <Star className="h-6 w-6" />,
      points: 20,
      unlocked: session.totalPointsEarned >= 100,
      progress: Math.min((session.totalPointsEarned / 100) * 100, 100),
      maxProgress: 100,
      category: 'engagement'
    });

    achievementsList.push({
      id: 'overachiever',
      title: 'Overachiever',
      description: 'Earn 200 points',
      icon: <Crown className="h-6 w-6" />,
      points: 60,
      unlocked: session.totalPointsEarned >= 200,
      progress: Math.min((session.totalPointsEarned / 200) * 100, 100),
      maxProgress: 100,
      category: 'engagement'
    });

    // Milestone Achievements
    achievementsList.push({
      id: 'halfway_hero',
      title: 'Halfway Hero',
      description: 'Reach Day 4 of onboarding',
      icon: <Target className="h-6 w-6" />,
      points: 35,
      unlocked: session.currentDay >= 4,
      progress: Math.min((session.currentDay / 4) * 100, 100),
      maxProgress: 100,
      category: 'milestone'
    });

    achievementsList.push({
      id: 'completion_master',
      title: 'Completion Master',
      description: 'Complete the entire onboarding journey',
      icon: <Trophy className="h-6 w-6" />,
      points: 100,
      unlocked: session.status === 'completed',
      progress: Math.min((session.currentDay / 7) * 100, 100),
      maxProgress: 100,
      category: 'milestone'
    });

    setAchievements(achievementsList);
  };

  const generateMilestones = (session: OnboardingSession) => {
    const milestonesList: Milestone[] = [
      {
        day: 1,
        title: 'Welcome Aboard',
        description: 'Start your health journey',
        pointsReward: 10,
        unlocked: session.currentDay >= 1,
        icon: <Heart className="h-5 w-5" />,
        benefits: ['Profile completion', 'Document upload access', 'Emergency contacts setup']
      },
      {
        day: 2,
        title: 'Benefits Explorer',
        description: 'Discover your coverage',
        pointsReward: 15,
        unlocked: session.currentDay >= 2,
        icon: <Shield className="h-5 w-5" />,
        benefits: ['Benefits education', 'Preventive care info', 'Coverage details']
      },
      {
        day: 3,
        title: 'Family Protector',
        description: 'Add your dependents',
        pointsReward: 20,
        unlocked: session.currentDay >= 3,
        icon: <Users className="h-5 w-5" />,
        benefits: ['Dependent registration', 'Family coverage setup', 'Emergency planning']
      },
      {
        day: 4,
        title: 'Safety First',
        description: 'Set emergency preferences',
        pointsReward: 25,
        unlocked: session.currentDay >= 4,
        icon: <Shield className="h-5 w-5" />,
        benefits: ['Emergency contacts', 'Medical preferences', 'Quick access setup']
      },
      {
        day: 5,
        title: 'Wellness Warrior',
        description: 'Join wellness programs',
        pointsReward: 30,
        unlocked: session.currentDay >= 5,
        icon: <Activity className="h-5 w-5" />,
        benefits: ['Wellness challenges', 'Health tracking', 'Goal setting']
      },
      {
        day: 6,
        title: 'Benefits Expert',
        description: 'Master your coverage',
        pointsReward: 35,
        unlocked: session.currentDay >= 6,
        icon: <Award className="h-5 w-5" />,
        benefits: ['Claims process', 'Coverage optimization', 'Cost savings tips']
      },
      {
        day: 7,
        title: 'Journey Complete',
        description: 'Onboarding champion',
        pointsReward: 50,
        unlocked: session.status === 'completed',
        icon: <Trophy className="h-5 w-5" />,
        benefits: ['Full portal access', 'Personalized recommendations', 'Premium features']
      }
    ];

    setMilestones(milestonesList);
  };

  const getFilteredAchievements = () => {
    if (selectedAchievementCategory === 'all') return achievements;
    return achievements.filter(a => a.category === selectedAchievementCategory);
  };

  const getOverallProgress = () => {
    if (!session) return 0;
    return Math.round((session.currentDay / 7) * 100);
  };

  const getTaskCompletionRate = () => {
    if (!tasks.length) return 0;
    const completed = tasks.filter(t => t.completionStatus).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getPointsToNextMilestone = () => {
    const currentPoints = session?.totalPointsEarned || 0;
    if (currentPoints >= 200) return 0;
    if (currentPoints >= 100) return 200 - currentPoints;
    return 100 - currentPoints;
  };

  const getLevel = () => {
    const points = session?.totalPointsEarned || 0;
    if (points >= 200) return { level: 5, title: 'Expert', color: 'bg-purple-100 text-purple-800' };
    if (points >= 150) return { level: 4, title: 'Advanced', color: 'bg-indigo-100 text-indigo-800' };
    if (points >= 100) return { level: 3, title: 'Intermediate', color: 'bg-blue-100 text-blue-800' };
    if (points >= 50) return { level: 2, title: 'Beginner', color: 'bg-green-100 text-green-800' };
    return { level: 1, title: 'Newcomer', color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <Card className={compact ? 'w-full' : 'w-full max-w-4xl mx-auto'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Alert>
        <AlertDescription>
          No onboarding progress data available.
        </AlertDescription>
      </Alert>
    );
  }

  const level = getLevel();
  const overallProgress = getOverallProgress();
  const taskCompletionRate = getTaskCompletionRate();
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const totalAchievementPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${level.color}`}>
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{level.title} Level {level.level}</h3>
                  <p className="text-sm text-gray-600">{session.totalPointsEarned} points earned</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
                <p className="text-sm text-gray-600">Overall Progress</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Onboarding Journey</span>
                  <span>Day {session.currentDay}/7</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Task Completion</span>
                  <span>{taskCompletionRate}%</span>
                </div>
                <Progress value={taskCompletionRate} className="h-2" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-orange-600">{session.streakDays}</div>
                <p className="text-xs text-gray-600">Day Streak</p>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{unlockedAchievements}</div>
                <p className="text-xs text-gray-600">Achievements</p>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">{totalAchievementPoints}</div>
                <p className="text-xs text-gray-600">Bonus Points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-6 w-6" />
                <span>Your Progress Journey</span>
              </CardTitle>
              <CardDescription>
                Track your onboarding progress, achievements, and milestones
              </CardDescription>
            </div>
            <Badge className={`${level.color} px-3 py-1`}>
              {level.title} Level {level.level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full inline-flex mb-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{overallProgress}%</div>
              <p className="text-sm text-gray-600">Overall Progress</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full inline-flex mb-2">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{session.totalPointsEarned}</div>
              <p className="text-sm text-gray-600">Total Points</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 p-3 rounded-full inline-flex mb-2">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{session.streakDays}</div>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full inline-flex mb-2">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{unlockedAchievements}</div>
              <p className="text-sm text-gray-600">Achievements</p>
            </div>
          </div>

          {getPointsToNextMilestone() > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    {getPointsToNextMilestone()} points to next milestone!
                  </span>
                </div>
                <Progress
                  value={((session.totalPointsEarned % 100) / 100) * 100}
                  className="w-24 h-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      {showDetailedStats && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Onboarding Progress</span>
                    <span className="text-sm">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Task Completion Rate</span>
                    <span className="text-sm">{taskCompletionRate}%</span>
                  </div>
                  <Progress value={taskCompletionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">
                      {tasks.filter(t => t.completionStatus).length}
                    </div>
                    <p className="text-xs text-gray-600">Tasks Completed</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">
                      {tasks.length - tasks.filter(t => t.completionStatus).length}
                    </div>
                    <p className="text-xs text-gray-600">Tasks Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Activity Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'profile_completion', label: 'Profile Tasks', color: 'bg-blue-500' },
                  { type: 'document_upload', label: 'Documents', color: 'bg-purple-500' },
                  { type: 'benefits_education', label: 'Education', color: 'bg-green-500' },
                  { type: 'wellness_setup', label: 'Wellness', color: 'bg-orange-500' }
                ].map((item) => {
                  const count = tasks.filter(t => t.taskType === item.type).length;
                  const completed = tasks.filter(t => t.taskType === item.type && t.completionStatus).length;
                  const percentage = count > 0 ? (completed / count) * 100 : 0;

                  return (
                    <div key={item.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span>{completed}/{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Achievements & Rewards</span>
          </CardTitle>
          <CardDescription>
            Unlock achievements to earn bonus points and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-sm font-medium">Filter by:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'speed', label: 'Speed' },
                { value: 'consistency', label: 'Consistency' },
                { value: 'completion', label: 'Completion' },
                { value: 'engagement', label: 'Engagement' },
                { value: 'milestone', label: 'Milestone' }
              ].map((category) => (
                <Button
                  key={category.value}
                  variant={selectedAchievementCategory === category.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAchievementCategory(category.value)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Achievement Grid */}
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {getFilteredAchievements().map((achievement) => (
              <div
                key={achievement.id}
                className={`border rounded-lg p-4 text-center transition-all duration-200 ${
                  achievement.unlocked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-75'
                }`}
              >
                <div className={`inline-flex p-3 rounded-full mb-3 ${
                  achievement.unlocked
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {achievement.icon}
                </div>
                <h3 className={`font-semibold mb-1 ${
                  achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {achievement.title}
                </h3>
                <p className={`text-sm mb-2 ${
                  achievement.unlocked ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {achievement.description}
                </p>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Badge className={`text-xs ${
                    achievement.unlocked
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    +{achievement.points} pts
                  </Badge>
                  {achievement.unlocked && (
                    <Badge className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Unlocked
                    </Badge>
                  )}
                </div>
                {!achievement.unlocked && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{Math.round(achievement.progress)}%</span>
                    </div>
                    <Progress value={achievement.progress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Achievement Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-purple-900">Achievement Summary</h4>
                <p className="text-sm text-purple-700 mt-1">
                  You've unlocked {unlockedAchievements} of {achievements.length} achievements
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-900">{totalAchievementPoints}</div>
                <p className="text-sm text-purple-700">Bonus Points Earned</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Journey Milestones</span>
          </CardTitle>
          <CardDescription>
            Key checkpoints in your onboarding journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.day}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  milestone.unlocked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    milestone.unlocked
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {milestone.unlocked ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Lock className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${
                        milestone.unlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        Day {milestone.day}: {milestone.title}
                      </h3>
                      <Badge className={
                        milestone.unlocked
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }>
                        +{milestone.pointsReward} pts
                      </Badge>
                    </div>
                    <p className={`text-sm mb-3 ${
                      milestone.unlocked ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {milestone.description}
                    </p>
                    {milestone.unlocked && (
                      <div>
                        <h4 className="text-sm font-medium text-green-900 mb-2">Benefits Unlocked:</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {milestone.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <Unlock className="h-3 w-3" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Motivational Footer */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">You're Doing Great! 🎉</h3>
            <p className="text-blue-700 mb-4">
              Your dedication to completing your onboarding journey is impressive.
              Keep up the great work to unlock all achievements and maximize your health benefits!
            </p>
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{session.currentDay}</div>
                <p className="text-sm text-blue-700">Current Day</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{7 - session.currentDay}</div>
                <p className="text-sm text-blue-700">Days to Go</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{session.totalPointsEarned + totalAchievementPoints}</div>
                <p className="text-sm text-blue-700">Total Points</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};