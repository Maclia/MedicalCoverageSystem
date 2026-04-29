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
}

export interface HealthData {
  id: string;
  type: 'steps' | 'calories' | 'active' | 'sleep' | 'heartRate';
  value: number;
  timestamp: string | Date;
  source: string;
}

export interface WellnessIntegration {
  id: string;
  provider: string;
  isConnected: boolean;
  lastSync?: string | Date;
  syncStatus?: 'connected' | 'syncing' | 'error' | 'disconnected';
  dataTypes: string[];
}

export interface WellnessIncentive {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'expired';
  progress: number;
  points: number;
  startDate?: string | Date;
  endDate?: string | Date;
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
  rating?: number;
  reviewCount?: number;
  sessionPrice?: number;
  bio?: string;
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