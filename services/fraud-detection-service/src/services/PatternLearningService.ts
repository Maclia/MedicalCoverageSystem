import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface FraudPattern {
  id: string;
  patternType: 'billing' | 'provider' | 'member' | 'pharmacy' | 'temporal' | 'network';
  patternName: string;
  description: string;
  indicators: string[];
  occurrences: number;
  confidence: number; // 0-1
  riskMultiplier: number; // How much to increase risk score
  discoveredAt: string;
  lastSeen: string;
  isActive: boolean;
  detectionRules: Record<string, any>;
}

export interface PatternOccurrence {
  id: string;
  patternId: string;
  claimId: number;
  memberId: number;
  providerId: number;
  matchedIndicators: string[];
  confidence: number;
  detectedAt: string;
}

export class PatternLearningService {
  private patterns: Map<string, FraudPattern> = new Map();
  private occurrences: Map<string, PatternOccurrence[]> = new Map();
  private pendingPatterns: Map<string, Partial<FraudPattern>> = new Map();

  constructor() {
    this.initializeCommonPatterns();

    // Start learning cycle if enabled
    if (config.patternLearning.enabled) {
      this.startLearningCycle();
    }
  }

  /**
   * Initialize common fraud patterns
   */
  private initializeCommonPatterns(): void {
    // Pattern 1: Duplicate Diagnosis
    this.patterns.set('dup_diagnosis', {
      id: 'dup_diagnosis',
      patternType: 'billing',
      patternName: 'Duplicate Diagnostic Claims',
      description: 'Multiple claims for the same diagnosis within a short period',
      indicators: ['same_diagnosis', 'multiple_claims_30days', 'same_provider'],
      occurrences: 0,
      confidence: 0.85,
      riskMultiplier: 1.5,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        timeWindow: 30, // days
        minimumClaims: 2,
        confidenceThreshold: 0.8,
      },
    });

    // Pattern 2: Provider Over-billing
    this.patterns.set('provider_overbilling', {
      id: 'provider_overbilling',
      patternType: 'provider',
      patternName: 'Provider Over-billing',
      description: 'Provider charges significantly higher than peers for same procedure',
      indicators: ['amount_outlier', 'procedure_code_match', 'peer_comparison'],
      occurrences: 0,
      confidence: 0.72,
      riskMultiplier: 1.3,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        percentageOver: 50, // 50% over peer average
        minimumPeers: 10,
        confidenceThreshold: 0.7,
      },
    });

    // Pattern 3: Unbundling
    this.patterns.set('procedure_unbundling', {
      id: 'procedure_unbundling',
      patternType: 'billing',
      patternName: 'Procedure Unbundling',
      description: 'Procedures that should be bundled submitted separately',
      indicators: ['bundled_procedures', 'separate_billing', 'inflated_total'],
      occurrences: 0,
      confidence: 0.88,
      riskMultiplier: 2.0,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        bundledPairs: [
          { parent: '99213', children: ['99211', '99212'] },
        ],
      },
    });

    // Pattern 4: Ring Scheme
    this.patterns.set('provider_ring', {
      id: 'provider_ring',
      patternType: 'network',
      patternName: 'Provider Ring Scheme',
      description: 'Coordinated billing between providers for same members',
      indicators: ['same_members', 'cross_referrals', 'timing_correlation'],
      occurrences: 0,
      confidence: 0.65,
      riskMultiplier: 3.0,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        minimumProviders: 3,
        memberIntersection: 70, // 70% member overlap
      },
    });

    // Pattern 5: Emergency Overuse
    this.patterns.set('emergency_overuse', {
      id: 'emergency_overuse',
      patternType: 'member',
      patternName: 'Emergency Department Overuse',
      description: 'Excessive ED visits with non-emergency diagnoses',
      indicators: ['ed_visit_frequency', 'non_emergency_diagnosis', 'pattern_frequency'],
      occurrences: 0,
      confidence: 0.68,
      riskMultiplier: 1.2,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        minVisitsPerMonth: 3,
        nonEmergencyPercentage: 80,
      },
    });
  }

  /**
   * Record pattern occurrence
   */
  async recordPatternOccurrence(
    patternId: string,
    claimId: number,
    memberId: number,
    providerId: number,
    matchedIndicators: string[],
    confidence: number
  ): Promise<void> {
    try {
      const pattern = this.patterns.get(patternId);

      if (!pattern) {
        logger.warn(`Pattern ${patternId} not found`, { patternId });
        return;
      }

      const occurrence: PatternOccurrence = {
        id: `occ_${claimId}_${patternId}`,
        patternId,
        claimId,
        memberId,
        providerId,
        matchedIndicators,
        confidence,
        detectedAt: new Date().toISOString(),
      };

      if (!this.occurrences.has(patternId)) {
        this.occurrences.set(patternId, []);
      }

      this.occurrences.get(patternId)!.push(occurrence);

      // Update pattern stats
      pattern.occurrences++;
      pattern.lastSeen = new Date().toISOString();

      logger.debug(`Pattern occurrence recorded`, {
        patternId,
        claimId,
        confidence,
      });
    } catch (error) {
      logger.error(`Error recording pattern occurrence`, {
        patternId,
        claimId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Discover new patterns from fraud data
   */
  async discoverNewPatterns(frauldClaims: any[]): Promise<FraudPattern[]> {
    if (!config.patternLearning.enabled || frauldClaims.length < config.patternLearning.minOccurrences) {
      return [];
    }

    const newPatterns: FraudPattern[] = [];

    try {
      logger.info(`Starting pattern discovery analysis`, {
        claimCount: frauldClaims.length,
      });

      // Analyze claim groupings to find new patterns
      const groupedByMember = this.groupByClaim(frauldClaims, 'memberId');
      const groupedByProvider = this.groupByClaim(frauldClaims, 'providerId');

      // Check for member-based patterns
      for (const [memberId, claims] of groupedByMember) {
        if (claims.length >= config.patternLearning.minOccurrences) {
          const memberPattern = await this.analyzeClaimGroup(
            claims,
            'member',
            `Member Fraud Pattern #${memberId}`
          );
          if (memberPattern) {
            newPatterns.push(memberPattern);
          }
        }
      }

      // Check for provider-based patterns
      for (const [providerId, claims] of groupedByProvider) {
        if (claims.length >= config.patternLearning.minOccurrences) {
          const providerPattern = await this.analyzeClaimGroup(
            claims,
            'provider',
            `Provider Fraud Pattern #${providerId}`
          );
          if (providerPattern) {
            newPatterns.push(providerPattern);
          }
        }
      }

      // Check for temporal patterns
      const temporalPattern = await this.analyzeTemporalPatterns(frauldClaims);
      if (temporalPattern) {
        newPatterns.push(temporalPattern);
      }

      logger.info(`Pattern discovery completed`, {
        newPatternsFound: newPatterns.length,
      });

      return newPatterns;
    } catch (error) {
      logger.error(`Error discovering new patterns`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Analyze a group of claims for pattern
   */
  private async analyzeClaimGroup(claims: any[], entityType: string, patternName: string): Promise<FraudPattern | null> {
    // TODO: Implement sophisticated pattern analysis
    // Find commonalities in claims (diagnosis, procedures, amounts, etc.)

    // Simple example: If > threshold occurrence of same diagnosis
    const diagnosisCounts = new Map<string, number>();
    claims.forEach(claim => {
      const count = diagnosisCounts.get(claim.diagnosis) || 0;
      diagnosisCounts.set(claim.diagnosis, count + 1);
    });

    const commonDiagnosis = Array.from(diagnosisCounts.entries()).find(
      ([_, count]) => count >= config.patternLearning.minOccurrences
    );

    if (!commonDiagnosis) {
      return null;
    }

    const pattern: FraudPattern = {
      id: `pattern_${Date.now()}`,
      patternType: entityType as any,
      patternName,
      description: `Detected pattern: Multiple claims with diagnosis ${commonDiagnosis[0]}`,
      indicators: [`diagnosis_${commonDiagnosis[0]}`, `count_${commonDiagnosis[1]}`],
      occurrences: commonDiagnosis[1],
      confidence: Math.min(0.95, 0.5 + commonDiagnosis[1] * 0.1),
      riskMultiplier: 1.3,
      discoveredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      detectionRules: {
        diagnosis: commonDiagnosis[0],
        minOccurrences: config.patternLearning.minOccurrences,
      },
    };

    return pattern;
  }

  /**
   * Analyze temporal patterns
   */
  private async analyzeTemporalPatterns(claims: any[]): Promise<FraudPattern | null> {
    // Check for claims happening at same time from different entities
    // Could indicate coordinated fraud

    // TODO: Implement temporal analysis (claims submitted at similar times, etc.)

    return null;
  }

  /**
   * Register newly discovered pattern
   */
  async registerPattern(pattern: FraudPattern): Promise<void> {
    if (pattern.confidence < config.patternLearning.confidenceThreshold) {
      logger.warn(`Pattern confidence below threshold, not registering`, {
        patternId: pattern.id,
        confidence: pattern.confidence,
      });
      return;
    }

    this.patterns.set(pattern.id, pattern);
    this.occurrences.set(pattern.id, []);

    logger.info(`New pattern registered`, {
      patternId: pattern.id,
      patternName: pattern.patternName,
      confidence: pattern.confidence,
    });
  }

  /**
   * Get pattern by ID
   */
  async getPattern(patternId: string): Promise<FraudPattern | null> {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Get all active patterns
   */
  async getActivePatterns(): Promise<FraudPattern[]> {
    return Array.from(this.patterns.values()).filter(p => p.isActive);
  }

  /**
   * Get pattern occurrences
   */
  async getPatternOccurrences(patternId: string): Promise<PatternOccurrence[]> {
    return this.occurrences.get(patternId) || [];
  }

  /**
   * Start learning cycle
   */
  private startLearningCycle(): void {
    // Run pattern discovery periodically
    setInterval(async () => {
      try {
        logger.debug(`Starting pattern learning cycle`);

        // TODO: Fetch recent fraud claims from database
        // const recentFraudClaims = await fetchRecentFraudClaims(
        //   config.patternLearning.learningWindow
        // );

        // const newPatterns = await this.discoverNewPatterns(recentFraudClaims);
        // for (const pattern of newPatterns) {
        //   await this.registerPattern(pattern);
        // }
      } catch (error) {
        logger.error(`Error in learning cycle`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 6 * 60 * 60 * 1000); // Run every 6 hours
  }

  /**
   * Helper: Group claims by key
   */
  private groupByClaim(claims: any[], key: string): Map<any, any[]> {
    const grouped = new Map();
    claims.forEach(claim => {
      const groupKey = claim[key];
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(claim);
    });
    return grouped;
  }
}

// Export singleton instance
export const patternLearningService = new PatternLearningService();
