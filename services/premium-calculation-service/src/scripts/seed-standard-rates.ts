/**
 * Seed script for Standard Kenya Medical Insurance Rates
 * Premium Medical Insurance Rate Table (KES) - Actuarial standard values
 */

import { db } from '../config/database';
import {
  rateTableVersions,
  basePremiumRates,
  coverLimitFactors,
  outpatientAddons,
  familySizeFactors,
  regionFactors,
  medicalRiskFactors,
  genderFactors,
  lifestyleFactors
} from '../models/schema';

async function seedStandardRates() {
  console.log('🌱 Seeding standard medical insurance rate table...');

  // Create standard 2026 rate table
  const [rateTable] = await db.insert(rateTableVersions).values({
    name: 'Standard National Rates 2026',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    status: 'ACTIVE'
  }).returning();

  console.log(`✅ Created rate table: ${rateTable.id}`);

  // ------------------------------
  // Base Premium by Age Band
  // ------------------------------
  const basePremiums = [
    { minAge: 0, maxAge: 17, baseAmount: '18000.00' },
    { minAge: 18, maxAge: 25, baseAmount: '28000.00' },
    { minAge: 26, maxAge: 35, baseAmount: '42000.00' },
    { minAge: 36, maxAge: 45, baseAmount: '58000.00' },
    { minAge: 46, maxAge: 55, baseAmount: '78000.00' },
    { minAge: 56, maxAge: 65, baseAmount: '110000.00' },
    { minAge: 66, maxAge: 75, baseAmount: '165000.00' },
    { minAge: 76, maxAge: 120, baseAmount: '240000.00' }
  ];

  await db.insert(basePremiumRates).values(
    basePremiums.map(p => ({ ...p, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${basePremiums.length} age base premium bands`);

  // ------------------------------
  // Cover Limit Loadings
  // ------------------------------
  const coverFactors = [
    { coverType: 'INPATIENT', minLimit: '0', maxLimit: '500000', factor: '0.750' },
    { coverType: 'INPATIENT', minLimit: '500001', maxLimit: '1000000', factor: '1.000' },
    { coverType: 'INPATIENT', minLimit: '1000001', maxLimit: '2500000', factor: '1.450' },
    { coverType: 'INPATIENT', minLimit: '2500001', maxLimit: '5000000', factor: '1.950' },
    { coverType: 'INPATIENT', minLimit: '5000001', maxLimit: '10000000', factor: '2.600' }
  ];

  await db.insert(coverLimitFactors).values(
    coverFactors.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${coverFactors.length} inpatient cover factors`);

  // ------------------------------
  // Outpatient Add-ons
  // ------------------------------
  const opAddons = [
    { opLimit: '50000', premiumAddon: '12000.00' },
    { opLimit: '100000', premiumAddon: '20000.00' },
    { opLimit: '250000', premiumAddon: '36000.00' },
    { opLimit: '500000', premiumAddon: '60000.00' }
  ];

  await db.insert(outpatientAddons).values(
    opAddons.map(a => ({ ...a, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${opAddons.length} outpatient add-on options`);

  // ------------------------------
  // Family Size Factors
  // ------------------------------
  const familyFactors = [
    { minMembers: 1, maxMembers: 1, factor: '1.000' },
    { minMembers: 2, maxMembers: 2, factor: '0.950' },
    { minMembers: 3, maxMembers: 5, factor: '0.900' },
    { minMembers: 6, maxMembers: 100, factor: '0.850' }
  ];

  await db.insert(familySizeFactors).values(
    familyFactors.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${familyFactors.length} family size factors`);

  // ------------------------------
  // Region / Hospital Tier Factors
  // ------------------------------
  const regionFactorData = [
    { regionCode: 'NAIROBI_TOP', factor: '1.300' },
    { regionCode: 'NAIROBI_STANDARD', factor: '1.100' },
    { regionCode: 'URBAN', factor: '1.000' },
    { regionCode: 'RURAL', factor: '0.850' }
  ];

  await db.insert(regionFactors).values(
    regionFactorData.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${regionFactorData.length} region factors`);

  // ------------------------------
  // Medical Risk Factors
  // ------------------------------
  const riskFactors = [
    { riskCode: 'STANDARD', factor: '1.000' },
    { riskCode: 'CONTROLLED_CHRONIC', factor: '1.150' },
    { riskCode: 'MULTIPLE_CHRONIC', factor: '1.350' },
    { riskCode: 'HIGH_RISK', factor: '1.600' }
  ];

  await db.insert(medicalRiskFactors).values(
    riskFactors.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted ${riskFactors.length} medical risk factors`);

  // ------------------------------
  // Gender Factors
  // ------------------------------
  const genderFactorData = [
    { gender: 'MALE', factor: '1.000' },
    { gender: 'FEMALE', factor: '1.050' }
  ];

  await db.insert(genderFactors).values(
    genderFactorData.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted gender factors`);

  // ------------------------------
  // Lifestyle Factors
  // ------------------------------
  const lifestyleFactorData = [
    { lifestyleCode: 'NON_SMOKER', factor: '1.000' },
    { lifestyleCode: 'SMOKER', factor: '1.200' }
  ];

  await db.insert(lifestyleFactors).values(
    lifestyleFactorData.map(f => ({ ...f, rateTableId: rateTable.id }))
  );
  console.log(`✅ Inserted lifestyle factors`);

  console.log('\n🎉 Standard rate table seeding complete!');
  console.log(`   Rate Table ID: ${rateTable.id}`);
  console.log(`   Valid: 2026-01-01 → 2026-12-31`);
  console.log('\n✅ Pricing service is now ready for calculations with standard Kenya market rates');

  process.exit(0);
}

seedStandardRates().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});