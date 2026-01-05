import { db } from './db';
import { eq, and, asc, desc, isNull, isNotNull, or, sql } from 'drizzle-orm';
import type { IStorage } from './storage';
import * as schema from '../shared/schema.js';
import { memberHasClaims } from './utils/dbOperations';

/**
 * Custom database error class
 */
class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Database storage implementation
 * Handles all database operations
 */
export class DatabaseStorage implements IStorage {
  // Helper method to ensure database connection
  private ensureConnected(): void {
    if (!db) {
      throw new DatabaseError('Database not connected', 'DB_NOT_CONNECTED');
    }
  }

  //User
  async getUser(id: number): Promise<schema.User> {
    this.ensureConnected();
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    
    if (!user) {
      throw new DatabaseError(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    this.ensureConnected();
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()));
    return user; // Allow undefined
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    this.ensureConnected();
    const [newUser] = await db.insert(schema.users)
      .values({
        email: user.email as string,
        name: user.name as string,
        role: user.role as "admin" | "user" | "provider",
        hashedPassword: user.hashedPassword as string,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
      })
      .returning();
    
    if (!newUser) {
      throw new DatabaseError('Failed to create user', 'CREATE_FAILED');
    }
    return newUser;
  }
  
  // Companies
  async getCompanies(): Promise<schema.Company[]> {
    this.ensureConnected();
    return await db.select().from(schema.companies);
  }
  
  async getCompany(id: number): Promise<schema.Company> {
    this.ensureConnected();
    const [company] = await db.select()
      .from(schema.companies)
      .where(eq(schema.companies.id, id));
    
    if (!company) {
      throw new DatabaseError(`Company with ID ${id} not found`, 'COMPANY_NOT_FOUND');
    }
    return company;
  }
  
  async createCompany(company: schema.InsertCompany): Promise<schema.Company> {
    this.ensureConnected();
    const values = {
      name: company.name as string,
      registrationNumber: company.registrationNumber as string,
      contactPerson: company.contactPerson as string,
      contactEmail: company.contactEmail as string,
      contactPhone: company.contactPhone as string,
      address: company.address as string,
      clientType: company.clientType as "corporate" | "sme" | "individual",
      billingFrequency: company.billingFrequency as "monthly" | "quarterly" | "annually",
      experienceRatingEnabled: company.experienceRatingEnabled ? true : false,
      customBenefitStructure: company.customBenefitStructure ? true : false,
      gradeBasedBenefits: company.gradeBasedBenefits ? true : false,
      registrationExpiryDate: company.registrationExpiryDate ? new Date(company.registrationExpiryDate) : null,
      createdAt: company.createdAt ? new Date(company.createdAt) : new Date(),
      updatedAt: company.updatedAt ? new Date(company.updatedAt) : new Date()
    };

    const [newCompany] = await db.insert(schema.companies)
      .values(values)
      .returning();
    
    if (!newCompany) {
      throw new DatabaseError('Failed to create company', 'CREATE_FAILED');
    }
    return newCompany;
  }
  
  // Members
  async getMembers(): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select().from(schema.members);
  }
  
  async getMember(id: number): Promise<schema.Member> {
    this.ensureConnected();
    const [member] = await db.select()
      .from(schema.members)
      .where(eq(schema.members.id, id));
    
    if (!member) {
      throw new DatabaseError(`Member with ID ${id} not found`, 'MEMBER_NOT_FOUND');
    }
    return member;
  }
  
  async getMembersByCompany(companyId: number): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.members)
      .where(eq(schema.members.companyId, companyId));
  }
  
  async getPrincipalMembers(): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.members)
      .where(eq(schema.members.memberType, 'principal' as schema.MemberType));
  }
  
  async getPrincipalMembersByCompany(companyId: number): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.companyId, companyId),
          eq(schema.members.memberType, 'principal' as schema.MemberType)
        )
      );
  }
  
  async getDependentsByPrincipal(principalId: number): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.principalId, principalId),
          eq(schema.members.memberType, 'dependent' as schema.MemberType)
        )
      );
  }
  
  async getActiveMembers(companyId: number): Promise<schema.Member[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.companyId, companyId),
          sql`${schema.members.status} = 'active'`
        )
      );
  }
  
  async createMember(member: schema.InsertMember): Promise<schema.Member> {
    this.ensureConnected();
    const values = {
      companyId: member.companyId as number,
      fullName: member.fullName as string,
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : new Date(),
      gender: member.gender as "male" | "female" | "other",
      nationalId: member.nationalId as string,
      passportNumber: member.passportNumber as string | null,
      memberNumber: member.memberNumber as string,
      memberType: member.memberType as "principal" | "dependent",
      principalId: member.principalId as number | null,
      relationshipToPrincipal: member.relationshipToPrincipal as "self" | "spouse" | "child" | "parent" | "other" | null,
      status: member.status as "active" | "inactive" | "suspended" | "pending",
      gradeLevel: member.gradeLevel as string | null,
      enrollmentDate: member.enrollmentDate ? new Date(member.enrollmentDate) : new Date(),
      terminationDate: member.terminationDate ? new Date(member.terminationDate) : null,
      email: member.email as string | null,
      phoneNumber: member.phoneNumber as string | null,
      address: member.address as string | null,
      emergencyContactName: member.emergencyContactName as string | null,
      emergencyContactPhone: member.emergencyContactPhone as string | null,
      specialNeeds: member.specialNeeds ? true : false,
      specialNeedsDetails: member.specialNeedsDetails as string | null,
      createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
      updatedAt: member.updatedAt ? new Date(member.updatedAt) : new Date()
    };

    const [newMember] = await db.insert(schema.members)
      .values(values)
      .returning();
    
    if (!newMember) {
      throw new DatabaseError('Failed to create member', 'CREATE_FAILED');
    }
    return newMember;
  }
  
  async deleteMember(id: number): Promise<schema.Member> {
    this.ensureConnected();
    
    // Check if member has any claims
    const hasClaims = await memberHasClaims(id);
    if (hasClaims) {
      throw new DatabaseError(`Cannot delete member with ID ${id} as they have active claims`, 'HAS_ACTIVE_CLAIMS');
    }
    
    // Check if this is a principal member with dependents
    const member = await this.getMember(id);
    
    if (member.memberType === 'principal') {
      const dependents = await this.getDependentsByPrincipal(id);
      if (dependents.length > 0) {
        throw new DatabaseError(`Cannot delete principal member with ID ${id} as they have ${dependents.length} dependent(s)`, 'HAS_DEPENDENTS');
      }
    }
    
    const [deletedMember] = await db.delete(schema.members)
      .where(eq(schema.members.id, id))
      .returning();
    
    if (!deletedMember) {
      throw new DatabaseError(`Failed to delete member with ID ${id}`, 'DELETE_FAILED');
    }
    
    return deletedMember;
  }
  
  // Periods
  async getPeriods(): Promise<schema.Period[]> {
    this.ensureConnected();
    return await db.select().from(schema.periods);
  }
  
  async getPeriod(id: number): Promise<schema.Period> {
    this.ensureConnected();
    const [period] = await db.select()
      .from(schema.periods)
      .where(eq(schema.periods.id, id));
    
    if (!period) {
      throw new DatabaseError(`Period with ID ${id} not found`, 'PERIOD_NOT_FOUND');
    }
    return period;
  }
  
  async getActivePeriod(): Promise<schema.Period | undefined> {
    this.ensureConnected();
    const [period] = await db.select()
      .from(schema.periods)
      .where(eq(schema.periods.status, 'active' as schema.PeriodStatus));
    return period;
  }
  
  async createPeriod(period: schema.InsertPeriod): Promise<schema.Period> {
    this.ensureConnected();
    const values = {
      name: period.name as string,
      startDate: period.startDate as string,
      endDate: period.endDate as string,
      periodType: period.periodType as "short_term" | "long_term" | "standard",
      status: "upcoming" as schema.PeriodStatus,
      description: period.description || null,
      createdAt: period.createdAt ? new Date(period.createdAt) : new Date(),
      updatedAt: period.updatedAt ? new Date(period.updatedAt) : new Date()
    };
    
    const [newPeriod] = await db.insert(schema.periods)
      .values(values)
      .returning();
    
    if (!newPeriod) {
      throw new DatabaseError('Failed to create period', 'CREATE_FAILED');
    }
    return newPeriod;
  }
  
  // Premium Rates
  async getPremiumRates(): Promise<schema.PremiumRate[]> {
    this.ensureConnected();
    return await db.select().from(schema.premiumRates);
  }
  
  async getPremiumRateByPeriod(periodId: number): Promise<schema.PremiumRate | undefined> {
    this.ensureConnected();
    const [rate] = await db.select()
      .from(schema.premiumRates)
      .where(eq(schema.premiumRates.periodId, periodId));
    return rate;
  }
  
  async createPremiumRate(premiumRate: schema.InsertPremiumRate): Promise<schema.PremiumRate> {
    this.ensureConnected();
    const values = {
      periodId: premiumRate.periodId as number,
      rateType: premiumRate.rateType as "standard" | "age_banded" | "family_size",
      principalRate: premiumRate.principalRate,
      spouseRate: premiumRate.spouseRate,
      childRate: premiumRate.childRate,
      specialNeedsRate: premiumRate.specialNeedsRate,
      taxRate: premiumRate.taxRate,
      createdAt: premiumRate.createdAt ? new Date(premiumRate.createdAt) : new Date(),
      updatedAt: premiumRate.updatedAt ? new Date(premiumRate.updatedAt) : new Date()
    };

    const [newRate] = await db.insert(schema.premiumRates)
      .values(values)
      .returning();
    
    if (!newRate) {
      throw new DatabaseError('Failed to create premium rate', 'CREATE_FAILED');
    }
    return newRate;
  }
  
  // Age Banded Rates
  async getAgeBandedRates(): Promise<schema.AgeBandedRate[]> {
    this.ensureConnected();
    return await db.select().from(schema.ageBandedRates);
  }
  
  async getAgeBandedRatesByPremiumRate(premiumRateId: number): Promise<schema.AgeBandedRate[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.ageBandedRates)
      .where(eq(schema.ageBandedRates.premiumRateId, premiumRateId));
  }
  
  async getAgeBandedRate(id: number): Promise<schema.AgeBandedRate> {
    this.ensureConnected();
    const [rate] = await db.select()
      .from(schema.ageBandedRates)
      .where(eq(schema.ageBandedRates.id, id));
    
    if (!rate) {
      throw new DatabaseError(`Age banded rate with ID ${id} not found`, 'RATE_NOT_FOUND');
    }
    return rate;
  }
  
  async createAgeBandedRate(ageBandedRate: schema.InsertAgeBandedRate): Promise<schema.AgeBandedRate> {
    this.ensureConnected();
    const values = {
      premiumRateId: ageBandedRate.premiumRateId as number,
      minAge: ageBandedRate.minAge as number,
      maxAge: ageBandedRate.maxAge as number,
      rate: ageBandedRate.rate,
      createdAt: ageBandedRate.createdAt ? new Date(ageBandedRate.createdAt) : new Date(),
      updatedAt: ageBandedRate.updatedAt ? new Date(ageBandedRate.updatedAt) : new Date()
    };

    const [newRate] = await db.insert(schema.ageBandedRates)
      .values(values)
      .returning();
    
    if (!newRate) {
      throw new DatabaseError('Failed to create age banded rate', 'CREATE_FAILED');
    }
    return newRate;
  }
  
  // Family Rates
  async getFamilyRates(): Promise<schema.FamilyRate[]> {
    this.ensureConnected();
    return await db.select().from(schema.familyRates);
  }
  
  async getFamilyRatesByPremiumRate(premiumRateId: number): Promise<schema.FamilyRate[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.familyRates)
      .where(eq(schema.familyRates.premiumRateId, premiumRateId));
  }
  
  async getFamilyRate(id: number): Promise<schema.FamilyRate> {
    this.ensureConnected();
    const [rate] = await db.select()
      .from(schema.familyRates)
      .where(eq(schema.familyRates.id, id));
    
    if (!rate) {
      throw new DatabaseError(`Family rate with ID ${id} not found`, 'RATE_NOT_FOUND');
    }
    return rate;
  }
  
  async createFamilyRate(familyRate: schema.InsertFamilyRate): Promise<schema.FamilyRate> {
    this.ensureConnected();
    const values = {
      premiumRateId: familyRate.premiumRateId as number,
      familySize: familyRate.familySize as number,
      rate: familyRate.rate,
      description: familyRate.description || null,
      maxDependents: familyRate.maxDependents || null,
      createdAt: familyRate.createdAt ? new Date(familyRate.createdAt) : new Date(),
      updatedAt: familyRate.updatedAt ? new Date(familyRate.updatedAt) : new Date()
    };

    const [newRate] = await db.insert(schema.familyRates)
      .values(values)
      .returning();
    
    if (!newRate) {
      throw new DatabaseError('Failed to create family rate', 'CREATE_FAILED');
    }
    return newRate;
  }
  
  // Premiums
  async getPremiums(): Promise<schema.Premium[]> {
    this.ensureConnected();
    return await db.select().from(schema.premiums);
  }
  
  async getPremium(id: number): Promise<schema.Premium> {
    this.ensureConnected();
    const [premium] = await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.id, id));
    
    if (!premium) {
      throw new DatabaseError(`Premium with ID ${id} not found`, 'PREMIUM_NOT_FOUND');
    }
    return premium;
  }
  
  async getPremiumsByCompany(companyId: number): Promise<schema.Premium[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.companyId, companyId));
  }
  
  async getPremiumsByPeriod(periodId: number): Promise<schema.Premium[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.periodId, periodId));
  }
  
  async createPremium(premium: schema.InsertPremium): Promise<schema.Premium> {
    this.ensureConnected();
    const values = {
      companyId: premium.companyId as number,
      periodId: premium.periodId as number,
      principalCount: premium.principalCount as number,
      spouseCount: premium.spouseCount as number,
      childCount: premium.childCount as number,
      specialNeedsCount: premium.specialNeedsCount as number,
      effectiveStartDate: premium.effectiveStartDate as string,
      effectiveEndDate: premium.effectiveEndDate as string,
      status: premium.status || "pending" as schema.PremiumStatus,
      issuedDate: premium.issuedDate ? new Date(premium.issuedDate) : null,
      paidDate: premium.paidDate ? new Date(premium.paidDate) : null,
      notes: premium.notes || null,
      subtotal: premium.subtotal,
      taxAmount: premium.taxAmount,
      totalAmount: premium.totalAmount,
      paidAmount: premium.paidAmount || 0,
      refundAmount: premium.refundAmount || 0,
      refundReason: premium.refundReason || null,
      createdAt: premium.createdAt ? new Date(premium.createdAt) : new Date(),
      updatedAt: premium.updatedAt ? new Date(premium.updatedAt) : new Date()
    };

    const [newPremium] = await db.insert(schema.premiums)
      .values(values)
      .returning();
    
    if (!newPremium) {
      throw new DatabaseError('Failed to create premium', 'CREATE_FAILED');
    }
    return newPremium;
  }
  
  // Benefits
  async getBenefits(): Promise<schema.Benefit[]> {
    this.ensureConnected();
    return await db.select().from(schema.benefits);
  }
  
  async getBenefit(id: number): Promise<schema.Benefit> {
    this.ensureConnected();
    const [benefit] = await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.id, id));
    
    if (!benefit) {
      throw new DatabaseError(`Benefit with ID ${id} not found`, 'BENEFIT_NOT_FOUND');
    }
    return benefit;
  }
  
  async getBenefitsByCategory(category: string): Promise<schema.Benefit[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.category, category as schema.BenefitCategory));
  }
  
  async getStandardBenefits(): Promise<schema.Benefit[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.isStandard, true));
  }
  
  async createBenefit(benefit: schema.InsertBenefit): Promise<schema.Benefit> {
    this.ensureConnected();
    const values = {
      name: benefit.name as string,
      description: benefit.description as string,
      category: benefit.category as schema.BenefitCategory,
      coverageDetails: benefit.coverageDetails || null,
      hasWaitingPeriod: benefit.hasWaitingPeriod ? true : false,
      waitingPeriodDays: benefit.waitingPeriodDays || null,
      isStandard: benefit.isStandard ? true : false,
      createdAt: benefit.createdAt ? new Date(benefit.createdAt) : new Date(),
      updatedAt: benefit.updatedAt ? new Date(benefit.updatedAt) : new Date()
    };

    const [newBenefit] = await db.insert(schema.benefits)
      .values(values)
      .returning();
    
    if (!newBenefit) {
      throw new DatabaseError('Failed to create benefit', 'CREATE_FAILED');
    }
    return newBenefit;
  }
  
  // Company Benefits
  async getCompanyBenefits(): Promise<schema.CompanyBenefit[]> {
    this.ensureConnected();
    return await db.select().from(schema.companyBenefits);
  }
  
  async getCompanyBenefit(id: number): Promise<schema.CompanyBenefit> {
    this.ensureConnected();
    const [companyBenefit] = await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.id, id));
    
    if (!companyBenefit) {
      throw new DatabaseError(`Company benefit with ID ${id} not found`, 'COMPANY_BENEFIT_NOT_FOUND');
    }
    return companyBenefit;
  }
  
  async getCompanyBenefitsByCompany(companyId: number): Promise<schema.CompanyBenefit[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.companyId, companyId));
  }
  
  async getCompanyBenefitsByPremium(premiumId: number): Promise<schema.CompanyBenefit[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.premiumId, premiumId));
  }
  
  async createCompanyBenefit(companyBenefit: schema.InsertCompanyBenefit): Promise<schema.CompanyBenefit> {
    this.ensureConnected();
    const values = {
      companyId: companyBenefit.companyId as number,
      benefitId: companyBenefit.benefitId as number,
      premiumId: companyBenefit.premiumId as number,
      isActive: companyBenefit.isActive !== undefined ? companyBenefit.isActive : true,
      additionalCoverage: companyBenefit.additionalCoverage || null,
      additionalCoverageDetails: companyBenefit.additionalCoverageDetails || null,
      limitClause: companyBenefit.limitClause || null,
      coverageRate: companyBenefit.coverageRate,
      limitAmount: companyBenefit.limitAmount,
      createdAt: companyBenefit.createdAt ? new Date(companyBenefit.createdAt) : new Date(),
      updatedAt: companyBenefit.updatedAt ? new Date(companyBenefit.updatedAt) : new Date()
    };

    const [newCompanyBenefit] = await db.insert(schema.companyBenefits)
      .values(values)
      .returning();
    
    if (!newCompanyBenefit) {
      throw new DatabaseError('Failed to create company benefit', 'CREATE_FAILED');
    }
    return newCompanyBenefit;
  }
  
  // Company Periods
  async getCompanyPeriods(): Promise<schema.CompanyPeriod[]> {
    this.ensureConnected();
    return await db.select().from(schema.companyPeriods);
  }
  
  async getCompanyPeriod(id: number): Promise<schema.CompanyPeriod> {
    this.ensureConnected();
    const [companyPeriod] = await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.id, id));
    
    if (!companyPeriod) {
      throw new DatabaseError(`Company period with ID ${id} not found`, 'COMPANY_PERIOD_NOT_FOUND');
    }
    return companyPeriod;
  }
  
  async getCompanyPeriodsByCompany(companyId: number): Promise<schema.CompanyPeriod[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.companyId, companyId));
  }
  
  async getCompanyPeriodsByPeriod(periodId: number): Promise<schema.CompanyPeriod[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.periodId, periodId));
  }
  
  async createCompanyPeriod(companyPeriod: schema.InsertCompanyPeriod): Promise<schema.CompanyPeriod> {
    this.ensureConnected();
    const [newCompanyPeriod] = await db.insert(schema.companyPeriods)
      .values({
        companyId: companyPeriod.companyId as number,
        periodId: companyPeriod.periodId as number,
        status: companyPeriod.status as schema.CompanyPeriodStatus,
        enrollmentDeadline: companyPeriod.enrollmentDeadline ? new Date(companyPeriod.enrollmentDeadline) : null,
        notes: companyPeriod.notes || null,
        createdAt: companyPeriod.createdAt ? new Date(companyPeriod.createdAt) : new Date(),
        updatedAt: companyPeriod.updatedAt ? new Date(companyPeriod.updatedAt) : new Date()
      })
      .returning();
    
    if (!newCompanyPeriod) {
      throw new DatabaseError('Failed to create company period', 'CREATE_FAILED');
    }
    return newCompanyPeriod;
  }
  
  // Regions
  async getRegions(): Promise<schema.Region[]> {
    this.ensureConnected();
    return await db.select().from(schema.regions);
  }
  
  async getRegion(id: number): Promise<schema.Region> {
    this.ensureConnected();
    const [region] = await db.select()
      .from(schema.regions)
      .where(eq(schema.regions.id, id));
    
    if (!region) {
      throw new DatabaseError(`Region with ID ${id} not found`, 'REGION_NOT_FOUND');
    }
    return region;
  }
  
  async createRegion(region: schema.InsertRegion): Promise<schema.Region> {
    this.ensureConnected();
    const [newRegion] = await db.insert(schema.regions)
      .values({
        name: region.name as string,
        code: region.code as string,
        description: region.description || null,
        createdAt: region.createdAt ? new Date(region.createdAt) : new Date(),
        updatedAt: region.updatedAt ? new Date(region.updatedAt) : new Date()
      })
      .returning();
    
    if (!newRegion) {
      throw new DatabaseError('Failed to create region', 'CREATE_FAILED');
    }
    return newRegion;
  }
  
  // Medical Institutions
  async getMedicalInstitutions(): Promise<schema.MedicalInstitution[]> {
    this.ensureConnected();
    return await db.select().from(schema.medicalInstitutions);
  }
  
  async getMedicalInstitution(id: number): Promise<schema.MedicalInstitution> {
    this.ensureConnected();
    const [institution] = await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.id, id));
    
    if (!institution) {
      throw new DatabaseError(`Medical institution with ID ${id} not found`, 'INSTITUTION_NOT_FOUND');
    }
    return institution;
  }
  
  async getMedicalInstitutionsByRegion(regionId: number): Promise<schema.MedicalInstitution[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.regionId, regionId));
  }
  
  async getMedicalInstitutionsByType(type: string): Promise<schema.MedicalInstitution[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.type, type as schema.MedicalInstitutionType));
  }
  
  async getMedicalInstitutionsByApprovalStatus(status: string): Promise<schema.MedicalInstitution[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.approvalStatus, status as schema.ApprovalStatus));
  }
  
  async createMedicalInstitution(institution: schema.InsertMedicalInstitution): Promise<schema.MedicalInstitution> {
    this.ensureConnected();
    const values = {
      name: institution.name as string,
      type: institution.type as schema.MedicalInstitutionType,
      registrationNumber: institution.registrationNumber as string,
      regionId: institution.regionId as number,
      address: institution.address as string,
      contactPerson: institution.contactPerson as string,
      contactEmail: institution.contactEmail as string,
      contactPhone: institution.contactPhone as string,
      approvalStatus: institution.approvalStatus || "pending" as schema.ApprovalStatus,
      approvalDate: institution.approvalDate ? new Date(institution.approvalDate) : null,
      validUntil: institution.validUntil ? new Date(institution.validUntil) : null,
      website: institution.website || null,
      description: institution.description || null,
      networkComplianceStatus: institution.networkComplianceStatus || "pending" as schema.NetworkComplianceStatus,
      createdAt: institution.createdAt ? new Date(institution.createdAt) : new Date(),
      updatedAt: institution.updatedAt ? new Date(institution.updatedAt) : new Date()
    };

    const [newInstitution] = await db.insert(schema.medicalInstitutions)
      .values(values)
      .returning();
    
    if (!newInstitution) {
      throw new DatabaseError('Failed to create medical institution', 'CREATE_FAILED');
    }
    return newInstitution;
  }
  
  async updateMedicalInstitutionApproval(id: number, status: string, validUntil?: Date): Promise<schema.MedicalInstitution> {
    this.ensureConnected();
    const [updatedInstitution] = await db.update(schema.medicalInstitutions)
      .set({
        approvalStatus: status as schema.ApprovalStatus,
        approvalDate: status === 'approved' ? new Date() : null,
        validUntil: validUntil
      })
      .where(eq(schema.medicalInstitutions.id, id))
      .returning();
    
    if (!updatedInstitution) {
      throw new DatabaseError(`Failed to update medical institution with ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedInstitution;
  }
  
  // Medical Personnel
  async getMedicalPersonnel(): Promise<schema.MedicalPersonnel[]> {
    this.ensureConnected();
    return await db.select().from(schema.medicalPersonnel);
  }
  
  async getMedicalPersonnelById(id: number): Promise<schema.MedicalPersonnel> {
    this.ensureConnected();
    const [personnel] = await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.id, id));
    
    if (!personnel) {
      throw new DatabaseError(`Medical personnel with ID ${id} not found`, 'PERSONNEL_NOT_FOUND');
    }
    return personnel;
  }
  
  async getMedicalPersonnelByInstitution(institutionId: number): Promise<schema.MedicalPersonnel[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.institutionId, institutionId));
  }
  
  async getMedicalPersonnelByType(type: string): Promise<schema.MedicalPersonnel[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.type, type as schema.MedicalPersonnelType));
  }
  
  async getMedicalPersonnelByApprovalStatus(status: string): Promise<schema.MedicalPersonnel[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.approvalStatus, status as schema.ApprovalStatus));
  }
  
  async createMedicalPersonnel(personnel: schema.InsertMedicalPersonnel): Promise<schema.MedicalPersonnel> {
    this.ensureConnected();
    const [newPersonnel] = await db.insert(schema.medicalPersonnel)
      .values({
        institutionId: personnel.institutionId as number,
        name: personnel.name as string,
        type: personnel.type as schema.MedicalPersonnelType,
        licenseNumber: personnel.licenseNumber as string,
        specialization: personnel.specialization || null,
        qualification: personnel.qualification || null,
        yearsOfExperience: personnel.yearsOfExperience || null,
        approvalStatus: personnel.approvalStatus || "pending" as schema.ApprovalStatus,
        approvalDate: personnel.approvalDate ? new Date(personnel.approvalDate) : null,
        validUntil: personnel.validUntil ? new Date(personnel.validUntil) : null,
        contactEmail: personnel.contactEmail || null,
        contactPhone: personnel.contactPhone || null,
        createdAt: personnel.createdAt ? new Date(personnel.createdAt) : new Date(),
        updatedAt: personnel.updatedAt ? new Date(personnel.updatedAt) : new Date()
      })
      .returning();
    
    if (!newPersonnel) {
      throw new DatabaseError('Failed to create medical personnel', 'CREATE_FAILED');
    }
    return newPersonnel;
  }
  
  async updateMedicalPersonnelApproval(id: number, status: string, validUntil?: Date): Promise<schema.MedicalPersonnel> {
    this.ensureConnected();
    const [updatedPersonnel] = await db.update(schema.medicalPersonnel)
      .set({
        approvalStatus: status as schema.ApprovalStatus,
        approvalDate: status === 'approved' ? new Date() : null,
        validUntil: validUntil
      })
      .where(eq(schema.medicalPersonnel.id, id))
      .returning();
    
    if (!updatedPersonnel) {
      throw new DatabaseError(`Failed to update medical personnel with ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedPersonnel;
  }
  
  // Panel Documentation
  async getPanelDocumentations(): Promise<schema.PanelDocumentation[]> {
    this.ensureConnected();
    return await db.select().from(schema.panelDocumentation);
  }
  
  async getPanelDocumentation(id: number): Promise<schema.PanelDocumentation> {
    this.ensureConnected();
    const [doc] = await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.id, id));
    
    if (!doc) {
      throw new DatabaseError(`Panel documentation with ID ${id} not found`, 'DOCUMENTATION_NOT_FOUND');
    }
    return doc;
  }
  
  async getPanelDocumentationsByInstitution(institutionId: number): Promise<schema.PanelDocumentation[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.institutionId, institutionId));
  }
  
  async getPanelDocumentationsByPersonnel(personnelId: number): Promise<schema.PanelDocumentation[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.personnelId, personnelId));
  }
  
  async getPanelDocumentationsByVerificationStatus(isVerified: boolean): Promise<schema.PanelDocumentation[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.isVerified, isVerified));
  }
  
  async createPanelDocumentation(documentation: schema.InsertPanelDocumentation): Promise<schema.PanelDocumentation> {
    this.ensureConnected();
    const [newDoc] = await db.insert(schema.panelDocumentation)
      .values({
        institutionId: documentation.institutionId as number,
        personnelId: documentation.personnelId as number,
        documentType: documentation.documentType as string,
        documentUrl: documentation.documentUrl as string,
        uploadDate: documentation.uploadDate ? new Date(documentation.uploadDate) : new Date(),
        isVerified: documentation.isVerified ? true : false,
        verificationDate: documentation.verificationDate ? new Date(documentation.verificationDate) : null,
        verifiedBy: documentation.verifiedBy || null,
        notes: documentation.notes || null,
        createdAt: documentation.createdAt ? new Date(documentation.createdAt) : new Date(),
        updatedAt: documentation.updatedAt ? new Date(documentation.updatedAt) : new Date()
      })
      .returning();
    
    if (!newDoc) {
      throw new DatabaseError('Failed to create panel documentation', 'CREATE_FAILED');
    }
    return newDoc;
  }
  
  async verifyPanelDocumentation(id: number, verifiedBy: string, notes?: string): Promise<schema.PanelDocumentation> {
    this.ensureConnected();
    const [verifiedDoc] = await db.update(schema.panelDocumentation)
      .set({
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy,
        notes: notes
      })
      .where(eq(schema.panelDocumentation.id, id))
      .returning();
    
    if (!verifiedDoc) {
      throw new DatabaseError(`Failed to verify panel documentation with ID ${id}`, 'VERIFICATION_FAILED');
    }
    return verifiedDoc;
  }
  
  // Claims
  async getClaims(): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select().from(schema.claims);
  }
  
  async getClaim(id: number): Promise<schema.Claim> {
    this.ensureConnected();
    const [claim] = await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.id, id));
    
    if (!claim) {
      throw new DatabaseError(`Claim with ID ${id} not found`, 'CLAIM_NOT_FOUND');
    }
    return claim;
  }
  
  async getClaimsByInstitution(institutionId: number): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.institutionId, institutionId));
  }
  
  async getClaimsByPersonnel(personnelId: number): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.personnelId, personnelId));
  }
  
  async getClaimsByMember(memberId: number): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.memberId, memberId));
  }
  
  async getClaimsByStatus(status: string): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.status, status as schema.ClaimStatus));
  }
  
  async getClaimsByProviderVerification(verified: boolean): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.providerVerified, verified));
  }
  
  async getClaimsByFraudRiskLevel(riskLevel: string): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.fraudRiskLevel, riskLevel as schema.FraudRiskLevel));
  }
  
  async getClaimsRequiringHigherApproval(): Promise<schema.Claim[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claims)
      .where(and(
        eq(schema.claims.requiresHigherApproval, true),
        eq(schema.claims.approvedByAdmin, false)
      ));
  }
  
  async createClaim(claim: schema.InsertClaim): Promise<schema.Claim> {
    this.ensureConnected();
    const values = {
      claimNumber: claim.claimNumber as string,
      institutionId: claim.institutionId as number,
      memberId: claim.memberId as number,
      benefitId: claim.benefitId as number,
      description: claim.description as string,
      claimDate: claim.claimDate ? new Date(claim.claimDate) : new Date(),
      serviceDate: claim.serviceDate ? new Date(claim.serviceDate) : new Date(),
      memberName: claim.memberName as string,
      serviceType: claim.serviceType as string,
      procedureCode: claim.procedureCode || null,
      preAuthRequired: claim.preAuthRequired ? true : false,
      preAuthNumber: claim.preAuthNumber || null,
      status: "submitted" as schema.ClaimStatus,
      submittedDate: new Date(),
      approvedDate: null,
      approvedBy: null,
      rejectionReason: null,
      amountBilled: claim.amountBilled,
      amountApproved: null,
      amountPaid: 0,
      deductibleApplied: claim.deductibleApplied || 0,
      coinsuranceApplied: claim.coinsuranceApplied || 0,
      notes: claim.notes || null,
      fraudFlag: false,
      fraudReviewerId: null,
      providerVerified: claim.providerVerified ? true : false,
      requiresHigherApproval: claim.requiresHigherApproval ? true : false,
      approvedByAdmin: false,
      fraudRiskLevel: claim.fraudRiskLevel || null,
      fraudRiskFactors: claim.fraudRiskFactors || null,
      paymentDate: null,
      paymentReference: null,
      createdAt: claim.createdAt ? new Date(claim.createdAt) : new Date(),
      updatedAt: claim.updatedAt ? new Date(claim.updatedAt) : new Date()
    };

    const [newClaim] = await db.insert(schema.claims)
      .values(values)
      .returning();
    
    if (!newClaim) {
      throw new DatabaseError('Failed to create claim', 'CREATE_FAILED');
    }
    return newClaim;
  }
  
  async updateClaimStatus(id: number, status: string, reviewerNotes?: string): Promise<schema.Claim> {
    this.ensureConnected();
    const [updatedClaim] = await db.update(schema.claims)
      .set({
        status: status as schema.ClaimStatus,
        reviewDate: new Date(),
        reviewerNotes: reviewerNotes
      })
      .where(eq(schema.claims.id, id))
      .returning();
    
    if (!updatedClaim) {
      throw new DatabaseError(`Failed to update claim status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedClaim;
  }
  
  async adminApproveClaim(id: number, adminNotes: string): Promise<schema.Claim> {
    this.ensureConnected();
    const [updatedClaim] = await db.update(schema.claims)
      .set({
        approvedByAdmin: true,
        adminApprovalDate: new Date(),
        adminReviewNotes: adminNotes,
        status: 'approved' as schema.ClaimStatus,
        reviewDate: new Date()
      })
      .where(eq(schema.claims.id, id))
      .returning();
    
    if (!updatedClaim) {
      throw new DatabaseError(`Failed to admin approve claim with ID ${id}`, 'APPROVAL_FAILED');
    }
    return updatedClaim;
  }
  
  async rejectClaim(id: number, reason: string): Promise<schema.Claim> {
    this.ensureConnected();
    const [rejectedClaim] = await db.update(schema.claims)
      .set({
        status: 'rejected' as schema.ClaimStatus,
        reviewDate: new Date(),
        reviewerNotes: reason
      })
      .where(eq(schema.claims.id, id))
      .returning();
    
    if (!rejectedClaim) {
      throw new DatabaseError(`Failed to reject claim with ID ${id}`, 'REJECTION_FAILED');
    }
    return rejectedClaim;
  }
  
  async markClaimAsFraudulent(
    id: number, 
    riskLevel: string, 
    riskFactors: string, 
    reviewerId: number
  ): Promise<schema.Claim> {
    this.ensureConnected();
    const [fraudClaim] = await db.update(schema.claims)
      .set({
        fraudRiskLevel: riskLevel as schema.FraudRiskLevel,
        fraudRiskFactors: riskFactors,
        fraudReviewDate: new Date(),
        fraudReviewerId: reviewerId,
        status: riskLevel === 'confirmed' ? 'fraud_confirmed' as schema.ClaimStatus : 'fraud_review' as schema.ClaimStatus,
        reviewDate: new Date()
      })
      .where(eq(schema.claims.id, id))
      .returning();
    
    if (!fraudClaim) {
      throw new DatabaseError(`Failed to mark claim as fraudulent for ID ${id}`, 'UPDATE_FAILED');
    }
    return fraudClaim;
  }
  
  async processClaimPayment(id: number, paymentReference: string): Promise<schema.Claim> {
    this.ensureConnected();
    const [paidClaim] = await db.update(schema.claims)
      .set({
        status: 'paid' as schema.ClaimStatus,
        paymentDate: new Date(),
        paymentReference
      })
      .where(eq(schema.claims.id, id))
      .returning();
    
    if (!paidClaim) {
      throw new DatabaseError(`Failed to process claim payment for ID ${id}`, 'PAYMENT_FAILED');
    }
    return paidClaim;
  }

  // Premium Payment methods
  async getPremiumPayments(): Promise<schema.PremiumPayment[]> {
    this.ensureConnected();
    return await db.select().from(schema.premiumPayments);
  }
  
  async getPremiumPayment(id: number): Promise<schema.PremiumPayment> {
    this.ensureConnected();
    const [payment] = await db.select()
      .from(schema.premiumPayments)
      .where(eq(schema.premiumPayments.id, id));
    
    if (!payment) {
      throw new DatabaseError(`Premium payment with ID ${id} not found`, 'PAYMENT_NOT_FOUND');
    }
    return payment;
  }
  
  async getPremiumPaymentsByCompany(companyId: number): Promise<schema.PremiumPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.premiumPayments)
      .where(eq(schema.premiumPayments.companyId, companyId));
  }
  
  async getPremiumPaymentsByPremium(premiumId: number): Promise<schema.PremiumPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.premiumPayments)
      .where(eq(schema.premiumPayments.premiumId, premiumId));
  }
  
  async getPremiumPaymentsByStatus(status: string): Promise<schema.PremiumPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.premiumPayments)
      .where(eq(schema.premiumPayments.status as any, status));
  }
  
  async createPremiumPayment(payment: schema.InsertPremiumPayment): Promise<schema.PremiumPayment> {
    this.ensureConnected();
    const values = {
      premiumId: payment.premiumId as number,
      companyId: payment.companyId as number,
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
      paymentMethod: payment.paymentMethod as "credit_card" | "bank_transfer" | "check" | "cash" | "online",
      paymentReference: payment.paymentReference as string,
      status: "pending" as schema.PaymentStatus,
      transactionId: payment.transactionId || null,
      paymentDetails: payment.paymentDetails || null,
      amount: payment.amount,
      createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
      updatedAt: payment.updatedAt ? new Date(payment.updatedAt) : new Date()
    };

    const [newPayment] = await db.insert(schema.premiumPayments)
      .values(values)
      .returning();
    
    if (!newPayment) {
      throw new DatabaseError('Failed to create premium payment', 'CREATE_FAILED');
    }
    return newPayment;
  }
  
  async updatePremiumPaymentStatus(id: number, status: string): Promise<schema.PremiumPayment> {
    this.ensureConnected();
    const [updatedPayment] = await db.update(schema.premiumPayments)
      .set({
        status: status as schema.PaymentStatus
      })
      .where(eq(schema.premiumPayments.id, id))
      .returning();
    
    if (!updatedPayment) {
      throw new DatabaseError(`Failed to update premium payment status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedPayment;
  }
  
  // Claim Payment methods
  async getClaimPayments(): Promise<schema.ClaimPayment[]> {
    this.ensureConnected();
    return await db.select().from(schema.claimPayments);
  }
  
  async getClaimPayment(id: number): Promise<schema.ClaimPayment> {
    this.ensureConnected();
    const [payment] = await db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.id, id));
    
    if (!payment) {
      throw new DatabaseError(`Claim payment with ID ${id} not found`, 'PAYMENT_NOT_FOUND');
    }
    return payment;
  }
  
  async getClaimPaymentsByClaim(claimId: number): Promise<schema.ClaimPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.claimId, claimId));
  }
  
  async getClaimPaymentsByMember(memberId: number): Promise<schema.ClaimPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.memberId, memberId));
  }
  
  async getClaimPaymentsByInstitution(institutionId: number): Promise<schema.ClaimPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.institutionId, institutionId));
  }
  
  async getClaimPaymentsByStatus(status: string): Promise<schema.ClaimPayment[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.claimPayments)
      .where(eq(schema.claimPayments.status as any, status));
  }
  
  async createClaimPayment(payment: schema.InsertClaimPayment): Promise<schema.ClaimPayment> {
    this.ensureConnected();
    const [newPayment] = await db.insert(schema.claimPayments)
      .values({
        claimId: payment.claimId as number,
        memberId: payment.memberId as number,
        institutionId: payment.institutionId as number,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        paymentMethod: payment.paymentMethod as string,
        paymentReference: payment.paymentReference as string,
        status: payment.status as schema.PaymentStatus,
        transactionId: payment.transactionId || null,
        paymentDetails: payment.paymentDetails || null,
        amount: payment.amount,
        createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
        updatedAt: payment.updatedAt ? new Date(payment.updatedAt) : new Date()
      })
      .returning();
    
    if (!newPayment) {
      throw new DatabaseError('Failed to create claim payment', 'CREATE_FAILED');
    }
    return newPayment;
  }
  
  async updateClaimPaymentStatus(id: number, status: string): Promise<schema.ClaimPayment> {
    this.ensureConnected();
    const [updatedPayment] = await db.update(schema.claimPayments)
      .set({
        status: status as schema.PaymentStatus
      })
      .where(eq(schema.claimPayments.id, id))
      .returning();
    
    if (!updatedPayment) {
      throw new DatabaseError(`Failed to update claim payment status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedPayment;
  }
  
  // Provider Disbursement methods
  async getProviderDisbursements(): Promise<schema.ProviderDisbursement[]> {
    this.ensureConnected();
    return await db.select().from(schema.providerDisbursements);
  }
  
  async getProviderDisbursement(id: number): Promise<schema.ProviderDisbursement> {
    this.ensureConnected();
    const [disbursement] = await db.select()
      .from(schema.providerDisbursements)
      .where(eq(schema.providerDisbursements.id, id));
    
    if (!disbursement) {
      throw new DatabaseError(`Provider disbursement with ID ${id} not found`, 'DISBURSEMENT_NOT_FOUND');
    }
    return disbursement;
  }
  
  async getProviderDisbursementsByInstitution(institutionId: number): Promise<schema.ProviderDisbursement[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.providerDisbursements)
      .where(eq(schema.providerDisbursements.institutionId, institutionId));
  }
  
  async getProviderDisbursementsByStatus(status: string): Promise<schema.ProviderDisbursement[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.providerDisbursements)
      .where(eq(schema.providerDisbursements.status as any, status));
  }
  
  async createProviderDisbursement(disbursement: schema.InsertProviderDisbursement): Promise<schema.ProviderDisbursement> {
    this.ensureConnected();
    const [newDisbursement] = await db.insert(schema.providerDisbursements)
      .values({
        institutionId: disbursement.institutionId as number,
        disbursementDate: disbursement.disbursementDate ? new Date(disbursement.disbursementDate) : new Date(),
        totalAmount: disbursement.totalAmount,
        status: disbursement.status as schema.DisbursementStatus,
        paymentMethod: disbursement.paymentMethod as string,
        paymentReference: disbursement.paymentReference as string,
        bankAccountNumber: disbursement.bankAccountNumber || null,
        bankName: disbursement.bankName || null,
        notes: disbursement.notes || null,
        createdAt: disbursement.createdAt ? new Date(disbursement.createdAt) : new Date(),
        updatedAt: disbursement.updatedAt ? new Date(disbursement.updatedAt) : new Date()
      })
      .returning();
    
    if (!newDisbursement) {
      throw new DatabaseError('Failed to create provider disbursement', 'CREATE_FAILED');
    }
    return newDisbursement;
  }
  
  async updateProviderDisbursementStatus(id: number, status: string): Promise<schema.ProviderDisbursement> {
    this.ensureConnected();
    const [updatedDisbursement] = await db.update(schema.providerDisbursements)
      .set({
        status: status as schema.DisbursementStatus
      })
      .where(eq(schema.providerDisbursements.id, id))
      .returning();
    
    if (!updatedDisbursement) {
      throw new DatabaseError(`Failed to update provider disbursement status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedDisbursement;
  }
  
  // Disbursement Item methods
  async getDisbursementItems(): Promise<schema.DisbursementItem[]> {
    this.ensureConnected();
    return await db.select().from(schema.disbursementItems);
  }
  
  async getDisbursementItem(id: number): Promise<schema.DisbursementItem> {
    this.ensureConnected();
    const [item] = await db.select()
      .from(schema.disbursementItems)
      .where(eq(schema.disbursementItems.id, id));
    
    if (!item) {
      throw new DatabaseError(`Disbursement item with ID ${id} not found`, 'ITEM_NOT_FOUND');
    }
    return item;
  }
  
  async getDisbursementItemsByDisbursement(disbursementId: number): Promise<schema.DisbursementItem[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.disbursementItems)
      .where(eq(schema.disbursementItems.disbursementId, disbursementId));
  }
  
  async getDisbursementItemsByClaim(claimId: number): Promise<schema.DisbursementItem[]> {
    this.ensureConnected();
    return await db.select()
      .from(schema.disbursementItems)
      .where(eq(schema.disbursementItems.claimId, claimId));
  }
  
  async createDisbursementItem(item: schema.InsertDisbursementItem): Promise<schema.DisbursementItem> {
    this.ensureConnected();
    const [newItem] = await db.insert(schema.disbursementItems)
      .values({
        disbursementId: item.disbursementId as number,
        claimId: item.claimId as number,
        amount: item.amount,
        status: item.status as schema.DisbursementItemStatus,
        notes: item.notes || null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      })
      .returning();
    
    if (!newItem) {
      throw new DatabaseError('Failed to create disbursement item', 'CREATE_FAILED');
    }
    return newItem;
  }
  
  async updateDisbursementItemStatus(id: number, status: string): Promise<schema.DisbursementItem> {
    this.ensureConnected();
    const [updatedItem] = await db.update(schema.disbursementItems)
      .set({
        status: status as schema.DisbursementItemStatus
      })
      .where(eq(schema.disbursementItems.id, id))
      .returning();
    
    if (!updatedItem) {
      throw new DatabaseError(`Failed to update disbursement item status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedItem;
  }
  
  // Insurance Balance methods
  async getInsuranceBalances(): Promise<schema.InsuranceBalance[]> {
    this.ensureConnected();
    return await db.select().from(schema.insuranceBalances);
  }
  
  async getInsuranceBalance(id: number): Promise<schema.InsuranceBalance> {
    this.ensureConnected();
    const [balance] = await db.select()
      .from(schema.insuranceBalances)
      .where(eq(schema.insuranceBalances.id, id));
    
    if (!balance) {
      throw new DatabaseError(`Insurance balance with ID ${id} not found`, 'BALANCE_NOT_FOUND');
    }
    return balance;
  }
  
  async getInsuranceBalanceByPeriod(periodId: number): Promise<schema.InsuranceBalance | undefined> {
    this.ensureConnected();
    const [balance] = await db.select()
      .from(schema.insuranceBalances)
      .where(eq(schema.insuranceBalances.periodId, periodId));
    return balance;
  }
  
  async createInsuranceBalance(balance: schema.InsertInsuranceBalance): Promise<schema.InsuranceBalance> {
    this.ensureConnected();
    const [newBalance] = await db.insert(schema.insuranceBalances)
      .values({
        periodId: balance.periodId as number,
        totalPremiums: balance.totalPremiums,
        totalClaims: balance.totalClaims,
        pendingClaims: balance.pendingClaims,
        activeBalance: balance.activeBalance,
        lastUpdated: balance.lastUpdated ? new Date(balance.lastUpdated) : new Date(),
        createdAt: balance.createdAt ? new Date(balance.createdAt) : new Date(),
        updatedAt: balance.updatedAt ? new Date(balance.updatedAt) : new Date()
      })
      .returning();
    
    if (!newBalance) {
      throw new DatabaseError('Failed to create insurance balance', 'CREATE_FAILED');
    }
    return newBalance;
  }
  
  async updateInsuranceBalance(
    id: number, 
    totalPremiums: number, 
    totalClaims: number, 
    pendingClaims: number, 
    activeBalance: number
  ): Promise<schema.InsuranceBalance> {
    this.ensureConnected();
    const [updatedBalance] = await db.update(schema.insuranceBalances)
      .set({
        totalPremiums,
        totalClaims,
        pendingClaims,
        activeBalance,
        lastUpdated: new Date()
      })
      .where(eq(schema.insuranceBalances.id, id))
      .returning();
    
    if (!updatedBalance) {
      throw new DatabaseError(`Failed to update insurance balance for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedBalance;
  }

  // Medical Procedures
  async getMedicalProcedures(): Promise<schema.MedicalProcedure[]> {
    this.ensureConnected();
    return db.select().from(schema.medicalProcedures)
      .where(eq(schema.medicalProcedures.active, true))
      .orderBy(asc(schema.medicalProcedures.category), asc(schema.medicalProcedures.name));
  }

  async getMedicalProcedure(id: number): Promise<schema.MedicalProcedure> {
    this.ensureConnected();
    const [procedure] = await db.select()
      .from(schema.medicalProcedures)
      .where(eq(schema.medicalProcedures.id, id));
    
    if (!procedure) {
      throw new DatabaseError(`Medical procedure with ID ${id} not found`, 'PROCEDURE_NOT_FOUND');
    }
    return procedure;
  }

  async getMedicalProceduresByCategory(category: string): Promise<schema.MedicalProcedure[]> {
    this.ensureConnected();
    return db.select().from(schema.medicalProcedures)
      .where(and(
        eq(schema.medicalProcedures.category, category as any),
        eq(schema.medicalProcedures.active, true)
      ))
      .orderBy(asc(schema.medicalProcedures.name));
  }

  async createMedicalProcedure(procedure: schema.InsertMedicalProcedure): Promise<schema.MedicalProcedure> {
    this.ensureConnected();
    const values = {
      name: procedure.name as string,
      code: procedure.code as string,
      category: procedure.category as any,
      description: procedure.description || null,
      active: procedure.active !== undefined ? procedure.active : true,
      icd10Codes: procedure.icd10Codes || null,
      cptCodes: procedure.cptCodes || null,
      hcpcsCodes: procedure.hcpcsCodes || null,
      descriptionLong: procedure.descriptionLong || null,
      clinicalNotes: procedure.clinicalNotes || null,
      complexityLevel: procedure.complexityLevel || null,
      averageDuration: procedure.averageDuration || null,
      requiresSpecialist: procedure.requiresSpecialist ? true : false,
      typicalCost: procedure.typicalCost || null,
      subCategory: procedure.subCategory || null,
      createdAt: procedure.createdAt ? new Date(procedure.createdAt) : new Date(),
      updatedAt: procedure.updatedAt ? new Date(procedure.updatedAt) : new Date()
    };

    const [newProcedure] = await db.insert(schema.medicalProcedures)
      .values(values)
      .returning();
    
    if (!newProcedure) {
      throw new DatabaseError('Failed to create medical procedure', 'CREATE_FAILED');
    }
    return newProcedure;
  }
  
  async getActiveMedicalProcedures(): Promise<schema.MedicalProcedure[]> {
    this.ensureConnected();
    return db.select().from(schema.medicalProcedures)
      .where(eq(schema.medicalProcedures.active, true))
      .orderBy(asc(schema.medicalProcedures.category), asc(schema.medicalProcedures.name));
  }
  
  async updateMedicalProcedureStatus(id: number, active: boolean): Promise<schema.MedicalProcedure> {
    this.ensureConnected();
    const [updatedProcedure] = await db.update(schema.medicalProcedures)
      .set({ active, updatedAt: new Date() })
      .where(eq(schema.medicalProcedures.id, id))
      .returning();
    
    if (!updatedProcedure) {
      throw new DatabaseError(`Failed to update medical procedure status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedProcedure;
  }

  // Provider Procedure Rates
  async getProviderProcedureRates(): Promise<schema.ProviderProcedureRate[]> {
    this.ensureConnected();
    return db.select().from(schema.providerProcedureRates);
  }

  async getProviderProcedureRate(id: number): Promise<schema.ProviderProcedureRate> {
    this.ensureConnected();
    const [rate] = await db.select()
      .from(schema.providerProcedureRates)
      .where(eq(schema.providerProcedureRates.id, id));
    
    if (!rate) {
      throw new DatabaseError(`Provider procedure rate with ID ${id} not found`, 'RATE_NOT_FOUND');
    }
    return rate;
  }

  async getProviderProcedureRatesByInstitution(institutionId: number): Promise<schema.ProviderProcedureRate[]> {
    this.ensureConnected();
    return db.select().from(schema.providerProcedureRates)
      .where(eq(schema.providerProcedureRates.institutionId, institutionId))
      .orderBy(asc(schema.providerProcedureRates.procedureId));
  }

  async getProviderProcedureRatesByProcedure(procedureId: number): Promise<schema.ProviderProcedureRate[]> {
    this.ensureConnected();
    return db.select().from(schema.providerProcedureRates)
      .where(eq(schema.providerProcedureRates.procedureId, procedureId))
      .orderBy(asc(schema.providerProcedureRates.institutionId));
  }

  async getActiveProviderProcedureRates(): Promise<schema.ProviderProcedureRate[]> {
    this.ensureConnected();
    return db.select().from(schema.providerProcedureRates)
      .where(eq(schema.providerProcedureRates.active, true))
      .orderBy(asc(schema.providerProcedureRates.procedureId));
  }

  async updateProviderProcedureRateStatus(id: number, active: boolean): Promise<schema.ProviderProcedureRate> {
    this.ensureConnected();
    const [updatedRate] = await db.update(schema.providerProcedureRates)
      .set({ active, updatedAt: new Date() })
      .where(eq(schema.providerProcedureRates.id, id))
      .returning();
    
    if (!updatedRate) {
      throw new DatabaseError(`Failed to update provider procedure rate status for ID ${id}`, 'UPDATE_FAILED');
    }
    return updatedRate;
  }

  async createProviderProcedureRate(rate: schema.InsertProviderProcedureRate): Promise<schema.ProviderProcedureRate> {
    this.ensureConnected();
    const [newRate] = await db.insert(schema.providerProcedureRates)
      .values({
        institutionId: rate.institutionId as number,
        procedureId: rate.procedureId as number,
        rate: rate.rate,
        active: rate.active !== undefined ? rate.active : true,
        notes: rate.notes || null,
        createdAt: rate.createdAt ? new Date(rate.createdAt) : new Date(),
        updatedAt: rate.updatedAt ? new Date(rate.updatedAt) : new Date()
      })
      .returning();
    
    if (!newRate) {
      throw new DatabaseError('Failed to create provider procedure rate', 'CREATE_FAILED');
    }
    return newRate;
  }

  // Claim Procedure Items
  async getClaimProcedureItems(): Promise<schema.ClaimProcedureItem[]> {
    this.ensureConnected();
    return db.select().from(schema.claimProcedureItems);
  }

  async getClaimProcedureItem(id: number): Promise<schema.ClaimProcedureItem> {
    this.ensureConnected();
    const [item] = await db.select()
      .from(schema.claimProcedureItems)
      .where(eq(schema.claimProcedureItems.id, id));
    
    if (!item) {
      throw new DatabaseError(`Claim procedure item with ID ${id} not found`, 'ITEM_NOT_FOUND');
    }
    return item;
  }

  async getClaimProcedureItemsByClaim(claimId: number): Promise<schema.ClaimProcedureItem[]> {
    this.ensureConnected();
    return db.select().from(schema.claimProcedureItems).where(eq(schema.claimProcedureItems.claimId, claimId));
  }
  
  async getClaimProcedureItemsByProcedure(procedureId: number): Promise<schema.ClaimProcedureItem[]> {
    this.ensureConnected();
    return db.select().from(schema.claimProcedureItems).where(eq(schema.claimProcedureItems.procedureId, procedureId));
  }

  async createClaimProcedureItem(item: schema.InsertClaimProcedureItem): Promise<schema.ClaimProcedureItem> {
    this.ensureConnected();
    const [newItem] = await db.insert(schema.claimProcedureItems)
      .values({
        claimId: item.claimId as number,
        procedureId: item.procedureId as number,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes || null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      })
      .returning();
    
    if (!newItem) {
      throw new DatabaseError('Failed to create claim procedure item', 'CREATE_FAILED');
    }
    return newItem;
  }

  async createClaimWithProcedureItems(
    claim: schema.InsertClaim, 
    procedureItems: Omit<schema.InsertClaimProcedureItem, 'claimId'>[]
  ): Promise<{ claim: schema.Claim, procedureItems: schema.ClaimProcedureItem[] }> {
    this.ensureConnected();
    
    // Start a transaction
    return db.transaction(async (tx) => {
      // Create the claim
      const [newClaim] = await tx.insert(schema.claims)
        .values(claim as any)
        .returning();
      
      if (!newClaim) {
        throw new DatabaseError('Failed to create claim', 'CREATE_FAILED');
      }

      // Create all procedure items with the new claim ID
      const items = await Promise.all(
        procedureItems.map(async (item) => {
          const [newItem] = await tx.insert(schema.claimProcedureItems)
            .values({ 
              ...item, 
              claimId: newClaim.id,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          if (!newItem) {
            throw new DatabaseError('Failed to create claim procedure item', 'CREATE_FAILED');
          }
          
          return newItem;
        })
      );
      
      return { claim: newClaim, procedureItems: items };
    });
  }

  // Diagnosis Code methods
  async getDiagnosisCodes(): Promise<schema.DiagnosisCode[]> {
    this.ensureConnected();
    return await db.select().from(schema.diagnosisCodes);
  }

  async getDiagnosisCode(id: number): Promise<schema.DiagnosisCode> {
    this.ensureConnected();
    const [diagnosisCode] = await db
      .select()
      .from(schema.diagnosisCodes)
      .where(eq(schema.diagnosisCodes.id, id));
    
    if (!diagnosisCode) {
      throw new DatabaseError(`Diagnosis code with ID ${id} not found`, 'DIAGNOSIS_CODE_NOT_FOUND');
    }
    
    return diagnosisCode;
  }

  async getDiagnosisCodeByCode(code: string): Promise<schema.DiagnosisCode | undefined> {
    this.ensureConnected();
    const [diagnosisCode] = await db
      .select()
      .from(schema.diagnosisCodes)
      .where(eq(schema.diagnosisCodes.code, code));
    return diagnosisCode;
  }

  async getDiagnosisCodesByType(codeType: string): Promise<schema.DiagnosisCode[]> {
    this.ensureConnected();
    return await db
      .select()
      .from(schema.diagnosisCodes)
      .where(eq(schema.diagnosisCodes.codeType, codeType as any));
  }

  async getDiagnosisCodesBySearch(searchTerm: string): Promise<schema.DiagnosisCode[]> {
    this.ensureConnected();
    
    // Create a SQL query to search for terms in both code and description fields
    // Using SQL ILIKE for case-insensitive search with pattern matching
    const searchPattern = `%${searchTerm}%`;
    
    // Use the direct SQL approach instead of the query builder
    return await db
      .select()
      .from(schema.diagnosisCodes)
      .where(
        or(
          sql`${schema.diagnosisCodes.code} ILIKE ${searchPattern}`,
          sql`${schema.diagnosisCodes.description} ILIKE ${searchPattern}`,
          sql`COALESCE(${schema.diagnosisCodes.searchTerms}, '') ILIKE ${searchPattern}`
        )
      );
  }

  async createDiagnosisCode(diagnosisCode: schema.InsertDiagnosisCode): Promise<schema.DiagnosisCode> {
    this.ensureConnected();
    const [newDiagnosisCode] = await db
      .insert(schema.diagnosisCodes)
      .values({
        code: diagnosisCode.code as string,
        description: diagnosisCode.description as string,
        codeType: diagnosisCode.codeType as any,
        searchTerms: diagnosisCode.searchTerms || null,
        isActive: diagnosisCode.isActive !== undefined ? diagnosisCode.isActive : true,
        createdAt: diagnosisCode.createdAt ? new Date(diagnosisCode.createdAt) : new Date(),
        updatedAt: diagnosisCode.updatedAt ? new Date(diagnosisCode.updatedAt) : new Date()
      })
      .returning();
    
    if (!newDiagnosisCode) {
      throw new DatabaseError('Failed to create diagnosis code', 'CREATE_FAILED');
    }
    
    return newDiagnosisCode;
  }

  async updateDiagnosisCodeStatus(id: number, isActive: boolean): Promise<schema.DiagnosisCode> {
    this.ensureConnected();
    const [updatedDiagnosisCode] = await db
      .update(schema.diagnosisCodes)
      .set({ isActive })
      .where(eq(schema.diagnosisCodes.id, id))
      .returning();
    
    if (!updatedDiagnosisCode) {
      throw new DatabaseError(`Diagnosis code with ID ${id} not found`, 'UPDATE_FAILED');
    }
    
    return updatedDiagnosisCode;
  }
}