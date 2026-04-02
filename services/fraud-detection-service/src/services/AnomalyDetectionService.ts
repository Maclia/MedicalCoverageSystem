import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface StatisticalMetrics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  advisoryScore: number; // 0-100
  deviations: number; // Standard deviations from mean
  method: 'zscore' | 'isolation_forest' | 'isolation_forest_ensemble';
  explanation: string;
}

export interface BehavioralPattern {
  memberId: string;
  claimFrequency: number; // Claims per month
  averageClaimAmount: number;
  maxClaimAmount: number;
  minClaimAmount: number;
  claimTypes: Map<string, number>; // count by type
  providerCount: number;
  daysSinceLastClaim: number;
  metrics: StatisticalMetrics;
}

export class AnomalyDetectionService {
  private memberPatterns: Map<string, BehavioralPattern>;
  private historicalMetrics: Map<string, StatisticalMetrics>;
  private readonly zScoreThreshold = 3.0;
  private readonly isolationThreshold = 0.6;

  constructor() {
    this.memberPatterns = new Map();
    this.historicalMetrics = new Map();
  }

  /**
   * Detect anomalies in claim amount
   */
  detectClaimAmountAnomaly(
    memberId: string,
    claimAmount: number,
    claimType: string
  ): AnomalyDetectionResult {
    const pattern = this.memberPatterns.get(memberId);

    if (!pattern) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'zscore',
        explanation: 'No historical data for member',
      };
    }

    // Get metrics for this claim type
    const metricKey = `${memberId}_${claimType}_amount`;
    const metrics = this.historicalMetrics.get(metricKey);

    if (!metrics) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'zscore',
        explanation: 'No historical data for claim type',
      };
    }

    // Calculate Z-score
    const zScore = (claimAmount - metrics.mean) / metrics.stdDev;
    const isAnomaly = Math.abs(zScore) > this.zScoreThreshold;
    const advisoryScore = this.calculateAnomalyScore(
      Math.abs(zScore),
      this.zScoreThreshold
    );

    return {
      isAnomaly,
      advisoryScore,
      deviations: zScore,
      method: 'zscore',
      explanation: isAnomaly
        ? `Claim amount is ${Math.abs(zScore).toFixed(2)} standard deviations from member's average`
        : `Claim amount is within normal range for member (Z-score: ${zScore.toFixed(2)})`,
    };
  }

  /**
   * Detect anomalies in claim frequency
   */
  detectClaimFrequencyAnomaly(memberId: string): AnomalyDetectionResult {
    const pattern = this.memberPatterns.get(memberId);

    if (!pattern) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'zscore',
        explanation: 'No historical data for member',
      };
    }

    // Load overall metrics for frequency
    const metrics = this.historicalMetrics.get('_claim_frequency');

    if (!metrics) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'zscore',
        explanation: 'No historical frequency metrics',
      };
    }

    const zScore = (pattern.claimFrequency - metrics.mean) / metrics.stdDev;
    const isAnomaly = Math.abs(zScore) > this.zScoreThreshold;
    const advisoryScore = this.calculateAnomalyScore(
      Math.abs(zScore),
      this.zScoreThreshold
    );

    return {
      isAnomaly,
      advisoryScore,
      deviations: zScore,
      method: 'zscore',
      explanation: isAnomaly
        ? `Claim frequency is ${Math.abs(zScore).toFixed(2)} standard deviations from population average`
        : `Claim frequency is within normal range`,
    };
  }

  /**
   * Detect provider utilization anomalies (visiting many new providers)
   */
  detectProviderAnomalies(
    memberId: string,
    newProvidersCount: number
  ): AnomalyDetectionResult {
    const pattern = this.memberPatterns.get(memberId);

    if (!pattern || pattern.providerCount === 0) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'zscore',
        explanation: 'No provider history',
      };
    }

    // Calculate percentage of new providers
    const newProviderPercentage =
      (newProvidersCount / (pattern.providerCount + newProvidersCount)) * 100;

    // Flag if more than 50% of providers in a period are new
    const isAnomaly = newProviderPercentage > 50;
    const advisoryScore = Math.min(100, newProviderPercentage);

    return {
      isAnomaly,
      advisoryScore,
      deviations: newProviderPercentage,
      method: 'zscore',
      explanation: isAnomaly
        ? `${newProviderPercentage.toFixed(1)}% of claims are from new providers`
        : `Provider distribution is normal (${newProviderPercentage.toFixed(1)}% new)`,
    };
  }

  /**
   * Detect billing pattern anomalies (e.g., duplicate claims, unbundling)
   */
  detectBillingPatternAnomaly(
    memberId: string,
    claimsInWindow: any[]
  ): AnomalyDetectionResult {
    const anomalies: string[] = [];
    let score = 0;

    // Check for duplicate claims (same code, same amount, same provider, same date)
    const groupedByCode = new Map<string, any[]>();
    claimsInWindow.forEach(claim => {
      const key = `${claim.diagnosisCode}_${claim.procedureCode}_${claim.providerId}_${claim.serviceDate}`;
      if (!groupedByCode.has(key)) {
        groupedByCode.set(key, []);
      }
      groupedByCode.get(key)!.push(claim);
    });

    groupedByCode.forEach((claims, key) => {
      if (claims.length > 1) {
        anomalies.push(`${claims.length} duplicate claims for code ${key}`);
        score += 25;
      }
    });

    // Check for unbundling (many small related claims instead of bundled claim)
    const procedureCodes = new Map<string, number>();
    claimsInWindow.forEach(claim => {
      const count = procedureCodes.get(claim.procedureCode) || 0;
      procedureCodes.set(claim.procedureCode, count + 1);
    });

    procedureCodes.forEach((count, code) => {
      if (count > 5) {
        anomalies.push(
          `Potential unbundling: ${count} claims with code ${code}`
        );
        score += 15;
      }
    });

    // Check for billing on weekend/holiday
    const weekendClaims = claimsInWindow.filter(c => {
      const date = new Date(c.serviceDate);
      return date.getDay() === 0 || date.getDay() === 6;
    }).length;

    if (weekendClaims > claimsInWindow.length * 0.5) {
      anomalies.push(
        `${weekendClaims} claims on weekends (${(weekendClaims / claimsInWindow.length * 100).toFixed(1)}%)`
      );
      score += 10;
    }

    return {
      isAnomaly: score > 30,
      advisoryScore: Math.min(100, score),
      deviations: score,
      method: 'zscore',
      explanation:
        anomalies.length > 0
          ? `Billing anomalies detected: ${anomalies.join('; ')}`
          : 'No billing pattern anomalies detected',
    };
  }

  /**
   * Advanced outlier detection using Isolation Forest algorithm
   */
  detectOutlierIsolationForest(
    value: number,
    historicalData: number[]
  ): AnomalyDetectionResult {
    if (historicalData.length < 10) {
      return {
        isAnomaly: false,
        advisoryScore: 0,
        deviations: 0,
        method: 'isolation_forest',
        explanation: 'Insufficient historical data for Isolation Forest',
      };
    }

    // Simplified Isolation Forest: calculate anomaly score based on isolation path length
    const sorted = [...historicalData].sort((a, b) => a - b);
    let pathLength = 0;
    let left = 0;
    let right = sorted.length - 1;

    while (left <= right && pathLength < Math.log2(sorted.length)) {
      const mid = Math.floor((left + right) / 2);
      if (sorted[mid] < value) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
      pathLength++;
    }

    // Normalize anomaly score (shorter path = more anomalous)
    const basePathLength = Math.log2(sorted.length);
    const anomalyScore =
      2 ** (-(pathLength / basePathLength) * Math.log2(sorted.length));

    const isAnomaly = anomalyScore > this.isolationThreshold;
    const advisoryScore = Math.min(100, anomalyScore * 100);

    return {
      isAnomaly,
      advisoryScore,
      deviations: pathLength,
      method: 'isolation_forest',
      explanation: isAnomaly
        ? `Value is isolated with anomaly score ${anomalyScore.toFixed(2)}`
        : `Value is within normal distribution`,
    };
  }

  /**
   * Multi-method ensemble anomaly detection
   */
  detectAnomalyEnsemble(
    memberId: string,
    claimAmount: number,
    claimType: string,
    claimsInPeriod: any[]
  ): AnomalyDetectionResult {
    const results = [
      this.detectClaimAmountAnomaly(memberId, claimAmount, claimType),
      this.detectClaimFrequencyAnomaly(memberId),
      this.detectBillingPatternAnomaly(memberId, claimsInPeriod),
    ];

    // Ensemble decision: flag if 2+ methods agree
    const anomalyVotes = results.filter(r => r.isAnomaly).length;
    const isAnomaly = anomalyVotes >= 2;

    // Average scores from all methods
    const averageScore =
      results.reduce((sum, r) => sum + r.advisoryScore, 0) / results.length;

    const explanations = results
      .filter(r => r.isAnomaly)
      .map(r => r.explanation);

    logger.debug(`Ensemble anomaly detection completed`, {
      memberId,
      anomalyVotes,
      isAnomaly,
      averageScore: averageScore.toFixed(2),
    });

    return {
      isAnomaly,
      advisoryScore: isAnomaly ? Math.min(100, averageScore) : 0,
      deviations: anomalyVotes,
      method: 'isolation_forest_ensemble',
      explanation:
        explanations.length > 0
          ? explanations.join('; ')
          : 'No anomalies detected by ensemble',
    };
  }

  /**
   * Calculate anomaly score (converts Z-score or other metric to 0-100)
   */
  private calculateAnomalyScore(
    deviations: number,
    threshold: number
  ): number {
    if (deviations <= threshold) {
      return (deviations / threshold) * 50;
    }
    // Above threshold: scale from 50 to 100
    return 50 + Math.min(50, (deviations - threshold) * 5);
  }

  /**
   * Update member behavioral pattern
   */
  updateMemberPattern(
    memberId: string,
    claimData: {
      amount: number;
      type: string;
      providerId: string;
      date: Date;
    }[]
  ): void {
    const pattern: BehavioralPattern = {
      memberId,
      claimFrequency: claimData.length / 12, // Claims per month
      averageClaimAmount:
        claimData.reduce((sum, c) => sum + c.amount, 0) / claimData.length,
      maxClaimAmount: Math.max(...claimData.map(c => c.amount)),
      minClaimAmount: Math.min(...claimData.map(c => c.amount)),
      claimTypes: new Map(),
      providerCount: new Set(claimData.map(c => c.providerId)).size,
      daysSinceLastClaim: Math.floor(
        (Date.now() -
          Math.max(...claimData.map(c => c.date.getTime()))) /
          (1000 * 60 * 60 * 24)
      ),
      metrics: this.calculateMetrics(claimData.map(c => c.amount)),
    };

    // Count claim types
    claimData.forEach(claim => {
      const count = pattern.claimTypes.get(claim.type) || 0;
      pattern.claimTypes.set(claim.type, count + 1);
    });

    this.memberPatterns.set(memberId, pattern);

    logger.debug(`Member pattern updated`, {
      memberId,
      claimCount: claimData.length,
      avgAmount: pattern.averageClaimAmount.toFixed(2),
    });
  }

  /**
   * Calculate statistical metrics from data
   */
  private calculateMetrics(data: number[]): StatisticalMetrics {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      data.length;
    const stdDev = Math.sqrt(variance);
    const median = sorted[Math.floor(sorted.length / 2)];
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const q3 = sorted[Math.floor((sorted.length * 3) / 4)];
    const iqr = q3 - q1;

    return {
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
      q1,
      q3,
      iqr,
    };
  }

  /**
   * Get member pattern
   */
  getMemberPattern(memberId: string): BehavioralPattern | undefined {
    return this.memberPatterns.get(memberId);
  }

  /**
   * Get metrics for a specific metric key
   */
  getMetrics(metricKey: string): StatisticalMetrics | undefined {
    return this.historicalMetrics.get(metricKey);
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();
