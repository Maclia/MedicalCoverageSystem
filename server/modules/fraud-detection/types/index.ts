// Fraud Detection Types and Interfaces

export interface FraudAlert {
  id: number;
  alertId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_review' | 'investigating' | 'resolved' | 'dismissed';
  description: string;
  entityType: 'member' | 'provider' | 'claim';
  entityId: number;
  riskScore: number;
  triggeredRules: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: number;
}

export interface FraudRule {
  id: number;
  ruleName: string;
  ruleType: 'threshold' | 'pattern' | 'behavioral' | 'network';
  description: string;
  conditions: RuleCondition;
  actions: RuleAction[];
  riskWeight: number;
  priority: number;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  operator: 'and' | 'or';
  conditions: ConditionItem[];
}

export interface ConditionItem {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
  weight?: number;
}

export interface RuleAction {
  type: 'alert' | 'block' | 'flag' | 'notify' | 'escalate';
  parameters: Record<string, any>;
}

export interface FraudInvestigation {
  id: number;
  investigationId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'suspended';
  priority: 'low' | 'medium' | 'high' | 'critical';
  alertId: string;
  assignedInvestigator?: number;
  findings: InvestigationFinding[];
  actions: InvestigationAction[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface InvestigationFinding {
  id: number;
  findingType: 'evidence' | 'pattern' | 'connection' | 'anomaly';
  description: string;
  evidence: Record<string, any>;
  confidence: number;
  createdAt: Date;
}

export interface InvestigationAction {
  id: number;
  actionType: 'review' | 'contact' | 'suspend' | 'terminate' | 'refer';
  description: string;
  performedBy: number;
  performedAt: Date;
  result?: string;
}

export interface MLModel {
  id: number;
  modelName: string;
  algorithm: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDataSize: number;
  features: string[];
  hyperparameters: Record<string, any>;
  isActive: boolean;
  deployedAt: Date;
  lastRetrained?: Date;
}

export interface BehavioralProfile {
  id: number;
  entityType: 'member' | 'provider' | 'facility';
  entityId: number;
  profileData: {
    claimFrequency: number;
    averageAmount: number;
    serviceTypes: string[];
    geographicPatterns: GeographicPattern[];
    temporalPatterns: TemporalPattern[];
    anomalyScores: AnomalyScore[];
  };
  lastUpdated: Date;
  confidence: number;
}

export interface GeographicPattern {
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  };
  frequency: number;
  lastUsed: Date;
}

export interface TemporalPattern {
  dayOfWeek: number;
  hourOfDay: number;
  frequency: number;
  averageAmount: number;
}

export interface AnomalyScore {
  metric: string;
  score: number;
  threshold: number;
  detectedAt: Date;
}

export interface NetworkAnalysis {
  id: number;
  networkId: string;
  networkType: 'provider_ring' | 'member_cluster' | 'facility_network';
  entities: NetworkEntity[];
  connections: NetworkConnection[];
  riskScore: number;
  analysisDate: Date;
  findings: string[];
}

export interface NetworkEntity {
  entityType: 'member' | 'provider' | 'facility';
  entityId: number;
  role: 'central' | 'peripheral' | 'connector';
  riskContribution: number;
}

export interface NetworkConnection {
  fromEntity: NetworkEntity;
  toEntity: NetworkEntity;
  connectionType: 'shared_provider' | 'geographic' | 'temporal' | 'financial';
  strength: number;
  frequency: number;
}

export interface RiskScore {
  id: number;
  entityType: 'member' | 'provider' | 'facility' | 'claim';
  entityId: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  lastCalculated: Date;
  expiresAt: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface FraudAnalytics {
  timePeriod: string;
  totalAlerts: number;
  alertsByRiskLevel: Record<string, number>;
  alertsByStatus: Record<string, number>;
  topFraudTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  detectionAccuracy: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  financialImpact: {
    preventedLoss: number;
    detectedFraud: number;
    investigationCosts: number;
  };
  trends: Array<{
    date: string;
    alerts: number;
    riskScore: number;
  }>;
}

export interface ClaimAnalysisRequest {
  claimId?: number;
  memberId: number;
  providerId?: number;
  amount: number;
  diagnosisCodes?: string[];
  serviceDate: string;
  location?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
  };
}

export interface ClaimAnalysisResult {
  claimId?: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  triggeredRules: string[];
  behavioralAnomalies: string[];
  networkRisks: string[];
  mlPredictions: MLPrediction[];
  recommendations: string[];
  analysisTimestamp: Date;
}

export interface MLPrediction {
  modelId: number;
  modelName: string;
  prediction: number;
  confidence: number;
  features: Record<string, any>;
}

export interface AlertNotification {
  alertId: string;
  recipientType: 'user' | 'team' | 'system';
  recipientId: number;
  channel: 'email' | 'sms' | 'dashboard' | 'api';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}
