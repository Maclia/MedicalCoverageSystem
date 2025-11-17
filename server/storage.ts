import {
  Company, InsertCompany,
  Member, InsertMember,
  Period, InsertPeriod,
  PremiumRate, InsertPremiumRate,
  Premium, InsertPremium,
  Benefit, InsertBenefit,
  CompanyBenefit, InsertCompanyBenefit,
  CompanyPeriod, InsertCompanyPeriod,
  Region, InsertRegion,
  MedicalInstitution, InsertMedicalInstitution,
  MedicalPersonnel, InsertMedicalPersonnel,
  PanelDocumentation, InsertPanelDocumentation,
  Claim, InsertClaim,
  AgeBandedRate, InsertAgeBandedRate,
  FamilyRate, InsertFamilyRate,
  PremiumPayment, InsertPremiumPayment,
  ClaimPayment, InsertClaimPayment,
  ProviderDisbursement, InsertProviderDisbursement,
  DisbursementItem, InsertDisbursementItem,
  InsuranceBalance, InsertInsuranceBalance,
  MedicalProcedure, InsertMedicalProcedure,
  ProviderProcedureRate, InsertProviderProcedureRate,
  ClaimProcedureItem, InsertClaimProcedureItem,
  DiagnosisCode, InsertDiagnosisCode,
  User
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User authentication methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Company methods
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Member methods
  getMembers(): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  getMembersByCompany(companyId: number): Promise<Member[]>;
  getPrincipalMembers(): Promise<Member[]>;
  getPrincipalMembersByCompany(companyId: number): Promise<Member[]>;
  getDependentsByPrincipal(principalId: number): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  deleteMember?(id: number): Promise<Member | undefined>; // Optional - only implemented in DatabaseStorage
  
  // Period methods
  getPeriods(): Promise<Period[]>;
  getPeriod(id: number): Promise<Period | undefined>;
  getActivePeriod(): Promise<Period | undefined>;
  createPeriod(period: InsertPeriod): Promise<Period>;
  
  // Premium Rate methods
  getPremiumRates(): Promise<PremiumRate[]>;
  getPremiumRateByPeriod(periodId: number): Promise<PremiumRate | undefined>;
  createPremiumRate(premiumRate: InsertPremiumRate): Promise<PremiumRate>;
  
  // Age banded rate methods
  getAgeBandedRates(): Promise<AgeBandedRate[]>;
  getAgeBandedRatesByPremiumRate(premiumRateId: number): Promise<AgeBandedRate[]>;
  getAgeBandedRate(id: number): Promise<AgeBandedRate | undefined>;
  createAgeBandedRate(ageBandedRate: InsertAgeBandedRate): Promise<AgeBandedRate>;
  
  // Family rate methods
  getFamilyRates(): Promise<FamilyRate[]>;
  getFamilyRatesByPremiumRate(premiumRateId: number): Promise<FamilyRate[]>;
  getFamilyRate(id: number): Promise<FamilyRate | undefined>;
  createFamilyRate(familyRate: InsertFamilyRate): Promise<FamilyRate>;
  
  // Premium methods
  getPremiums(): Promise<Premium[]>;
  getPremium(id: number): Promise<Premium | undefined>;
  getPremiumsByCompany(companyId: number): Promise<Premium[]>;
  getPremiumsByPeriod(periodId: number): Promise<Premium[]>;
  createPremium(premium: InsertPremium): Promise<Premium>;

  // Benefit methods
  getBenefits(): Promise<Benefit[]>;
  getBenefit(id: number): Promise<Benefit | undefined>;
  getBenefitsByCategory(category: string): Promise<Benefit[]>;
  getStandardBenefits(): Promise<Benefit[]>;
  createBenefit(benefit: InsertBenefit): Promise<Benefit>;
  
  // Company Benefit methods
  getCompanyBenefits(): Promise<CompanyBenefit[]>;
  getCompanyBenefit(id: number): Promise<CompanyBenefit | undefined>;
  getCompanyBenefitsByCompany(companyId: number): Promise<CompanyBenefit[]>;
  getCompanyBenefitsByPremium(premiumId: number): Promise<CompanyBenefit[]>;
  createCompanyBenefit(companyBenefit: InsertCompanyBenefit): Promise<CompanyBenefit>;
  
  // Company Period methods
  getCompanyPeriods(): Promise<CompanyPeriod[]>;
  getCompanyPeriod(id: number): Promise<CompanyPeriod | undefined>;
  getCompanyPeriodsByCompany(companyId: number): Promise<CompanyPeriod[]>;
  getCompanyPeriodsByPeriod(periodId: number): Promise<CompanyPeriod[]>;
  createCompanyPeriod(companyPeriod: InsertCompanyPeriod): Promise<CompanyPeriod>;
  
  // Region methods
  getRegions(): Promise<Region[]>;
  getRegion(id: number): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  
  // Medical Institution methods
  getMedicalInstitutions(): Promise<MedicalInstitution[]>;
  getMedicalInstitution(id: number): Promise<MedicalInstitution | undefined>;
  getMedicalInstitutionsByRegion(regionId: number): Promise<MedicalInstitution[]>;
  getMedicalInstitutionsByType(type: string): Promise<MedicalInstitution[]>;
  getMedicalInstitutionsByApprovalStatus(status: string): Promise<MedicalInstitution[]>;
  createMedicalInstitution(institution: InsertMedicalInstitution): Promise<MedicalInstitution>;
  updateMedicalInstitutionApproval(id: number, status: string, validUntil?: Date): Promise<MedicalInstitution>;
  
  // Medical Personnel methods
  getMedicalPersonnel(): Promise<MedicalPersonnel[]>;
  getMedicalPersonnelById?(id: number): Promise<MedicalPersonnel | undefined>; // Used by DatabaseStorage
  getMedicalPersonnel?(id: number): Promise<MedicalPersonnel | undefined>; // Used by MemStorage - deprecate later
  getMedicalPersonnelByInstitution(institutionId: number): Promise<MedicalPersonnel[]>;
  getMedicalPersonnelByType(type: string): Promise<MedicalPersonnel[]>;
  getMedicalPersonnelByApprovalStatus(status: string): Promise<MedicalPersonnel[]>;
  createMedicalPersonnel(personnel: InsertMedicalPersonnel): Promise<MedicalPersonnel>;
  updateMedicalPersonnelApproval(id: number, status: string, validUntil?: Date): Promise<MedicalPersonnel>;
  
  // Panel Documentation methods
  getPanelDocumentations(): Promise<PanelDocumentation[]>;
  getPanelDocumentation(id: number): Promise<PanelDocumentation | undefined>;
  getPanelDocumentationsByInstitution(institutionId: number): Promise<PanelDocumentation[]>;
  getPanelDocumentationsByPersonnel(personnelId: number): Promise<PanelDocumentation[]>;
  getPanelDocumentationsByVerificationStatus(isVerified: boolean): Promise<PanelDocumentation[]>;
  createPanelDocumentation(documentation: InsertPanelDocumentation): Promise<PanelDocumentation>;
  verifyPanelDocumentation(id: number, verifiedBy: string, notes?: string): Promise<PanelDocumentation>;
  
  // Claims methods
  getClaims(): Promise<Claim[]>;
  getClaim(id: number): Promise<Claim | undefined>;
  getClaimsByInstitution(institutionId: number): Promise<Claim[]>;
  getClaimsByPersonnel(personnelId: number): Promise<Claim[]>;
  getClaimsByMember(memberId: number): Promise<Claim[]>;
  getClaimsByStatus(status: string): Promise<Claim[]>;
  // New methods for provider verification and fraud detection
  getClaimsByProviderVerification(verified: boolean): Promise<Claim[]>;
  getClaimsByFraudRiskLevel(riskLevel: string): Promise<Claim[]>;
  getClaimsRequiringHigherApproval(): Promise<Claim[]>;
  
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimStatus(id: number, status: string, reviewerNotes?: string): Promise<Claim>;
  
  // Admin approval and fraud detection methods
  adminApproveClaim(id: number, adminNotes: string): Promise<Claim>;
  rejectClaim(id: number, reason: string): Promise<Claim>;
  markClaimAsFraudulent(id: number, riskLevel: string, riskFactors: string, reviewerId: number): Promise<Claim>;
  processClaimPayment(id: number, paymentReference: string): Promise<Claim>;
  
  // Premium Payment methods
  getPremiumPayments(): Promise<PremiumPayment[]>;
  getPremiumPayment(id: number): Promise<PremiumPayment | undefined>;
  getPremiumPaymentsByCompany(companyId: number): Promise<PremiumPayment[]>;
  getPremiumPaymentsByPremium(premiumId: number): Promise<PremiumPayment[]>;
  getPremiumPaymentsByStatus(status: string): Promise<PremiumPayment[]>;
  createPremiumPayment(payment: InsertPremiumPayment): Promise<PremiumPayment>;
  updatePremiumPaymentStatus(id: number, status: string): Promise<PremiumPayment>;
  
  // Claim Payment methods
  getClaimPayments(): Promise<ClaimPayment[]>;
  getClaimPayment(id: number): Promise<ClaimPayment | undefined>;
  getClaimPaymentsByClaim(claimId: number): Promise<ClaimPayment[]>;
  getClaimPaymentsByMember(memberId: number): Promise<ClaimPayment[]>;
  getClaimPaymentsByInstitution(institutionId: number): Promise<ClaimPayment[]>;
  getClaimPaymentsByStatus(status: string): Promise<ClaimPayment[]>;
  createClaimPayment(payment: InsertClaimPayment): Promise<ClaimPayment>;
  updateClaimPaymentStatus(id: number, status: string): Promise<ClaimPayment>;
  
  // Provider Disbursement methods
  getProviderDisbursements(): Promise<ProviderDisbursement[]>;
  getProviderDisbursement(id: number): Promise<ProviderDisbursement | undefined>;
  getProviderDisbursementsByInstitution(institutionId: number): Promise<ProviderDisbursement[]>;
  getProviderDisbursementsByStatus(status: string): Promise<ProviderDisbursement[]>;
  createProviderDisbursement(disbursement: InsertProviderDisbursement): Promise<ProviderDisbursement>;
  updateProviderDisbursementStatus(id: number, status: string): Promise<ProviderDisbursement>;
  
  // Disbursement Item methods
  getDisbursementItems(): Promise<DisbursementItem[]>;
  getDisbursementItem(id: number): Promise<DisbursementItem | undefined>;
  getDisbursementItemsByDisbursement(disbursementId: number): Promise<DisbursementItem[]>;
  getDisbursementItemsByClaim(claimId: number): Promise<DisbursementItem[]>;
  createDisbursementItem(item: InsertDisbursementItem): Promise<DisbursementItem>;
  updateDisbursementItemStatus(id: number, status: string): Promise<DisbursementItem>;
  
  // Insurance Balance methods
  getInsuranceBalances(): Promise<InsuranceBalance[]>;
  getInsuranceBalance(id: number): Promise<InsuranceBalance | undefined>;
  getInsuranceBalanceByPeriod(periodId: number): Promise<InsuranceBalance | undefined>;
  createInsuranceBalance(balance: InsertInsuranceBalance): Promise<InsuranceBalance>;
  updateInsuranceBalance(id: number, totalPremiums: number, totalClaims: number, pendingClaims: number, activeBalance: number): Promise<InsuranceBalance>;
  
  // Medical Procedure methods
  getMedicalProcedures(): Promise<MedicalProcedure[]>;
  getMedicalProcedure(id: number): Promise<MedicalProcedure | undefined>;
  getMedicalProceduresByCategory(category: string): Promise<MedicalProcedure[]>;
  getActiveMedicalProcedures(): Promise<MedicalProcedure[]>;
  createMedicalProcedure(procedure: InsertMedicalProcedure): Promise<MedicalProcedure>;
  updateMedicalProcedureStatus(id: number, active: boolean): Promise<MedicalProcedure>;
  
  // Provider Procedure Rate methods
  getProviderProcedureRates(): Promise<ProviderProcedureRate[]>;
  getProviderProcedureRate(id: number): Promise<ProviderProcedureRate | undefined>;
  getProviderProcedureRatesByInstitution(institutionId: number): Promise<ProviderProcedureRate[]>;
  getProviderProcedureRatesByProcedure(procedureId: number): Promise<ProviderProcedureRate[]>;
  getActiveProviderProcedureRates(): Promise<ProviderProcedureRate[]>;
  createProviderProcedureRate(rate: InsertProviderProcedureRate): Promise<ProviderProcedureRate>;
  updateProviderProcedureRateStatus(id: number, active: boolean): Promise<ProviderProcedureRate>;
  
  // Claim Procedure Item methods
  getClaimProcedureItems(): Promise<ClaimProcedureItem[]>;
  getClaimProcedureItem(id: number): Promise<ClaimProcedureItem | undefined>;
  getClaimProcedureItemsByClaim(claimId: number): Promise<ClaimProcedureItem[]>;
  getClaimProcedureItemsByProcedure(procedureId: number): Promise<ClaimProcedureItem[]>;
  createClaimProcedureItem(item: InsertClaimProcedureItem): Promise<ClaimProcedureItem>;
  createClaimWithProcedureItems(claim: InsertClaim, procedureItems: Omit<InsertClaimProcedureItem, 'claimId'>[]): Promise<{ claim: Claim, procedureItems: ClaimProcedureItem[] }>;
  
  // Diagnosis Code methods
  getDiagnosisCodes(): Promise<DiagnosisCode[]>;
  getDiagnosisCode(id: number): Promise<DiagnosisCode | undefined>;
  getDiagnosisCodeByCode(code: string): Promise<DiagnosisCode | undefined>;
  getDiagnosisCodesByType(codeType: string): Promise<DiagnosisCode[]>;
  getDiagnosisCodesBySearch(searchTerm: string): Promise<DiagnosisCode[]>;
  createDiagnosisCode(diagnosisCode: InsertDiagnosisCode): Promise<DiagnosisCode>;
  updateDiagnosisCodeStatus(id: number, isActive: boolean): Promise<DiagnosisCode>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private companies: Map<number, Company>;
  private members: Map<number, Member>;
  private periods: Map<number, Period>;
  private premiumRates: Map<number, PremiumRate>;
  private premiums: Map<number, Premium>;
  private benefits: Map<number, Benefit>;
  private companyBenefits: Map<number, CompanyBenefit>;
  private companyPeriods: Map<number, CompanyPeriod>;
  private regions: Map<number, Region>;
  private medicalInstitutions: Map<number, MedicalInstitution>;
  private medicalPersonnel: Map<number, MedicalPersonnel>;
  private panelDocumentations: Map<number, PanelDocumentation>;
  private claims: Map<number, Claim>;
  private ageBandedRates: Map<number, AgeBandedRate>;
  private familyRates: Map<number, FamilyRate>;
  private premiumPayments: Map<number, PremiumPayment>;
  private claimPayments: Map<number, ClaimPayment>;
  private providerDisbursements: Map<number, ProviderDisbursement>;
  private disbursementItems: Map<number, DisbursementItem>;
  private insuranceBalances: Map<number, InsuranceBalance>;
  private medicalProcedures: Map<number, MedicalProcedure>;
  private providerProcedureRates: Map<number, ProviderProcedureRate>;
  private claimProcedureItems: Map<number, ClaimProcedureItem>;
  private diagnosisCodes: Map<number, DiagnosisCode>;
  
  private companyId: number;
  private memberId: number;
  private periodId: number;
  private premiumRateId: number;
  private premiumId: number;
  private benefitId: number;
  private companyBenefitId: number;
  private companyPeriodId: number;
  private regionId: number;
  private medicalInstitutionId: number;
  private medicalPersonnelId: number;
  private panelDocumentationId: number;
  private claimId: number;
  private ageBandedRateId: number;
  private familyRateId: number;
  private premiumPaymentId: number;
  private claimPaymentId: number;
  private providerDisbursementId: number;
  private disbursementItemId: number;
  private insuranceBalanceId: number;
  private medicalProcedureId: number;
  private providerProcedureRateId: number;
  private claimProcedureItemId: number;
  private diagnosisCodeId: number;
  private users: Map<number, User>;
  private userId: number;

  constructor() {
    this.companies = new Map();
    this.members = new Map();
    this.periods = new Map();
    this.premiumRates = new Map();
    this.premiums = new Map();
    this.benefits = new Map();
    this.companyBenefits = new Map();
    this.companyPeriods = new Map();
    this.regions = new Map();
    this.medicalInstitutions = new Map();
    this.medicalPersonnel = new Map();
    this.panelDocumentations = new Map();
    this.claims = new Map();
    this.ageBandedRates = new Map();
    this.familyRates = new Map();
    this.premiumPayments = new Map();
    this.claimPayments = new Map();
    this.providerDisbursements = new Map();
    this.disbursementItems = new Map();
    this.insuranceBalances = new Map();
    this.medicalProcedures = new Map();
    this.providerProcedureRates = new Map();
    this.claimProcedureItems = new Map();
    this.diagnosisCodes = new Map();
    this.users = new Map();
    
    this.companyId = 1;
    this.memberId = 1;
    this.periodId = 1;
    this.premiumRateId = 1;
    this.premiumId = 1;
    this.benefitId = 1;
    this.companyBenefitId = 1;
    this.companyPeriodId = 1;
    this.regionId = 1;
    this.medicalInstitutionId = 1;
    this.medicalPersonnelId = 1;
    this.panelDocumentationId = 1;
    this.claimId = 1;
    this.ageBandedRateId = 1;
    this.familyRateId = 1;
    this.premiumPaymentId = 1;
    this.claimPaymentId = 1; 
    this.providerDisbursementId = 1;
    this.disbursementItemId = 1;
    this.insuranceBalanceId = 1;
    this.medicalProcedureId = 1;
    this.providerProcedureRateId = 1;
    this.claimProcedureItemId = 1;
    this.diagnosisCodeId = 1;
    this.userId = 1;
    
    // Initialize with a default active period, rates, and benefits
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Create a default period (current quarter)
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    
    const quarterStartMonth = (currentQuarter - 1) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    const startDate = new Date(currentYear, quarterStartMonth, 1);
    const endDate = new Date(currentYear, quarterEndMonth + 1, 0); // Last day of the end month
    
    const period: Period = {
      id: this.periodId++,
      name: `Q${currentQuarter} ${currentYear}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    this.periods.set(period.id, period);
    
    // Create default premium rates for the period
    const premiumRate: PremiumRate = {
      id: this.premiumRateId++,
      periodId: period.id,
      principalRate: 350.00,
      spouseRate: 275.00,
      childRate: 175.00,
      specialNeedsRate: 225.00,
      taxRate: 0.10,
      createdAt: new Date().toISOString()
    };
    
    this.premiumRates.set(premiumRate.id, premiumRate);
    
    // Create default standard benefits
    const defaultBenefits: InsertBenefit[] = [
      {
        name: "Primary Care Visits",
        description: "Covers visits to primary care physicians for routine checkups and basic healthcare needs",
        category: "medical",
        coverageDetails: "100% coverage after $20 copay",
        limitAmount: 0,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Specialist Visits",
        description: "Covers visits to specialist doctors like cardiologists, dermatologists, etc.",
        category: "specialist",
        coverageDetails: "80% coverage after $40 copay",
        limitAmount: 0,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Hospitalization",
        description: "Covers inpatient hospital stays including room and board, nursing care, and medications",
        category: "hospital",
        coverageDetails: "90% coverage after deductible",
        limitAmount: 10000,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Emergency Room",
        description: "Covers emergency room visits for urgent medical conditions",
        category: "emergency",
        coverageDetails: "100% coverage after $150 copay",
        limitAmount: 0,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Prescription Drugs",
        description: "Covers prescribed medications",
        category: "prescription",
        coverageDetails: "Generic: $10 copay, Brand: $30 copay, Specialty: $50 copay",
        limitAmount: 2000,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Preventive Care",
        description: "Covers preventive services like vaccinations, screenings, and wellness visits",
        category: "wellness",
        coverageDetails: "100% coverage, no copay",
        limitAmount: 0,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Dental Basic",
        description: "Covers basic dental services including cleanings, exams, and X-rays",
        category: "dental",
        coverageDetails: "100% coverage for preventive, 80% for basic procedures",
        limitAmount: 1000,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Vision Basic",
        description: "Covers basic vision services including eye exams and partial coverage for glasses/contacts",
        category: "vision",
        coverageDetails: "100% coverage for annual exam, $150 allowance for glasses/contacts",
        limitAmount: 150,
        hasWaitingPeriod: false,
        isStandard: true
      },
      {
        name: "Maternity Care",
        description: "Covers prenatal care, delivery, and postnatal care",
        category: "maternity",
        coverageDetails: "90% coverage after deductible",
        limitAmount: 7500,
        hasWaitingPeriod: true,
        waitingPeriodDays: 270, // 9 months
        isStandard: true
      }
    ];
    
    // Add default benefits
    defaultBenefits.forEach(benefit => {
      const id = this.benefitId++;
      const newBenefit: Benefit = {
        ...benefit,
        id,
        createdAt: new Date().toISOString()
      };
      this.benefits.set(id, newBenefit);
    });
  }

  // User authentication methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  // Company methods
  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }
  
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }
  
  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.companyId++;
    const newCompany: Company = {
      ...company,
      id,
      createdAt: new Date().toISOString()
    };
    this.companies.set(id, newCompany);
    return newCompany;
  }
  
  // Member methods
  async getMembers(): Promise<Member[]> {
    return Array.from(this.members.values());
  }
  
  async getMember(id: number): Promise<Member | undefined> {
    return this.members.get(id);
  }
  
  async getMembersByCompany(companyId: number): Promise<Member[]> {
    return Array.from(this.members.values()).filter(
      member => member.companyId === companyId
    );
  }
  
  async getPrincipalMembers(): Promise<Member[]> {
    return Array.from(this.members.values()).filter(
      member => member.memberType === 'principal'
    );
  }
  
  async getPrincipalMembersByCompany(companyId: number): Promise<Member[]> {
    return Array.from(this.members.values()).filter(
      member => member.companyId === companyId && member.memberType === 'principal'
    );
  }
  
  async getDependentsByPrincipal(principalId: number): Promise<Member[]> {
    return Array.from(this.members.values()).filter(
      member => member.principalId === principalId && member.memberType === 'dependent'
    );
  }
  
  async createMember(member: InsertMember): Promise<Member> {
    const id = this.memberId++;
    const newMember: Member = {
      ...member,
      id,
      createdAt: new Date().toISOString()
    };
    this.members.set(id, newMember);
    return newMember;
  }
  
  // Period methods
  async getPeriods(): Promise<Period[]> {
    return Array.from(this.periods.values());
  }
  
  async getPeriod(id: number): Promise<Period | undefined> {
    return this.periods.get(id);
  }
  
  async getActivePeriod(): Promise<Period | undefined> {
    return Array.from(this.periods.values()).find(
      period => period.status === 'active'
    );
  }
  
  async createPeriod(period: InsertPeriod): Promise<Period> {
    const id = this.periodId++;
    const newPeriod: Period = {
      ...period,
      id,
      createdAt: new Date().toISOString()
    };
    this.periods.set(id, newPeriod);
    return newPeriod;
  }
  
  // Premium Rate methods
  async getPremiumRates(): Promise<PremiumRate[]> {
    return Array.from(this.premiumRates.values());
  }
  
  async getPremiumRateByPeriod(periodId: number): Promise<PremiumRate | undefined> {
    return Array.from(this.premiumRates.values()).find(
      rate => rate.periodId === periodId
    );
  }
  
  async createPremiumRate(premiumRate: InsertPremiumRate): Promise<PremiumRate> {
    const id = this.premiumRateId++;
    const newPremiumRate: PremiumRate = {
      ...premiumRate,
      id,
      createdAt: new Date().toISOString()
    };
    this.premiumRates.set(id, newPremiumRate);
    return newPremiumRate;
  }
  
  // Age Banded Rate methods
  async getAgeBandedRates(): Promise<AgeBandedRate[]> {
    return Array.from(this.ageBandedRates.values());
  }
  
  async getAgeBandedRatesByPremiumRate(premiumRateId: number): Promise<AgeBandedRate[]> {
    return Array.from(this.ageBandedRates.values()).filter(
      rate => rate.premiumRateId === premiumRateId
    );
  }
  
  async getAgeBandedRate(id: number): Promise<AgeBandedRate | undefined> {
    return this.ageBandedRates.get(id);
  }
  
  async createAgeBandedRate(ageBandedRate: InsertAgeBandedRate): Promise<AgeBandedRate> {
    const id = this.ageBandedRateId++;
    const newAgeBandedRate: AgeBandedRate = {
      ...ageBandedRate,
      id,
      createdAt: new Date().toISOString()
    };
    this.ageBandedRates.set(id, newAgeBandedRate);
    return newAgeBandedRate;
  }
  
  // Family Rate methods
  async getFamilyRates(): Promise<FamilyRate[]> {
    return Array.from(this.familyRates.values());
  }
  
  async getFamilyRatesByPremiumRate(premiumRateId: number): Promise<FamilyRate[]> {
    return Array.from(this.familyRates.values()).filter(
      rate => rate.premiumRateId === premiumRateId
    );
  }
  
  async getFamilyRate(id: number): Promise<FamilyRate | undefined> {
    return this.familyRates.get(id);
  }
  
  async createFamilyRate(familyRate: InsertFamilyRate): Promise<FamilyRate> {
    const id = this.familyRateId++;
    const newFamilyRate: FamilyRate = {
      ...familyRate,
      id,
      createdAt: new Date().toISOString()
    };
    this.familyRates.set(id, newFamilyRate);
    return newFamilyRate;
  }
  
  // Premium methods
  async getPremiums(): Promise<Premium[]> {
    return Array.from(this.premiums.values());
  }
  
  async getPremium(id: number): Promise<Premium | undefined> {
    return this.premiums.get(id);
  }
  
  async getPremiumsByCompany(companyId: number): Promise<Premium[]> {
    return Array.from(this.premiums.values()).filter(
      premium => premium.companyId === companyId
    );
  }
  
  async getPremiumsByPeriod(periodId: number): Promise<Premium[]> {
    return Array.from(this.premiums.values()).filter(
      premium => premium.periodId === periodId
    );
  }
  
  async createPremium(premium: InsertPremium): Promise<Premium> {
    console.log("Creating premium with data:", premium);
    const id = this.premiumId++;
    const newPremium: Premium = {
      ...premium,
      id,
      createdAt: new Date().toISOString()
    };
    this.premiums.set(id, newPremium);
    console.log("Premium created successfully:", newPremium);
    return newPremium;
  }

  // Benefit methods
  async getBenefits(): Promise<Benefit[]> {
    return Array.from(this.benefits.values());
  }
  
  async getBenefit(id: number): Promise<Benefit | undefined> {
    return this.benefits.get(id);
  }
  
  async getBenefitsByCategory(category: string): Promise<Benefit[]> {
    return Array.from(this.benefits.values()).filter(
      benefit => benefit.category === category
    );
  }
  
  async getStandardBenefits(): Promise<Benefit[]> {
    return Array.from(this.benefits.values()).filter(
      benefit => benefit.isStandard
    );
  }
  
  async createBenefit(benefit: InsertBenefit): Promise<Benefit> {
    const id = this.benefitId++;
    const newBenefit: Benefit = {
      ...benefit,
      id,
      createdAt: new Date().toISOString()
    };
    this.benefits.set(id, newBenefit);
    return newBenefit;
  }
  
  // Company Benefit methods
  async getCompanyBenefits(): Promise<CompanyBenefit[]> {
    return Array.from(this.companyBenefits.values());
  }
  
  async getCompanyBenefit(id: number): Promise<CompanyBenefit | undefined> {
    return this.companyBenefits.get(id);
  }
  
  async getCompanyBenefitsByCompany(companyId: number): Promise<CompanyBenefit[]> {
    return Array.from(this.companyBenefits.values()).filter(
      benefit => benefit.companyId === companyId
    );
  }
  
  async getCompanyBenefitsByPremium(premiumId: number): Promise<CompanyBenefit[]> {
    return Array.from(this.companyBenefits.values()).filter(
      benefit => benefit.premiumId === premiumId
    );
  }
  
  async createCompanyBenefit(companyBenefit: InsertCompanyBenefit): Promise<CompanyBenefit> {
    const id = this.companyBenefitId++;
    const newCompanyBenefit: CompanyBenefit = {
      ...companyBenefit,
      id,
      createdAt: new Date().toISOString()
    };
    this.companyBenefits.set(id, newCompanyBenefit);
    return newCompanyBenefit;
  }

  // Company Period methods
  async getCompanyPeriods(): Promise<CompanyPeriod[]> {
    return Array.from(this.companyPeriods.values());
  }
  
  async getCompanyPeriod(id: number): Promise<CompanyPeriod | undefined> {
    return this.companyPeriods.get(id);
  }
  
  async getCompanyPeriodsByCompany(companyId: number): Promise<CompanyPeriod[]> {
    return Array.from(this.companyPeriods.values()).filter(
      companyPeriod => companyPeriod.companyId === companyId
    );
  }
  
  async getCompanyPeriodsByPeriod(periodId: number): Promise<CompanyPeriod[]> {
    return Array.from(this.companyPeriods.values()).filter(
      companyPeriod => companyPeriod.periodId === periodId
    );
  }
  
  async createCompanyPeriod(companyPeriod: InsertCompanyPeriod): Promise<CompanyPeriod> {
    const id = this.companyPeriodId++;
    const newCompanyPeriod: CompanyPeriod = {
      ...companyPeriod,
      id,
      createdAt: new Date().toISOString()
    };
    this.companyPeriods.set(id, newCompanyPeriod);
    return newCompanyPeriod;
  }

  // Region methods
  async getRegions(): Promise<Region[]> {
    return Array.from(this.regions.values());
  }
  
  async getRegion(id: number): Promise<Region | undefined> {
    return this.regions.get(id);
  }
  
  async createRegion(region: InsertRegion): Promise<Region> {
    const id = this.regionId++;
    const newRegion: Region = {
      ...region,
      id,
      createdAt: new Date().toISOString()
    };
    this.regions.set(id, newRegion);
    return newRegion;
  }
  
  // Medical Institution methods
  async getMedicalInstitutions(): Promise<MedicalInstitution[]> {
    return Array.from(this.medicalInstitutions.values());
  }
  
  async getMedicalInstitution(id: number): Promise<MedicalInstitution | undefined> {
    return this.medicalInstitutions.get(id);
  }
  
  async getMedicalInstitutionsByRegion(regionId: number): Promise<MedicalInstitution[]> {
    return Array.from(this.medicalInstitutions.values()).filter(
      institution => institution.regionId === regionId
    );
  }
  
  async getMedicalInstitutionsByType(type: string): Promise<MedicalInstitution[]> {
    return Array.from(this.medicalInstitutions.values()).filter(
      institution => institution.type === type
    );
  }
  
  async getMedicalInstitutionsByApprovalStatus(status: string): Promise<MedicalInstitution[]> {
    return Array.from(this.medicalInstitutions.values()).filter(
      institution => institution.approvalStatus === status
    );
  }
  
  async createMedicalInstitution(institution: InsertMedicalInstitution): Promise<MedicalInstitution> {
    const id = this.medicalInstitutionId++;
    const newInstitution: MedicalInstitution = {
      ...institution,
      id,
      approvalDate: null,
      createdAt: new Date().toISOString()
    };
    this.medicalInstitutions.set(id, newInstitution);
    return newInstitution;
  }
  
  async updateMedicalInstitutionApproval(id: number, status: string, validUntil?: Date): Promise<MedicalInstitution> {
    const institution = this.medicalInstitutions.get(id);
    if (!institution) {
      throw new Error(`Medical institution with ID ${id} not found`);
    }
    
    const updatedInstitution: MedicalInstitution = {
      ...institution,
      approvalStatus: status as any,
      approvalDate: status === 'approved' ? new Date().toISOString() : institution.approvalDate,
      validUntil: validUntil ? validUntil.toISOString() : institution.validUntil
    };
    
    this.medicalInstitutions.set(id, updatedInstitution);
    return updatedInstitution;
  }
  
  // Medical Personnel methods
  async getMedicalPersonnel(): Promise<MedicalPersonnel[]> {
    return Array.from(this.medicalPersonnel.values());
  }
  
  async getMedicalPersonnelById(id: number): Promise<MedicalPersonnel | undefined> {
    return this.medicalPersonnel.get(id);
  }
  
  async getMedicalPersonnelByInstitution(institutionId: number): Promise<MedicalPersonnel[]> {
    return Array.from(this.medicalPersonnel.values()).filter(
      personnel => personnel.institutionId === institutionId
    );
  }
  
  async getMedicalPersonnelByType(type: string): Promise<MedicalPersonnel[]> {
    return Array.from(this.medicalPersonnel.values()).filter(
      personnel => personnel.type === type
    );
  }
  
  async getMedicalPersonnelByApprovalStatus(status: string): Promise<MedicalPersonnel[]> {
    return Array.from(this.medicalPersonnel.values()).filter(
      personnel => personnel.approvalStatus === status
    );
  }
  
  async createMedicalPersonnel(personnel: InsertMedicalPersonnel): Promise<MedicalPersonnel> {
    const id = this.medicalPersonnelId++;
    const newPersonnel: MedicalPersonnel = {
      ...personnel,
      id,
      approvalDate: null,
      createdAt: new Date().toISOString()
    };
    this.medicalPersonnel.set(id, newPersonnel);
    return newPersonnel;
  }
  
  async updateMedicalPersonnelApproval(id: number, status: string, validUntil?: Date): Promise<MedicalPersonnel> {
    const personnel = this.medicalPersonnel.get(id);
    if (!personnel) {
      throw new Error(`Medical personnel with ID ${id} not found`);
    }
    
    const updatedPersonnel: MedicalPersonnel = {
      ...personnel,
      approvalStatus: status as any,
      approvalDate: status === 'approved' ? new Date().toISOString() : personnel.approvalDate,
      validUntil: validUntil ? validUntil.toISOString() : personnel.validUntil
    };
    
    this.medicalPersonnel.set(id, updatedPersonnel);
    return updatedPersonnel;
  }
  
  // Panel Documentation methods
  async getPanelDocumentations(): Promise<PanelDocumentation[]> {
    return Array.from(this.panelDocumentations.values());
  }
  
  async getPanelDocumentation(id: number): Promise<PanelDocumentation | undefined> {
    return this.panelDocumentations.get(id);
  }
  
  async getPanelDocumentationsByInstitution(institutionId: number): Promise<PanelDocumentation[]> {
    return Array.from(this.panelDocumentations.values()).filter(
      doc => doc.institutionId === institutionId
    );
  }
  
  async getPanelDocumentationsByPersonnel(personnelId: number): Promise<PanelDocumentation[]> {
    return Array.from(this.panelDocumentations.values()).filter(
      doc => doc.personnelId === personnelId
    );
  }
  
  async getPanelDocumentationsByVerificationStatus(isVerified: boolean): Promise<PanelDocumentation[]> {
    return Array.from(this.panelDocumentations.values()).filter(
      doc => doc.isVerified === isVerified
    );
  }
  
  async createPanelDocumentation(documentation: InsertPanelDocumentation): Promise<PanelDocumentation> {
    const id = this.panelDocumentationId++;
    const newDocumentation: PanelDocumentation = {
      ...documentation,
      id,
      isVerified: false,
      verificationDate: null,
      createdAt: new Date().toISOString()
    };
    this.panelDocumentations.set(id, newDocumentation);
    return newDocumentation;
  }
  
  async verifyPanelDocumentation(id: number, verifiedBy: string, notes?: string): Promise<PanelDocumentation> {
    const doc = this.panelDocumentations.get(id);
    if (!doc) {
      throw new Error(`Panel documentation with ID ${id} not found`);
    }
    
    const updatedDoc: PanelDocumentation = {
      ...doc,
      isVerified: true,
      verificationDate: new Date().toISOString(),
      verifiedBy,
      notes: notes || doc.notes
    };
    
    this.panelDocumentations.set(id, updatedDoc);
    return updatedDoc;
  }
  
  // Claims methods
  async getClaims(): Promise<Claim[]> {
    return Array.from(this.claims.values());
  }
  
  async getClaim(id: number): Promise<Claim | undefined> {
    return this.claims.get(id);
  }
  
  async getClaimsByInstitution(institutionId: number): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.institutionId === institutionId
    );
  }
  
  async getClaimsByPersonnel(personnelId: number): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.personnelId === personnelId
    );
  }
  
  async getClaimsByMember(memberId: number): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.memberId === memberId
    );
  }
  
  async getClaimsByStatus(status: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.status === status
    );
  }
  
  async getClaimsByProviderVerification(verified: boolean): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.providerVerified === verified
    );
  }
  
  async getClaimsByFraudRiskLevel(riskLevel: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.fraudRiskLevel === riskLevel
    );
  }
  
  async getClaimsRequiringHigherApproval(): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.requiresHigherApproval === true && !claim.approvedByAdmin
    );
  }
  
  async createClaim(claim: InsertClaim): Promise<Claim> {
    const id = this.claimId++;
    
    // Validate diagnosis code is provided
    if (!claim.diagnosisCode || !claim.diagnosisCodeType) {
      throw new Error('ICD-10 or ICD-11 diagnosis code and code type are required');
    }
    
    // Validate diagnosis code type is valid
    if (claim.diagnosisCodeType !== 'ICD-10' && claim.diagnosisCodeType !== 'ICD-11') {
      throw new Error('Diagnosis code type must be either ICD-10 or ICD-11');
    }
    
    // Check provider verification status
    const institution = await this.getMedicalInstitution(claim.institutionId);
    const personnel = claim.personnelId ? await this.getMedicalPersonnel(claim.personnelId) : null;
    
    // Determine provider verification status
    const isInstitutionVerified = institution && institution.approvalStatus === 'approved';
    const isPersonnelVerified = !claim.personnelId || 
      (personnel && personnel.approvalStatus === 'approved');

    // Set provider verified status 
    const providerVerified = isInstitutionVerified && isPersonnelVerified;
    
    // Set higher approval requirement
    const requiresHigherApproval = !providerVerified;

    const newClaim: Claim = {
      ...claim,
      id,
      claimDate: new Date().toISOString(),
      status: requiresHigherApproval ? 'under_review' : 'submitted',
      reviewDate: null,
      paymentDate: null,
      providerVerified,
      requiresHigherApproval,
      approvedByAdmin: false,
      adminApprovalDate: null,
      adminReviewNotes: null,
      fraudRiskLevel: 'none',
      fraudRiskFactors: null,
      fraudReviewDate: null,
      fraudReviewerId: null,
      createdAt: new Date().toISOString()
    };
    this.claims.set(id, newClaim);
    return newClaim;
  }
  
  async updateClaimStatus(id: number, status: string, reviewerNotes?: string): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    const updatedClaim: Claim = {
      ...claim,
      status: status as any,
      reviewDate: new Date().toISOString(),
      reviewerNotes: reviewerNotes || claim.reviewerNotes
    };
    
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }
  
  async adminApproveClaim(id: number, adminNotes: string): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    if (!claim.requiresHigherApproval) {
      throw new Error(`Claim with ID ${id} does not require admin approval`);
    }
    
    const updatedClaim: Claim = {
      ...claim,
      approvedByAdmin: true,
      adminApprovalDate: new Date().toISOString(),
      adminReviewNotes: adminNotes,
      status: 'approved',
      reviewDate: new Date().toISOString()
    };
    
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }
  
  async rejectClaim(id: number, reason: string): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    const updatedClaim: Claim = {
      ...claim,
      status: 'rejected',
      reviewDate: new Date().toISOString(),
      reviewerNotes: reason
    };
    
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }
  
  async markClaimAsFraudulent(
    id: number, 
    riskLevel: string, 
    riskFactors: string, 
    reviewerId: number
  ): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    // Valid risk levels
    const validRiskLevels = ['low', 'medium', 'high', 'confirmed'];
    if (!validRiskLevels.includes(riskLevel)) {
      throw new Error(`Invalid risk level: ${riskLevel}. Must be one of: ${validRiskLevels.join(', ')}`);
    }
    
    const updatedClaim: Claim = {
      ...claim,
      fraudRiskLevel: riskLevel as any,
      fraudRiskFactors: riskFactors,
      fraudReviewDate: new Date().toISOString(),
      fraudReviewerId: reviewerId,
      status: riskLevel === 'confirmed' ? 'fraud_confirmed' : 'fraud_review',
      reviewDate: new Date().toISOString()
    };
    
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }
  
  async processClaimPayment(id: number, paymentReference: string): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    if (claim.status !== 'approved') {
      throw new Error(`Claim with ID ${id} must be approved before payment can be processed`);
    }
    
    if (claim.requiresHigherApproval && !claim.approvedByAdmin) {
      throw new Error(`Claim with ID ${id} requires admin approval before payment can be processed`);
    }
    
    if (claim.fraudRiskLevel === 'high' || claim.fraudRiskLevel === 'confirmed') {
      throw new Error(`Claim with ID ${id} has been flagged for fraud and cannot be processed for payment`);
    }
    
    const updatedClaim: Claim = {
      ...claim,
      status: 'paid',
      paymentDate: new Date().toISOString(),
      paymentReference
    };
    
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }

  // Premium Payment methods
  async getPremiumPayments(): Promise<PremiumPayment[]> {
    return Array.from(this.premiumPayments.values());
  }
  
  async getPremiumPayment(id: number): Promise<PremiumPayment | undefined> {
    return this.premiumPayments.get(id);
  }
  
  async getPremiumPaymentsByCompany(companyId: number): Promise<PremiumPayment[]> {
    return Array.from(this.premiumPayments.values()).filter(
      payment => payment.companyId === companyId
    );
  }
  
  async getPremiumPaymentsByPremium(premiumId: number): Promise<PremiumPayment[]> {
    return Array.from(this.premiumPayments.values()).filter(
      payment => payment.premiumId === premiumId
    );
  }
  
  async getPremiumPaymentsByStatus(status: string): Promise<PremiumPayment[]> {
    return Array.from(this.premiumPayments.values()).filter(
      payment => payment.status === status
    );
  }
  
  async createPremiumPayment(payment: InsertPremiumPayment): Promise<PremiumPayment> {
    const id = this.premiumPaymentId++;
    const newPayment: PremiumPayment = {
      ...payment,
      id,
      createdAt: new Date().toISOString()
    };
    this.premiumPayments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePremiumPaymentStatus(id: number, status: string): Promise<PremiumPayment> {
    const payment = this.premiumPayments.get(id);
    if (!payment) {
      throw new Error(`Premium Payment with ID ${id} not found`);
    }
    
    const updatedPayment: PremiumPayment = {
      ...payment,
      status,
      updatedAt: new Date().toISOString()
    };
    
    this.premiumPayments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Claim Payment methods
  async getClaimPayments(): Promise<ClaimPayment[]> {
    return Array.from(this.claimPayments.values());
  }
  
  async getClaimPayment(id: number): Promise<ClaimPayment | undefined> {
    return this.claimPayments.get(id);
  }
  
  async getClaimPaymentsByClaim(claimId: number): Promise<ClaimPayment[]> {
    return Array.from(this.claimPayments.values()).filter(
      payment => payment.claimId === claimId
    );
  }
  
  async getClaimPaymentsByMember(memberId: number): Promise<ClaimPayment[]> {
    return Array.from(this.claimPayments.values()).filter(
      payment => payment.memberId === memberId
    );
  }
  
  async getClaimPaymentsByInstitution(institutionId: number): Promise<ClaimPayment[]> {
    return Array.from(this.claimPayments.values()).filter(
      payment => payment.institutionId === institutionId
    );
  }
  
  async getClaimPaymentsByStatus(status: string): Promise<ClaimPayment[]> {
    return Array.from(this.claimPayments.values()).filter(
      payment => payment.status === status
    );
  }
  
  async createClaimPayment(payment: InsertClaimPayment): Promise<ClaimPayment> {
    const id = this.claimPaymentId++;
    const newPayment: ClaimPayment = {
      ...payment,
      id,
      createdAt: new Date().toISOString()
    };
    this.claimPayments.set(id, newPayment);
    return newPayment;
  }
  
  async updateClaimPaymentStatus(id: number, status: string): Promise<ClaimPayment> {
    const payment = this.claimPayments.get(id);
    if (!payment) {
      throw new Error(`Claim Payment with ID ${id} not found`);
    }
    
    const updatedPayment: ClaimPayment = {
      ...payment,
      status,
      updatedAt: new Date().toISOString()
    };
    
    this.claimPayments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Provider Disbursement methods
  async getProviderDisbursements(): Promise<ProviderDisbursement[]> {
    return Array.from(this.providerDisbursements.values());
  }
  
  async getProviderDisbursement(id: number): Promise<ProviderDisbursement | undefined> {
    return this.providerDisbursements.get(id);
  }
  
  async getProviderDisbursementsByInstitution(institutionId: number): Promise<ProviderDisbursement[]> {
    return Array.from(this.providerDisbursements.values()).filter(
      disbursement => disbursement.institutionId === institutionId
    );
  }
  
  async getProviderDisbursementsByStatus(status: string): Promise<ProviderDisbursement[]> {
    return Array.from(this.providerDisbursements.values()).filter(
      disbursement => disbursement.status === status
    );
  }
  
  async createProviderDisbursement(disbursement: InsertProviderDisbursement): Promise<ProviderDisbursement> {
    const id = this.providerDisbursementId++;
    const newDisbursement: ProviderDisbursement = {
      ...disbursement,
      id,
      createdAt: new Date().toISOString()
    };
    this.providerDisbursements.set(id, newDisbursement);
    return newDisbursement;
  }
  
  async updateProviderDisbursementStatus(id: number, status: string): Promise<ProviderDisbursement> {
    const disbursement = this.providerDisbursements.get(id);
    if (!disbursement) {
      throw new Error(`Provider Disbursement with ID ${id} not found`);
    }
    
    const updatedDisbursement: ProviderDisbursement = {
      ...disbursement,
      status,
      updatedAt: new Date().toISOString()
    };
    
    this.providerDisbursements.set(id, updatedDisbursement);
    return updatedDisbursement;
  }
  
  // Disbursement Item methods
  async getDisbursementItems(): Promise<DisbursementItem[]> {
    return Array.from(this.disbursementItems.values());
  }
  
  async getDisbursementItem(id: number): Promise<DisbursementItem | undefined> {
    return this.disbursementItems.get(id);
  }
  
  async getDisbursementItemsByDisbursement(disbursementId: number): Promise<DisbursementItem[]> {
    return Array.from(this.disbursementItems.values()).filter(
      item => item.disbursementId === disbursementId
    );
  }
  
  async getDisbursementItemsByClaim(claimId: number): Promise<DisbursementItem[]> {
    return Array.from(this.disbursementItems.values()).filter(
      item => item.claimId === claimId
    );
  }
  
  async createDisbursementItem(item: InsertDisbursementItem): Promise<DisbursementItem> {
    const id = this.disbursementItemId++;
    const newItem: DisbursementItem = {
      ...item,
      id,
      createdAt: new Date().toISOString()
    };
    this.disbursementItems.set(id, newItem);
    return newItem;
  }
  
  async updateDisbursementItemStatus(id: number, status: string): Promise<DisbursementItem> {
    const item = this.disbursementItems.get(id);
    if (!item) {
      throw new Error(`Disbursement Item with ID ${id} not found`);
    }
    
    const updatedItem: DisbursementItem = {
      ...item,
      status,
      updatedAt: new Date().toISOString()
    };
    
    this.disbursementItems.set(id, updatedItem);
    return updatedItem;
  }
  
  // Insurance Balance methods
  async getInsuranceBalances(): Promise<InsuranceBalance[]> {
    return Array.from(this.insuranceBalances.values());
  }
  
  async getInsuranceBalance(id: number): Promise<InsuranceBalance | undefined> {
    return this.insuranceBalances.get(id);
  }
  
  async getInsuranceBalanceByPeriod(periodId: number): Promise<InsuranceBalance | undefined> {
    return Array.from(this.insuranceBalances.values()).find(
      balance => balance.periodId === periodId
    );
  }
  
  async createInsuranceBalance(balance: InsertInsuranceBalance): Promise<InsuranceBalance> {
    const id = this.insuranceBalanceId++;
    const newBalance: InsuranceBalance = {
      ...balance,
      id,
      createdAt: new Date().toISOString()
    };
    this.insuranceBalances.set(id, newBalance);
    return newBalance;
  }
  
  async updateInsuranceBalance(
    id: number, 
    totalPremiums: number, 
    totalClaims: number, 
    pendingClaims: number, 
    activeBalance: number
  ): Promise<InsuranceBalance> {
    const balance = this.insuranceBalances.get(id);
    if (!balance) {
      throw new Error(`Insurance Balance with ID ${id} not found`);
    }
    
    const updatedBalance: InsuranceBalance = {
      ...balance,
      totalPremiums,
      totalClaims,
      pendingClaims,
      activeBalance,
      updatedAt: new Date().toISOString()
    };
    
    this.insuranceBalances.set(id, updatedBalance);
    return updatedBalance;
  }

  // Medical Procedure methods
  async getMedicalProcedures(): Promise<MedicalProcedure[]> {
    return Array.from(this.medicalProcedures.values()).filter(
      procedure => procedure.active
    ).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  async getMedicalProcedure(id: number): Promise<MedicalProcedure | undefined> {
    return this.medicalProcedures.get(id);
  }

  async getMedicalProceduresByCategory(category: string): Promise<MedicalProcedure[]> {
    return Array.from(this.medicalProcedures.values()).filter(
      procedure => procedure.category === category && procedure.active
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveMedicalProcedures(): Promise<MedicalProcedure[]> {
    return Array.from(this.medicalProcedures.values()).filter(
      procedure => procedure.active
    );
  }

  async createMedicalProcedure(procedure: InsertMedicalProcedure): Promise<MedicalProcedure> {
    const id = this.medicalProcedureId++;
    const newProcedure: MedicalProcedure = {
      ...procedure,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.medicalProcedures.set(id, newProcedure);
    return newProcedure;
  }

  async updateMedicalProcedureStatus(id: number, active: boolean): Promise<MedicalProcedure> {
    const procedure = this.medicalProcedures.get(id);
    if (!procedure) {
      throw new Error(`Medical Procedure with ID ${id} not found`);
    }
    
    const updatedProcedure: MedicalProcedure = {
      ...procedure,
      active,
      updatedAt: new Date()
    };
    
    this.medicalProcedures.set(id, updatedProcedure);
    return updatedProcedure;
  }

  // Provider Procedure Rate methods
  async getProviderProcedureRates(): Promise<ProviderProcedureRate[]> {
    return Array.from(this.providerProcedureRates.values());
  }

  async getProviderProcedureRate(id: number): Promise<ProviderProcedureRate | undefined> {
    return this.providerProcedureRates.get(id);
  }

  async getProviderProcedureRatesByInstitution(institutionId: number): Promise<ProviderProcedureRate[]> {
    return Array.from(this.providerProcedureRates.values()).filter(
      rate => rate.medicalInstitutionId === institutionId
    );
  }

  async getProviderProcedureRatesByProcedure(procedureId: number): Promise<ProviderProcedureRate[]> {
    return Array.from(this.providerProcedureRates.values()).filter(
      rate => rate.procedureId === procedureId
    );
  }

  async getActiveProviderProcedureRates(): Promise<ProviderProcedureRate[]> {
    return Array.from(this.providerProcedureRates.values()).filter(
      rate => rate.active
    );
  }

  async createProviderProcedureRate(rate: InsertProviderProcedureRate): Promise<ProviderProcedureRate> {
    const id = this.providerProcedureRateId++;
    const newRate: ProviderProcedureRate = {
      ...rate,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.providerProcedureRates.set(id, newRate);
    return newRate;
  }

  async updateProviderProcedureRateStatus(id: number, active: boolean): Promise<ProviderProcedureRate> {
    const rate = this.providerProcedureRates.get(id);
    if (!rate) {
      throw new Error(`Provider Procedure Rate with ID ${id} not found`);
    }
    
    const updatedRate: ProviderProcedureRate = {
      ...rate,
      active,
      updatedAt: new Date()
    };
    
    this.providerProcedureRates.set(id, updatedRate);
    return updatedRate;
  }

  // Claim Procedure Item methods
  async getClaimProcedureItems(): Promise<ClaimProcedureItem[]> {
    return Array.from(this.claimProcedureItems.values());
  }

  async getClaimProcedureItem(id: number): Promise<ClaimProcedureItem | undefined> {
    return this.claimProcedureItems.get(id);
  }

  async getClaimProcedureItemsByClaim(claimId: number): Promise<ClaimProcedureItem[]> {
    return Array.from(this.claimProcedureItems.values()).filter(
      item => item.claimId === claimId
    );
  }

  async getClaimProcedureItemsByProcedure(procedureId: number): Promise<ClaimProcedureItem[]> {
    return Array.from(this.claimProcedureItems.values()).filter(
      item => item.procedureId === procedureId
    );
  }

  async createClaimProcedureItem(item: InsertClaimProcedureItem): Promise<ClaimProcedureItem> {
    const id = this.claimProcedureItemId++;
    const newItem: ClaimProcedureItem = {
      ...item,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.claimProcedureItems.set(id, newItem);
    return newItem;
  }

  async createClaimWithProcedureItems(
    claim: InsertClaim, 
    procedureItems: Omit<InsertClaimProcedureItem, 'claimId'>[]
  ): Promise<{ claim: Claim, procedureItems: ClaimProcedureItem[] }> {
    // Create the claim first
    const newClaim = await this.createClaim(claim);
    
    // Then create all procedure items with the new claim ID
    const items = await Promise.all(
      procedureItems.map(item => this.createClaimProcedureItem({
        ...item,
        claimId: newClaim.id
      }))
    );
    
    return { claim: newClaim, procedureItems: items };
  }

  // Diagnosis Code methods
  async getDiagnosisCodes(): Promise<DiagnosisCode[]> {
    return Array.from(this.diagnosisCodes.values());
  }

  async getDiagnosisCode(id: number): Promise<DiagnosisCode | undefined> {
    return this.diagnosisCodes.get(id);
  }

  async getDiagnosisCodeByCode(code: string): Promise<DiagnosisCode | undefined> {
    return Array.from(this.diagnosisCodes.values()).find(
      diagnosisCode => diagnosisCode.code === code
    );
  }

  async getDiagnosisCodesByType(codeType: string): Promise<DiagnosisCode[]> {
    return Array.from(this.diagnosisCodes.values()).filter(
      diagnosisCode => diagnosisCode.codeType === codeType
    );
  }

  async getDiagnosisCodesBySearch(searchTerm: string): Promise<DiagnosisCode[]> {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return Array.from(this.diagnosisCodes.values()).filter(
      diagnosisCode => 
        diagnosisCode.code.toLowerCase().includes(lowerSearchTerm) ||
        diagnosisCode.description.toLowerCase().includes(lowerSearchTerm)
    );
  }

  async createDiagnosisCode(diagnosisCode: InsertDiagnosisCode): Promise<DiagnosisCode> {
    const id = this.diagnosisCodeId++;
    const newDiagnosisCode: DiagnosisCode = {
      ...diagnosisCode,
      id,
      createdAt: new Date().toISOString()
    };
    this.diagnosisCodes.set(id, newDiagnosisCode);
    return newDiagnosisCode;
  }

  async updateDiagnosisCodeStatus(id: number, isActive: boolean): Promise<DiagnosisCode> {
    const diagnosisCode = this.diagnosisCodes.get(id);
    if (!diagnosisCode) {
      throw new Error(`Diagnosis code with ID ${id} not found`);
    }
    
    const updatedDiagnosisCode: DiagnosisCode = {
      ...diagnosisCode,
      isActive
    };
    this.diagnosisCodes.set(id, updatedDiagnosisCode);
    return updatedDiagnosisCode;
  }
}

import { DatabaseStorage } from './databaseStorage';

// If using DATABASE_URL, use DatabaseStorage, otherwise use MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
