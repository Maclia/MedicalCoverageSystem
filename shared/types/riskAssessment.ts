export interface RiskAssessment {
  id: string;
  memberId: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  assessmentDate: Date;
  nextAssessmentDue: Date;
  categoryScores: {
    chronicDisease: RiskCategoryScore;
    lifestyle: RiskCategoryScore;
    preventive: RiskCategoryScore;
    mentalHealth: RiskCategoryScore;
    environmental: RiskCategoryScore;
  };
  topRiskFactors: RiskFactor[];
  recommendations: RiskRecommendation[];
  trendAnalysis: RiskTrendAnalysis;
  complianceLevel: number; // 0-100
  actionItems: RiskActionItem[];
  lastUpdated: Date;
  assessedBy: 'system' | 'health_coach' | 'medical_provider';
  confidenceScore: number; // 0-100
}

export interface RiskCategoryScore {
  category: string;
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'critical';
  factors: RiskFactor[];
  weight: number; // Relative importance (0-1)
  trend: 'improving' | 'stable' | 'declining';
  lastEvaluated: Date;
}

export interface RiskFactor {
  id: string;
  name: string;
  category: string;
  value: number | string | boolean;
  unit?: string;
  normalRange?: {
    min: number;
    max: number;
  };
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  impact: number; // 0-100 on overall score
  trend: 'improving' | 'stable' | 'declining';
  dataPoints: RiskDataPoint[];
  confidence: number; // 0-100
  source: string;
  lastUpdated: Date;
  description?: string;
}

export interface RiskDataPoint {
  timestamp: Date;
  value: number | string | boolean;
  source: string;
  confidence?: number;
  notes?: string;
}

export interface RiskRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'lifestyle' | 'medical' | 'preventive' | 'monitoring' | 'education';
  impact: number; // Expected impact on risk score (0-100)
  effort: number; // Required effort (0-100)
  timeframe: string;
  specificActions: string[];
  resources: RiskResource[];
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  targetDate?: Date;
  completedDate?: Date;
  outcome?: string;
  acceptanceRate?: number;
}

export interface RiskResource {
  id: string;
  type: 'article' | 'video' | 'tool' | 'service' | 'program' | 'provider';
  title: string;
  description: string;
  url?: string;
  provider?: string;
  cost?: number;
  duration?: string;
  effectiveness?: number; // 0-100
  category: string;
}

export interface RiskTrendAnalysis {
  period: string;
  overallTrend: 'improving' | 'stable' | 'declining';
  trendRate: number; // Points per month
  projectedRisk: number; // Risk score at next assessment
  categoryTrends: {
    [category: string]: {
      trend: 'improving' | 'stable' | 'declining';
      rate: number;
      projectedScore: number;
    };
  };
  seasonality?: RiskSeasonality;
  significantChanges: RiskSignificantChange[];
}

export interface RiskSeasonality {
  pattern: 'seasonal' | 'monthly' | 'weekly' | 'none';
  peaks: string[]; // Months/weeks with higher risk
  valleys: string[]; // Months/weeks with lower risk
  confidence: number;
}

export interface RiskSignificantChange {
  date: Date;
  category: string;
  previousScore: number;
  newScore: number;
  changeReason: string;
  factors: string[];
}

export interface RiskActionItem {
  id: string;
  memberId: string;
  type: 'assessment' | 'screening' | 'lifestyle_change' | 'medication_review' | 'follow_up';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  assignedTo?: string; // Healthcare provider or coach
  completionDate?: Date;
  outcome?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  riskImpact?: number; // Impact on overall risk score
}

export interface RiskAlert {
  id: string;
  memberId: string;
  type: 'threshold_breach' | 'rapid_decline' | 'missed_target' | 'new_risk_factor' | 'recommendation';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  category: string;
  data?: any;
  actionRequired: boolean;
  actionItems: string[];
  createdAt: Date;
  read: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

export interface RiskPrediction {
  id: string;
  memberId: string;
  predictionType: 'disease_risk' | 'complication_risk' | 'lifestyle_risk' | 'cost_projection';
  targetOutcome: string;
  probability: number; // 0-100
  confidence: number; // 0-100
  timeframe: string;
  factors: RiskPredictionFactor[];
  model: string;
  version: string;
  createdAt: Date;
  validUntil: Date;
  interventions?: RiskIntervention[];
}

export interface RiskPredictionFactor {
  name: string;
  value: number | string | boolean;
  impact: number; // Contribution to prediction (0-100)
  category: string;
  modifiable: boolean;
  currentLevel: string;
  targetLevel?: string;
}

export interface RiskIntervention {
  id: string;
  name: string;
  description: string;
  type: string;
  effectiveness: number; // 0-100
  feasibility: number; // 0-100
  cost: number;
  timeframe: string;
  requiredEffort: number; // 0-100
  resources: string[];
  provider?: string;
}

export interface RiskBenchmark {
  id: string;
  category: string;
  metric: string;
  population: string;
  average: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  riskThresholds: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  lastUpdated: Date;
  sampleSize: number;
}

export interface RiskAssessmentConfig {
  enabledCategories: string[];
  weights: {
    [category: string]: number;
  };
  thresholds: {
    [category: string]: {
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
  };
  assessmentFrequency: string;
  autoAlerts: boolean;
  notificationPreferences: RiskNotificationPreferences;
}

export interface RiskNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  minSeverity: 'info' | 'warning' | 'critical' | 'emergency';
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface RiskAssessmentHistory {
  id: string;
  memberId: string;
  assessmentId: string;
  assessmentDate: Date;
  overallRiskScore: number;
  riskLevel: string;
  categoryScores: RiskCategoryScore[];
  majorChanges: string[];
  notes?: string;
  assessor?: string;
}

export interface RiskDashboard {
  currentAssessment: RiskAssessment;
  historicalData: RiskAssessmentHistory[];
  alerts: RiskAlert[];
  upcomingAssessments: RiskActionItem[];
  recommendations: RiskRecommendation[];
  benchmarks: RiskBenchmark[];
  predictions: RiskPrediction[];
  insights: RiskInsight[];
}

export interface RiskInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'achievement' | 'concern' | 'opportunity' | 'trend';
  impact: 'positive' | 'negative' | 'neutral';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions: string[];
  data: any;
  createdAt: Date;
}