import { z } from 'zod';

const FamilyCompositionSchema = z.object({
  familySize: z.number().min(1),
  hasSpouse: z.boolean(),
  childCount: z.number().min(0),
  specialNeedsCount: z.number().min(0),
  singleParent: z.boolean().optional(),
});

const AgeBandDistributionSchema = z.object({
  '0-17': z.number().min(0),
  '18-25': z.number().min(0),
  '26-35': z.number().min(0),
  '36-45': z.number().min(0),
  '46-55': z.number().min(0),
  '56-65': z.number().min(0),
  '65+': z.number().min(0),
});

const GeographicDataSchema = z.object({
  state: z.string().min(2),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  costIndex: z.number(),
});

const DemographicDataSchema = z.object({
  averageAge: z.number().min(0),
  ageDistribution: AgeBandDistributionSchema,
  location: GeographicDataSchema,
  industryRisk: z.enum(['low', 'medium', 'high']),
  groupSize: z.number().min(1),
});

const HistoricalClaimsDataSchema = z.object({
  totalClaims: z.number().min(0),
  claimFrequency: z.number().min(0),
  averageClaimAmount: z.number().min(0),
  lossRatio: z.number().min(0),
  trendYears: z.number().min(1),
});

export const PremiumCalculationInputSchema = z.object({
  companyId: z.number(),
  periodId: z.number().optional(),
  memberId: z.number().optional(),
  memberIds: z.array(z.number()).optional(),
  includeRiskAdjustment: z.boolean().optional(),
  geographicRegion: z.string().optional(),
  projectionYear: z.number().optional(),
  familyComposition: FamilyCompositionSchema.optional(),
  demographics: DemographicDataSchema.optional(),
  historicalClaims: HistoricalClaimsDataSchema.optional(),
  dataQuality: z.number().min(0).max(100).optional(),
});

export function validatePremiumData(data: unknown) {
  const result = PremiumCalculationInputSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid premium calculation input: ${result.error.message}`);
  }
  return result.data;
}
