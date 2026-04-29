import React, { useEffect, useMemo, useState } from 'react';
import { wellnessApi } from '@api/wellnessApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import {
  Heart,
  Activity,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Flame,
  Brain,
  Moon,
  Users,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Star,
  Trophy,
  Mountain,
  Flag,
  Shield
} from 'lucide-react';

type GoalCategory = 'physical' | 'mental' | 'nutrition' | 'sleep' | 'social' | 'preventive';
type GoalFrequency = 'daily' | 'weekly' | 'monthly';
type GoalStatus = 'active' | 'completed' | 'paused' | 'not_started';
type GoalDifficulty = 'easy' | 'medium' | 'hard';

interface HealthMetrics {
  steps?: number;
  calories?: number;
  exercise?: number;
  sleep?: number;
  heartRate?: number;
  weight?: number;
}

interface WellnessStats {
  totalPointsEarned?: number;
  currentStreak?: number;
  activeIncentives?: number;
  completedIncentives?: number;
  connectedDevices?: number;
  pointsToNextReward?: number;
  healthMetrics?: HealthMetrics;
}

interface WellnessIncentive {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  points: number;
  endDate: string | Date;
  category?: string;
}

interface WellnessGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  frequency: GoalFrequency;
  status: GoalStatus;
  targetDate: Date;
  difficulty: GoalDifficulty;
  points: number;
  source: 'health_metrics';
}

interface WellnessChallenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'team' | 'company_wide';
  category: string;
  endDate: Date;
  participants?: number;
  points: number;
  isActive: boolean;
  difficulty: GoalDifficulty;
  progress: number;
}

interface WellnessInsight {
  tone: 'blue' | 'green' | 'yellow';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface WellnessJourneyProps {
  memberId: string;
  memberName?: string;
}

const GOAL_TARGETS = {
  steps: 10000,
  exercise: 60,
  sleep: 8,
  calories: 2500,
} as const;

export const WellnessJourney: React.FC<WellnessJourneyProps> = ({ memberId, memberName }) => {
  const [activeTab, setActiveTab] = useState('goals');
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);
  const [incentives, setIncentives] = useState<WellnessIncentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJourneyData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const [metrics, stats, challengeData] = await Promise.all([
        wellnessApi.getHealthMetrics('30d'),
        wellnessApi.getWellnessStats('30d'),
        wellnessApi.getIncentives({ limit: 8, status: 'active' }),
      ]);

      setHealthMetrics(metrics as HealthMetrics);
      setWellnessStats(stats as WellnessStats);
      setIncentives((challengeData as WellnessIncentive[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wellness journey data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchJourneyData();
  }, [memberId]);

  const goals = useMemo<WellnessGoal[]>(() => {
    const metrics = wellnessStats?.healthMetrics ?? healthMetrics;
    if (!metrics) {
      return [];
    }

    const now = new Date();
    const monthFromNow = new Date(now);
    monthFromNow.setDate(monthFromNow.getDate() + 30);

    const derivedGoals: WellnessGoal[] = [
      {
        id: 'steps',
        title: 'Daily Steps',
        description: 'Derived from your latest synced activity metrics.',
        category: 'physical',
        targetValue: GOAL_TARGETS.steps,
        currentValue: metrics.steps ?? 0,
        unit: 'steps',
        frequency: 'daily',
        status: (metrics.steps ?? 0) >= GOAL_TARGETS.steps ? 'completed' : 'active',
        targetDate: monthFromNow,
        difficulty: 'medium',
        points: 250,
        source: 'health_metrics',
      },
      {
        id: 'exercise',
        title: 'Active Minutes',
        description: 'Based on exercise minutes recorded in the backend.',
        category: 'physical',
        targetValue: GOAL_TARGETS.exercise,
        currentValue: metrics.exercise ?? 0,
        unit: 'minutes',
        frequency: 'daily',
        status: (metrics.exercise ?? 0) >= GOAL_TARGETS.exercise ? 'completed' : 'active',
        targetDate: monthFromNow,
        difficulty: 'medium',
        points: 200,
        source: 'health_metrics',
      },
      {
        id: 'sleep',
        title: 'Sleep Target',
        description: 'Built from your latest synced sleep data.',
        category: 'sleep',
        targetValue: GOAL_TARGETS.sleep,
        currentValue: metrics.sleep ?? 0,
        unit: 'hours',
        frequency: 'daily',
        status: (metrics.sleep ?? 0) >= GOAL_TARGETS.sleep ? 'completed' : 'active',
        targetDate: monthFromNow,
        difficulty: 'easy',
        points: 150,
        source: 'health_metrics',
      },
      {
        id: 'calories',
        title: 'Calorie Burn',
        description: 'Derived from recent tracked calorie data.',
        category: 'nutrition',
        targetValue: GOAL_TARGETS.calories,
        currentValue: metrics.calories ?? 0,
        unit: 'calories',
        frequency: 'daily',
        status: (metrics.calories ?? 0) >= GOAL_TARGETS.calories ? 'completed' : 'active',
        targetDate: monthFromNow,
        difficulty: 'hard',
        points: 225,
        source: 'health_metrics',
      },
    ];

    return derivedGoals.filter(goal => goal.currentValue > 0 || goal.targetValue > 0);
  }, [healthMetrics, wellnessStats]);

  const challenges = useMemo<WellnessChallenge[]>(
    () =>
      incentives.map((incentive) => ({
        id: incentive.id,
        title: incentive.title,
        description: incentive.description,
        type: 'individual',
        category: incentive.category ?? 'wellness',
        endDate: new Date(incentive.endDate),
        participants: undefined,
        points: incentive.points,
        isActive: incentive.status === 'active',
        difficulty:
          incentive.progress >= 75 ? 'easy' : incentive.progress >= 40 ? 'medium' : 'hard',
        progress: incentive.progress ?? 0,
      })),
    [incentives]
  );

  const totalPoints = wellnessStats?.totalPointsEarned ?? 0;
  const currentStreak = wellnessStats?.currentStreak ?? 0;
  const level = Math.max(1, Math.floor(totalPoints / 1000) + 1);

  const insights = useMemo<WellnessInsight[]>(() => {
    const metrics = wellnessStats?.healthMetrics ?? healthMetrics;
    if (!metrics) {
      return [];
    }

    const derivedInsights: WellnessInsight[] = [];

    if ((metrics.steps ?? 0) >= GOAL_TARGETS.steps) {
      derivedInsights.push({
        tone: 'blue',
        icon: TrendingUp,
        title: 'Step Target On Track',
        description: 'Your synced activity data shows you are meeting or exceeding your current step target.',
      });
    }

    if ((metrics.sleep ?? 0) < GOAL_TARGETS.sleep) {
      derivedInsights.push({
        tone: 'yellow',
        icon: AlertCircle,
        title: 'Sleep Opportunity',
        description: 'Recent synced sleep data is below your daily target, so this is a strong area to focus on next.',
      });
    }

    if (currentStreak > 0) {
      derivedInsights.push({
        tone: 'green',
        icon: CheckCircle,
        title: 'Consistency Streak',
        description: `Your backend wellness record shows a ${currentStreak}-day streak of activity.`,
      });
    }

    if ((metrics.exercise ?? 0) === 0 && (metrics.steps ?? 0) === 0) {
      derivedInsights.push({
        tone: 'yellow',
        icon: AlertCircle,
        title: 'Sync More Activity',
        description: 'There is limited recent exercise data, so connecting or syncing a device will improve your journey view.',
      });
    }

    return derivedInsights.slice(0, 3);
  }, [currentStreak, healthMetrics, wellnessStats]);

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      physical: Activity,
      mental: Brain,
      nutrition: Heart,
      sleep: Moon,
      social: Users,
      preventive: Shield,
      wellness: Heart,
    };

    return iconMap[category as keyof typeof iconMap] || Target;
  };

  const getCategoryColor = (category: string) => {
    const colorMap = {
      physical: 'text-blue-600 bg-blue-50',
      mental: 'text-purple-600 bg-purple-50',
      nutrition: 'text-green-600 bg-green-50',
      sleep: 'text-indigo-600 bg-indigo-50',
      social: 'text-orange-600 bg-orange-50',
      preventive: 'text-red-600 bg-red-50',
      wellness: 'text-emerald-600 bg-emerald-50',
    };

    return colorMap[category as keyof typeof colorMap] || 'text-gray-600 bg-gray-50';
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      not_started: 'bg-gray-100 text-gray-800',
    };

    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const getProgressPercentage = (goal: WellnessGoal) =>
    Math.min((goal.currentValue / goal.targetValue) * 100, 100);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-600" />
              <span>Wellness Journey</span>
            </h1>
            <p className="text-gray-600">Loading your latest backend wellness data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Unable to load wellness journey</p>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <Button onClick={() => void fetchJourneyData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Heart className="h-8 w-8 text-red-600" />
            <span>Wellness Journey</span>
          </h1>
          <p className="text-gray-600">
            {memberName ? `${memberName}'s ` : 'Your '}journey view is powered by live wellness metrics and incentives.
          </p>
        </div>
        <Button onClick={() => void fetchJourneyData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold text-gray-900">{level}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900">{currentStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {goals.filter((goal) => goal.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="goals">My Goals</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          <TabsTrigger value="insights">Adaptive Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="space-y-4">
            {goals.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">
                    No synced wellness metrics are available yet. Connect a device or add wellness activity to build this journey.
                  </p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => {
                const Icon = getCategoryIcon(goal.category);
                const progress = getProgressPercentage(goal);

                return (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(goal.category)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <CardDescription>{goal.description}</CardDescription>
                            <div className="flex items-center space-x-2 mt-2 flex-wrap">
                              <Badge className={getStatusColor(goal.status)}>
                                {goal.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {goal.difficulty}
                              </Badge>
                              <Badge variant="outline">Live metric</Badge>
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Target className="h-4 w-4" />
                                <span>{goal.points} points</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>
                              Progress: {goal.currentValue} / {goal.targetValue} {goal.unit}
                            </span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Derived from latest 30-day metrics</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Flag className="h-4 w-4" />
                            <span>Target: {goal.targetDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="challenges">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">
                    No active backend wellness incentives are available right now.
                  </p>
                </CardContent>
              </Card>
            ) : (
              challenges.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <CardDescription>{challenge.description}</CardDescription>
                        <div className="flex items-center space-x-2 mt-2 flex-wrap">
                          <Badge className="capitalize">{challenge.type.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {challenge.difficulty}
                          </Badge>
                          {challenge.isActive && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{challenge.points}</p>
                        <p className="text-sm text-gray-500">points</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{challenge.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>Ends {challenge.endDate.toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Backend progress</span>
                          <span>{Math.round(challenge.progress)}%</span>
                        </div>
                        <Progress value={challenge.progress} className="h-2" />
                      </div>

                      <Button className="w-full" variant="outline" disabled>
                        Challenge participation is tracked by the backend
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mountain className="h-5 w-5" />
                  <span>Wellness Journey Progress</span>
                </CardTitle>
                <CardDescription>
                  Progress is calculated from synced wellness metrics and backend points.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>Level {level} Progress</span>
                      <span>{totalPoints % 1000} / 1000 XP</span>
                    </div>
                    <Progress value={(totalPoints % 1000) / 10} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['physical', 'mental', 'nutrition', 'sleep', 'social', 'preventive'].map((category) => {
                      const Icon = getCategoryIcon(category);
                      const categoryGoals = goals.filter((goal) => goal.category === category);
                      const completedGoals = categoryGoals.filter((goal) => goal.status === 'completed').length;
                      const percentage =
                        categoryGoals.length > 0 ? (completedGoals / categoryGoals.length) * 100 : 0;

                      return (
                        <div key={category} className="text-center">
                          <div className={`inline-flex p-3 rounded-full ${getCategoryColor(category)}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium capitalize mt-2">{category}</p>
                          <p className="text-xs text-gray-500">
                            {completedGoals}/{categoryGoals.length} goals
                          </p>
                          <Progress value={percentage} className="h-1 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Adaptive Wellness Insights</span>
                </CardTitle>
                <CardDescription>
                  These observations are generated from your current backend wellness metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      More synced wellness activity is needed before personalized insights can be shown here.
                    </p>
                  ) : (
                    insights.map((insight) => {
                      const Icon = insight.icon;
                      const toneClasses = {
                        blue: 'bg-blue-50 text-blue-900',
                        green: 'bg-green-50 text-green-900',
                        yellow: 'bg-yellow-50 text-yellow-900',
                      };
                      const textToneClasses = {
                        blue: 'text-blue-700',
                        green: 'text-green-700',
                        yellow: 'text-yellow-700',
                      };

                      return (
                        <div key={insight.title} className={`p-4 rounded-lg ${toneClasses[insight.tone as keyof typeof toneClasses]}`}>
                          <div className="flex items-start space-x-3">
                            <Icon className="h-5 w-5 mt-0.5" />
                            <div>
                              <h3 className="font-medium">{insight.title}</h3>
                              <p className={`text-sm mt-1 ${textToneClasses[insight.tone as keyof typeof textToneClasses]}`}>
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Backend Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border p-4">
                    <p className="text-gray-500">Active incentives</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {wellnessStats?.activeIncentives ?? challenges.filter((challenge) => challenge.isActive).length}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-gray-500">Completed incentives</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {wellnessStats?.completedIncentives ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-gray-500">Connected devices</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {wellnessStats?.connectedDevices ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

