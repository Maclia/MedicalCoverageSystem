export interface WellnessIntegration {
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
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HealthData {
  id: string;
  type: string;
  value: number;
  unit: string;
  source: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}

export interface HealthMetrics {
  steps: number;
  calories: number;
  heartRate: number;
  sleep: number;
  weight: number;
  exercise: number;
  period: string;
}

export interface WellnessIncentive {
  id: string;
  title: string;
  description: string;
  category: 'physical' | 'mental' | 'nutrition' | 'sleep' | 'social' | 'preventive';
  type: 'challenge' | 'goal' | 'habit';
  points: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'active' | 'in_progress' | 'completed' | 'expired';
  progress: number; // percentage
  startDate: Date;
  endDate: Date;
  requirements: string[];
  rewards: string[];
  icon?: string;
}

export interface WellnessReward {
  id: string;
  title: string;
  description: string;
  category: 'fitness' | 'nutrition' | 'retail' | 'education' | 'services';
  pointsCost: number;
  value: number;
  type: 'gift_card' | 'voucher' | 'product' | 'service';
  available: boolean;
  image: string;
  descriptionLong?: string;
  terms?: string;
  partnerName?: string;
  expiryDate?: Date;
}

export interface WellnessCoach {
  id: string;
  name: string;
  credentials: string;
  specialties: string[];
  languages: string[];
  rating: number;
  reviewCount: number;
  experience: number; // years
  sessionPrice: number;
  introductoryPrice?: number;
  image: string;
  bio: string;
  availability: 'available' | 'limited' | 'unavailable';
  nextAvailableSlot?: Date;
  certifications: string[];
}

export interface CoachingSession {
  id: string;
  userId: string;
  coachId: string;
  slotId: string;
  type: 'initial' | 'followup' | 'group';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  startTime: Date;
  endTime: Date;
  notes?: string;
  joinUrl?: string;
  recordingUrl?: string;
  feedback?: {
    rating: number;
    comment: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  price?: number;
}

export interface AvailableSlot {
  id: string;
  coachId: string;
  startTime: Date;
  endTime: Date;
  type: 'initial' | 'followup' | 'group';
  available: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
}

export interface HealthGoal {
  id: string;
  type: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

export interface WellnessStats {
  healthMetrics: HealthMetrics;
  activeIncentives: number;
  completedIncentives: number;
  totalPointsEarned: number;
  currentStreak: number;
  averageDailySteps: number;
  sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  connectedDevices: number;
  upcomingSessions: number;
  pointsToNextReward: number;
}

export interface DeviceConnectionData {
  authUrl?: string;
  state?: string;
  message?: string;
  integration?: WellnessIntegration;
  success?: boolean;
}

export interface SyncResult {
  syncedRecords: number;
  lastSync: Date;
  dataTypes: string[];
  errors?: string[];
}

export interface ManualHealthEntry {
  type: string;
  value: number;
  unit: string;
  timestamp?: Date;
  notes?: string;
}

export interface WellnessNotificationSettings {
  dailyReminders: boolean;
  achievementAlerts: boolean;
  weeklyProgress: boolean;
  coachReminders: boolean;
  deviceSyncAlerts: boolean;
  reminderTime: string; // HH:mm format
}

export interface WellnessProfile {
  preferences: {
    activities: string[];
    goals: string[];
    privacy: {
      shareData: boolean;
      anonymizeData: boolean;
    };
  };
  notifications: WellnessNotificationSettings;
  connectedDevices: WellnessIntegration[];
  healthGoals: HealthGoal[];
  totalPoints: number;
  level: number;
  badges: string[];
  joinedAt: Date;
  lastActiveAt: Date;
}