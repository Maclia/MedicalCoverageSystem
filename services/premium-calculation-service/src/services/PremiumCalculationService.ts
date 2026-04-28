import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  rateTableVersions,
  basePremiumRates,
  coverLimitFactors,
  regionFactors,
  medicalRiskFactors,
  genderFactors,
  lifestyleFactors,
  familySizeFactors,
  outpatientAddons,
  schemeOverrides,
  premiumCalculationLogs
} from '../models/schema';

export interface PremiumCalculationInput {
  age: number;
  gender: 'MALE' | 'FEMALE';
  regionCode: string;
  coverLimit: number;
  coverType: string;
  riskCode: string;
  lifestyleCode: string;
  familySize: number;
  outpatientLimit?: number;
  schemeId?: string;
}

export interface CalculationStep {
  step: string;
  description: string;
  value: number;
  factor?: number;
  result: number;
}

export interface PremiumCalculationResult {
  basePremium: number;
  finalPremium: number;
  breakdown: CalculationStep[];
  rateTableId: string;
  calculationDate: Date;
}

export class PremiumCalculationService {
  private static instance: PremiumCalculationService;

  /**
   * Get singleton instance of PremiumCalculationService
   */
  public static getInstance(): PremiumCalculationService {
    if (!PremiumCalculationService.instance) {
      PremiumCalculationService.instance = new PremiumCalculationService();
    }
    return PremiumCalculationService.instance;
  }

  /**
   * Main premium calculation pipeline
   * Follows exact architecture specifications:
   * 1. Get Active Rate Table
   * 2. Resolve Base Premium
   * 3. Apply All Multipliers
   * 4. Add Fixed Costs
   * 5. Apply Family Discount
   * 6. Apply Scheme Overrides
   */
  async calculatePremium(input: PremiumCalculationInput): Promise<PremiumCalculationResult> {
    const breakdown: CalculationStep[] = [];
    let currentValue = 0;

    // Step 1: Get current active rate table
    const activeRateTable = await this.getActiveRateTable();
    if (!activeRateTable) {
      throw new Error('No active rate table found for current date');
    }

    // Step 2: Base Premium (Age Based)
    const basePremium = await this.getBasePremium(activeRateTable.id, input.age);
    currentValue = basePremium;
    breakdown.push({
      step: 'BASE_PREMIUM',
      description: `Base premium for age ${input.age}`,
      value: basePremium,
      result: basePremium
    });

    // Step 3: Apply Cover Limit Factor
    const coverFactor = await this.getCoverLimitFactor(activeRateTable.id, input.coverType, input.coverLimit);
    currentValue *= coverFactor;
    breakdown.push({
      step: 'COVER_LIMIT_FACTOR',
      description: `${input.coverType} cover limit ${input.coverLimit.toLocaleString()}`,
      value: coverFactor,
      factor: coverFactor,
      result: currentValue
    });

    // Step 4: Apply Region Factor
    const regionFactor = await this.getRegionFactor(activeRateTable.id, input.regionCode);
    currentValue *= regionFactor;
    breakdown.push({
      step: 'REGION_FACTOR',
      description: `Region ${input.regionCode}`,
      value: regionFactor,
      factor: regionFactor,
      result: currentValue
    });

    // Step 5: Apply Medical Risk Factor
    const riskFactor = await this.getMedicalRiskFactor(activeRateTable.id, input.riskCode);
    currentValue *= riskFactor;
    breakdown.push({
      step: 'MEDICAL_RISK_FACTOR',
      description: `Risk profile ${input.riskCode}`,
      value: riskFactor,
      factor: riskFactor,
      result: currentValue
    });

    // Step 6: Apply Gender Factor
    const genderFactor = await this.getGenderFactor(activeRateTable.id, input.gender);
    currentValue *= genderFactor;
    breakdown.push({
      step: 'GENDER_FACTOR',
      description: `Gender ${input.gender}`,
      value: genderFactor,
      factor: genderFactor,
      result: currentValue
    });

    // Step 7: Apply Lifestyle Factor
    const lifestyleFactor = await this.getLifestyleFactor(activeRateTable.id, input.lifestyleCode);
    currentValue *= lifestyleFactor;
    breakdown.push({
      step: 'LIFESTYLE_FACTOR',
      description: `Lifestyle ${input.lifestyleCode}`,
      value: lifestyleFactor,
      factor: lifestyleFactor,
      result: currentValue
    });

    // Step 8: Add Outpatient Addon if applicable
    if (input.outpatientLimit && input.outpatientLimit > 0) {
      const opAddon = await this.getOutpatientAddon(activeRateTable.id, input.outpatientLimit);
      currentValue += opAddon;
      breakdown.push({
        step: 'OUTPATIENT_ADDON',
        description: `Outpatient limit ${input.outpatientLimit.toLocaleString()}`,
        value: opAddon,
        result: currentValue
      });
    }

    // Step 9: Apply Family Size Factor (Final Multiplier)
    const familyFactor = await this.getFamilySizeFactor(activeRateTable.id, input.familySize);
    currentValue *= familyFactor;
    breakdown.push({
      step: 'FAMILY_SIZE_FACTOR',
      description: `Family size ${input.familySize} members`,
      value: familyFactor,
      factor: familyFactor,
      result: currentValue
    });

    // Step 10: Apply Scheme Overrides if provided
    if (input.schemeId) {
      const schemeAdjustment = await this.applySchemeOverrides(input.schemeId, activeRateTable.id, currentValue);
      if (schemeAdjustment !== currentValue) {
        breakdown.push({
          step: 'SCHEME_OVERRIDE',
          description: `Corporate scheme ${input.schemeId} adjustment`,
          value: schemeAdjustment - currentValue,
          result: schemeAdjustment
        });
        currentValue = schemeAdjustment;
      }
    }

    // Round to 2 decimal places
    const finalPremium = Math.round(currentValue * 100) / 100;

    // Log calculation for audit
    await this.logCalculation(activeRateTable.id, input, breakdown, finalPremium);

    return {
      basePremium,
      finalPremium,
      breakdown,
      rateTableId: activeRateTable.id,
      calculationDate: new Date()
    };
  }

  async getActiveRateTable() {
    const today = new Date().toISOString().split('T')[0];
    return db.select()
      .from(rateTableVersions)
      .where(
        and(
          eq(rateTableVersions.status, 'ACTIVE'),
          lte(rateTableVersions.effectiveFrom, today),
          gte(rateTableVersions.effectiveTo, today)
        )
      )
      .limit(1)
      .then(res => res[0] || null);
  }

  private async getBasePremium(rateTableId: string, age: number): Promise<number> {
    const result = await db.select()
      .from(basePremiumRates)
      .where(
        and(
          eq(basePremiumRates.rateTableId, rateTableId),
          lte(basePremiumRates.minAge, age),
          gte(basePremiumRates.maxAge, age)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.baseAmount || '0');
  }

  private async getCoverLimitFactor(rateTableId: string, coverType: string, limit: number): Promise<number> {
    const result = await db.select()
      .from(coverLimitFactors)
      .where(
        and(
          eq(coverLimitFactors.rateTableId, rateTableId),
          eq(coverLimitFactors.coverType, coverType),
          lte(coverLimitFactors.minLimit, limit.toString()),
          gte(coverLimitFactors.maxLimit, limit.toString())
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getRegionFactor(rateTableId: string, regionCode: string): Promise<number> {
    const result = await db.select()
      .from(regionFactors)
      .where(
        and(
          eq(regionFactors.rateTableId, rateTableId),
          eq(regionFactors.regionCode, regionCode)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getMedicalRiskFactor(rateTableId: string, riskCode: string): Promise<number> {
    const result = await db.select()
      .from(medicalRiskFactors)
      .where(
        and(
          eq(medicalRiskFactors.rateTableId, rateTableId),
          eq(medicalRiskFactors.riskCode, riskCode)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getGenderFactor(rateTableId: string, gender: string): Promise<number> {
    const result = await db.select()
      .from(genderFactors)
      .where(
        and(
          eq(genderFactors.rateTableId, rateTableId),
          eq(genderFactors.gender, gender)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getLifestyleFactor(rateTableId: string, lifestyleCode: string): Promise<number> {
    const result = await db.select()
      .from(lifestyleFactors)
      .where(
        and(
          eq(lifestyleFactors.rateTableId, rateTableId),
          eq(lifestyleFactors.lifestyleCode, lifestyleCode)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getFamilySizeFactor(rateTableId: string, familySize: number): Promise<number> {
    const result = await db.select()
      .from(familySizeFactors)
      .where(
        and(
          eq(familySizeFactors.rateTableId, rateTableId),
          lte(familySizeFactors.minMembers, familySize),
          gte(familySizeFactors.maxMembers, familySize)
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.factor || '1.000');
  }

  private async getOutpatientAddon(rateTableId: string, opLimit: number): Promise<number> {
    const result = await db.select()
      .from(outpatientAddons)
      .where(
        and(
          eq(outpatientAddons.rateTableId, rateTableId),
          eq(outpatientAddons.opLimit, opLimit.toString())
        )
      )
      .limit(1);
    
    return parseFloat(result[0]?.premiumAddon || '0');
  }

  private async applySchemeOverrides(schemeId: string, rateTableId: string, currentValue: number): Promise<number> {
    const overrides = await db.select()
      .from(schemeOverrides)
      .where(
        and(
          eq(schemeOverrides.schemeId, schemeId),
          eq(schemeOverrides.rateTableId, rateTableId)
        )
      );

    let adjustedValue = currentValue;
    for (const override of overrides) {
      adjustedValue *= parseFloat(override.overrideValue);
    }

    return adjustedValue;
  }

  private async logCalculation(rateTableId: string, input: PremiumCalculationInput, breakdown: CalculationStep[], finalPremium: number) {
    await db.insert(premiumCalculationLogs).values({
      requestId: crypto.randomUUID(),
      rateTableId,
      inputParameters: JSON.stringify(input),
      calculationSteps: JSON.stringify(breakdown),
      finalPremium: finalPremium.toString()
    });
  }

  /**
   * Retrieve calculation history by calculation ID
   */
  async getCalculationHistory(calculationId: string) {
    return db.select()
      .from(premiumCalculationLogs)
      .where(eq(premiumCalculationLogs.requestId, calculationId))
      .limit(1)
      .then((res: any[]) => res[0] || null);
  }
}
