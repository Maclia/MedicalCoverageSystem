import { db } from './db';
import { eq, and, asc, desc, isNull, isNotNull } from 'drizzle-orm';
import type { IStorage } from './storage';
import * as schema from '@shared/schema';
import { memberHasClaims } from './utils/dbOperations';

/**
 * Database storage implementation
 * Handles all database operations
 */
export class DatabaseStorage implements IStorage {
  
  // Companies
  async getCompanies(): Promise<schema.Company[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.companies);
  }
  
  async getCompany(id: number): Promise<schema.Company | undefined> {
    if (!db) throw new Error('Database not connected');
    const [company] = await db.select()
      .from(schema.companies)
      .where(eq(schema.companies.id, id));
    return company;
  }
  
  async createCompany(company: schema.InsertCompany): Promise<schema.Company> {
    if (!db) throw new Error('Database not connected');
    const [newCompany] = await db.insert(schema.companies)
      .values(company)
      .returning();
    return newCompany;
  }
  
  // Members
  async getMembers(): Promise<schema.Member[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.members);
  }
  
  async getMember(id: number): Promise<schema.Member | undefined> {
    if (!db) throw new Error('Database not connected');
    const [member] = await db.select()
      .from(schema.members)
      .where(eq(schema.members.id, id));
    return member;
  }
  
  async getMembersByCompany(companyId: number): Promise<schema.Member[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.members)
      .where(eq(schema.members.companyId, companyId));
  }
  
  async getPrincipalMembers(): Promise<schema.Member[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.members)
      .where(eq(schema.members.memberType, 'principal'));
  }
  
  async getPrincipalMembersByCompany(companyId: number): Promise<schema.Member[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.companyId, companyId),
          eq(schema.members.memberType, 'principal')
        )
      );
  }
  
  async getDependentsByPrincipal(principalId: number): Promise<schema.Member[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.members)
      .where(
        and(
          eq(schema.members.principalId, principalId),
          eq(schema.members.memberType, 'dependent')
        )
      );
  }
  
  async createMember(member: schema.InsertMember): Promise<schema.Member> {
    if (!db) throw new Error('Database not connected');
    const [newMember] = await db.insert(schema.members)
      .values(member)
      .returning();
    return newMember;
  }
  
  async deleteMember(id: number): Promise<schema.Member | undefined> {
    if (!db) throw new Error('Database not connected');
    
    // Check if member has any claims
    const hasClaims = await memberHasClaims(id);
    if (hasClaims) {
      throw new Error(`Cannot delete member with ID ${id} as they have active claims`);
    }
    
    // Check if this is a principal member with dependents
    const member = await this.getMember(id);
    if (!member) {
      return undefined;
    }
    
    if (member.memberType === 'principal') {
      const dependents = await this.getDependentsByPrincipal(id);
      if (dependents.length > 0) {
        throw new Error(`Cannot delete principal member with ID ${id} as they have ${dependents.length} dependent(s)`);
      }
    }
    
    const [deletedMember] = await db.delete(schema.members)
      .where(eq(schema.members.id, id))
      .returning();
    
    return deletedMember;
  }
  
  // Periods
  async getPeriods(): Promise<schema.Period[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.periods);
  }
  
  async getPeriod(id: number): Promise<schema.Period | undefined> {
    if (!db) throw new Error('Database not connected');
    const [period] = await db.select()
      .from(schema.periods)
      .where(eq(schema.periods.id, id));
    return period;
  }
  
  async getActivePeriod(): Promise<schema.Period | undefined> {
    if (!db) throw new Error('Database not connected');
    const [period] = await db.select()
      .from(schema.periods)
      .where(eq(schema.periods.status, 'active'));
    return period;
  }
  
  async createPeriod(period: schema.InsertPeriod): Promise<schema.Period> {
    if (!db) throw new Error('Database not connected');
    const [newPeriod] = await db.insert(schema.periods)
      .values(period)
      .returning();
    return newPeriod;
  }
  
  // Premium Rates
  async getPremiumRates(): Promise<schema.PremiumRate[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.premiumRates);
  }
  
  async getPremiumRateByPeriod(periodId: number): Promise<schema.PremiumRate | undefined> {
    if (!db) throw new Error('Database not connected');
    const [rate] = await db.select()
      .from(schema.premiumRates)
      .where(eq(schema.premiumRates.periodId, periodId));
    return rate;
  }
  
  async createPremiumRate(premiumRate: schema.InsertPremiumRate): Promise<schema.PremiumRate> {
    if (!db) throw new Error('Database not connected');
    const [newRate] = await db.insert(schema.premiumRates)
      .values(premiumRate)
      .returning();
    return newRate;
  }
  
  // Age Banded Rates
  async getAgeBandedRates(): Promise<schema.AgeBandedRate[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.ageBandedRates);
  }
  
  async getAgeBandedRatesByPremiumRate(premiumRateId: number): Promise<schema.AgeBandedRate[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.ageBandedRates)
      .where(eq(schema.ageBandedRates.premiumRateId, premiumRateId));
  }
  
  async getAgeBandedRate(id: number): Promise<schema.AgeBandedRate | undefined> {
    if (!db) throw new Error('Database not connected');
    const [rate] = await db.select()
      .from(schema.ageBandedRates)
      .where(eq(schema.ageBandedRates.id, id));
    return rate;
  }
  
  async createAgeBandedRate(ageBandedRate: schema.InsertAgeBandedRate): Promise<schema.AgeBandedRate> {
    if (!db) throw new Error('Database not connected');
    const [newRate] = await db.insert(schema.ageBandedRates)
      .values(ageBandedRate)
      .returning();
    return newRate;
  }
  
  // Family Rates
  async getFamilyRates(): Promise<schema.FamilyRate[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.familyRates);
  }
  
  async getFamilyRatesByPremiumRate(premiumRateId: number): Promise<schema.FamilyRate[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.familyRates)
      .where(eq(schema.familyRates.premiumRateId, premiumRateId));
  }
  
  async getFamilyRate(id: number): Promise<schema.FamilyRate | undefined> {
    if (!db) throw new Error('Database not connected');
    const [rate] = await db.select()
      .from(schema.familyRates)
      .where(eq(schema.familyRates.id, id));
    return rate;
  }
  
  async createFamilyRate(familyRate: schema.InsertFamilyRate): Promise<schema.FamilyRate> {
    if (!db) throw new Error('Database not connected');
    const [newRate] = await db.insert(schema.familyRates)
      .values(familyRate)
      .returning();
    return newRate;
  }
  
  // Premiums
  async getPremiums(): Promise<schema.Premium[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.premiums);
  }
  
  async getPremium(id: number): Promise<schema.Premium | undefined> {
    if (!db) throw new Error('Database not connected');
    const [premium] = await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.id, id));
    return premium;
  }
  
  async getPremiumsByCompany(companyId: number): Promise<schema.Premium[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.companyId, companyId));
  }
  
  async getPremiumsByPeriod(periodId: number): Promise<schema.Premium[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.premiums)
      .where(eq(schema.premiums.periodId, periodId));
  }
  
  async createPremium(premium: schema.InsertPremium): Promise<schema.Premium> {
    if (!db) throw new Error('Database not connected');
    const [newPremium] = await db.insert(schema.premiums)
      .values(premium)
      .returning();
    return newPremium;
  }
  
  // Benefits
  async getBenefits(): Promise<schema.Benefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.benefits);
  }
  
  async getBenefit(id: number): Promise<schema.Benefit | undefined> {
    if (!db) throw new Error('Database not connected');
    const [benefit] = await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.id, id));
    return benefit;
  }
  
  async getBenefitsByCategory(category: string): Promise<schema.Benefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.category, category as any));
  }
  
  async getStandardBenefits(): Promise<schema.Benefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.benefits)
      .where(eq(schema.benefits.isStandard, true));
  }
  
  async createBenefit(benefit: schema.InsertBenefit): Promise<schema.Benefit> {
    if (!db) throw new Error('Database not connected');
    const [newBenefit] = await db.insert(schema.benefits)
      .values(benefit)
      .returning();
    return newBenefit;
  }
  
  // Company Benefits
  async getCompanyBenefits(): Promise<schema.CompanyBenefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.companyBenefits);
  }
  
  async getCompanyBenefit(id: number): Promise<schema.CompanyBenefit | undefined> {
    if (!db) throw new Error('Database not connected');
    const [companyBenefit] = await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.id, id));
    return companyBenefit;
  }
  
  async getCompanyBenefitsByCompany(companyId: number): Promise<schema.CompanyBenefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.companyId, companyId));
  }
  
  async getCompanyBenefitsByPremium(premiumId: number): Promise<schema.CompanyBenefit[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.companyBenefits)
      .where(eq(schema.companyBenefits.premiumId, premiumId));
  }
  
  async createCompanyBenefit(companyBenefit: schema.InsertCompanyBenefit): Promise<schema.CompanyBenefit> {
    if (!db) throw new Error('Database not connected');
    const [newCompanyBenefit] = await db.insert(schema.companyBenefits)
      .values(companyBenefit)
      .returning();
    return newCompanyBenefit;
  }
  
  // Company Periods
  async getCompanyPeriods(): Promise<schema.CompanyPeriod[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.companyPeriods);
  }
  
  async getCompanyPeriod(id: number): Promise<schema.CompanyPeriod | undefined> {
    if (!db) throw new Error('Database not connected');
    const [companyPeriod] = await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.id, id));
    return companyPeriod;
  }
  
  async getCompanyPeriodsByCompany(companyId: number): Promise<schema.CompanyPeriod[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.companyId, companyId));
  }
  
  async getCompanyPeriodsByPeriod(periodId: number): Promise<schema.CompanyPeriod[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.companyPeriods)
      .where(eq(schema.companyPeriods.periodId, periodId));
  }
  
  async createCompanyPeriod(companyPeriod: schema.InsertCompanyPeriod): Promise<schema.CompanyPeriod> {
    if (!db) throw new Error('Database not connected');
    const [newCompanyPeriod] = await db.insert(schema.companyPeriods)
      .values(companyPeriod)
      .returning();
    return newCompanyPeriod;
  }
  
  // Regions
  async getRegions(): Promise<schema.Region[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.regions);
  }
  
  async getRegion(id: number): Promise<schema.Region | undefined> {
    if (!db) throw new Error('Database not connected');
    const [region] = await db.select()
      .from(schema.regions)
      .where(eq(schema.regions.id, id));
    return region;
  }
  
  async createRegion(region: schema.InsertRegion): Promise<schema.Region> {
    if (!db) throw new Error('Database not connected');
    const [newRegion] = await db.insert(schema.regions)
      .values(region)
      .returning();
    return newRegion;
  }
  
  // Medical Institutions
  async getMedicalInstitutions(): Promise<schema.MedicalInstitution[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.medicalInstitutions);
  }
  
  async getMedicalInstitution(id: number): Promise<schema.MedicalInstitution | undefined> {
    if (!db) throw new Error('Database not connected');
    const [institution] = await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.id, id));
    return institution;
  }
  
  async getMedicalInstitutionsByRegion(regionId: number): Promise<schema.MedicalInstitution[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.regionId, regionId));
  }
  
  async getMedicalInstitutionsByType(type: string): Promise<schema.MedicalInstitution[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.type, type as any));
  }
  
  async getMedicalInstitutionsByApprovalStatus(status: string): Promise<schema.MedicalInstitution[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalInstitutions)
      .where(eq(schema.medicalInstitutions.approvalStatus, status as any));
  }
  
  async createMedicalInstitution(institution: schema.InsertMedicalInstitution): Promise<schema.MedicalInstitution> {
    if (!db) throw new Error('Database not connected');
    const [newInstitution] = await db.insert(schema.medicalInstitutions)
      .values(institution)
      .returning();
    return newInstitution;
  }
  
  async updateMedicalInstitutionApproval(id: number, status: string, validUntil?: Date): Promise<schema.MedicalInstitution> {
    if (!db) throw new Error('Database not connected');
    const [updatedInstitution] = await db.update(schema.medicalInstitutions)
      .set({
        approvalStatus: status as any,
        approvalDate: status === 'approved' ? new Date() : null,
        validUntil: validUntil
      })
      .where(eq(schema.medicalInstitutions.id, id))
      .returning();
    return updatedInstitution;
  }
  
  // Medical Personnel
  async getMedicalPersonnel(): Promise<schema.MedicalPersonnel[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.medicalPersonnel);
  }
  
  async getMedicalPersonnelById(id: number): Promise<schema.MedicalPersonnel | undefined> {
    if (!db) throw new Error('Database not connected');
    const [personnel] = await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.id, id));
    return personnel;
  }
  
  async getMedicalPersonnelByInstitution(institutionId: number): Promise<schema.MedicalPersonnel[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.institutionId, institutionId));
  }
  
  async getMedicalPersonnelByType(type: string): Promise<schema.MedicalPersonnel[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.type, type as any));
  }
  
  async getMedicalPersonnelByApprovalStatus(status: string): Promise<schema.MedicalPersonnel[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.medicalPersonnel)
      .where(eq(schema.medicalPersonnel.approvalStatus, status as any));
  }
  
  async createMedicalPersonnel(personnel: schema.InsertMedicalPersonnel): Promise<schema.MedicalPersonnel> {
    if (!db) throw new Error('Database not connected');
    const [newPersonnel] = await db.insert(schema.medicalPersonnel)
      .values(personnel)
      .returning();
    return newPersonnel;
  }
  
  async updateMedicalPersonnelApproval(id: number, status: string, validUntil?: Date): Promise<schema.MedicalPersonnel> {
    if (!db) throw new Error('Database not connected');
    const [updatedPersonnel] = await db.update(schema.medicalPersonnel)
      .set({
        approvalStatus: status as any,
        approvalDate: status === 'approved' ? new Date() : null,
        validUntil: validUntil
      })
      .where(eq(schema.medicalPersonnel.id, id))
      .returning();
    return updatedPersonnel;
  }
  
  // Panel Documentation
  async getPanelDocumentations(): Promise<schema.PanelDocumentation[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.panelDocumentation);
  }
  
  async getPanelDocumentation(id: number): Promise<schema.PanelDocumentation | undefined> {
    if (!db) throw new Error('Database not connected');
    const [doc] = await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.id, id));
    return doc;
  }
  
  async getPanelDocumentationsByInstitution(institutionId: number): Promise<schema.PanelDocumentation[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.institutionId, institutionId));
  }
  
  async getPanelDocumentationsByPersonnel(personnelId: number): Promise<schema.PanelDocumentation[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.personnelId, personnelId));
  }
  
  async getPanelDocumentationsByVerificationStatus(isVerified: boolean): Promise<schema.PanelDocumentation[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.panelDocumentation)
      .where(eq(schema.panelDocumentation.isVerified, isVerified));
  }
  
  async createPanelDocumentation(documentation: schema.InsertPanelDocumentation): Promise<schema.PanelDocumentation> {
    if (!db) throw new Error('Database not connected');
    const [newDoc] = await db.insert(schema.panelDocumentation)
      .values(documentation)
      .returning();
    return newDoc;
  }
  
  async verifyPanelDocumentation(id: number, verifiedBy: string, notes?: string): Promise<schema.PanelDocumentation> {
    if (!db) throw new Error('Database not connected');
    const [verifiedDoc] = await db.update(schema.panelDocumentation)
      .set({
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy,
        notes: notes
      })
      .where(eq(schema.panelDocumentation.id, id))
      .returning();
    return verifiedDoc;
  }
  
  // Claims
  async getClaims(): Promise<schema.Claim[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select().from(schema.claims);
  }
  
  async getClaim(id: number): Promise<schema.Claim | undefined> {
    if (!db) throw new Error('Database not connected');
    const [claim] = await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.id, id));
    return claim;
  }
  
  async getClaimsByInstitution(institutionId: number): Promise<schema.Claim[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.institutionId, institutionId));
  }
  
  async getClaimsByPersonnel(personnelId: number): Promise<schema.Claim[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.personnelId, personnelId));
  }
  
  async getClaimsByMember(memberId: number): Promise<schema.Claim[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.memberId, memberId));
  }
  
  async getClaimsByStatus(status: string): Promise<schema.Claim[]> {
    if (!db) throw new Error('Database not connected');
    return await db.select()
      .from(schema.claims)
      .where(eq(schema.claims.status, status as any));
  }
  
  async createClaim(claim: schema.InsertClaim): Promise<schema.Claim> {
    if (!db) throw new Error('Database not connected');
    const [newClaim] = await db.insert(schema.claims)
      .values(claim)
      .returning();
    return newClaim;
  }
  
  async updateClaimStatus(id: number, status: string, reviewerNotes?: string): Promise<schema.Claim> {
    if (!db) throw new Error('Database not connected');
    const [updatedClaim] = await db.update(schema.claims)
      .set({
        status: status as any,
        reviewDate: new Date(),
        reviewerNotes: reviewerNotes
      })
      .where(eq(schema.claims.id, id))
      .returning();
    return updatedClaim;
  }
  
  async processClaimPayment(id: number, paymentReference: string): Promise<schema.Claim> {
    if (!db) throw new Error('Database not connected');
    const [paidClaim] = await db.update(schema.claims)
      .set({
        status: 'paid',
        paymentDate: new Date(),
        paymentReference
      })
      .where(eq(schema.claims.id, id))
      .returning();
    return paidClaim;
  }
}