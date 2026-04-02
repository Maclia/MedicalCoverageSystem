import { createLogger } from '../utils/logger.js';
import {
  externalDatabaseService,
  ExternalDatabaseResult,
  MemberId,
  ProviderId,
} from './ExternalDatabaseService.js';
import {
  geolocationService,
  GeolocationResult,
  LocationData,
} from './GeolocationService.js';
import {
  anomalyDetectionService,
  AnomalyDetectionResult,
  BehavioralPattern,
} from './AnomalyDetectionService.js';
import { nlpService, NlpAnalysisResult } from './NlpService.js';

const logger = createLogger();

export interface FraudIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  riskScore: number;
}

export interface ClaimFraudAssessment {
  claimId: string;
  memberId: string;
  providerId: string;
  overallRiskScore: number; // 0-100
  fraudProbability: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendations: string[];
  timestamp: Date;
  details: {
    externalDatabase?: ExternalDatabaseResult[];
    geolocation?: GeolocationResult;
    anomalies?: AnomalyDetectionResult[];
    nlpAnalysis?: NlpAnalysisResult;
  };
}

export interface EnrollmentFraudAssessment {
  enrollmentId: string;
  memberId: string;
  overallRiskScore: number;
  fraudProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendations: string[];
  timestamp: Date;
}

export interface ProviderFraudAssessment {
  providerId: string;
  complianceScore: number; // 0-100 (higher is better)
  fraudRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendations: string[];
  lastAuditDate: Date;
}

export class FraudDetectionEngine {
  constructor() {
    logger.info(`Fraud Detection Engine initialized`);
  }

  /**
   * Perform comprehensive claim fraud assessment
   */
  async assessClaimFraud(
    claimData: {
      claimId: string;
      memberId: string;
      providerId: string;
      claimAmount: number;
      claimType: string;
      serviceDate: Date;
      submittedDate: Date;
      memberInfo: MemberId;
      providerInfo: ProviderId;
      ipAddress?: string;
      userAgent?: string;
      clinicalNotes?: string;
      memberLocationData?: LocationData[];
    },
    historicalClaims?: any[]
  ): Promise<ClaimFraudAssessment> {
    const assessment: ClaimFraudAssessment = {
      claimId: claimData.claimId,
      memberId: claimData.memberId,
      providerId: claimData.providerId,
      overallRiskScore: 0,
      fraudProbability: 0,
      riskLevel: 'low',
      indicators: [],
      recommendations: [],
      timestamp: new Date(),
      details: {},
    };

    try {
      logger.info(`Assessing claim fraud`, {
        claimId: claimData.claimId,
        memberId: claimData.memberId,
      });

      // 1. Check external fraud databases
      if (claimData.memberInfo) {
        const externalResults = await externalDatabaseService.checkMemberFraudHistory(
          claimData.memberInfo
        );
        assessment.details.externalDatabase = externalResults;

        externalResults.forEach(result => {
          if (result.found) {
            assessment.indicators.push({
              type: 'External Database Match',
              severity: this.mapRiskToSeverity(result.riskScore),
              description: `Member found in ${result.source.toUpperCase()} fraud database`,
              evidence: { source: result.source, severity: result.severity },
              riskScore: result.riskScore,
            });
          }
        });
      }

      // 2. Analyze geolocation and device
      if (claimData.ipAddress) {
        const geoResult = await geolocationService.analyzeLocation(
          claimData.ipAddress
        );
        assessment.details.geolocation = geoResult;

        if (geoResult.isAnomalous) {
          assessment.indicators.push({
            type: 'Geolocation Anomaly',
            severity: this.mapRiskToSeverity(geoResult.riskScore),
            description: `Unusual location or access method detected`,
            evidence: { location: geoResult.location, factors: geoResult.riskFactors },
            riskScore: geoResult.riskScore,
          });
        }

        // Analyze device if available
        if (claimData.userAgent) {
          const deviceAnalysis = geolocationService.analyzeDevice(
            claimData.claimId,
            claimData.userAgent,
            claimData.memberId
          );

          const correlation = await geolocationService.correlateLocationAndDevice(
            claimData.ipAddress,
            deviceAnalysis,
            claimData.memberLocationData || []
          );

          if (correlation.isAnomalous) {
            assessment.indicators.push({
              type: 'Location-Device Correlation',
              severity: this.mapRiskToSeverity(correlation.riskScore),
              description: `Suspicious location-device combination`,
              evidence: { factors: correlation.factors },
              riskScore: correlation.riskScore,
            });
          }
        }
      }

      // 3. Detect claim anomalies
      const anomalyResults: AnomalyDetectionResult[] = [];

      // Amount anomaly
      const amountAnomaly = anomalyDetectionService.detectClaimAmountAnomaly(
        claimData.memberId,
        claimData.claimAmount,
        claimData.claimType
      );
      anomalyResults.push(amountAnomaly);

      if (amountAnomaly.isAnomaly) {
        assessment.indicators.push({
          type: 'Claim Amount Anomaly',
          severity: this.mapRiskToSeverity(amountAnomaly.advisoryScore),
          description: amountAnomaly.explanation,
          evidence: {
            deviations: amountAnomaly.deviations,
            amount: claimData.claimAmount,
          },
          riskScore: amountAnomaly.advisoryScore,
        });
      }

      // Frequency anomaly
      const frequencyAnomaly = anomalyDetectionService.detectClaimFrequencyAnomaly(
        claimData.memberId
      );
      anomalyResults.push(frequencyAnomaly);

      if (frequencyAnomaly.isAnomaly) {
        assessment.indicators.push({
          type: 'Claim Frequency Anomaly',
          severity: this.mapRiskToSeverity(frequencyAnomaly.advisoryScore),
          description: frequencyAnomaly.explanation,
          evidence: { deviations: frequencyAnomaly.deviations },
          riskScore: frequencyAnomaly.advisoryScore,
        });
      }

      // Billing pattern anomaly
      if (historicalClaims && historicalClaims.length > 0) {
        const billingAnomaly = anomalyDetectionService.detectBillingPatternAnomaly(
          claimData.memberId,
          historicalClaims
        );

        if (billingAnomaly.isAnomaly) {
          assessment.indicators.push({
            type: 'Billing Pattern Anomaly',
            severity: this.mapRiskToSeverity(billingAnomaly.advisoryScore),
            description: billingAnomaly.explanation,
            evidence: { deviations: billingAnomaly.deviations },
            riskScore: billingAnomaly.advisoryScore,
          });
        }
      }

      assessment.details.anomalies = anomalyResults;

      // 4. NLP analysis of clinical notes
      if (claimData.clinicalNotes) {
        const nlpResult = await nlpService.analyzeClinicalNotes(
          claimData.clinicalNotes
        );
        assessment.details.nlpAnalysis = nlpResult;

        if (nlpResult.riskScore > 30) {
          assessment.indicators.push({
            type: 'Suspicious Clinical Notes',
            severity: this.mapRiskToSeverity(nlpResult.riskScore),
            description: `Clinical notes contain suspicious language or patterns`,
            evidence: {
              patterns: nlpResult.suspiciousPatterns,
              sentiment: nlpResult.sentiment,
            },
            riskScore: nlpResult.riskScore,
          });
        }
      }

      // 5. Calculate overall fraud assessment
      this.calculateOverallAssessment(assessment);

      // 6. Generate recommendations
      this.generateRecommendations(assessment);

      logger.info(`Claim fraud assessment completed`, {
        claimId: claimData.claimId,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.overallRiskScore,
        indicatorCount: assessment.indicators.length,
      });
    } catch (error) {
      logger.error(`Claim fraud assessment failed`, {
        claimId: claimData.claimId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return assessment;
  }

  /**
   * Perform comprehensive enrollment fraud assessment
   */
  async assessEnrollmentFraud(
    enrollmentData: {
      enrollmentId: string;
      memberId: string;
      memberInfo: MemberId;
      ipAddress?: string;
      userAgent?: string;
      submittedData?: string;
      memberLocationData?: LocationData[];
    }
  ): Promise<EnrollmentFraudAssessment> {
    const assessment: EnrollmentFraudAssessment = {
      enrollmentId: enrollmentData.enrollmentId,
      memberId: enrollmentData.memberId,
      overallRiskScore: 0,
      fraudProbability: 0,
      riskLevel: 'low',
      indicators: [],
      recommendations: [],
      timestamp: new Date(),
    };

    try {
      logger.info(`Assessing enrollment fraud`, {
        enrollmentId: enrollmentData.enrollmentId,
        memberId: enrollmentData.memberId,
      });

      // 1. Check external fraud databases
      const externalResults = await externalDatabaseService.checkMemberFraudHistory(
        enrollmentData.memberInfo
      );

      externalResults.forEach(result => {
        if (result.found) {
          assessment.indicators.push({
            type: 'Fraud History Detected',
            severity: this.mapRiskToSeverity(result.riskScore),
            description: `Member has previous fraud history in ${result.source}`,
            evidence: { source: result.source },
            riskScore: result.riskScore,
          });
        }
      });

      // 2. Analyze geolocation
      if (enrollmentData.ipAddress) {
        const geoResult = await geolocationService.analyzeLocation(
          enrollmentData.ipAddress
        );

        if (geoResult.isAnomalous) {
          assessment.indicators.push({
            type: 'Suspicious Enrollment Location',
            severity: this.mapRiskToSeverity(geoResult.riskScore),
            description: 'Enrollment from unusual location or VPN',
            evidence: { location: geoResult.location },
            riskScore: geoResult.riskScore,
          });
        }
      }

      // 3. NLP analysis of enrollment data
      if (enrollmentData.submittedData) {
        const nlpResult = await nlpService.analyzeClinicalNotes(
          enrollmentData.submittedData
        );

        if (nlpResult.riskScore > 25) {
          assessment.indicators.push({
            type: 'Suspicious Enrollment Data',
            severity: this.mapRiskToSeverity(nlpResult.riskScore),
            description: 'Enrollment data contains inconsistencies or fraud indicators',
            evidence: { patterns: nlpResult.suspiciousPatterns },
            riskScore: nlpResult.riskScore,
          });
        }
      }

      // Calculate overall assessment
      this.calculateOverallEnrollmentAssessment(assessment);

      // Generate recommendations
      this.generateEnrollmentRecommendations(assessment);

      logger.info(`Enrollment fraud assessment completed`, {
        enrollmentId: enrollmentData.enrollmentId,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.overallRiskScore,
      });
    } catch (error) {
      logger.error(`Enrollment fraud assessment failed`, {
        enrollmentId: enrollmentData.enrollmentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return assessment;
  }

  /**
   * Assess provider fraud risk
   */
  async assessProviderFraud(
    providerId: string,
    providerInfo: ProviderId,
    claimHistory?: any[]
  ): Promise<ProviderFraudAssessment> {
    const assessment: ProviderFraudAssessment = {
      providerId,
      complianceScore: 100,
      fraudRiskScore: 0,
      riskLevel: 'low',
      indicators: [],
      recommendations: [],
      lastAuditDate: new Date(),
    };

    try {
      logger.info(`Assessing provider fraud`, { providerId });

      // 1. Check external database for provider fraud history
      const externalResults = await externalDatabaseService.checkProviderFraudHistory(
        providerInfo
      );

      externalResults.forEach(result => {
        if (result.found) {
          assessment.indicators.push({
            type: 'Provider Fraud History',
            severity: this.mapRiskToSeverity(result.riskScore),
            description: `Provider has fraud history`,
            evidence: { source: result.source },
            riskScore: result.riskScore,
          });
          assessment.complianceScore -= 20;
        }
      });

      // 2. Analyze claim patterns
      if (claimHistory && claimHistory.length > 0) {
        // Check for unusual billing patterns
        const billingAnomaly = anomalyDetectionService.detectBillingPatternAnomaly(
          providerId,
          claimHistory
        );

        if (billingAnomaly.isAnomaly) {
          assessment.indicators.push({
            type: 'Unusual Billing Pattern',
            severity: this.mapRiskToSeverity(billingAnomaly.advisoryScore),
            description: billingAnomaly.explanation,
            evidence: {
              pattern: billingAnomaly.method,
            },
            riskScore: billingAnomaly.advisoryScore,
          });
          assessment.complianceScore -= 15;
        }
      }

      // Calculate fraud risk score
      this.calculateProviderAssessment(assessment);

      // Generate recommendations
      this.generateProviderRecommendations(assessment);

      logger.info(`Provider fraud assessment completed`, {
        providerId,
        riskLevel: assessment.riskLevel,
        fraudRiskScore: assessment.fraudRiskScore,
        complianceScore: assessment.complianceScore,
      });
    } catch (error) {
      logger.error(`Provider fraud assessment failed`, {
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return assessment;
  }

  /**
   * Calculate overall fraud assessment
   */
  private calculateOverallAssessment(assessment: ClaimFraudAssessment): void {
    if (assessment.indicators.length === 0) {
      assessment.overallRiskScore = 0;
      assessment.fraudProbability = 0;
      assessment.riskLevel = 'low';
      return;
    }

    // Weighted average of risk scores
    const weights = {
      'External Database Match': 0.30,
      'Geolocation Anomaly': 0.15,
      'Location-Device Correlation': 0.15,
      'Claim Amount Anomaly': 0.20,
      'Claim Frequency Anomaly': 0.10,
      'Billing Pattern Anomaly': 0.15,
      'Suspicious Clinical Notes': 0.15,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    assessment.indicators.forEach(indicator => {
      const weight = weights[indicator.type as keyof typeof weights] || 0.1;
      weightedScore += indicator.riskScore * weight;
      totalWeight += weight;
    });

    assessment.overallRiskScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    assessment.fraudProbability = assessment.overallRiskScore / 100;
    assessment.riskLevel = this.mapScoreToRiskLevel(assessment.overallRiskScore);
  }

  /**
   * Calculate overall enrollment assessment
   */
  private calculateOverallEnrollmentAssessment(
    assessment: EnrollmentFraudAssessment
  ): void {
    if (assessment.indicators.length === 0) {
      assessment.overallRiskScore = 0;
      assessment.fraudProbability = 0;
      assessment.riskLevel = 'low';
      return;
    }

    const averageScore =
      assessment.indicators.reduce((sum, ind) => sum + ind.riskScore, 0) /
      assessment.indicators.length;

    assessment.overallRiskScore = Math.min(100, averageScore * 1.2);
    assessment.fraudProbability = assessment.overallRiskScore / 100;
    assessment.riskLevel = this.mapScoreToRiskLevel(assessment.overallRiskScore);
  }

  /**
   * Calculate provider assessment
   */
  private calculateProviderAssessment(assessment: ProviderFraudAssessment): void {
    assessment.fraudRiskScore = 100 - Math.max(0, assessment.complianceScore);
    assessment.riskLevel = this.mapScoreToRiskLevel(assessment.fraudRiskScore);
  }

  /**
   * Generate recommendations for claim assessment
   */
  private generateRecommendations(assessment: ClaimFraudAssessment): void {
    if (assessment.riskLevel === 'critical') {
      assessment.recommendations = [
        'Deny claim and investigate further',
        'Flag member account for manual review',
        'Contact provider for documentation',
        'Report to compliance team',
      ];
    } else if (assessment.riskLevel === 'high') {
      assessment.recommendations = [
        'Request additional documentation',
        'Verify member information with external sources',
        'Schedule peer-to-peer review',
        'Monitor member for patterns',
      ];
    } else if (assessment.riskLevel === 'medium') {
      assessment.recommendations = [
        'Review claim documentation thoroughly',
        'Verify claims with provider if amount is high',
        'Add to monitoring queue',
      ];
    }
  }

  /**
   * Generate recommendations for enrollment assessment
   */
  private generateEnrollmentRecommendations(assessment: EnrollmentFraudAssessment): void {
    if (assessment.riskLevel === 'critical') {
      assessment.recommendations = [
        'Reject enrollment',
        'Escalate to compliance',
        'Initiate investigation',
      ];
    } else if (assessment.riskLevel === 'high') {
      assessment.recommendations = [
        'Request identity verification',
        'Conduct manual review',
        'Require additional documentation',
      ];
    } else if (assessment.riskLevel === 'medium') {
      assessment.recommendations = [
        'Enhanced documentation review',
        'Monitor account for early fraud indicators',
      ];
    }
  }

  /**
   * Generate recommendations for provider assessment
   */
  private generateProviderRecommendations(assessment: ProviderFraudAssessment): void {
    if (assessment.fraudRiskScore > 70) {
      assessment.recommendations = [
        'Initiate audit',
        'Implement enhanced monitoring',
        'Request compliance certification',
      ];
    } else if (assessment.fraudRiskScore > 40) {
      assessment.recommendations = [
        'Schedule focused audit',
        'Monitor high-value claims',
      ];
    } else {
      assessment.recommendations = ['Continue routine monitoring'];
    }
  }

  /**
   * Map risk score to risk level
   */
  private mapScoreToRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Map risk score to severity
   */
  private mapRiskToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const fraudDetectionEngine = new FraudDetectionEngine();
