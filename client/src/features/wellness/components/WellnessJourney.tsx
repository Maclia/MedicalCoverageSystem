import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Heart,
  Activity,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Flame,
  Footprints,
  Brain,
  Moon,
  Users,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Star,
  Trophy,
  Mountain,
  Flag,
  Map,
  Shield
} from 'lucide-react';

interface WellnessGoal {
  id: string;
  title: string;
  description: string;
  category: 'physical' | 'mental' | 'nutrition' | 'sleep' | 'social' | 'preventive';
  targetValue: number;
  currentValue: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'completed' | 'paused' | 'not_started';
  startDate: Date;
  targetDate: Date;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  milestones: Milestone[];
  completedMilestones: string[];
  adaptivePlan?: AdaptivePlan;
}

interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  points: number;
  achievedDate?: Date;
}

interface AdaptivePlan {
  id: string;
  adjustments: Adjustment[];
  lastUpdated: Date;
  performanceTrend: 'improving' | 'stable' | 'declining';
}

interface Adjustment {
  id: string;
  type: 'intensity' | 'frequency' | 'duration' | 'rest_period';
  originalValue: number;
  newValue: number;
  reason: string;
  effectiveDate: Date;
}

interface WellnessChallenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'team' | 'company_wide';
  category: string;
  startDate: Date;
  endDate: Date;
  participants: number;
  maxParticipants?: number;
  points: number;
  isActive: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: Reward[];
}

interface Reward {
  type: 'points' | 'badge' | 'premium_discount' | 'wellness_credit';
  value: number | string;
  description: string;
}

interface WellnessJourneyProps {
  memberId: string;
  memberName?: string;
}

export const WellnessJourney: React.FC<WellnessJourneyProps> = ({ memberId, memberName }) => {
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [challenges, setChallenges] = useState<WellnessChallenge[]>([]);
  const [activeTab, setActiveTab] = useState('goals');
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  // Mock data - in a real app, this would come from APIs
  useEffect(() => {
    const mockGoals: WellnessGoal[] = [
      {
        id: '1',
        title: 'Daily Steps Challenge',
        description: 'Walk 10,000 steps every day to improve cardiovascular health',
        category: 'physical',
        targetValue: 10000,
        currentValue: 7500,
        unit: 'steps',
        frequency: 'daily',
        status: 'active',
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        difficulty: 'medium',
        points: 250,
        milestones: [
          { id: '1-1', title: 'First Week', targetValue: 7000, points: 50, achievedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: '1-2', title: 'Two Weeks', targetValue: 8500, points: 100 },
          { id: '1-3', title: 'Goal Achievement', targetValue: 10000, points: 100 }
        ],
        completedMilestones: ['1-1'],
        adaptivePlan: {
          id: 'plan-1',
          adjustments: [
            {
              id: 'adj-1',
              type: 'intensity',
              originalValue: 8000,
              newValue: 7500,
              reason: 'Based on your progress, we adjusted to a more achievable target',
              effectiveDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
          ],
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          performanceTrend: 'improving'
        }
      },
      {
        id: '2',
        title: 'Mindfulness Practice',
        description: 'Practice meditation for 10 minutes daily to reduce stress',
        category: 'mental',
        targetValue: 10,
        currentValue: 8,
        unit: 'minutes',
        frequency: 'daily',
        status: 'active',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        difficulty: 'easy',
        points: 150,
        milestones: [
          { id: '2-1', title: 'First Week', targetValue: 5, points: 30, achievedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { id: '2-2', title: 'Consistent Practice', targetValue: 8, points: 50 },
          { id: '2-3', title: 'Mind Master', targetValue: 10, points: 70 }
        ],
        completedMilestones: ['2-1']
      },
      {
        id: '3',
        title: 'Sleep Quality Improvement',
        description: 'Get 7-8 hours of quality sleep each night',
        category: 'sleep',
        targetValue: 7,
        currentValue: 6.5,
        unit: 'hours',
        frequency: 'daily',
        status: 'active',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        difficulty: 'medium',
        points: 200,
        milestones: [
          { id: '3-1', title: 'Better Sleep Habits', targetValue: 6, points: 40, achievedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { id: '3-2', title: 'Consistent Schedule', targetValue: 7, points: 80 },
          { id: '3-3', title: 'Sleep Champion', targetValue: 8, points: 80 }
        ],
        completedMilestones: ['3-1']
      },
      {
        id: '4',
        title: 'Preventive Care Completion',
        description: 'Complete annual health screenings and checkups',
        category: 'preventive',
        targetValue: 100,
        currentValue: 75,
        unit: 'percent',
        frequency: 'yearly',
        status: 'active',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        difficulty: 'easy',
        points: 300,
        milestones: [
          { id: '4-1', title: 'Initial Assessment', targetValue: 25, points: 50, achievedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
          { id: '4-2', title: 'Half Complete', targetValue: 50, points: 100, achievedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
          { id: '4-3', title: 'Fully Protected', targetValue: 100, points: 150 }
        ],
        completedMilestones: ['4-1', '4-2']
      }
    ];

    const mockChallenges: WellnessChallenge[] = [
      {
        id: '1',
        title: 'Company Step Challenge',
        description: 'Join colleagues in a company-wide step competition',
        type: 'company_wide',
        category: 'physical',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        participants: 247,
        maxParticipants: 500,
        points: 500,
        isActive: true,
        difficulty: 'medium',
        rewards: [
          { type: 'points', value: 500, description: 'Winning team points' },
          { type: 'badge', value: 'Step Champion', description: 'Exclusive badge' },
          { type: 'wellness_credit', value: 100, description: '$100 wellness credit' }
        ]
      },
      {
        id: '2',
        title: 'Mindful Mondays',
        description: 'Practice mindfulness every Monday for a month',
        type: 'individual',
        category: 'mental',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        participants: 89,
        points: 200,
        isActive: true,
        difficulty: 'easy',
        rewards: [
          { type: 'points', value: 200, description: 'Completion points' },
          { type: 'badge', value: 'Mindful Master', description: 'Achievement badge' }
        ]
      }
    ];

    setGoals(mockGoals);
    setChallenges(mockChallenges);
    setTotalPoints(1450);
    setCurrentStreak(12);
    setLevel(3);
  }, [memberId]);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const iconMap = {
      physical: Activity,
      mental: Brain,
      nutrition: Heart,
      sleep: Moon,
      social: Users,
      preventive: Shield
    };
    return iconMap[category as keyof typeof iconMap] || Target;
  };

  // Get color for category
  const getCategoryColor = (category: string) => {
    const colorMap = {
      physical: 'text-blue-600 bg-blue-50',
      mental: 'text-purple-600 bg-purple-50',
      nutrition: 'text-green-600 bg-green-50',
      sleep: 'text-indigo-600 bg-indigo-50',
      social: 'text-orange-600 bg-orange-50',
      preventive: 'text-red-600 bg-red-50'
    };
    return colorMap[category as keyof typeof colorMap] || 'text-gray-600 bg-gray-50';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colorMap = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      not_started: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  // Calculate progress percentage
  const getProgressPercentage = (goal: WellnessGoal) => {
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  // Handle goal action
  const handleGoalAction = (goalId: string, action: 'pause' | 'resume' | 'complete') => {
    setGoals(prev => prev.map(goal =>
      goal.id === goalId
        ? { ...goal, status: action === 'complete' ? 'completed' : action === 'pause' ? 'paused' : 'active' }
        : goal
    ));
  };

  // Handle joining challenge
  const handleJoinChallenge = (challengeId: string) => {
    setChallenges(prev => prev.map(challenge =>
      challenge.id === challengeId
        ? { ...challenge, participants: challenge.participants + 1 }
        : challenge
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Heart className="h-8 w-8 text-red-600" />
            <span>Wellness Journey</span>
          </h1>
          <p className="text-gray-600">
            Your personalized path to better health and wellness
          </p>
        </div>
        <Button onClick={() => setShowGoalDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Level</p>
                  <p className="text-2xl font-bold text-gray-900">{level}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{currentStreak} days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{goals.filter(g => g.status === 'active').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="goals">My Goals</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          <TabsTrigger value="insights">Adaptive Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="space-y-4">
            {goals.map((goal) => {
              const Icon = getCategoryIcon(goal.category);
              const progress = getProgressPercentage(goal);
              return (
                <Card key={goal.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(goal.category)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          <CardDescription>{goal.description}</CardDescription>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getStatusColor(goal.status)}>
                              {goal.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {goal.difficulty}
                            </Badge>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Target className="h-4 w-4" />
                              <span>{goal.points} points</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {goal.status === 'active' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGoalAction(goal.id, 'pause')}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleGoalAction(goal.id, 'complete')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </>
                        ) : goal.status === 'paused' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleGoalAction(goal.id, 'resume')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress: {goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Dates */}
                      <div className="flex justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Started: {goal.startDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Flag className="h-4 w-4" />
                          <span>Target: {goal.targetDate.toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Milestones */}
                      {goal.milestones.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Milestones</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {goal.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className={`flex items-center space-x-2 p-2 rounded-lg border ${
                                  goal.completedMilestones.includes(milestone.id)
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {goal.completedMilestones.includes(milestone.id) ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{milestone.title}</p>
                                  <p className="text-xs text-gray-500">{milestone.points} points</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Adaptive Plan */}
                      {goal.adaptivePlan && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Adaptive Adjustments</p>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">Performance: {goal.adaptivePlan.performanceTrend}</span>
                            </div>
                            {goal.adaptivePlan.adjustments.slice(0, 1).map((adjustment) => (
                              <p key={adjustment.id} className="text-xs text-blue-700 mt-1">
                                {adjustment.reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="challenges">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className="capitalize">{challenge.type.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="capitalize">{challenge.difficulty}</Badge>
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
                    {/* Participants */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {challenge.participants}
                          {challenge.maxParticipants && ` / ${challenge.maxParticipants}`} participants
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          {challenge.startDate.toLocaleDateString()} - {challenge.endDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Rewards */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Rewards</p>
                      <div className="space-y-1">
                        {challenge.rewards.map((reward, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <Award className="h-4 w-4 text-yellow-500" />
                            <span>{reward.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      className="w-full"
                      variant={challenge.isActive ? "default" : "outline"}
                      disabled={!challenge.isActive}
                      onClick={() => handleJoinChallenge(challenge.id)}
                    >
                      {challenge.isActive ? 'Join Challenge' : 'Challenge Ended'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mountain className="h-5 w-5" />
                  <span>Wellness Journey Progress</span>
                </CardTitle>
                <CardDescription>Your overall wellness journey achievements and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Level Progress */}
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>Level {level} Progress</span>
                      <span>450 / 1000 XP</span>
                    </div>
                    <Progress value={45} className="h-3" />
                  </div>

                  {/* Category Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['physical', 'mental', 'nutrition', 'sleep', 'social', 'preventive'].map((category) => {
                      const Icon = getCategoryIcon(category);
                      const categoryGoals = goals.filter(g => g.category === category);
                      const completedGoals = categoryGoals.filter(g => g.status === 'completed').length;
                      const percentage = categoryGoals.length > 0 ? (completedGoals / categoryGoals.length) * 100 : 0;

                      return (
                        <div key={category} className="text-center">
                          <div className={`inline-flex p-3 rounded-full ${getCategoryColor(category)}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-medium capitalize mt-2">{category}</p>
                          <p className="text-xs text-gray-500">{completedGoals}/{categoryGoals.length} goals</p>
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
                <CardDescription>Personalized recommendations based on your progress and patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-900">Performance Trend: Improving</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Your physical activity goals are showing strong progress. Consider increasing your daily step target by 10% to maximize benefits.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-green-900">Consistency Achievement</h3>
                        <p className="text-sm text-green-700 mt-1">
                          You've maintained a 12-day streak! This consistency is building strong healthy habits that will have long-term benefits.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-900">Focus Opportunity</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your sleep goals could use additional attention. Try establishing a consistent bedtime routine to improve sleep quality.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Wellness Goal</DialogTitle>
            <DialogDescription>
              Set a new goal to continue your wellness journey
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input id="title" placeholder="Enter goal title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical Activity</SelectItem>
                  <SelectItem value="mental">Mental Health</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="sleep">Sleep</SelectItem>
                  <SelectItem value="social">Social Wellness</SelectItem>
                  <SelectItem value="preventive">Preventive Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target">Target Value</Label>
              <Input id="target" type="number" placeholder="Enter target" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowGoalDialog(false)}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};