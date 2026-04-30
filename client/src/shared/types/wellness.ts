/**
 * Shared TypeScript types for Wellness feature
 * Used by both client and wellness service
 */

export interface HealthMetrics {
  steps: number;
  calories: number;
  exercise: number;
  sleep: number;
  heartRate?: number;
  weight?: number;
}

export interface HealthData {
  id: string;
  type: 'steps' | 'calories' | 'active' | 'sleep' | 'heartRate' | 'exercise' | 'weight';
  value: number;
  unit?: string;
  timestamp: string | Date;
  source: string;
}

export interface WellnessIntegration {
  id: string;
  provider: string;
  isConnected: boolean;
  lastSync?: string | Date | null;
  syncStatus?: 'connected' | 'syncing' | 'error' | 'disconnected';
  dataTypes: string[];
  permissions?: string[];
  settings?: {
    autoSync: boolean;
    syncFrequency: number;
    notifications: boolean;
    dataRetention: number;
  };
}

export interface WellnessIncentive {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'expired' | 'in_progress';
  progress: number;
  points: number;
  startDate?: string | Date;
  endDate?: string | Date;
  type?: 'points' | 'premium_discount' | 'gift_card' | 'wellness_credit' | 'cash_reward';
  value?: number;
  currency?: string;
  requirements?: {
    metricType: string;
    target: number;
    timeframe: string;
    frequency: string;
  }[] | any;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  isActive?: boolean;
  rewards?: any[];
}

export interface WellnessReward {
  id: string;
  title: string;
  description: string;
  pointsCost?: number;
  available: boolean;
  imageUrl?: string;
}

export interface WellnessCoach {
  id: string;
  name: string;
  image?: string;
  specialties?: string[];
  specialty?: string;
  rating?: number;
  reviewCount?: number;
  sessionPrice?: number;
  bio?: string;
  availability?: string[];
  nextAvailableSlot?: string | Date;
}

export interface CoachingSession {
  id: string;
  type: string;
  startTime?: string | Date;
  endTime?: string | Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  coachId: string;
}

export interface WellnessStats {
  activeIncentives?: number;
  completedIncentives?: number;
  connectedDevices?: number;
  upcomingSessions?: number;
  pointsToNextReward?: number;
  currentStreak?: number;
  totalPointsEarned?: number;
  healthMetrics?: HealthMetrics;
}

export interface HealthGoal {
  id: string;
  title: string;
  description?: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline?: string | Date;
  status: 'active' | 'completed' | 'failed';
}

export interface AvailableSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  available: boolean;
}