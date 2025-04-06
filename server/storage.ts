import { 
  Company, InsertCompany, 
  Member, InsertMember, 
  Period, InsertPeriod, 
  PremiumRate, InsertPremiumRate,
  Premium, InsertPremium
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
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private companies: Map<number, Company>;
  private members: Map<number, Member>;
  private periods: Map<number, Period>;
  private premiumRates: Map<number, PremiumRate>;
  private premiums: Map<number, Premium>;
  
  private companyId: number;
  private memberId: number;
  private periodId: number;
  private premiumRateId: number;
  private premiumId: number;
  
  constructor() {
    this.companies = new Map();
    this.members = new Map();
    this.periods = new Map();
    this.premiumRates = new Map();
    this.premiums = new Map();
    
    this.companyId = 1;
    this.memberId = 1;
    this.periodId = 1;
    this.premiumRateId = 1;
    this.premiumId = 1;
    
    // Initialize with a default active period and rates
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
    const id = this.premiumId++;
    const newPremium: Premium = {
      ...premium,
      id,
      createdAt: new Date().toISOString()
    };
    this.premiums.set(id, newPremium);
    return newPremium;
  }
}

export const storage = new MemStorage();
