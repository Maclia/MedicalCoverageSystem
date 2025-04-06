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
  Claim, InsertClaim
} from "@shared/schema";

// Storage interface
export interface IStorage {
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
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimStatus(id: number, status: string, reviewerNotes?: string): Promise<Claim>;
  processClaimPayment(id: number, paymentReference: string): Promise<Claim>;
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
  
  async getMedicalPersonnel(id: number): Promise<MedicalPersonnel | undefined> {
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
  
  async createClaim(claim: InsertClaim): Promise<Claim> {
    const id = this.claimId++;
    const newClaim: Claim = {
      ...claim,
      id,
      claimDate: new Date().toISOString(),
      status: 'submitted',
      reviewDate: null,
      paymentDate: null,
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
  
  async processClaimPayment(id: number, paymentReference: string): Promise<Claim> {
    const claim = this.claims.get(id);
    if (!claim) {
      throw new Error(`Claim with ID ${id} not found`);
    }
    
    if (claim.status !== 'approved') {
      throw new Error(`Claim with ID ${id} must be approved before payment can be processed`);
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
}

import { DatabaseStorage } from './databaseStorage';

// If using DATABASE_URL, use DatabaseStorage, otherwise use MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
