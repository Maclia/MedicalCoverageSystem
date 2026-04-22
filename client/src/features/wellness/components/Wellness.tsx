import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from "wouter";
import { wellnessApi } from '@/services/api/wellnessApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Progress } from '@/features/ui/progress';
import { Separator } from '@/features/ui/separator';
import { Avatar } from '@/features/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/features/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/features/ui/alert';
import { Skeleton } from '@/features/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Heart,
  Activity,
  Moon,
  Flame,
  Footprints,
  Trophy,
  Gift,
  Users,
  Calendar,
  Clock,
  Download,
  Settings,
  Plus,
  RefreshCw,
  Smartphone,
  Watch,
  Bluetooth,
  CheckCircle,
  XCircle,
  ChevronRight,
  Star,
  Target,
  TrendingUp,
  Zap,
  Award,
  CalendarCheck,
  Link,
  Unlink
} from 'lucide-react';

// Import shared types
import type {
  HealthMetrics,
  HealthData,
  WellnessIntegration,
  WellnessIncentive,
  WellnessReward,
  WellnessCoach,
  CoachingSession,
  WellnessStats,
  HealthGoal,
  AvailableSlot
} from '../../../../../shared/types/wellness';

const WellnessPage: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [integrations, setIntegrations] = useState<WellnessIntegration[]>([]);
  const [incentives, setIncentives] = useState<WellnessIncentive[]>([]);
  const [rewards, setRewards] = useState<WellnessReward[]>([]);
  const [coaches, setCoaches] = useState<WellnessCoach[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [wellnessStats, setWellnessStats] = useState<WellnessStats | null>(null);
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<WellnessCoach | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const REFRESH_INTERVAL = 300000; // 5 minutes


  const fetchWellnessData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchHealthMetrics(),
        fetchHealthData(),
        fetchIntegrations(),
        fetchIncentives(),
        fetchRewards(),
        fetchCoaches(),
        fetchCoachingSessions(),
        fetchWellnessStats(),
        fetchHealthGoals()
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wellness data';
      setError(errorMessage);
      console.error('Error fetching wellness data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWellnessData();
    
    if (autoRefresh && id) {
      const intervalId = setInterval(fetchWellnessData, REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [id, fetchWellnessData, autoRefresh]);

  const fetchHealthMetrics = async () => {
    const metrics = await wellnessApi.getHealthMetrics('30d');
    setHealthMetrics(metrics);
  };

  const fetchHealthData = async () => {
    const result = await wellnessApi.getHealthData({ limit: 20 });
    setHealthData(result.data);
  };

  const fetchIntegrations = async () => {
    const data = await wellnessApi.getIntegrations();
    setIntegrations(data);
  };

  const fetchIncentives = async () => {
    const data = await wellnessApi.getIncentives({ limit: 10 });
    setIncentives(data);
  };

  const fetchRewards = async () => {
    const data = await wellnessApi.getRewards({ available: true, limit: 8 });
    setRewards(data);
  };

  const fetchCoaches = async () => {
    const result = await wellnessApi.getCoaches({ limit: 6 });
    setCoaches(result.coaches);
  };

  const fetchCoachingSessions = async () => {
    const result = await wellnessApi.getCoachingSessions({ limit: 5 });
    setSessions(result.sessions);
  };

  const fetchWellnessStats = async () => {
    const stats = await wellnessApi.getWellnessStats('30d');
    setWellnessStats(stats);
  };

  const fetchHealthGoals = async () => {
    // Goals functionality will be implemented via wellness stats for now
    // getHealthGoals endpoint not available, using empty array
    setGoals([]);
  };

  const handleSyncData = async (integrationId: string) => {
    setSyncing(true);
    try {
      await wellnessApi.syncDeviceData(integrationId, ['steps', 'heart_rate', 'sleep', 'calories']);
      
      // Optimistic UI update
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, lastSync: new Date(), syncStatus: 'syncing' } 
          : i
      ));

      // Refresh data in background
      Promise.all([
        fetchHealthData(),
        fetchHealthMetrics(),
        fetchWellnessStats()
      ]).then(() => {
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId 
            ? { ...i, syncStatus: 'connected' } 
            : i
        ));
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, syncStatus: 'error' } 
          : i
      ));
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectDevice = async (provider: string) => {
    await wellnessApi.connectDevice(provider, ['activity', 'heartrate', 'sleep'], {});
    await fetchIntegrations();
  };

  const handleClaimReward = async (rewardId: string) => {
    try {
      setSaving(true);
      await wellnessApi.claimReward(rewardId);
      await fetchRewards();
      await fetchWellnessStats();
    } finally {
      setSaving(false);
    }
  };

  const handleBookSession = async (coachId: string, slotId: string) => {
    try {
      setSaving(true);
      await wellnessApi.bookCoachingSession({
        coachId,
        slotId,
        type: 'video'
      });
      await fetchCoachingSessions();
      setShowBookingDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadAvailableSlots = async (coach: WellnessCoach) => {
    setSelectedCoach(coach);
    const slots = await wellnessApi.getAvailableSlots(coach.id);
    setAvailableSlots(slots);
    setShowBookingDialog(true);
  };

  const handleUpdateGoal = async (goalId: string, value: number) => {
    // Use existing updateHealthGoals method for batch updates
    await wellnessApi.updateHealthGoals({ [goalId]: { currentValue: value } });
    await fetchHealthGoals();
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'steps': return <Footprints className="h-5 w-5" />;
      case 'calories': return <Flame className="h-5 w-5" />;
      case 'exercise': return <Activity className="h-5 w-5" />;
      case 'sleep': return <Moon className="h-5 w-5" />;
      case 'heartRate': return <Heart className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  // Transform REAL health data ONLY from backend API
  const chartData = useMemo(() => {
    const groupedByDay: Record<string, any> = {};
    
    if (!healthData || healthData.length === 0) {
      return [];
    }

    healthData.forEach(data => {
      const day = new Date(data.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      if (!groupedByDay[day]) {
        groupedByDay[day] = { day, steps: 0, calories: 0, active: 0 };
      }
      if (data.type === 'steps') groupedByDay[day].steps = data.value;
      if (data.type === 'calories') groupedByDay[day].calories = data.value;
      if (data.type === 'active') groupedByDay[day].active = data.value;
    });

    return Object.values(groupedByDay);
  }, [healthData]);

  // Calculate wellness score from real metrics
  const wellnessScore = useMemo(() => {
    if (!wellnessStats?.healthMetrics) return 0;
    return Math.round(
      Math.min(
        (wellnessStats.healthMetrics.steps / 10000) * 30 +
        (wellnessStats.healthMetrics.calories / 2500) * 25 +
        (wellnessStats.healthMetrics.exercise / 60) * 25 +
        (wellnessStats.healthMetrics.sleep / 8) * 20,
        100
      )
    );
  }, [wellnessStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg">Loading wellness dashboard...</p>
          <div className="mt-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <Alert variant="destructive" className="max-w-md mx-auto mt-12">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Wellness Data</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{error}</p>
            <Button onClick={fetchWellnessData} variant="destructive">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Wellness Center</h1>
                <p className="text-sm text-gray-500">
                  Track your health and earn rewards
                  {lastUpdated && ` • Last updated: ${lastUpdated.toLocaleTimeString()}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={fetchWellnessData} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Wellness Score Card */}
        {wellnessStats && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
                  <div className="text-center lg:text-left">
                    <h2 className="text-lg font-medium opacity-90 mb-1">Your Wellness Score</h2>
                    <div className="text-6xl font-bold mb-2">{wellnessScore}</div>
                    <p className="text-sm opacity-80">out of 100</p>
                    <div className="mt-4 flex items-center space-x-3">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <Trophy className="h-3 w-3 mr-1" />
                        Level {Math.floor(wellnessStats.totalPointsEarned / 1000) + 1}
                      </Badge>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <Zap className="h-3 w-3 mr-1" />
                        {wellnessStats.currentStreak || 0} Day Streak
                      </Badge>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <Award className="h-3 w-3 mr-1" />
                        {wellnessStats.totalPointsEarned || 0} Points
                      </Badge>
                    </div>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Footprints className="h-5 w-5 opacity-80" />
                        <span className="text-sm opacity-80">Steps</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {wellnessStats.healthMetrics?.steps?.toLocaleString() ?? '-'}
                      </div>
                      <div className="text-xs opacity-70">/ 10,000 daily goal</div>
                      <Progress
                        value={getProgressPercentage(wellnessStats.healthMetrics?.steps ?? 0, 10000)}
                        className="mt-2 h-2 bg-white/20"
                      />
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Flame className="h-5 w-5 opacity-80" />
                        <span className="text-sm opacity-80">Calories</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {wellnessStats.healthMetrics?.calories?.toLocaleString() ?? '-'}
                      </div>
                      <div className="text-xs opacity-70">/ 2,500 daily</div>
                      <Progress
                        value={getProgressPercentage(wellnessStats.healthMetrics?.calories ?? 0, 2500)}
                        className="mt-2 h-2 bg-white/20"
                      />
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="h-5 w-5 opacity-80" />
                        <span className="text-sm opacity-80">Active</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {wellnessStats.healthMetrics?.exercise ?? '-'}
                      </div>
                      <div className="text-xs opacity-70">min / 60 min goal</div>
                      <Progress
                        value={getProgressPercentage(wellnessStats.healthMetrics?.exercise ?? 0, 60)}
                        className="mt-2 h-2 bg-white/20"
                      />
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Moon className="h-5 w-5 opacity-80" />
                        <span className="text-sm opacity-80">Sleep</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {wellnessStats.healthMetrics?.sleep ?? '-'}h
                      </div>
                      <div className="text-xs opacity-70">/ 8h target</div>
                      <Progress
                        value={getProgressPercentage(wellnessStats.healthMetrics?.sleep ?? 0, 8)}
                        className="mt-2 h-2 bg-white/20"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="activity">Activity Chart</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="coaching">Coaching</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Overview</CardTitle>
                  <CardDescription>Your wellness stats at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Active Incentives</span>
                    <Badge variant="outline">{wellnessStats?.activeIncentives || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Completed Challenges</span>
                    <Badge variant="outline">{wellnessStats?.completedIncentives || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Connected Devices</span>
                    <Badge variant="outline">{wellnessStats?.connectedDevices || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Upcoming Sessions</span>
                    <Badge variant="outline">{wellnessStats?.upcomingSessions || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Points to Next Reward</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{wellnessStats?.pointsToNextReward || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Streak Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    Current Streak
                  </CardTitle>
                  <CardDescription>Keep up the great work!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-6xl font-bold text-yellow-500 mb-4">
                      {wellnessStats?.currentStreak || 0}
                    </div>
                    <p className="text-gray-500">consecutive days</p>
                    <div className="mt-6 flex justify-center space-x-2">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-12 w-12 rounded-full flex items-center justify-center ${
                            i < (wellnessStats?.currentStreak || 0) % 7
                              ? 'bg-yellow-400 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {i < (wellnessStats?.currentStreak || 0) % 7 ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <Calendar className="h-6 w-6" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Chart Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Trends</CardTitle>
                <CardDescription>Your weekly activity data</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="steps" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} />
                        <Line type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No activity data available</p>
                      <p className="text-sm">Connect a device to start tracking</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Health Goals</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map(goal => (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(goal.currentValue, goal.targetValue)} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                        <Badge>{goal.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {incentives.map(incentive => (
                <Card key={incentive.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{incentive.title}</CardTitle>
                        <CardDescription>{incentive.description}</CardDescription>
                      </div>
                      <Badge>{incentive.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Progress</span>
                        <span className="font-medium">{Math.round(incentive.progress)}%</span>
                      </div>
                      <Progress value={incentive.progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 text-green-800">
                          <Trophy className="h-3 w-3 mr-1" />
                          {incentive.points} points
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Ends: {new Date(incentive.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" disabled={incentive.status !== 'active'}>
                      View Challenge
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Rewards Store</h2>
                <p className="text-gray-500">You have {wellnessStats?.totalPointsEarned || 0} points available</p>
              </div>
              <Badge className="text-lg px-4 py-2 bg-yellow-100 text-yellow-800">
                <Gift className="h-4 w-4 mr-2" />
                {wellnessStats?.totalPointsEarned || 0} Points
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {rewards.map(reward => (
                <Card key={reward.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <Gift className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="font-semibold">{reward.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {reward.pointsCost} Points
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleClaimReward(reward.id)}
                        disabled={saving || !reward.available || (wellnessStats?.totalPointsEarned || 0) < reward.pointsCost}
                      >
                        Claim
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Connected Devices</h2>
              <Button>
                <Link className="h-4 w-4 mr-2" />
                Connect Device
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map(integration => (
                <Card key={integration.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">
                        {integration.provider.replace('_', ' ')}
                      </CardTitle>
                      <Badge className={integration.isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {integration.isConnected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Watch className="h-4 w-4 text-gray-500" />
                        <span>{integration.dataTypes.length} data types synced</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Last sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex space-x-2">
                    {integration.isConnected && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSyncData(integration.id)}
                        disabled={syncing}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Now
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Coaching Tab */}
          <TabsContent value="coaching" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Wellness Coaching</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessions.length > 0 ? sessions.map(session => (
                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{session.type}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge>{session.status}</Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
                  )}
                </CardContent>
              </Card>

              {/* Available Coaches */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Coaches</CardTitle>
                    <CardDescription>Book a session with our wellness experts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coaches.map(coach => (
                      <div key={coach.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <img src={coach.image} alt={coach.name} />
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{coach.name}</h4>
                            <p className="text-sm text-gray-500">{coach.specialties.join(', ')}</p>
                            <div className="flex items-center mt-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm ml-1">{coach.rating} ({coach.reviewCount} reviews)</span>
                            </div>
                          </div>
                        </div>
                        <Button onClick={() => handleLoadAvailableSlots(coach)}>
                          Book Session
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Book Coaching Session</DialogTitle>
          </DialogHeader>
          {selectedCoach && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <img src={selectedCoach.image} alt={selectedCoach.name} />
                </Avatar>
                <div>
                  <h4 className="font-medium text-lg">{selectedCoach.name}</h4>
                  <p className="text-gray-500">{selectedCoach.specialties.join(', ')}</p>
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Available Slots</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleBookSession(selectedCoach.id, slot.id)}
                  >
                    <div>
                      <p className="font-medium">{new Date(slot.startTime).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge>${selectedCoach.sessionPrice}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WellnessPage;