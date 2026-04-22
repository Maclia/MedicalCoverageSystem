export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type RiskTrend = 'improving' | 'declining' | 'stable';
export type AlertSeverity = 'emergency' | 'critical' | 'warning' | 'info';

export interface RiskFactorDataPoint {
  timestamp: string;
  value: number;
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: RiskLevel;
  value: number | string;
  unit?: string;
  normalRange?: {
    min: number;
    max: number;
  };
  impact: number;
  trend: RiskTrend;
  dataPoints: RiskFactorDataPoint[];
  lastUpdated: string;
}

export interface RiskActionItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  dueDate?: string;
}

export interface RiskRecommendation {
  id: string;
  title: string;
  description: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  impact: number;
  effort: number;
  timeframe: string;
  specificActions: string[];
}

export interface RiskAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: string;
  actionRequired: boolean;
  acknowledged: boolean;
  read?: boolean;
  acknowledgedAt?: string | Date;
  createdAt: string;
  actionItems: string[];
}

export interface RiskPrediction {
  id: string;
  targetOutcome: string;
  predictionType: string;
  probability: number;
  confidence: number;
  timeframe: string;
  validUntil: string;
  model: string;
  version: string;
}

export interface RiskTrendAnalysis {
  overallTrend: RiskTrend;
  trendRate: number;
}

export interface RiskCategoryScore {
  category: string;
  score: number;
  level: RiskLevel;
}

export interface RiskInsight {
  id: string;
  title: string;
  description: string;
  category?: string;
}

export interface RiskIntervention {
  id: string;
  title: string;
  status: string;
}

export interface RiskBenchmark {
  id: string;
  category: string;
  metric: string;
  value: number;
  population?: string;
}

export interface RiskAssessmentHistory {
  id: string;
  overallRiskScore: number;
  assessedAt: string;
}

export interface RiskAssessment {
  id: string;
  memberId: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  complianceLevel: number;
  trendAnalysis: RiskTrendAnalysis;
  categoryScores: Record<string, RiskCategoryScore>;
  topRiskFactors: RiskFactor[];
  actionItems: RiskActionItem[];
  nextAssessmentDue: string;
  lastUpdated: string;
}

export interface RiskDashboard {
  currentAssessment: RiskAssessment;
  historicalData: RiskAssessmentHistory[];
  alerts: RiskAlert[];
  recommendations: RiskRecommendation[];
  predictions: RiskPrediction[];
  insights: RiskInsight[];
}
