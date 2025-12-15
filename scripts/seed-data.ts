import { db } from '../server/db';
import * as schema from ''../shared/schema'.js';
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

// Clear existing data
async function clearData() {
  try {
    console.log('Clearing existing data...');
    await db.delete(schema.claims);
    await db.delete(schema.panelDocumentation);
    await db.delete(schema.medicalPersonnel);
    await db.delete(schema.medicalInstitutions);
    await db.delete(schema.regions);
    await db.delete(schema.companyBenefits);
    await db.delete(schema.benefits);
    await db.delete(schema.premiums);
    await db.delete(schema.premiumRates);
    await db.delete(schema.periods);
    await db.delete(schema.members); // This cleans both principals and dependents
    await db.delete(schema.companies);
    console.log('Data cleared successfully.');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Seed companies
async function seedCompanies() {
  try {
    console.log('Seeding companies...');
    const companyData: schema.InsertCompany[] = [
      {
        name: 'Acme Corporation',
        registrationNumber: 'ACM12345',
        contactPerson: 'John Smith',
        contactEmail: 'john.smith@acme.com',
        contactPhone: '123-456-7890',
        address: '123 Business St, Business City, 12345'
      },
      {
        name: 'TechNova Inc',
        registrationNumber: 'TNI78901',
        contactPerson: 'Jane Doe',
        contactEmail: 'jane.doe@technova.com',
        contactPhone: '987-654-3210',
        address: '456 Innovation Ave, Tech City, 67890'
      },
      {
        name: 'Global Enterprises',
        registrationNumber: 'GLE24680',
        contactPerson: 'Robert Johnson',
        contactEmail: 'robert.johnson@global.com',
        contactPhone: '555-123-4567',
        address: '789 Global Blvd, Metro City, 13579'
      }
    ];

    const companies = await db.insert(schema.companies).values(companyData).returning();
    console.log(`Seeded ${companies.length} companies.`);
    return companies;
  } catch (error) {
    console.error('Error seeding companies:', error);
    return [];
  }
}

// Seed principal members
async function seedPrincipalMembers(companies: schema.Company[]) {
  try {
    console.log('Seeding principal members...');
    const principalData: schema.InsertMember[] = [];

    companies.forEach(company => {
      const numPrincipals = faker.number.int({ min: 3, max: 5 });
      for (let i = 0; i < numPrincipals; i++) {
        principalData.push({
          companyId: company.id,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
          employeeId: `EMP${faker.number.int({ min: 1000, max: 9999 })}`,
          memberType: 'principal',
        });
      }
    });

    const principals = await db.insert(schema.members).values(principalData).returning();
    console.log(`Seeded ${principals.length} principal members.`);
    return principals;
  } catch (error) {
    console.error('Error seeding principal members:', error);
    return [];
  }
}

// Seed dependent members
async function seedDependentMembers(principals: schema.Member[]) {
  try {
    console.log('Seeding dependent members...');
    const dependentData: schema.InsertMember[] = [];

    principals.forEach(principal => {
      // Add spouse (50% chance)
      if (faker.datatype.boolean(0.5)) {
        dependentData.push({
          companyId: principal.companyId,
          firstName: faker.person.firstName(),
          lastName: principal.lastName, // Same last name as principal
          email: faker.internet.email(),
          phone: faker.phone.number(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
          employeeId: principal.employeeId, // Same employee ID
          memberType: 'dependent',
          principalId: principal.id,
          dependentType: 'spouse',
          hasDisability: false,
        });
      }

      // Add children (0-3)
      const numChildren = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < numChildren; i++) {
        const hasDisability = faker.datatype.boolean(0.1); // 10% chance
        const age = hasDisability ? faker.number.int({ min: 1, max: 25 }) : faker.number.int({ min: 1, max: 17 });
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - age);
        
        dependentData.push({
          companyId: principal.companyId,
          firstName: faker.person.firstName(),
          lastName: principal.lastName, // Same last name as principal
          email: faker.internet.email(),
          phone: faker.phone.number(),
          dateOfBirth: birthDate,
          employeeId: principal.employeeId, // Same employee ID
          memberType: 'dependent',
          principalId: principal.id,
          dependentType: 'child',
          hasDisability,
          disabilityDetails: hasDisability ? faker.lorem.sentence() : undefined,
        });
      }
    });

    const dependents = await db.insert(schema.members).values(dependentData).returning();
    console.log(`Seeded ${dependents.length} dependent members.`);
    return dependents;
  } catch (error) {
    console.error('Error seeding dependent members:', error);
    return [];
  }
}

// Seed periods
async function seedPeriods() {
  try {
    console.log('Seeding periods...');
    const currentYear = new Date().getFullYear();
    
    const periodData: schema.InsertPeriod[] = [
      {
        name: `${currentYear-1} Insurance Period`,
        startDate: new Date(`${currentYear-1}-01-01`),
        endDate: new Date(`${currentYear-1}-12-31`),
        status: 'expired'
      },
      {
        name: `${currentYear} Insurance Period`,
        startDate: new Date(`${currentYear}-01-01`),
        endDate: new Date(`${currentYear}-12-31`),
        status: 'active'
      },
      {
        name: `${currentYear+1} Insurance Period`,
        startDate: new Date(`${currentYear+1}-01-01`),
        endDate: new Date(`${currentYear+1}-12-31`),
        status: 'upcoming'
      }
    ];

    const periods = await db.insert(schema.periods).values(periodData).returning();
    console.log(`Seeded ${periods.length} periods.`);
    return periods;
  } catch (error) {
    console.error('Error seeding periods:', error);
    return [];
  }
}

// Seed premium rates
async function seedPremiumRates(periods: schema.Period[]) {
  try {
    console.log('Seeding premium rates...');
    const premiumRateData: schema.InsertPremiumRate[] = periods.map(period => ({
      periodId: period.id,
      principalRate: faker.number.float({ min: 5000, max: 8000, precision: 0.01 }),
      spouseRate: faker.number.float({ min: 3000, max: 5000, precision: 0.01 }),
      childRate: faker.number.float({ min: 1500, max: 3000, precision: 0.01 }),
      specialNeedsRate: faker.number.float({ min: 4000, max: 6000, precision: 0.01 }),
      taxRate: 0.15 // 15% tax
    }));

    const premiumRates = await db.insert(schema.premiumRates).values(premiumRateData).returning();
    console.log(`Seeded ${premiumRates.length} premium rates.`);
    return premiumRates;
  } catch (error) {
    console.error('Error seeding premium rates:', error);
    return [];
  }
}

// Seed benefits
async function seedBenefits() {
  try {
    console.log('Seeding benefits...');
    const benefitData: schema.InsertBenefit[] = [
      {
        name: 'General Consultation',
        description: 'Coverage for general doctor consultations',
        category: 'medical',
        coverageDetails: 'Covers up to 12 consultations per year',
        limitAmount: 5000,
        isStandard: true
      },
      {
        name: 'Hospitalization',
        description: 'Coverage for hospital stays',
        category: 'hospital',
        coverageDetails: 'Covers room charges, nursing care, and other hospital services',
        limitAmount: 50000,
        isStandard: true
      },
      {
        name: 'Dental Check-up',
        description: 'Regular dental check-ups and basic treatments',
        category: 'dental',
        coverageDetails: 'Covers two check-ups per year and basic treatments',
        limitAmount: 3000,
        isStandard: true
      },
      {
        name: 'Vision Care',
        description: 'Eye examinations and prescription glasses',
        category: 'vision',
        coverageDetails: 'Covers one eye exam per year and glasses/contacts up to limit',
        limitAmount: 2000,
        isStandard: true
      },
      {
        name: 'Prescription Medication',
        description: 'Coverage for prescribed medications',
        category: 'prescription',
        coverageDetails: 'Covers 80% of prescription medication costs',
        limitAmount: 10000,
        isStandard: true
      },
      {
        name: 'Maternity Care',
        description: 'Prenatal, delivery, and postnatal care',
        category: 'maternity',
        coverageDetails: 'Covers prenatal visits, normal delivery, and postnatal care',
        limitAmount: 25000,
        hasWaitingPeriod: true,
        waitingPeriodDays: 270, // Approximately 9 months
        isStandard: false
      },
      {
        name: 'Specialist Consultation',
        description: 'Consultations with medical specialists',
        category: 'specialist',
        coverageDetails: 'Covers consultations with specialists upon referral',
        limitAmount: 8000,
        isStandard: false
      },
      {
        name: 'Emergency Services',
        description: 'Coverage for emergency medical services',
        category: 'emergency',
        coverageDetails: 'Covers emergency room visits and ambulance services',
        limitAmount: 15000,
        isStandard: true
      },
      {
        name: 'Wellness Program',
        description: 'Preventive healthcare services',
        category: 'wellness',
        coverageDetails: 'Covers annual health screenings and vaccinations',
        limitAmount: 3000,
        isStandard: false
      }
    ];

    const benefits = await db.insert(schema.benefits).values(benefitData).returning();
    console.log(`Seeded ${benefits.length} benefits.`);
    return benefits;
  } catch (error) {
    console.error('Error seeding benefits:', error);
    return [];
  }
}

// Seed premiums for companies
async function seedPremiums(companies: schema.Company[], periods: schema.Period[], members: schema.Member[]) {
  try {
    console.log('Seeding premiums...');
    const premiumData: schema.InsertPremium[] = [];
    const activePeriod = periods.find(p => p.status === 'active');
    
    if (!activePeriod) {
      console.error('No active period found.');
      return [];
    }
    
    // Get the premium rate directly with a query
    const [premiumRate] = await db.select()
      .from(schema.premiumRates)
      .where(eq(schema.premiumRates.periodId, activePeriod.id));
    
    if (!premiumRate) {
      console.error('No premium rate found for active period.');
      return [];
    }
    
    for (const company of companies) {
      // Count members of different types for this company
      const companyMembers = members.filter(m => m.companyId === company.id);
      const principals = companyMembers.filter(m => m.memberType === 'principal');
      const spouses = companyMembers.filter(m => m.memberType === 'dependent' && m.dependentType === 'spouse');
      const children = companyMembers.filter(m => m.memberType === 'dependent' && m.dependentType === 'child' && !m.hasDisability);
      const specialNeeds = companyMembers.filter(m => m.memberType === 'dependent' && m.hasDisability);
      
      // Calculate premium
      const principalCost = principals.length * premiumRate.principalRate;
      const spouseCost = spouses.length * premiumRate.spouseRate;
      const childrenCost = children.length * premiumRate.childRate;
      const specialNeedsCost = specialNeeds.length * premiumRate.specialNeedsRate;
      
      const subtotal = principalCost + spouseCost + childrenCost + specialNeedsCost;
      const tax = subtotal * premiumRate.taxRate;
      const total = subtotal + tax;
      
      // Convert dates to proper Date objects to ensure compatibility with Drizzle
      const issuedDate = new Date(faker.date.recent({ days: 30 }));
      const paidDate = faker.helpers.maybe(() => new Date(faker.date.recent({ days: 15 })));
      
      premiumData.push({
        companyId: company.id,
        periodId: activePeriod.id,
        principalCount: principals.length,
        spouseCount: spouses.length,
        childCount: children.length,
        specialNeedsCount: specialNeeds.length,
        subtotal,
        tax,
        total,
        status: faker.helpers.arrayElement(['pending', 'active', 'paid']),
        issuedDate,
        paidDate,
        effectiveStartDate: new Date(activePeriod.startDate),
        effectiveEndDate: new Date(activePeriod.endDate),
        // These are optional fields in our schema, so we don't need to provide them for seed data
        // proRatedTotal: null,
        // proRataStartDate: null,
        // proRataEndDate: null,
        // proRataAmount: null,
        // refundAmount: null,
        // refundDate: null,
        // refundReason: null,
      });
    }

    const premiums = await db.insert(schema.premiums).values(premiumData).returning();
    console.log(`Seeded ${premiums.length} premiums.`);
    return premiums;
  } catch (error) {
    console.error('Error seeding premiums:', error);
    return [];
  }
}

// Seed company benefits
async function seedCompanyBenefits(companies: schema.Company[], benefits: schema.Benefit[], premiums: schema.Premium[]) {
  try {
    console.log('Seeding company benefits...');
    const companyBenefitData: schema.InsertCompanyBenefit[] = [];

    for (const company of companies) {
      const companyPremium = premiums.find(p => p.companyId === company.id);
      if (!companyPremium) continue;

      // All companies get standard benefits
      const standardBenefits = benefits.filter(b => b.isStandard);
      for (const benefit of standardBenefits) {
        companyBenefitData.push({
          companyId: company.id,
          benefitId: benefit.id,
          premiumId: companyPremium.id,
          isActive: true,
          additionalCoverage: false
        });
      }

      // Some companies get additional non-standard benefits (50% chance per benefit)
      const nonStandardBenefits = benefits.filter(b => !b.isStandard);
      for (const benefit of nonStandardBenefits) {
        if (faker.datatype.boolean(0.5)) {
          const hasAdditionalCoverage = faker.datatype.boolean(0.3); // 30% chance
          companyBenefitData.push({
            companyId: company.id,
            benefitId: benefit.id,
            premiumId: companyPremium.id,
            isActive: true,
            additionalCoverage: hasAdditionalCoverage,
            additionalCoverageDetails: hasAdditionalCoverage ? 
              `Additional ${faker.number.int({ min: 10, max: 30 })}% coverage above standard limits` : 
              undefined
          });
        }
      }
    }

    // Only insert if we have data
    if (companyBenefitData.length > 0) {
      const companyBenefits = await db.insert(schema.companyBenefits).values(companyBenefitData).returning();
      console.log(`Seeded ${companyBenefits.length} company benefits.`);
      return companyBenefits;
    } else {
      console.log('No company benefits to seed.');
      return [];
    }
  } catch (error) {
    console.error('Error seeding company benefits:', error);
    return [];
  }
}

// Seed regions
async function seedRegions() {
  try {
    console.log('Seeding regions...');
    const regionData: schema.InsertRegion[] = [
      {
        name: 'Northern Region',
        country: 'United States',
        state: 'New York',
        city: 'New York City',
        postalCode: '10001'
      },
      {
        name: 'Central Region',
        country: 'United States',
        state: 'Illinois',
        city: 'Chicago',
        postalCode: '60601'
      },
      {
        name: 'Southern Region',
        country: 'United States',
        state: 'Texas',
        city: 'Houston',
        postalCode: '77001'
      },
      {
        name: 'Western Region',
        country: 'United States',
        state: 'California',
        city: 'Los Angeles',
        postalCode: '90001'
      }
    ];

    const regions = await db.insert(schema.regions).values(regionData).returning();
    console.log(`Seeded ${regions.length} regions.`);
    return regions;
  } catch (error) {
    console.error('Error seeding regions:', error);
    return [];
  }
}

// Seed medical institutions
async function seedMedicalInstitutions(regions: schema.Region[]) {
  try {
    console.log('Seeding medical institutions...');
    const institutionData: schema.InsertMedicalInstitution[] = [];

    const institutionTypes: schema.MedicalInstitution['type'][] = [
      'hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general'
    ];

    regions.forEach(region => {
      const numInstitutions = faker.number.int({ min: 2, max: 4 });
      for (let i = 0; i < numInstitutions; i++) {
        const type = faker.helpers.arrayElement(institutionTypes);
        institutionData.push({
          name: `${faker.company.name()} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          type,
          registrationNumber: `REG${faker.string.alphanumeric(8).toUpperCase()}`,
          regionId: region.id,
          address: faker.location.streetAddress(),
          contactPerson: faker.person.fullName(),
          contactEmail: faker.internet.email(),
          contactPhone: faker.phone.number(),
          approvalStatus: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
          website: faker.internet.url(),
          description: faker.company.catchPhrase()
        });
      }
    });

    const institutions = await db.insert(schema.medicalInstitutions).values(institutionData).returning();
    console.log(`Seeded ${institutions.length} medical institutions.`);
    return institutions;
  } catch (error) {
    console.error('Error seeding medical institutions:', error);
    return [];
  }
}

// Seed medical personnel
async function seedMedicalPersonnel(institutions: schema.MedicalInstitution[]) {
  try {
    console.log('Seeding medical personnel...');
    const personnelData: schema.InsertMedicalPersonnel[] = [];

    const personnelTypes: schema.MedicalPersonnel['type'][] = [
      'doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other'
    ];

    institutions.forEach(institution => {
      const numPersonnel = faker.number.int({ min: 2, max: 5 });
      for (let i = 0; i < numPersonnel; i++) {
        const type = faker.helpers.arrayElement(personnelTypes);
        personnelData.push({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          type,
          licenseNumber: `LIC${faker.string.alphanumeric(8).toUpperCase()}`,
          institutionId: institution.id,
          specialization: faker.helpers.maybe(() => faker.lorem.word()),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          approvalStatus: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
          qualifications: faker.lorem.sentence(),
          yearsOfExperience: faker.number.int({ min: 1, max: 30 })
        });
      }
    });

    const personnel = await db.insert(schema.medicalPersonnel).values(personnelData).returning();
    console.log(`Seeded ${personnel.length} medical personnel.`);
    return personnel;
  } catch (error) {
    console.error('Error seeding medical personnel:', error);
    return [];
  }
}

// Seed claims
async function seedClaims(
  members: schema.Member[], 
  institutions: schema.MedicalInstitution[], 
  personnel: schema.MedicalPersonnel[],
  benefits: schema.Benefit[],
  companyBenefits: schema.CompanyBenefit[]
) {
  try {
    console.log('Seeding claims...');
    const claimData: schema.InsertClaim[] = [];

    // For each member, create 0-3 claims
    for (const member of members) {
      const numClaims = faker.number.int({ min: 0, max: 3 });
      
      // Get available benefits for this member's company
      const availableBenefits = companyBenefits
        .filter(cb => cb.companyId === member.companyId && cb.isActive)
        .map(cb => benefits.find(b => b.id === cb.benefitId))
        .filter(Boolean) as schema.Benefit[];
      
      if (availableBenefits.length === 0) continue;

      // Get approved institutions and their personnel
      const approvedInstitutions = institutions.filter(i => i.approvalStatus === 'approved');
      if (approvedInstitutions.length === 0) continue;
      
      for (let i = 0; i < numClaims; i++) {
        const institution = faker.helpers.arrayElement(approvedInstitutions);
        const availablePersonnel = personnel.filter(p => 
          p.institutionId === institution.id && p.approvalStatus === 'approved'
        );
        
        if (availablePersonnel.length === 0) continue;
        
        const person = faker.helpers.arrayElement(availablePersonnel);
        const benefit = faker.helpers.arrayElement(availableBenefits);
        
        // Generate a claim amount based on benefit limit
        const maxAmount = benefit.limitAmount || 1000;
        const amount = faker.number.float({ min: 100, max: maxAmount, fractionDigits: 2 });
        
        // Create claim with proper Date object for serviceDate
        claimData.push({
          institutionId: institution.id,
          personnelId: person.id,
          memberId: member.id,
          benefitId: benefit.id,
          serviceDate: new Date(faker.date.recent({ days: 30 })),
          amount,
          description: faker.lorem.sentence(),
          diagnosis: faker.lorem.sentence(),
          treatmentDetails: faker.lorem.paragraph(),
          status: faker.helpers.arrayElement(['submitted', 'under_review', 'approved', 'rejected', 'paid'])
        });
      }
    }

    // Only insert if we have data
    if (claimData.length > 0) {
      const claims = await db.insert(schema.claims).values(claimData).returning();
      console.log(`Seeded ${claims.length} claims.`);
      return claims;
    } else {
      console.log('No claims to seed.');
      return [];
    }
  } catch (error) {
    console.error('Error seeding claims:', error);
    return [];
  }
}

// Main function to seed all data
async function seedAll() {
  try {
    // Clear existing data first
    await clearData();

    // Seed data in the correct order to maintain relationships
    const companies = await seedCompanies();
    const principals = await seedPrincipalMembers(companies);
    const dependents = await seedDependentMembers(principals);
    const members = [...principals, ...dependents];
    
    const periods = await seedPeriods();
    await seedPremiumRates(periods);
    const benefits = await seedBenefits();
    const premiums = await seedPremiums(companies, periods, members);
    const companyBenefits = await seedCompanyBenefits(companies, benefits, premiums);
    
    const regions = await seedRegions();
    const institutions = await seedMedicalInstitutions(regions);
    const personnel = await seedMedicalPersonnel(institutions);
    
    await seedClaims(members, institutions, personnel, benefits, companyBenefits);

    console.log('All data seeded successfully!');
  } catch (error) {
    console.error('Error in seedAll:', error);
  }
}

// Run the seed function
seedAll();