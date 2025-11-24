import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  Activity,
  Smartphone,
  Watch,
  Brain,
  Shield,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Users,
  RefreshCw,
  Link2,
  Apple,
  Android,
  Bell,
  Gift,
  Camera,
  BarChart3,
  MapPin,
  Trophy,
  Star,
  Flame,
  Timer,
  Eye,
  Download,
  Upload,
  Settings,
  Moon,
  Plus,
  Drop
} from 'lucide-react';
import { wellnessApi } from '@/services/wellnessApi';
import {
  WellnessIntegration as IWellnessIntegration,
  HealthData as IHealthData,
  WellnessIncentive as IWellnessIncentive,
  WellnessCoach as IWellnessCoach,
  CoachingSession,
  AvailableSlot,
  HealthMetrics
} from '../../../shared/types/wellness';

interface WellnessIntegration {
  id: string;
  provider: 'fitbit' | 'apple_health' | 'google_fit' | 'samsung_health' | 'garmin_connect';
  isConnected: boolean;
  lastSync: Date | null;
  dataTypes: string[];
  permissions: string[];
  settings: {
    autoSync: boolean;
    syncFrequency: number; // minutes
    notifications: boolean;
    dataRetention: number; // days
  };
}

interface HealthData {
  id: string;
  memberId: string;
  type: 'steps' | 'calories' | 'heart_rate' | 'sleep' | 'weight' | 'exercise' | 'mindfulness' | 'hydration' | 'stress';
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  context?: string;
}

interface WellnessIncentive {
  id: string;
  title: string;
  description: string;
  type: 'points' | 'premium_discount' | 'gift_card' | 'wellness_credit' | 'cash_reward';
  value: number;
  currency?: string;
  requirements: {
    metricType: string;
    target: number;
    timeframe: string;
    frequency: string;
  };
  isActive: boolean;
  participants: number;
  achievedCount: number;
}

interface WellnessCoach {
  id: string;
  name: string;
  specialty: string;
  expertise: string[];
  rating: number;
  sessionPrice: number;
  availability: string[];
  bio: string;
  photo: string;
}

interface WellnessIntegrationProps {
  memberId: string;
  memberName?: string;
}

export const WellnessIntegration: React.FC<WellnessIntegrationProps> = ({ memberId, memberName }) => {
  const [integrations, setIntegrations] = useState<IWellnessIntegration[]>([]);
  const [healthData, setHealthData] = useState<IHealthData[]>([]);
  const [incentives, setIncentives] = useState<IWellnessIncentive[]>([]);
  const [coaches, setCoaches] = useState<IWellnessCoach[]>([]);
  const [healthMetricsData, setHealthMetricsData] = useState<HealthMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('integrations');
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IWellnessIntegration | null>(null);
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<IWellnessCoach | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    type: 'steps',
    value: '',
    unit: 'steps',
    timestamp: new Date().toISOString().slice(0, 16), // Format for datetime-local input
    notes: ''
  });

  // Load data from backend APIs
  useEffect(() => {
    loadWellnessData();
  }, [memberId]);

  const loadWellnessData = async () => {
    setLoading(true);
    try {
      // Load all wellness data in parallel
      const [
        integrationsData,
        healthDataResult,
        incentivesData,
        coachesData,
        healthMetrics
      ] = await Promise.allSettled([
        wellnessApi.getIntegrations(),
        wellnessApi.getHealthData({ limit: 100 }),
        wellnessApi.getIncentives({ limit: 50 }),
        wellnessApi.getCoaches({ limit: 20 }),
        wellnessApi.getHealthMetrics('30d')
      ]);

      // Handle successful data loading
      if (integrationsData.status === 'fulfilled') {
        setIntegrations(integrationsData.value);
      } else {
        console.error('Failed to load integrations:', integrationsData.reason);
      }

      if (healthDataResult.status === 'fulfilled') {
        setHealthData(healthDataResult.value.data);
      } else {
        console.error('Failed to load health data:', healthDataResult.reason);
      }

      if (incentivesData.status === 'fulfilled') {
        setIncentives(incentivesData.value);
      } else {
        console.error('Failed to load incentives:', incentivesData.reason);
      }

      if (coachesData.status === 'fulfilled') {
        setCoaches(coachesData.value.coaches);
      } else {
        console.error('Failed to load coaches:', coachesData.reason);
      }

      if (healthMetrics.status === 'fulfilled') {
        setHealthMetricsData(healthMetrics.value);
      } else {
        console.error('Failed to load health metrics:', healthMetrics.reason);
      }
    } catch (error) {
      console.error('Error loading wellness data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with all available devices
  useEffect(() => {
    initializeAvailableDevices();
  }, []);

  const initializeAvailableDevices = () => {
    const availableDevices = [
      {
        id: 'fitbit-available',
        provider: 'fitbit' as const,
        isConnected: false,
        lastSync: null,
        dataTypes: [],
        permissions: [],
        settings: {
          autoSync: true,
          syncFrequency: 15,
          notifications: true,
          dataRetention: 365
        }
      },
      {
        id: 'apple-health-available',
        provider: 'apple_health' as const,
        isConnected: false,
        lastSync: null,
        dataTypes: [],
        permissions: [],
        settings: {
          autoSync: true,
          syncFrequency: 30,
          notifications: true,
          dataRetention: 180
        }
      },
      {
        id: 'google-fit-available',
        provider: 'google_fit' as const,
        isConnected: false,
        lastSync: null,
        dataTypes: [],
        permissions: [],
        settings: {
          autoSync: true,
          syncFrequency: 60,
          notifications: true,
          dataRetention: 90
        }
      },
      {
        id: 'samsung-health-available',
        provider: 'samsung_health' as const,
        isConnected: false,
        lastSync: null,
        dataTypes: [],
        permissions: [],
        settings: {
          autoSync: true,
          syncFrequency: 45,
          notifications: true,
          dataRetention: 120
        }
      },
      {
        id: 'garmin-connect-available',
        provider: 'garmin_connect' as const,
        isConnected: false,
        lastSync: null,
        dataTypes: [],
        permissions: [],
        settings: {
          autoSync: true,
          syncFrequency: 30,
          notifications: true,
          dataRetention: 180
        }
      }
    ];

    // Merge with existing integrations from backend
    const existingProviders = new Set(integrations.map(i => i.provider));
    const newDevices = availableDevices.filter(device => !existingProviders.has(device.provider));

    if (newDevices.length > 0) {
      setIntegrations(prev => [...prev, ...newDevices]);
    }
  };

  // Get provider icon and color
  const getProviderInfo = (provider: string) => {
    const providers = {
      fitbit: {
        icon: <Activity className="h-5 w-5" />,
        color: 'text-blue-600 bg-blue-50',
        name: 'Fitbit',
        description: 'Track steps, heart rate, sleep, and more'
      },
      apple_health: {
        icon: <Heart className="h-5 w-5" />,
        color: 'text-black bg-gray-100',
        name: 'Apple Health',
        description: 'Comprehensive health data from iOS devices'
      },
      google_fit: {
        icon: <BarChart3 className="h-5 w-5" />,
        color: 'text-green-600 bg-green-50',
        name: 'Google Fit',
        description: 'Connects with Android apps and devices'
      },
      samsung_health: {
        icon: <Smartphone className="h-5 w-5" />,
        color: 'text-blue-700 bg-blue-100',
        name: 'Samsung Health',
        description: 'Samsung health platform integration'
      },
      garmin_connect: {
        icon: <Watch className="h-5 w-5" />,
        color: 'text-purple-600 bg-purple-50',
        name: 'Garmin Connect',
        description: 'Connects with Garmin devices and services'
      }
    };
    return providers[provider as keyof typeof providers] || providers.fitbit;
  };

  // Get health metric icon
  const getHealthIcon = (type: string) => {
    const icons = {
      steps: <Activity className="h-4 w-4" />,
      calories: <Flame className="h-4 w-4" />,
      heart_rate: <Heart className="h-4 w-4" />,
      sleep: <Moon className="h-4 w-4" />,
      weight: <Target className="h-4 w-4" />,
      exercise: <Timer className="h-4 w-4" />,
      mindfulness: <Brain className="h-4 w-4" />,
      hydration: <Drop className="h-4 w-4" />,
      stress: <AlertTriangle className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <Activity className="h-4 w-4" />;
  };

  // Get incentive type icon
  const getIncentiveIcon = (type: string) => {
    const icons = {
      points: <Zap className="h-5 w-5" />,
      premium_discount: <Shield className="h-5 w-5" />,
      gift_card: <Gift className="h-5 w-5" />,
      wellness_credit: <Star className="h-5 w-5" />,
      cash_reward: <Trophy className="h-5 w-5" />
    };
    return icons[type as keyof typeof icons] || <Zap className="h-5 w-5" />;
  };

  // Handle integration connection
  const handleConnectIntegration = async (integrationId: string) => {
    setLoading(true);
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Initiate OAuth flow
      const result = await wellnessApi.connectDevice(
        integration.provider,
        ['read'],
        integration.settings
      );

      if (result.authUrl) {
        // Redirect to OAuth URL or show it to user
        window.open(result.authUrl, '_blank');
      } else if (result.success) {
        // Connection completed successfully
        await loadWellnessData();
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      alert('Failed to connect device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle integration disconnection
  const handleDisconnectIntegration = async (integrationId: string) => {
    setLoading(true);
    try {
      await wellnessApi.disconnectDevice(integrationId);

      // Update local state
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, isConnected: false, lastSync: null }
          : integration
      ));
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Manual data sync
  const handleSyncData = async (integrationId: string) => {
    setLoading(true);
    try {
      const result = await wellnessApi.syncDeviceData(integrationId, ['all']);

      // Refresh health data after sync
      const healthDataResult = await wellnessApi.getHealthData({ limit: 50 });
      setHealthData(healthDataResult.data);

      // Update last sync time
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, lastSync: new Date() }
          : integration
      ));

      alert(`Successfully synced ${result.syncedRecords} records`);
    } catch (error) {
      console.error('Error syncing data:', error);
      alert('Failed to sync data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update integration settings
  const handleUpdateSettings = async (integrationId: string, newSettings: Partial<IWellnessIntegration['settings']>) => {
    try {
      // In a real implementation, this would call an API to update settings
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, settings: { ...integration.settings, ...newSettings } }
          : integration
      ));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Add manual health data
  const handleAddManualData = async () => {
    if (!manualEntryData.value) {
      alert('Please enter a value for the health data');
      return;
    }

    setLoading(true);
    try {
      const data = await wellnessApi.addManualHealthData({
        type: manualEntryData.type,
        value: parseFloat(manualEntryData.value),
        unit: manualEntryData.unit,
        timestamp: new Date(manualEntryData.timestamp),
        notes: manualEntryData.notes
      });

      // Refresh health data
      const healthDataResult = await wellnessApi.getHealthData({ limit: 50 });
      setHealthData(healthDataResult.data);

      // Reset form and close dialog
      setManualEntryData({
        type: 'steps',
        value: '',
        unit: 'steps',
        timestamp: new Date().toISOString().slice(0, 16),
        notes: ''
      });
      setShowManualEntryDialog(false);

      alert('Health data added successfully');
    } catch (error) {
      console.error('Error adding manual data:', error);
      alert('Failed to add health data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get health data summary
  const getHealthDataSummary = () => {
    // If we have metrics data from API, use that first
    if (healthMetricsData) {
      return {
        steps: healthMetricsData.steps,
        calories: healthMetricsData.calories,
        heartRate: healthMetricsData.heartRate,
        sleep: healthMetricsData.sleep,
        weight: healthMetricsData.weight,
        exercise: healthMetricsData.exercise,
        stress: 0 // Not in metrics API yet
      };
    }

    // Fallback to manual calculation from health data
    const latest = healthData.reduce((acc, data) => {
      if (!acc[data.type] || new Date(data.timestamp) > new Date(acc[data.type].timestamp)) {
        acc[data.type] = data;
      }
      return acc;
    }, {} as Record<string, IHealthData>);

    return {
      steps: latest.steps?.value || 0,
      calories: latest.calories?.value || 0,
      heartRate: latest.heart_rate?.value || 0,
      sleep: latest.sleep?.value || 0,
      weight: latest.weight?.value || 0,
      exercise: latest.exercise?.value || 0,
      stress: latest.stress?.value || 0
    };
  };

  // Calculate progress for incentive
  const getIncentiveProgress = (incentive: IWellnessIncentive) => {
    // Use progress from API if available
    if (incentive.progress !== undefined) {
      return incentive.progress;
    }

    // Fallback to manual calculation
    const relevantData = healthData.filter(data => {
      const targetType = incentive.requirements?.metricType || '';
      return data.type === targetType || targetType === 'activity_completion' && (data.type === 'steps' || data.type === 'exercise');
    });

    if (relevantData.length === 0) return 0;

    const targetValue = incentive.targetValue || incentive.requirements?.target || 1;
    const progress = Math.min(
      (relevantData.reduce((sum, data) => sum + data.value, 0) /
       relevantData.length) / targetValue,
      1
    ) * 100;

    return Math.round(progress);
  };

  // Handle incentive participation
  const handleJoinIncentive = async (incentiveId: string) => {
    try {
      // In a real implementation, this would call an API to join the incentive
      const incentive = incentives.find(i => i.id === incentiveId);
      if (incentive) {
        alert(`You've joined the "${incentive.title}" incentive! Start tracking your progress to earn rewards.`);
      }
    } catch (error) {
      console.error('Error joining incentive:', error);
      alert('Failed to join incentive. Please try again.');
    }
  };

  // Handle reward claiming
  const handleClaimReward = async (incentiveId: string) => {
    try {
      // This would use the actual reward API in a real implementation
      alert('Reward claimed successfully! Check your rewards section for details.');
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward. Please try again.');
    }
  };

  // Handle coach session booking
  const handleBookSession = async (coachId: string) => {
    try {
      const coach = coaches.find(c => c.id === coachId);
      if (coach) {
        // In a real implementation, this would show a booking dialog
        alert(`Booking session with ${coach.name}. This would open a scheduling dialog in the full implementation.`);
      }
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Failed to book session. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Heart className="h-8 w-8 text-red-600" />
            <span>Wellness Integration</span>
          </h1>
          <p className="text-gray-600">
            Connect your favorite health devices and apps for seamless wellness tracking
          </p>
        </div>
        <Button onClick={() => setShowIntegrationDialog(true)}>
          <Link2 className="h-4 w-4 mr-2" />
          Connect Device
        </Button>
      </div>

      {/* Real-time Health Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Today's Health Overview</span>
          </CardTitle>
          <CardDescription>
            Real-time data from your connected devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(getHealthDataSummary()).map(([type, value]) => (
              <div key={type} className="text-center">
                <div className={`inline-flex p-3 rounded-full ${
                  type === 'steps' ? 'bg-blue-100' :
                  type === 'calories' ? 'bg-orange-100' :
                  type === 'heart_rate' ? 'bg-red-100' :
                  type === 'sleep' ? 'bg-purple-100' :
                  type === 'weight' ? 'bg-green-100' :
                  type === 'exercise' ? 'bg-yellow-100' :
                  'bg-gray-100'
                }`}>
                  {getHealthIcon(type)}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {type === 'steps' && typeof value === 'number' && value.toLocaleString()}
                    {type === 'calories' && typeof value === 'number' && `${value} kcal`}
                    {type === 'heart_rate' && typeof value === 'number' && `${value} bpm`}
                    {type === 'sleep' && typeof value === 'number' && `${value}h`}
                    {type === 'weight' && typeof value === 'number' && `${value} lbs`}
                    {type === 'exercise' && typeof value === 'number' && `${value} min`}
                    {type === 'stress' && typeof value === 'number' && `Level ${value}`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {type.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">Device Integrations</TabsTrigger>
          <TabsTrigger value="data">Health Data</TabsTrigger>
          <TabsTrigger value="incentives">Wellness Incentives</TabsTrigger>
          <TabsTrigger value="coaching">Wellness Coaching</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="space-y-4">
            {integrations.map((integration) => {
              const providerInfo = getProviderInfo(integration.provider);
              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${providerInfo.color}`}>
                          {providerInfo.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{providerInfo.name}</CardTitle>
                          <CardDescription>{providerInfo.description}</CardDescription>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={
                              integration.isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }>
                              {integration.isConnected ? 'Connected' : 'Not Connected'}
                            </Badge>
                            {integration.lastSync && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Last synced: {integration.lastSync.toLocaleTimeString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {integration.isConnected ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncData(integration.id)}
                              disabled={loading}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Sync
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnectIntegration(integration.id)}
                              disabled={loading}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleConnectIntegration(integration.id)}
                            disabled={loading}
                            className={providerInfo.color}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {integration.isConnected && (
                    <CardContent>
                      <div className="space-y-4">
                        {/* Data Types */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Data Types Synced</p>
                          <div className="flex flex-wrap gap-2">
                            {integration.dataTypes.map((dataType) => (
                              <Badge key={dataType} variant="outline" className="capitalize">
                                {dataType.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Settings */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Settings</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setShowIntegrationDialog(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                              Configure
                            </Button>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Auto Sync</span>
                              <Switch
                                checked={integration.settings.autoSync}
                                onChecked={(checked) =>
                                  handleUpdateSettings(integration.id, {
                                    settings: { ...integration.settings, autoSync: checked }
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Notifications</span>
                              <Switch
                                checked={integration.settings.notifications}
                                onChecked={(checked) =>
                                  handleUpdateSettings(integration.id, {
                                    settings: { ...integration.settings, notifications: checked }
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Sync Frequency</span>
                                <span className="text-sm text-gray-900">{integration.settings.syncFrequency} min</span>
                              </div>
                              <Slider
                                value={[integration.settings.syncFrequency]}
                                onValueChange={([value]) =>
                                  handleUpdateSettings(integration.id, {
                                    settings: { ...integration.settings, syncFrequency: value }
                                  })
                                }
                                min={5}
                                max={120}
                                step={5}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Sync Status */}
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700">
                              Integration is healthy and syncing regularly
                            </span>
                          </div>
                        </div>
                      </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-6">
            {/* Health Metrics Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Health Metrics Overview</span>
                </CardTitle>
                <CardDescription>
                  Your health data trends and patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 7-Day Steps Trend */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">7-Day Steps Trend</h4>
                      <span className="text-sm text-gray-500">Average: 8,234 steps</span>
                    </div>
                    <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg relative">
                      <div className="absolute inset-0 flex items-end">
                        <div className="w-full h-20 bg-blue-500 bg-opacity-20" style={{height: '60%'}}></div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                    <div className="space-y-2">
                      {healthData.slice(0, 5).map((data) => (
                        <div key={data.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            {getHealthIcon(data.type)}
                            <div>
                              <p className="text-sm font-medium capitalize">{data.type.replace('_', ' ')}</p>
                              <p className="text-xs text-gray-500">{data.value} {data.unit}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{data.timestamp.toLocaleTimeString()}</p>
                            <p className="text-xs text-gray-400">from {data.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Sources Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>
                  Breakdown of connected data sources and their contribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrations
                    .filter(integration => integration.isConnected)
                    .map((integration) => {
                      const providerInfo = getProviderInfo(integration.provider);
                      const sourceCount = healthData.filter(d => d.source === integration.provider).length;
                      return (
                        <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            {providerInfo.icon}
                            <div>
                              <p className="text-sm font-medium">{providerInfo.name}</p>
                              <p className="text-xs text-gray-500">
                                {sourceCount} data points this week
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{sourceCount}</p>
                            <p className="text-xs text-gray-500">points</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Manual Data Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Manual Data Entry</span>
                </CardTitle>
                <CardDescription>
                  Add health data manually when devices aren't available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from CSV File
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowManualEntryDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incentives">
          <div className="space-y-6">
            {/* Active Incentives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gift className="h-5 w-5" />
                  <span>Wellness Incentives</span>
                </CardTitle>
                <CardDescription>
                  Earn rewards for achieving your health goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {incentives.filter(incentive => incentive.status === 'active' || incentive.status === 'in_progress').map((incentive) => {
                    const incentiveIcon = getIncentiveIcon(incentive.type);
                    const progress = getIncentiveProgress(incentive);

                    return (
                      <Card key={incentive.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{incentive.title}</CardTitle>
                              <CardDescription>{incentive.description}</CardDescription>
                              <div className="flex items-center space-x-2 mt-2">
                                {incentiveIcon}
                                <span className="text-sm font-medium">
                                  {incentive.points} points
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{progress}%</p>
                              <p className="text-sm text-gray-500">progress</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Requirements */}
                            <div>
                              <p className="text-sm font-medium text-gray-700">Requirements</p>
                              <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                                <p>
                                  {incentive.targetValue.toLocaleString()} {incentive.unit}{' '}
                                  {incentive.requirements?.join(', ') || 'Complete daily activities'}
                                </p>
                              </div>
                            </div>

                            {/* Progress */}
                            <div>
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>
                                  {incentive.currentValue.toLocaleString()} / {incentive.targetValue.toLocaleString()}
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            {/* Rewards */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Rewards: {incentive.rewards?.join(', ') || `${incentive.points} points`}
                              </span>
                              <Badge className={
                                progress >= 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }>
                                {progress >= 100 ? 'Completed' : 'In Progress'}
                              </Badge>
                            </div>

                            {/* Join Button */}
                            {progress < 100 && (
                              <Button
                                className="w-full"
                                onClick={() => handleJoinIncentive(incentive.id)}
                              >
                                Join Incentive
                              </Button>
                            )}

                            {/* Claim Reward */}
                            {progress >= 100 && (
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => handleClaimReward(incentive.id)}
                              >
                                <Gift className="h-4 w-4 mr-2" />
                                Claim Reward
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Inactive Incentives */}
            {incentives.filter(incentive => !incentive.isActive).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Incentives</CardTitle>
                  <CardDescription>Coming soon wellness incentives</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {incentives.filter(incentive => !incentive.isActive).map((incentive) => (
                      <div key={incentive.id} className="p-3 border rounded-lg opacity-60">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{incentive.title}</h4>
                            <p className="text-sm text-gray-500">{incentive.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm font-medium">
                                {incentive.value}
                                {incentive.currency && ` ${incentive.currency}`}
                              </span>
                              <Badge variant="outline">Coming Soon</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coaching">
          <div className="space-y-6">
            {/* Featured Coaches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Wellness Coaching</span>
                </CardTitle>
                <CardDescription>
                  Connect with certified wellness coaches for personalized guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {coaches.map((coach) => (
                    <Card key={coach.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{coach.name}</CardTitle>
                            <CardDescription>{coach.specialties?.join(', ') || 'Wellness Coach'}</CardDescription>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(coach.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">({coach.rating})</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm font-medium">${coach.sessionPrice}</span>
                              <span className="text-sm text-gray-500">/session</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Expertise */}
                          <div>
                            <p className="text-sm font-medium text-gray-700">Expertise</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {coach.specialties?.map((specialty) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Availability */}
                          <div>
                            <p className="text-sm font-medium text-gray-700">Status</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <Badge className={
                                coach.availability === 'available' ? 'bg-green-100 text-green-800' :
                                coach.availability === 'limited' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {coach.availability}
                              </Badge>
                              {coach.nextAvailableSlot && (
                                <span className="text-xs text-gray-500">
                                  Next: {new Date(coach.nextAvailableSlot).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bio */}
                          <div>
                            <p className="text-sm text-gray-600 line-clamp-2">{coach.bio}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button
                              className="flex-1"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setShowCoachDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleBookSession(coach.id)}
                              disabled={coach.availability === 'unavailable'}
                            >
                              Book Session
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coaching Plans */}
            <Card>
              <CardHeader>
                <CardTitle>Personalized Coaching Plans</CardTitle>
                <CardDescription>
                  Structured wellness programs with expert guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-l-4 border-blue-500">
                    <CardHeader>
                      <CardTitle>6-Week Transformation</CardTitle>
                      <CardDescription>Complete body transformation program</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">What's Included:</p>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            <li>12 personal training sessions</li>
                            <li>Custom nutrition plan</li>
                            <li>Weekly progress reviews</li>
                            <li>24/7 messaging support</li>
                          </ul>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">$1,200</span>
                          <Button>Learn More</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-green-500">
                    <CardHeader>
                      <CardTitle>Stress Management</CardTitle>
                      <CardDescription>Mindfulness and resilience training</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">What's Included:</p>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            <li>8 guided meditation sessions</li>
                            <li>Stress assessment</li>
                            <li>Coping strategies toolkit</li>
                            <li>Progress tracking app</li>
                          </ul>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">$600</span>
                          <Button>Learn More</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Integration Dialog */}
      <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration ? 'Configure Integration' : 'Connect Health Device'}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration
                ? `Manage your ${getProviderInfo(selectedIntegration.provider).name} connection`
                : 'Choose a device or app to connect for automatic health data syncing'
              }
            </DialogDescription>
          </DialogHeader>

          {!selectedIntegration ? (
            <div className="space-y-6">
              {/* Available Integrations */}
              <div className="grid grid-cols-2 gap-4">
                {integrations.filter(i => !i.isConnected).map((integration) => {
                  const providerInfo = getProviderInfo(integration.provider);
                  return (
                    <Button
                      key={integration.id}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => setSelectedIntegration(integration)}
                    >
                      {providerInfo.icon}
                      <span className="text-sm font-medium">{providerInfo.name}</span>
                      <Button>Connect</Button>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Info */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`inline-flex p-4 rounded-full ${getProviderInfo(selectedIntegration.provider).color}`}>
                  {getProviderInfo(selectedIntegration.provider).icon}
                </div>
                <h3 className="text-lg font-medium mt-2">
                  {getProviderInfo(selectedIntegration.provider).name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getProviderInfo(selectedIntegration.provider).description}
                </p>
              </div>

              {/* Connection Steps */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    1
                  </div>
                  <p className="text-sm text-gray-600">
                    Install the {getProviderInfo(selectedIntegration.provider).name} app on your device
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    2
                  </div>
                  <p className="text-sm text-gray-600">
                    Grant permissions to sync health data
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                    3
                  </div>
                  <p className="text-sm text-600">
                    Configure sync preferences
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                    ✓
                  </div>
                  <p className="text-sm text-green-600">
                    Connection complete!
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                className="w-full"
                onClick={() => handleConnectIntegration(selectedIntegration.id)}
                disabled={loading}
                className={getProviderInfo(selectedIntegration.provider).color}
              >
                {loading ? 'Connecting...' : `Connect ${getProviderInfo(selectedIntegration.provider).name}`}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowIntegrationDialog(false);
              if (!selectedIntegration) {
                setSelectedIntegration(null);
              }
            }}>
              Cancel
            </Button>
            {selectedIntegration && (
              <Button onClick={() => setShowIntegrationDialog(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coach Dialog */}
      <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedCoach?.name} - Book Session</DialogTitle>
            <DialogDescription>
              Schedule a personalized wellness coaching session
            </DialogDescription>
          </DialogHeader>

          {selectedCoach && (
            <div className="space-y-6">
              {/* Coach Profile */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto mb-3">
                  <Users className="w-8 h-8 text-gray-500 mx-auto" />
                </div>
                <h3 className="text-lg font-medium">{selectedCoach.name}</h3>
                <p className="text-sm text-gray-600">{selectedCoach.specialty}</p>
                <div className="flex justify-center mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(selectedCoach.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">({selectedCoach.rating})</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCoach.bio}
                </p>
              </div>

              {/* Availability */}
              <div>
                <h4 className="text-sm font-medium text-gray-700">Available Times</h4>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {selectedCoach.availability.map((day) => (
                    <Button
                      key={day}
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Selected time:', day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Session Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-700">Session Type</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" onClick={() => console.log('Selected: Initial Consultation')}>
                    Initial Consultation
                  </Button>
                  <Button variant="outline" onClick={() => console.log('Selected: Follow-up Session')}>
                    Follow-up Session
                  </Button>
                  <Button variant="outline" onClick={() => console.log('Selected: Progress Review')}>
                    Progress Review
                  </Button>
                  <Button variant="outline" onClick={() => console.log('Selected: Custom Program')}>
                    Custom Program
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700">Notes (Optional)</h4>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  placeholder="Any specific goals or areas of focus..."
                />
              </div>

              {/* Pricing */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCoach.sessionPrice} per session
                  </span>
                  <span className="text-sm text-blue-700">
                    Your plan: 5 sessions = ${selectedCoach.sessionPrice * 5}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoachDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log('Booking session with:', selectedCoach?.name);
              setShowCoachDialog(false);
            }}>
              Book Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Data Entry Dialog */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Manual Health Data</DialogTitle>
            <DialogDescription>
              Enter health data manually when devices aren't available
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Data Type */}
            <div>
              <Label htmlFor="data-type">Data Type</Label>
              <Select value={manualEntryData.type} onValueChange={(value) =>
                setManualEntryData(prev => ({
                  ...prev,
                  type: value,
                  unit: value === 'steps' ? 'steps' :
                         value === 'calories' ? 'kcal' :
                         value === 'heart_rate' ? 'bpm' :
                         value === 'sleep' ? 'hours' :
                         value === 'weight' ? 'kg' :
                         value === 'exercise' ? 'minutes' :
                         value === 'mindfulness' ? 'minutes' :
                         value === 'hydration' ? 'ml' : 'count'
                }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="steps">Steps</SelectItem>
                  <SelectItem value="calories">Calories</SelectItem>
                  <SelectItem value="heart_rate">Heart Rate</SelectItem>
                  <SelectItem value="sleep">Sleep Duration</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="exercise">Exercise</SelectItem>
                  <SelectItem value="mindfulness">Mindfulness</SelectItem>
                  <SelectItem value="hydration">Hydration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div>
              <Label htmlFor="value">Value ({manualEntryData.unit})</Label>
              <Input
                id="value"
                type="number"
                step={manualEntryData.type === 'weight' ? '0.1' : '1'}
                placeholder={`Enter ${manualEntryData.type} value`}
                value={manualEntryData.value}
                onChange={(e) => setManualEntryData(prev => ({ ...prev, value: e.target.value }))}
              />
            </div>

            {/* Timestamp */}
            <div>
              <Label htmlFor="timestamp">Date & Time</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={manualEntryData.timestamp}
                onChange={(e) => setManualEntryData(prev => ({ ...prev, timestamp: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this entry..."
                value={manualEntryData.notes}
                onChange={(e) => setManualEntryData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEntryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManualData} disabled={loading}>
              {loading ? 'Adding...' : 'Add Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};