/**
 * Actuarial Configuration Module
 *
 * Central configuration for actuarial calculations, regulatory compliance,
 * market assumptions, and pricing methodology parameters.
 *
 * Updated: 2025-11-24
 * Version: 1.0.0
 */

import { PricingMethodology, RiskAdjustmentTier, InflationCategory, GeographicAdjustment } from './enhancedPremiumCalculator';

export interface ActuarialConfig {
  // Regulatory Compliance Settings
  regulatory: {
    acaCompliance: {
      minimumLossRatio: number; // ACA MLR requirements (80-85%)
      reportingFrequency: 'monthly' | 'quarterly' | 'annually';
      rateFilingRequirements: {
        priorApproval: boolean;
        justificationLevel: 'detailed' | 'summary' | 'minimal';
        publicDisclosure: boolean;
      };
    };
    stateRegulations: {
      [state: string]: {
        ratingRestrictions: {
          ageBanding: boolean;
          genderRating: boolean;
          healthStatusRating: boolean;
          geographicRating: boolean;
          tobaccoRating: boolean;
        };
      };
    };
  };

  // Market Assumptions and Economic Factors
  marketAssumptions: {
    healthcareInflation: {
      [year: number]: {
        [category in InflationCategory]: number;
      };
    };
    discountRate: number; // For present value calculations
    riskFreeRate: number; // Treasury rate for profit margin calculations
    administrativeExpenseRatio: number; // Admin costs as % of premium
    claimProcessingCostRatio: number; // Claims admin costs as % of claims
    profitMarginTarget: number; // Target profit margin (3-5% typical)
    capitalChargeRate: number; // Cost of capital for risk-bearing
  };

  // Pricing Methodology Parameters
  pricingMethodologies: {
    [methodology in PricingMethodology]: {
      description: string;
     适用条件: string;
      baseAdjustmentFactor: number;
      riskAdjustmentWeight: number;
      trendApplication: 'pre_trend' | 'post_trend' | 'blended';
      allowedMarkets: string[];
    };
  };

  // Risk Adjustment Parameters
  riskAdjustment: {
    tierParameters: {
      [tier in RiskAdjustmentTier]: {
        riskScoreRange: [number, number];
        premiumMultiplier: number;
        underwritingAction: 'automatic' | 'review' | 'decline';
        monitoringFrequency: number; // Days between reviews
      };
    };
    factorWeights: {
      healthCondition: number; // Weight for medical conditions
      lifestyle: number; // Weight for lifestyle factors
      age: number; // Weight for age-based risk
      geographic: number; // Weight for location risk
      occupational: number; // Weight for job-related risk
      familyHistory: number; // Weight for hereditary conditions
    };
    corridors: {
      maximumAdjustment: number; // Max premium increase (200% typical)
      minimumAdjustment: number; // Min premium decrease (50% typical)
      gradualPhaseIn: {
        enabled: boolean;
        phaseInPeriod: number; // Months for full phase-in
        maximumAnnualIncrease: number; // Max annual increase %
      };
    };
  };

  // Geographic Adjustments
  geographicAdjustments: {
    [regionCode: string]: GeographicAdjustment;
  };

  // Age and Demographic Parameters
  demographicParameters: {
    ageBands: {
      [bandName: string]: {
        minAge: number;
        maxAge: number;
        baseRateMultiplier: number;
        claimCostMultiplier: number;
      };
    };
    familyCompositions: {
      [composition: string]: { // 'individual', 'couple', 'family', etc.
        memberCount: number;
        baseRateMultiplier: number;
        administrativeLoading: number;
      };
    };
    genderNeutral: boolean; // If true, no gender-based rating
  };

  // Benefit Design Parameters
  benefitDesign: {
    planTypes: {
      [planType: string]: {
        baseRichness: number; // 0-1 scale of benefit generosity
        expectedUtilization: number; // Claims per member per year
        costSharing: {
          deductible: number;
          coinsurance: number;
          outOfPocketMaximum: number;
          copaymentStructures: Record<string, number>;
        };
      };
    };
  };

  // Competitive Intelligence
  competitiveAnalysis: {
    marketPositioning: {
      strategy: 'market_leader' | 'value_provider' | 'premium_provider' | 'disruptor';
      priceElasticity: number; // % volume change per % price change
      competitiveIndex: number; // 0-1 market competitiveness score
    };
    benchmarking: {
      peerGroups: string[];
      dataSources: string[];
      updateFrequency: number; // Days between updates
      qualityWeighting: number; // Weight for quality vs price competition
    };
  };

  // Trend Analysis Parameters
  trendAnalysis: {
    claimTrendFactors: {
      medicalInflation: number;
      utilizationIncrease: number;
      intensityIncrease: number; // More services per episode
      technologyImpact: number;
      demographicShift: number; // Aging population impact
    };
    lagFactors: {
      claimLag: number; // Average days from service to claim payment
      reportingLag: number; // Average days from service to reporting
      developmentFactor: number; // IBNR development factor
    };
  };

  // Capital and Solvency Parameters
  capitalManagement: {
    riskBasedCapital: {
      standardLevel: number; // % of reserves
      targetLevel: number; // Desired capital level
      minimumLevel: number; // Regulatory minimum
    };
    reinsurance: {
      retentionLimit: number; // Maximum retention per claim
      aggregateExcess: number; // Aggregate excess of loss threshold
      reinsuranceCost: number; // % of ceded premium
    };
  };

  // Model Validation and Testing
  modelValidation: {
    backtesting: {
      historicalPeriodYears: number;
      accuracyTolerance: number; // % deviation allowed
      calibrationFrequency: number; // Months between recalibration
    };
    stressTesting: {
      scenarios: StressTestScenario[];
      frequency: number; // Months between stress tests
      reportingRequirements: string[];
    };
  };
}

export interface StressTestScenario {
  name: string;
  description: string;
  parameters: {
    medicalInflationShock?: number; // % increase in medical costs
    utilizationShock?: number; // % increase in utilization
    pandemicImpact?: number; // % impact on claims
    economicRecession?: number; // % impact on premium collection
    catastrophicEvent?: number; // Impact from major catastrophe
  };
}

// Default Configuration for 2025
export const defaultActuarialConfig: ActuarialConfig = {
  regulatory: {
    acaCompliance: {
      minimumLossRatio: 0.85, // 85% for individual/small group
      reportingFrequency: 'quarterly',
      rateFilingRequirements: {
        priorApproval: true,
        justificationLevel: 'detailed',
        publicDisclosure: true,
      },
    },
    stateRegulations: {
      CA: {
        ratingRestrictions: {
          ageBanding: true,
          genderRating: false,
          healthStatusRating: false,
          geographicRating: true,
          tobaccoRating: true,
        },
      },
      NY: {
        ratingRestrictions: {
          ageBanding: true,
          genderRating: false,
          healthStatusRating: false,
          geographicRating: true,
          tobaccoRating: true,
        },
      },
      TX: {
        ratingRestrictions: {
          ageBanding: true,
          genderRating: false,
          healthStatusRating: false,
          geographicRating: true,
          tobaccoRating: true,
        },
      },
      FL: {
        ratingRestrictions: {
          ageBanding: true,
          genderRating: false,
          healthStatusRating: false,
          geographicRating: true,
          tobaccoRating: true,
        },
      },
    },
  },

  marketAssumptions: {
    healthcareInflation: {
      2025: {
        hospital: 0.058, // 5.8% CMS projection
        physician: 0.023, // 2.3% utilization increase
        prescription: 0.015, // 1.5% cost shifting from Medicare/Medicaid
        mentalHealth: 0.018, // 1.8% new technology impact
        preventive: 0.008, // 0.8% regulatory cost impact
        medical_trend: 0.058,
        utilization_trend: 0.023,
        cost_shifting: 0.015,
        technology_advancement: 0.018,
        regulatory_impact: 0.008,
      },
      2026: {
        hospital: 0.060, // 6.0% projection
        physician: 0.025,
        prescription: 0.016,
        mentalHealth: 0.019,
        preventive: 0.009,
        medical_trend: 0.060,
        utilization_trend: 0.025,
        cost_shifting: 0.016,
        technology_advancement: 0.019,
        regulatory_impact: 0.009,
      },
    },
    discountRate: 0.035, // 3.5% discount rate
    riskFreeRate: 0.020, // 2.0% Treasury rate
    administrativeExpenseRatio: 0.12, // 12% of premium
    claimProcessingCostRatio: 0.08, // 8% of claims
    profitMarginTarget: 0.04, // 4% target profit
    capitalChargeRate: 0.06, // 6% cost of capital
  },

  pricingMethodologies: {
    standard: {
      description: 'Standard rating methodology with balanced risk adjustment',
      适用条件: 'General application across all market segments',
      baseAdjustmentFactor: 1.0,
      riskAdjustmentWeight: 0.5,
      trendApplication: 'pre_trend',
      allowedMarkets: ['individual', 'small_group', 'medium_group'],
    },
    'risk-adjusted': {
      description: 'Enhanced risk adjustment with individual underwriting',
      适用条件: 'Groups requiring detailed risk assessment',
      baseAdjustmentFactor: 0.95,
      riskAdjustmentWeight: 0.8,
      trendApplication: 'pre_trend',
      allowedMarkets: ['medium_group', 'large_group'],
    },
    hybrid: {
      description: 'Combines multiple rating approaches for optimal pricing',
      适用条件: 'Complex groups requiring customized solutions',
      baseAdjustmentFactor: 1.05,
      riskAdjustmentWeight: 0.6,
      trendApplication: 'blended',
      allowedMarkets: ['large_group', 'self_funded'],
    },
    community_rated: {
      description: 'All members pay same rate regardless of individual claims experience',
      适用条件: 'Small groups or regulated markets with community rating requirements',
      baseAdjustmentFactor: 1.0,
      riskAdjustmentWeight: 0.0,
      trendApplication: 'post_trend',
      allowedMarkets: ['individual', 'small_group'],
    },
    experience_rated: {
      description: 'Premiums based on group-specific claims experience',
      适用条件: 'Large groups with credible claims experience',
      baseAdjustmentFactor: 0.9,
      riskAdjustmentWeight: 1.0,
      trendApplication: 'blended',
      allowedMarkets: ['large_group', 'self_funded'],
    },
    adjusted_community_rated: {
      description: 'Hybrid approach combining community rating with demographic adjustments',
      适用条件: 'Medium-sized groups with partial experience rating',
      baseAdjustmentFactor: 0.95,
      riskAdjustmentWeight: 0.5,
      trendApplication: 'blended',
      allowedMarkets: ['medium_group', 'association'],
    },
    benefit_rated: {
      description: 'Rating based primarily on benefit design richness',
      适用条件: 'Markets with varying benefit designs',
      baseAdjustmentFactor: 1.0,
      riskAdjustmentWeight: 0.3,
      trendApplication: 'post_trend',
      allowedMarkets: ['individual', 'small_group'],
    },
  },

  riskAdjustment: {
    tierParameters: {
      low_risk: {
        riskScoreRange: [0.0, 0.7],
        premiumMultiplier: 0.8,
        underwritingAction: 'automatic',
        monitoringFrequency: 365,
      },
      average_risk: {
        riskScoreRange: [0.7, 1.3],
        premiumMultiplier: 1.0,
        underwritingAction: 'automatic',
        monitoringFrequency: 365,
      },
      moderate_risk: {
        riskScoreRange: [1.3, 1.8],
        premiumMultiplier: 1.25,
        underwritingAction: 'review',
        monitoringFrequency: 180,
      },
      high_risk: {
        riskScoreRange: [1.8, 2.5],
        premiumMultiplier: 1.6,
        underwritingAction: 'review',
        monitoringFrequency: 90,
      },
      very_high_risk: {
        riskScoreRange: [2.5, 5.0],
        premiumMultiplier: 2.0,
        underwritingAction: 'decline',
        monitoringFrequency: 30,
      },
    },
    factorWeights: {
      healthCondition: 0.35,
      lifestyle: 0.20,
      age: 0.20,
      geographic: 0.10,
      occupational: 0.10,
      familyHistory: 0.05,
    },
    corridors: {
      maximumAdjustment: 2.0, // 200% of standard rate
      minimumAdjustment: 0.5, // 50% of standard rate
      gradualPhaseIn: {
        enabled: true,
        phaseInPeriod: 12, // 12 months for full phase-in
        maximumAnnualIncrease: 0.15, // 15% max annual increase
      },
    },
  },

  geographicAdjustments: {
    'CA-LOS': {
      regionId: 'CA-LOS',
      regionName: 'Los Angeles Metro',
      baseCostIndex: 1.45,
      medicalCostIndex: 1.52,
      utilizationIndex: 1.18,
      competitiveIndex: 1.22,
      adjustmentFactors: {
        providerNetworkDensity: 1.15,
        hospitalMarketShare: 0.75,
        specialistAvailability: 1.08,
        technologyAdoption: 1.12,
      },
    },
    'CA-SF': {
      regionId: 'CA-SF',
      regionName: 'San Francisco Bay Area',
      baseCostIndex: 1.68,
      medicalCostIndex: 1.75,
      utilizationIndex: 1.25,
      competitiveIndex: 1.35,
      adjustmentFactors: {
        providerNetworkDensity: 1.22,
        hospitalMarketShare: 0.85,
        specialistAvailability: 1.15,
        technologyAdoption: 1.18,
      },
    },
    'NY-NYC': {
      regionId: 'NY-NYC',
      regionName: 'New York City Metro',
      baseCostIndex: 1.72,
      medicalCostIndex: 1.80,
      utilizationIndex: 1.28,
      competitiveIndex: 1.40,
      adjustmentFactors: {
        providerNetworkDensity: 1.20,
        hospitalMarketShare: 0.90,
        specialistAvailability: 1.20,
        technologyAdoption: 1.15,
      },
    },
    'TX-DFW': {
      regionId: 'TX-DFW',
      regionName: 'Dallas-Fort Worth',
      baseCostIndex: 1.18,
      medicalCostIndex: 1.22,
      utilizationIndex: 1.12,
      competitiveIndex: 1.08,
      adjustmentFactors: {
        providerNetworkDensity: 1.05,
        hospitalMarketShare: 0.65,
        specialistAvailability: 0.95,
        technologyAdoption: 0.98,
      },
    },
    'FL-MIA': {
      regionId: 'FL-MIA',
      regionName: 'Miami-Fort Lauderdale',
      baseCostIndex: 1.35,
      medicalCostIndex: 1.42,
      utilizationIndex: 1.20,
      competitiveIndex: 1.15,
      adjustmentFactors: {
        providerNetworkDensity: 1.08,
        hospitalMarketShare: 0.70,
        specialistAvailability: 1.02,
        technologyAdoption: 1.05,
      },
    },
  },

  demographicParameters: {
    ageBands: {
      'adult_0_20': { minAge: 0, maxAge: 20, baseRateMultiplier: 0.6, claimCostMultiplier: 0.5 },
      'adult_21_30': { minAge: 21, maxAge: 30, baseRateMultiplier: 0.8, claimCostMultiplier: 0.7 },
      'adult_31_40': { minAge: 31, maxAge: 40, baseRateMultiplier: 1.0, claimCostMultiplier: 0.9 },
      'adult_41_50': { minAge: 41, maxAge: 50, baseRateMultiplier: 1.2, claimCostMultiplier: 1.2 },
      'adult_51_60': { minAge: 51, maxAge: 60, baseRateMultiplier: 1.8, claimCostMultiplier: 1.8 },
      'adult_61_plus': { minAge: 61, maxAge: 120, baseRateMultiplier: 3.0, claimCostMultiplier: 2.8 },
    },
    familyCompositions: {
      'individual': { memberCount: 1, baseRateMultiplier: 1.0, administrativeLoading: 1.0 },
      'employee_spouse': { memberCount: 2, baseRateMultiplier: 1.8, administrativeLoading: 0.9 },
      'employee_child': { memberCount: 2, baseRateMultiplier: 1.6, administrativeLoading: 0.9 },
      'family': { memberCount: 3, baseRateMultiplier: 2.2, administrativeLoading: 0.85 },
      'family_plus': { memberCount: 4, baseRateMultiplier: 2.8, administrativeLoading: 0.8 },
    },
    genderNeutral: true,
  },

  benefitDesign: {
    planTypes: {
      'hmo': {
        baseRichness: 0.75,
        expectedUtilization: 4.2,
        costSharing: {
          deductible: 1000,
          coinsurance: 0.15,
          outOfPocketMaximum: 5000,
          copaymentStructures: {
            primary_care: 25,
            specialist: 50,
            emergency_room: 150,
            hospital_admission: 300,
          },
        },
      },
      'ppo': {
        baseRichness: 0.85,
        expectedUtilization: 5.1,
        costSharing: {
          deductible: 2000,
          coinsurance: 0.20,
          outOfPocketMaximum: 7000,
          copaymentStructures: {
            primary_care: 30,
            specialist: 60,
            emergency_room: 200,
            hospital_admission: 400,
          },
        },
      },
      'epo': {
        baseRichness: 0.80,
        expectedUtilization: 4.6,
        costSharing: {
          deductible: 1500,
          coinsurance: 0.18,
          outOfPocketMaximum: 6000,
          copaymentStructures: {
            primary_care: 28,
            specialist: 55,
            emergency_room: 175,
            hospital_admission: 350,
          },
        },
      },
      'hdhp': {
        baseRichness: 0.65,
        expectedUtilization: 3.8,
        costSharing: {
          deductible: 5000,
          coinsurance: 0.10,
          outOfPocketMaximum: 8000,
          copaymentStructures: {
            primary_care: 0,
            specialist: 0,
            emergency_room: 0,
            hospital_admission: 0,
          },
        },
      },
    },
  },

  competitiveAnalysis: {
    marketPositioning: {
      strategy: 'value_provider',
      priceElasticity: -0.3,
      competitiveIndex: 0.75,
    },
    benchmarking: {
      peerGroups: ['regional_carriers', 'national_carriers', ' Blues_plans'],
      dataSources: ['KFF', 'AHIP', 'state_rate_filings', 'market_surveys'],
      updateFrequency: 30,
      qualityWeighting: 0.7,
    },
  },

  trendAnalysis: {
    claimTrendFactors: {
      medicalInflation: 0.058,
      utilizationIncrease: 0.023,
      intensityIncrease: 0.015,
      technologyImpact: 0.018,
      demographicShift: 0.012,
    },
    lagFactors: {
      claimLag: 45, // Average 45 days
      reportingLag: 15, // Average 15 days
      developmentFactor: 1.15, // 15% IBNR development
    },
  },

  capitalManagement: {
    riskBasedCapital: {
      standardLevel: 0.12, // 12% of reserves
      targetLevel: 0.15, // 15% target
      minimumLevel: 0.08, // 8% regulatory minimum
    },
    reinsurance: {
      retentionLimit: 250000, // $250k per claim
      aggregateExcess: 10000000, // $10M aggregate
      reinsuranceCost: 0.05, // 5% of ceded premium
    },
  },

  modelValidation: {
    backtesting: {
      historicalPeriodYears: 3,
      accuracyTolerance: 0.05, // 5% tolerance
      calibrationFrequency: 90, // Quarterly recalibration
    },
    stressTesting: {
      scenarios: [
        {
          name: 'pandemic_scenario',
          description: 'COVID-19 like pandemic impact',
          parameters: {
            medicalInflationShock: 0.15,
            utilizationShock: 0.25,
            pandemicImpact: 0.20,
            economicRecession: -0.05,
          },
        },
        {
          name: 'severe_recession',
          description: 'Economic recession with reduced enrollment',
          parameters: {
            medicalInflationShock: 0.03,
            utilizationShock: -0.10,
            economicRecession: -0.15,
          },
        },
        {
          name: 'medical_inflation_spike',
          description: 'Higher than expected medical cost inflation',
          parameters: {
            medicalInflationShock: 0.10,
            utilizationShock: 0.05,
            catastrophicEvent: 0.08,
          },
        },
      ],
      frequency: 180, // Semi-annual stress tests
      reportingRequirements: ['board_report', 'regulatory_filing', 'management_dashboard'],
    },
  },
};

// Configuration Management Functions
export class ActuarialConfigManager {
  private config: ActuarialConfig;

  constructor(config: ActuarialConfig = defaultActuarialConfig) {
    this.config = { ...config };
  }

  // Get current configuration
  getConfig(): ActuarialConfig {
    return { ...this.config };
  }

  // Update configuration section
  updateConfig<K extends keyof ActuarialConfig>(
    section: K,
    updates: Partial<ActuarialConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
  }

  // Get specific configuration value
  getValue<K extends keyof ActuarialConfig>(section: K): ActuarialConfig[K] {
    return this.config[section];
  }

  // Validate configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate ACA compliance
    if (this.config.regulatory.acaCompliance.minimumLossRatio < 0.80 ||
        this.config.regulatory.acaCompliance.minimumLossRatio > 0.90) {
      errors.push('ACA minimum loss ratio must be between 80% and 90%');
    }

    // Validate profit margins
    if (this.config.marketAssumptions.profitMarginTarget < 0.02 ||
        this.config.marketAssumptions.profitMarginTarget > 0.08) {
      errors.push('Profit margin target should be between 2% and 8%');
    }

    // Validate risk adjustment corridors
    if (this.config.riskAdjustment.corridors.maximumAdjustment < 1.0 ||
        this.config.riskAdjustment.corridors.maximumAdjustment > 3.0) {
      errors.push('Maximum adjustment should be between 100% and 300%');
    }

    // Validate geographic adjustments
    Object.entries(this.config.geographicAdjustments).forEach(([region, adjustment]) => {
      if (adjustment.baseCostIndex < 0.5 || adjustment.baseCostIndex > 3.0) {
        errors.push(`Invalid cost index for region ${region}: ${adjustment.baseCostIndex}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Export configuration
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(configJson) as ActuarialConfig;
      const validation = this.validateConfig();

      if (validation.isValid) {
        this.config = imported;
        return { success: true };
      } else {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(', ')}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get market-specific configuration
  getMarketConfig(marketCode: string): Partial<ActuarialConfig> {
    const marketConfig: Partial<ActuarialConfig> = {
      marketAssumptions: this.config.marketAssumptions,
      pricingMethodologies: this.config.pricingMethodologies,
      demographicParameters: this.config.demographicParameters,
    };

    // Add state-specific regulations if available
    const stateCode = marketCode.substring(0, 2);
    if (this.config.regulatory.stateRegulations[stateCode]) {
      marketConfig.regulatory = {
        acaCompliance: this.config.regulatory.acaCompliance,
        stateRegulations: {
          [stateCode]: this.config.regulatory.stateRegulations[stateCode],
        },
      };
    }

    return marketConfig;
  }
}

// Export singleton instance
export const actuarialConfig = new ActuarialConfigManager();