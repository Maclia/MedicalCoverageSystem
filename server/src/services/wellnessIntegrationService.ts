import crypto from 'crypto';
import axios from 'axios';
import {
  WellnessIntegration,
  HealthData,
  HealthMetrics,
  WellnessIncentive,
  WellnessReward,
  WellnessCoach,
  CoachingSession,
  AvailableSlot
} from '../../shared/types/wellness';

// In-memory storage for demo purposes (in production, use database)
let wellnessIntegrations: Record<string, WellnessIntegration[]> = {};
let healthDataStore: Record<string, HealthData[]> = {};
let wellnessIncentivesStore: Record<string, WellnessIncentive[]> = {};
let coachingSessionsStore: Record<string, CoachingSession[]> = {};

// Device provider configurations
const deviceProviders = {
  fitbit: {
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    scope: 'activity heartrate location nutrition profile settings sleep social weight',
    clientId: process.env.FITBIT_CLIENT_ID,
    clientSecret: process.env.FITBIT_CLIENT_SECRET,
    redirectUri: process.env.FITBIT_REDIRECT_URI
  },
  apple_health: {
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scope: 'health.read',
    clientId: process.env.APPLE_HEALTH_CLIENT_ID,
    clientSecret: process.env.APPLE_HEALTH_CLIENT_SECRET,
    redirectUri: process.env.APPLE_HEALTH_REDIRECT_URI
  },
  google_fit: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read',
    clientId: process.env.GOOGLE_FIT_CLIENT_ID,
    clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_FIT_REDIRECT_URI
  }
};

// Wellness Integration Management
export async function getWellnessIntegrations(userId: string): Promise<WellnessIntegration[]> {
  return wellnessIntegrations[userId] || [];
}

export async function connectDevice(
  userId: string,
  provider: string,
  permissions: string[] | null,
  settings: any,
  code?: string,
  state?: string
): Promise<any> {
  const providerConfig = deviceProviders[provider as keyof typeof deviceProviders];
  if (!providerConfig) {
    throw new Error('Invalid provider');
  }

  // For demo purposes, simulate OAuth flow
  if (code && state) {
    // Complete OAuth flow
    const accessToken = `demo_access_token_${Date.now()}`;
    const refreshToken = `demo_refresh_token_${Date.now()}`;
    const expiresIn = 3600;

    const integration: WellnessIntegration = {
      id: crypto.randomUUID(),
      provider: provider as any,
      isConnected: true,
      lastSync: new Date(),
      dataTypes: ['steps', 'heart_rate', 'calories', 'sleep'],
      permissions: permissions || ['read'],
      settings: {
        autoSync: true,
        syncFrequency: 60,
        notifications: true,
        dataRetention: 90,
        ...settings
      },
      accessToken,
      refreshToken,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000)
    };

    if (!wellnessIntegrations[userId]) {
      wellnessIntegrations[userId] = [];
    }

    // Remove any existing integration for this provider
    wellnessIntegrations[userId] = wellnessIntegrations[userId].filter(
      integ => integ.provider !== provider
    );

    wellnessIntegrations[userId].push(integration);

    return {
      success: true,
      message: `${provider} connected successfully`,
      integration
    };
  } else {
    // Initiate OAuth flow
    const authState = crypto.randomBytes(16).toString('hex');
    const authUrl = `${providerConfig.authUrl}?client_id=${providerConfig.clientId}&redirect_uri=${providerConfig.redirectUri}&response_type=code&scope=${encodeURIComponent(providerConfig.scope)}&state=${authState}`;

    return {
      authUrl,
      state: authState,
      message: 'Please complete the authentication flow'
    };
  }
}

export async function disconnectDevice(userId: string, integrationId: string): Promise<void> {
  if (wellnessIntegrations[userId]) {
    wellnessIntegrations[userId] = wellnessIntegrations[userId].filter(
      integ => integ.id !== integrationId
    );
  }
}

export async function revokeDeviceAccess(userId: string, integrationId: string): Promise<void> {
  // In production, revoke tokens with provider
  await disconnectDevice(userId, integrationId);
}

export async function refreshDeviceToken(userId: string, integrationId: string): Promise<any> {
  const userIntegrations = wellnessIntegrations[userId] || [];
  const integration = userIntegrations.find(integ => integ.id === integrationId);

  if (!integration) {
    throw new Error('Integration not found');
  }

  // Simulate token refresh
  const newAccessToken = `demo_access_token_${Date.now()}`;
  const newRefreshToken = `demo_refresh_token_${Date.now()}`;
  const expiresIn = 3600;

  integration.accessToken = newAccessToken;
  integration.refreshToken = newRefreshToken;
  integration.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt: integration.tokenExpiry
  };
}

export async function syncDeviceData(
  userId: string,
  integrationId: string,
  dataTypes: string[],
  dateRange?: { from: string; to: string }
): Promise<any> {
  const userIntegrations = wellnessIntegrations[userId] || [];
  const integration = userIntegrations.find(integ => integ.id === integrationId);

  if (!integration) {
    throw new Error('Integration not found');
  }

  // Simulate data sync
  const syncedData: HealthData[] = [];
  const now = new Date();
  const daysBack = 30;

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    if (!dataTypes || dataTypes.includes('steps')) {
      syncedData.push({
        id: crypto.randomUUID(),
        type: 'steps',
        value: Math.floor(Math.random() * 10000) + 5000,
        unit: 'count',
        source: integration.provider,
        timestamp: date,
        userId,
        metadata: { device: `${integration.provider} device` }
      });
    }

    if (!dataTypes || dataTypes.includes('heart_rate')) {
      syncedData.push({
        id: crypto.randomUUID(),
        type: 'heart_rate',
        value: Math.floor(Math.random() * 60) + 60,
        unit: 'bpm',
        source: integration.provider,
        timestamp: date,
        userId,
        metadata: { device: `${integration.provider} device` }
      });
    }

    if (!dataTypes || dataTypes.includes('calories')) {
      syncedData.push({
        id: crypto.randomUUID(),
        type: 'calories',
        value: Math.floor(Math.random() * 500) + 2000,
        unit: 'kcal',
        source: integration.provider,
        timestamp: date,
        userId,
        metadata: { device: `${integration.provider} device` }
      });
    }

    if (!dataTypes || dataTypes.includes('sleep')) {
      syncedData.push({
        id: crypto.randomUUID(),
        type: 'sleep_duration',
        value: Math.floor(Math.random() * 3) + 6,
        unit: 'hours',
        source: integration.provider,
        timestamp: date,
        userId,
        metadata: { device: `${integration.provider} device` }
      });
    }
  }

  // Store synced data
  if (!healthDataStore[userId]) {
    healthDataStore[userId] = [];
  }
  healthDataStore[userId].push(...syncedData);

  // Update last sync time
  integration.lastSync = new Date();

  return {
    syncedRecords: syncedData.length,
    lastSync: integration.lastSync,
    dataTypes: dataTypes || ['all']
  };
}

// Health Data Management
export async function getHealthData(
  userId: string,
  options: {
    dataTypes?: string[];
    dateFrom?: string;
    dateTo?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: HealthData[]; total: number }> {
  let data = healthDataStore[userId] || [];

  // Apply filters
  if (options.dataTypes && options.dataTypes.length > 0) {
    data = data.filter(item => options.dataTypes!.includes(item.type));
  }

  if (options.dateFrom) {
    const fromDate = new Date(options.dateFrom);
    data = data.filter(item => new Date(item.timestamp) >= fromDate);
  }

  if (options.dateTo) {
    const toDate = new Date(options.dateTo);
    data = data.filter(item => new Date(item.timestamp) <= toDate);
  }

  if (options.source) {
    data = data.filter(item => item.source === options.source);
  }

  // Sort by timestamp descending
  data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const total = data.length;
  const offset = options.offset || 0;
  const limit = options.limit || 100;
  const paginatedData = data.slice(offset, offset + limit);

  return { data: paginatedData, total };
}

export async function getHealthMetrics(userId: string, period: string): Promise<HealthMetrics> {
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  const healthDataResult = await getHealthData(userId, {
    dateFrom: fromDate.toISOString(),
    dateTo: toDate.toISOString()
  });

  const data = healthDataResult.data;

  // Calculate metrics
  const stepsData = data.filter(item => item.type === 'steps');
  const heartRateData = data.filter(item => item.type === 'heart_rate');
  const caloriesData = data.filter(item => item.type === 'calories');
  const sleepData = data.filter(item => item.type === 'sleep_duration');
  const weightData = data.filter(item => item.type === 'weight');
  const exerciseData = data.filter(item => item.type === 'exercise_minutes');

  const avgSteps = stepsData.length > 0
    ? Math.round(stepsData.reduce((sum, item) => sum + item.value, 0) / stepsData.length)
    : 0;

  const avgHeartRate = heartRateData.length > 0
    ? Math.round(heartRateData.reduce((sum, item) => sum + item.value, 0) / heartRateData.length)
    : 0;

  const avgCalories = caloriesData.length > 0
    ? Math.round(caloriesData.reduce((sum, item) => sum + item.value, 0) / caloriesData.length)
    : 0;

  const avgSleep = sleepData.length > 0
    ? parseFloat((sleepData.reduce((sum, item) => sum + item.value, 0) / sleepData.length).toFixed(1))
    : 0;

  const latestWeight = weightData.length > 0 ? weightData[0].value : 0;

  const weeklyExercise = exerciseData
    .filter(item => {
      const itemDate = new Date(item.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return itemDate >= weekAgo;
    })
    .reduce((sum, item) => sum + item.value, 0);

  return {
    steps: avgSteps,
    calories: avgCalories,
    heartRate: avgHeartRate,
    sleep: avgSleep,
    weight: latestWeight,
    exercise: weeklyExercise,
    period
  };
}

export async function addManualHealthData(userId: string, healthData: Partial<HealthData>): Promise<HealthData> {
  const newData: HealthData = {
    id: crypto.randomUUID(),
    type: healthData.type!,
    value: healthData.value!,
    unit: healthData.unit!,
    source: 'manual',
    timestamp: healthData.timestamp || new Date(),
    userId,
    metadata: healthData.metadata || {}
  };

  if (!healthDataStore[userId]) {
    healthDataStore[userId] = [];
  }
  healthDataStore[userId].push(newData);

  return newData;
}

export async function updateHealthGoals(userId: string, goals: any): Promise<any> {
  // In production, store goals in database
  return { success: true, goals };
}

// Wellness Incentives System
export async function getWellnessIncentives(
  userId: string,
  options: {
    category?: string;
    status?: string;
    limit?: number;
  }
): Promise<WellnessIncentive[]> {
  // Demo incentives
  const incentives: WellnessIncentive[] = [
    {
      id: '1',
      title: 'Daily Steps Challenge',
      description: 'Walk 10,000 steps for 7 consecutive days',
      category: 'physical',
      type: 'challenge',
      points: 100,
      currentValue: 50000,
      targetValue: 70000,
      unit: 'steps',
      status: 'in_progress',
      progress: 71,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-07'),
      requirements: ['10,000 steps daily', '7 consecutive days'],
      rewards: ['100 wellness points', 'Digital badge']
    },
    {
      id: '2',
      title: 'Sleep Quality Improvement',
      description: 'Average 7+ hours of sleep for 30 days',
      category: 'sleep',
      type: 'goal',
      points: 150,
      currentValue: 6.5,
      targetValue: 7,
      unit: 'hours',
      status: 'in_progress',
      progress: 93,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-30'),
      requirements: ['7+ hours average sleep', '30 day period'],
      rewards: ['150 wellness points', 'Sleep tracking premium']
    },
    {
      id: '3',
      title: 'Mindfulness Monday',
      description: 'Complete 10-minute mindfulness session every Monday',
      category: 'mental',
      type: 'habit',
      points: 50,
      currentValue: 3,
      targetValue: 4,
      unit: 'sessions',
      status: 'in_progress',
      progress: 75,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-30'),
      requirements: ['10-minute session', 'Every Monday'],
      rewards: ['50 wellness points', 'Meditation app access']
    }
  ];

  // Apply filters
  let filteredIncentives = incentives;
  if (options.category) {
    filteredIncentives = filteredIncentives.filter(incentive => incentive.category === options.category);
  }
  if (options.status) {
    filteredIncentives = filteredIncentives.filter(incentive => incentive.status === options.status);
  }

  return filteredIncentives.slice(0, options.limit || 50);
}

export async function getWellnessRewards(
  userId: string,
  options: {
    category?: string;
    available?: boolean;
    limit?: number;
  }
): Promise<WellnessReward[]> {
  // Demo rewards
  const rewards: WellnessReward[] = [
    {
      id: '1',
      title: 'Coffee Shop Gift Card',
      description: '$10 gift card to local coffee shop',
      category: 'retail',
      pointsCost: 500,
      value: 10,
      type: 'gift_card',
      available: true,
      image: '/rewards/coffee.jpg',
      descriptionLong: 'Enjoy a complimentary coffee at participating locations. Valid for 6 months.',
      terms: 'One per customer per month. Non-transferable.'
    },
    {
      id: '2',
      title: 'Fitness Class Pass',
      description: 'Free fitness class at partner gym',
      category: 'fitness',
      pointsCost: 750,
      value: 25,
      type: 'voucher',
      available: true,
      image: '/rewards/fitness.jpg',
      descriptionLong: 'Access any group fitness class at our partner gym locations. Includes yoga, cycling, and strength training.',
      terms: 'Valid for 3 months. Reservation required.'
    },
    {
      id: '3',
      title: 'Wellness Book Bundle',
      description: 'Collection of wellness and nutrition books',
      category: 'education',
      pointsCost: 1000,
      value: 40,
      type: 'product',
      available: true,
      image: '/rewards/books.jpg',
      descriptionLong: 'Curated collection of best-selling wellness books covering nutrition, exercise, and mental health.',
      terms: 'While supplies last. Digital or physical version available.'
    }
  ];

  // Apply filters
  let filteredRewards = rewards;
  if (options.category) {
    filteredRewards = filteredRewards.filter(reward => reward.category === options.category);
  }
  if (options.available !== undefined) {
    filteredRewards = filteredRewards.filter(reward => reward.available === options.available);
  }

  return filteredRewards.slice(0, options.limit || 50);
}

export async function claimWellnessReward(userId: string, rewardId: string): Promise<any> {
  // In production, check user points, deduct points, and issue reward
  return {
    success: true,
    rewardId,
    claimedAt: new Date(),
    estimatedDelivery: '3-5 business days',
    confirmationCode: `WR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  };
}

// Wellness Coaching System
export async function getWellnessCoaches(options: {
  specialty?: string;
  language?: string;
  availability?: string;
  rating?: number;
  limit?: number;
  offset?: number;
}): Promise<{ coaches: WellnessCoach[]; total: number }> {
  // Demo coaches
  const coaches: WellnessCoach[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      credentials: 'Certified Wellness Coach, RYT-500',
      specialties: ['yoga', 'meditation', 'stress_management'],
      languages: ['English'],
      rating: 4.9,
      reviewCount: 127,
      experience: 8,
      sessionPrice: 75,
      introductoryPrice: 50,
      image: '/coaches/sarah.jpg',
      bio: 'Sarah specializes in holistic wellness combining physical fitness with mental clarity.',
      availability: 'available',
      nextAvailableSlot: new Date('2024-11-25T10:00:00Z')
    },
    {
      id: '2',
      name: 'Michael Chen',
      credentials: 'MS, CNS, Certified Nutritionist',
      specialties: ['nutrition', 'weight_management', 'meal_planning'],
      languages: ['English', 'Mandarin'],
      rating: 4.8,
      reviewCount: 89,
      experience: 6,
      sessionPrice: 85,
      introductoryPrice: 60,
      image: '/coaches/michael.jpg',
      bio: 'Michael helps clients achieve their health goals through evidence-based nutrition coaching.',
      availability: 'available',
      nextAvailableSlot: new Date('2024-11-24T14:00:00Z')
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      credentials: 'NASM-CPT, Behavioral Change Specialist',
      specialties: ['fitness', 'behavior_change', 'motivation'],
      languages: ['English', 'Spanish'],
      rating: 4.7,
      reviewCount: 156,
      experience: 10,
      sessionPrice: 80,
      introductoryPrice: 55,
      image: '/coaches/emma.jpg',
      bio: 'Emma focuses on creating sustainable fitness habits and transforming lifestyle patterns.',
      availability: 'limited',
      nextAvailableSlot: new Date('2024-11-28T09:00:00Z')
    }
  ];

  // Apply filters
  let filteredCoaches = coaches;
  if (options.specialty) {
    filteredCoaches = filteredCoaches.filter(coach =>
      coach.specialties.includes(options.specialty!)
    );
  }
  if (options.language) {
    filteredCoaches = filteredCoaches.filter(coach =>
      coach.languages.includes(options.language!)
    );
  }
  if (options.rating) {
    filteredCoaches = filteredCoaches.filter(coach => coach.rating >= options.rating!);
  }

  const total = filteredCoaches.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  const paginatedCoaches = filteredCoaches.slice(offset, offset + limit);

  return { coaches: paginatedCoaches, total };
}

export async function getAvailableSlots(
  coachId: string,
  dateFrom: string,
  dateTo: string
): Promise<AvailableSlot[]> {
  // Demo available slots
  const slots: AvailableSlot[] = [
    {
      id: '1',
      coachId,
      startTime: new Date('2024-11-25T10:00:00Z'),
      endTime: new Date('2024-11-25T11:00:00Z'),
      type: 'initial',
      available: true
    },
    {
      id: '2',
      coachId,
      startTime: new Date('2024-11-25T14:00:00Z'),
      endTime: new Date('2024-11-25T15:00:00Z'),
      type: 'followup',
      available: true
    },
    {
      id: '3',
      coachId,
      startTime: new Date('2024-11-26T09:00:00Z'),
      endTime: new Date('2024-11-26T10:00:00Z'),
      type: 'initial',
      available: true
    }
  ];

  return slots;
}

export async function bookCoachingSession(
  userId: string,
  coachId: string,
  slotId: string,
  type: string,
  notes?: string
): Promise<CoachingSession> {
  const session: CoachingSession = {
    id: crypto.randomUUID(),
    userId,
    coachId,
    slotId,
    type: type as any,
    status: 'confirmed',
    startTime: new Date('2024-11-25T10:00:00Z'),
    endTime: new Date('2024-11-25T11:00:00Z'),
    notes,
    createdAt: new Date(),
    paymentStatus: 'pending'
  };

  if (!coachingSessionsStore[userId]) {
    coachingSessionsStore[userId] = [];
  }
  coachingSessionsStore[userId].push(session);

  return session;
}

export async function getCoachingSessions(
  userId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ sessions: CoachingSession[]; total: number }> {
  let sessions = coachingSessionsStore[userId] || [];

  // Apply filters
  if (options.status) {
    sessions = sessions.filter(session => session.status === options.status);
  }

  // Sort by start time descending
  sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const total = sessions.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  const paginatedSessions = sessions.slice(offset, offset + limit);

  return { sessions: paginatedSessions, total };
}

// Wellness Statistics
export async function getWellnessStats(userId: string, period: string): Promise<any> {
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const [metrics, incentives] = await Promise.all([
    getHealthMetrics(userId, period),
    getWellnessIncentives(userId, {})
  ]);

  return {
    healthMetrics: metrics,
    activeIncentives: incentives.filter(i => i.status === 'in_progress').length,
    completedIncentives: incentives.filter(i => i.status === 'completed').length,
    totalPointsEarned: 250,
    currentStreak: 5,
    averageDailySteps: metrics.steps,
    sleepQuality: 'Good',
    connectedDevices: (await getWellnessIntegrations(userId)).filter(i => i.isConnected).length
  };
}