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
  User,
  OnboardingSession, InsertOnboardingSession,
  OnboardingTask, InsertOnboardingTask,
  MemberDocument, InsertMemberDocument,
  OnboardingPreference, InsertOnboardingPreference,
  ActivationToken, InsertActivationToken,
  MemberPreference, InsertMemberPreference,
  BehaviorAnalytic, InsertBehaviorAnalytic,
  PersonalizationScore, InsertPersonalizationScore,
  JourneyStage, InsertJourneyStage,
  RecommendationHistory, InsertRecommendationHistory,
  ClaimAdjudicationResult, InsertClaimAdjudicationResult,
  MedicalNecessityValidation, InsertMedicalNecessityValidation,
  FraudDetectionResult, InsertFraudDetectionResult,
  ExplanationOfBenefits, InsertExplanationOfBenefits,
  ClaimAuditTrail, InsertClaimAuditTrail,
  BenefitUtilization, InsertBenefitUtilization,
  MemberCard, InsertMemberCard,
  CardTemplate, InsertCardTemplate,
  CardVerificationEvent, InsertCardVerificationEvent,
  CardProductionBatch, InsertCardProductionBatch
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User authentication methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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

  // User method
  createUser(user: InsertUser): Promise<User>;

  // Enhanced Claims Processing Methods
  // Claim Adjudication Results
  getClaimAdjudicationResults(): Promise<ClaimAdjudicationResult[]>;
  getClaimAdjudicationResult(id: number): Promise<ClaimAdjudicationResult | undefined>;
  getClaimAdjudicationResultsByClaim(claimId: number): Promise<ClaimAdjudicationResult[]>;
  createClaimAdjudicationResult(result: InsertClaimAdjudicationResult): Promise<ClaimAdjudicationResult>;

  // Medical Necessity Validations
  getMedicalNecessityValidations(): Promise<MedicalNecessityValidation[]>;
  getMedicalNecessityValidation(id: number): Promise<MedicalNecessityValidation | undefined>;
  getMedicalNecessityValidationsByClaim(claimId: number): Promise<MedicalNecessityValidation[]>;
  createMedicalNecessityResult(validation: InsertMedicalNecessityValidation): Promise<MedicalNecessityValidation>;

  // Fraud Detection Results
  getFraudDetectionResults(): Promise<FraudDetectionResult[]>;
  getFraudDetectionResult(id: number): Promise<FraudDetectionResult | undefined>;
  getFraudDetectionResultsByClaim(claimId: number): Promise<FraudDetectionResult[]>;
  createFraudDetectionResult(result: InsertFraudDetectionResult): Promise<FraudDetectionResult>;

  // Explanation of Benefits
  getExplanationOfBenefits(): Promise<ExplanationOfBenefits[]>;
  getExplanationOfBenefits(id: number): Promise<ExplanationOfBenefits | undefined>;
  getExplanationOfBenefitsByClaim(claimId: number): Promise<ExplanationOfBenefits[]>;
  getExplanationOfBenefitsByMember(memberId: number): Promise<ExplanationOfBenefits[]>;
  createExplanationOfBenefits(eob: InsertExplanationOfBenefits): Promise<ExplanationOfBenefits>;

  // Claim Audit Trails
  getClaimAuditTrails(): Promise<ClaimAuditTrail[]>;
  getClaimAuditTrail(id: number): Promise<ClaimAuditTrail | undefined>;
  getClaimAuditTrailsByClaim(claimId: number): Promise<ClaimAuditTrail[]>;
  createClaimAuditTrail(audit: InsertClaimAuditTrail): Promise<ClaimAuditTrail>;

  // Benefit Utilization
  getBenefitUtilization(): Promise<BenefitUtilization[]>;
  getBenefitUtilizationById(id: number): Promise<BenefitUtilization | undefined>;
  getBenefitUtilizationByMember(memberId: number): Promise<BenefitUtilization[]>;
  getBenefitUtilizationByMemberAndBenefit(memberId: number, benefitId: number): Promise<BenefitUtilization | undefined>;
  createBenefitUtilization(utilization: InsertBenefitUtilization): Promise<BenefitUtilization>;
  updateBenefitUtilization(id: number, usedAmount: number): Promise<BenefitUtilization>;

  // Member Engagement Hub - Onboarding System
  getOnboardingSession(id: number): Promise<OnboardingSession | undefined>;
  getOnboardingSessionByMember(memberId: number): Promise<OnboardingSession | undefined>;
  getAllOnboardingSessions(): Promise<OnboardingSession[]>;
  getOnboardingSessionsByCompany(companyId: number): Promise<OnboardingSession[]>;
  createOnboardingSession(session: InsertOnboardingSession): Promise<OnboardingSession>;
  updateOnboardingSession(id: number, updates: Partial<OnboardingSession>): Promise<OnboardingSession>;

  getOnboardingTask(id: number): Promise<OnboardingTask | undefined>;
  getOnboardingTasksBySession(sessionId: number): Promise<OnboardingTask[]>;
  getOnboardingTasksBySessionAndDay(sessionId: number, dayNumber: number): Promise<OnboardingTask[]>;
  createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask>;
  updateOnboardingTask(id: number, updates: Partial<OnboardingTask>): Promise<OnboardingTask>;
  createOnboardingTasksForDay(memberId: number, dayNumber: number): Promise<OnboardingTask[]>;

  getMemberDocument(id: number): Promise<MemberDocument | undefined>;
  getMemberDocuments(memberId: number): Promise<MemberDocument[]>;
  getMemberDocumentsByStatus(memberId: number, status: string): Promise<MemberDocument[]>;
  getAllMemberDocuments(): Promise<MemberDocument[]>;
  getPendingDocuments(): Promise<MemberDocument[]>;
  createMemberDocument(document: InsertMemberDocument): Promise<MemberDocument>;
  updateMemberDocument(id: number, updates: Partial<MemberDocument>): Promise<MemberDocument>;

  getOnboardingPreference(id: number): Promise<OnboardingPreference | undefined>;
  getOnboardingPreferencesByMember(memberId: number): Promise<OnboardingPreference | undefined>;
  createOnboardingPreference(preference: InsertOnboardingPreference): Promise<OnboardingPreference>;
  updateOnboardingPreference(id: number, updates: Partial<OnboardingPreference>): Promise<OnboardingPreference>;

  getActivationToken(id: number): Promise<ActivationToken | undefined>;
  getActivationToken(tokenHash: string): Promise<ActivationToken | undefined>;
  createActivationToken(token: InsertActivationToken): Promise<ActivationToken>;
  updateActivationToken(id: number, updates: Partial<ActivationToken>): Promise<ActivationToken>;

  // Personalization System
  getMemberPreference(id: number): Promise<MemberPreference | undefined>;
  getMemberPreferences(memberId: number): Promise<MemberPreference | undefined>;
  createMemberPreference(preference: InsertMemberPreference): Promise<MemberPreference>;
  updateMemberPreferences(memberId: number, updates: Partial<MemberPreference>): Promise<MemberPreference>;

  getBehaviorAnalytic(id: number): Promise<BehaviorAnalytic | undefined>;
  getBehaviorAnalyticsByMember(memberId: number): Promise<BehaviorAnalytic[]>;
  getBehaviorAnalyticsBySession(memberId: number, sessionId: string, limit?: number): Promise<BehaviorAnalytic[]>;
  getBehaviorAnalyticsByType(memberId: number, eventType: string, limit?: number): Promise<BehaviorAnalytic[]>;
  getRecentBehaviorAnalytics(memberId: number, limit?: number): Promise<BehaviorAnalytic[]>;
  createBehaviorAnalytic(analytic: InsertBehaviorAnalytic): Promise<BehaviorAnalytic>;

  getPersonalizationScore(id: number): Promise<PersonalizationScore | undefined>;
  getPersonalizationScores(memberId: number): Promise<PersonalizationScore[]>;
  createPersonalizationScore(score: InsertPersonalizationScore): Promise<PersonalizationScore>;
  updatePersonalizationScore(id: number, updates: Partial<PersonalizationScore>): Promise<PersonalizationScore>;

  getJourneyStage(id: number): Promise<JourneyStage | undefined>;
  getJourneyStageByMember(memberId: number): Promise<JourneyStage | undefined>;
  createJourneyStage(stage: InsertJourneyStage): Promise<JourneyStage>;
  updateJourneyStage(id: number, updates: Partial<JourneyStage>): Promise<JourneyStage>;

  getRecommendationHistory(id: number): Promise<RecommendationHistory | undefined>;
  getActiveRecommendations(memberId: number, limit?: number): Promise<RecommendationHistory[]>;
  getRecommendationsByType(memberId: number, type: string, limit?: number): Promise<RecommendationHistory[]>;
  createRecommendationHistory(recommendation: InsertRecommendationHistory): Promise<RecommendationHistory>;
  updateRecommendationFeedback(id: number, updates: Partial<RecommendationHistory>): Promise<RecommendationHistory>;

  // Card Management System
  // Member Cards
  getMemberCards(): Promise<MemberCard[]>;
  getMemberCard(id: number): Promise<MemberCard | undefined>;
  getMemberCardsByMember(memberId: number): Promise<MemberCard[]>;
  getMemberCardsByStatus(status: string): Promise<MemberCard[]>;
  getActiveMemberCards(memberId: number): Promise<MemberCard[]>;
  createMemberCard(card: InsertMemberCard): Promise<MemberCard>;
  updateMemberCard(id: number, updates: Partial<MemberCard>): Promise<MemberCard>;
  deactivateMemberCard(id: number, reason: string): Promise<MemberCard>;
  replaceMemberCard(id: number, newCardData: InsertMemberCard): Promise<{ oldCard: MemberCard, newCard: MemberCard }>;

  // Card Templates
  getCardTemplates(): Promise<CardTemplate[]>;
  getCardTemplate(id: number): Promise<CardTemplate | undefined>;
  getCardTemplatesByCompany(companyId: number): Promise<CardTemplate[]>;
  getCardTemplatesByType(templateType: string): Promise<CardTemplate[]>;
  getActiveCardTemplates(): Promise<CardTemplate[]>;
  createCardTemplate(template: InsertCardTemplate): Promise<CardTemplate>;
  updateCardTemplate(id: number, updates: Partial<CardTemplate>): Promise<CardTemplate>;
  deactivateCardTemplate(id: number): Promise<CardTemplate>;

  // Card Verification Events
  getCardVerificationEvents(): Promise<CardVerificationEvent[]>;
  getCardVerificationEvent(id: number): Promise<CardVerificationEvent | undefined>;
  getCardVerificationEventsByCard(cardId: number): Promise<CardVerificationEvent[]>;
  getCardVerificationEventsByMember(memberId: number): Promise<CardVerificationEvent[]>;
  getCardVerificationEventsByDateRange(startDate: Date, endDate: Date): Promise<CardVerificationEvent[]>;
  createCardVerificationEvent(event: InsertCardVerificationEvent): Promise<CardVerificationEvent>;

  // Card Production Batches
  getCardProductionBatches(): Promise<CardProductionBatch[]>;
  getCardProductionBatch(id: number): Promise<CardProductionBatch | undefined>;
  getCardProductionBatchesByStatus(status: string): Promise<CardProductionBatch[]>;
  getCardProductionBatchesByDateRange(startDate: Date, endDate: Date): Promise<CardProductionBatch[]>;
  createCardProductionBatch(batch: InsertCardProductionBatch): Promise<CardProductionBatch>;
  updateCardProductionBatch(id: number, updates: Partial<CardProductionBatch>): Promise<CardProductionBatch>;
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

  // Member Engagement Hub storage
  private onboardingSessions: Map<number, OnboardingSession>;
  private onboardingTasks: Map<number, OnboardingTask>;
  private memberDocuments: Map<number, MemberDocument>;
  private onboardingPreferences: Map<number, OnboardingPreference>;
  private activationTokens: Map<number, ActivationToken>;
  private memberPreferences: Map<number, MemberPreference>;
  private behaviorAnalytics: Map<number, BehaviorAnalytic>;
  private personalizationScores: Map<number, PersonalizationScore>;
  private journeyStages: Map<number, JourneyStage>;
  private recommendationHistory: Map<number, RecommendationHistory>;

  // Enhanced Claims Processing Storage
  private claimAdjudicationResults: Map<number, ClaimAdjudicationResult>;
  private medicalNecessityValidations: Map<number, MedicalNecessityValidation>;
  private fraudDetectionResults: Map<number, FraudDetectionResult>;
  private explanationOfBenefits: Map<number, ExplanationOfBenefits>;
  private claimAuditTrails: Map<number, ClaimAuditTrail>;
  private benefitUtilization: Map<number, BenefitUtilization>;

  // Card Management Storage
  private memberCards: Map<number, MemberCard>;
  private cardTemplates: Map<number, CardTemplate>;
  private cardVerificationEvents: Map<number, CardVerificationEvent>;
  private cardProductionBatches: Map<number, CardProductionBatch>;

  // Member Engagement Hub IDs
  private onboardingSessionId: number;
  private onboardingTaskId: number;
  private memberDocumentId: number;
  private onboardingPreferenceId: number;
  private activationTokenId: number;
  private memberPreferenceId: number;
  private behaviorAnalyticId: number;
  private personalizationScoreId: number;
  private journeyStageId: number;
  private recommendationHistoryId: number;

  // Enhanced Claims Processing IDs
  private claimAdjudicationResultId: number;
  private medicalNecessityValidationId: number;
  private fraudDetectionResultId: number;
  private explanationOfBenefitsId: number;
  private claimAuditTrailId: number;
  private benefitUtilizationId: number;

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

  // Card Management IDs
  private memberCardId: number;
  private cardTemplateId: number;
  private cardVerificationEventId: number;
  private cardProductionBatchId: number;

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

    // Initialize Member Engagement Hub storage
    this.onboardingSessions = new Map();
    this.onboardingTasks = new Map();
    this.memberDocuments = new Map();
    this.onboardingPreferences = new Map();
    this.activationTokens = new Map();
    this.memberPreferences = new Map();
    this.behaviorAnalytics = new Map();
    this.personalizationScores = new Map();
    this.journeyStages = new Map();
    this.recommendationHistory = new Map();

    // Initialize Enhanced Claims Processing Storage
    this.claimAdjudicationResults = new Map();
    this.medicalNecessityValidations = new Map();
    this.fraudDetectionResults = new Map();
    this.explanationOfBenefits = new Map();
    this.claimAuditTrails = new Map();
    this.benefitUtilization = new Map();

    // Initialize Member Engagement Hub IDs
    this.onboardingSessionId = 1;
    this.onboardingTaskId = 1;
    this.memberDocumentId = 1;
    this.onboardingPreferenceId = 1;
    this.activationTokenId = 1;
    this.memberPreferenceId = 1;
    this.behaviorAnalyticId = 1;
    this.personalizationScoreId = 1;
    this.journeyStageId = 1;
    this.recommendationHistoryId = 1;

    // Initialize Enhanced Claims Processing IDs
    this.claimAdjudicationResultId = 1;
    this.medicalNecessityValidationId = 1;
    this.fraudDetectionResultId = 1;
    this.explanationOfBenefitsId = 1;
    this.claimAuditTrailId = 1;
    this.benefitUtilizationId = 1;

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

    // Card Management IDs
    this.memberCardId = 1;
    this.cardTemplateId = 1;
    this.cardVerificationEventId = 1;
    this.cardProductionBatchId = 1;

    // Initialize with a default active period, rates, and benefits
    this.initializeDefaultData();

    // Initialize card management storage
    this.initializeCardManagement();
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

  // Member Engagement Hub - Onboarding System Implementation

  // Onboarding Sessions
  async getOnboardingSession(id: number): Promise<OnboardingSession | undefined> {
    return this.onboardingSessions.get(id);
  }

  async getOnboardingSessionByMember(memberId: number): Promise<OnboardingSession | undefined> {
    return Array.from(this.onboardingSessions.values()).find(
      session => session.memberId === memberId
    );
  }

  async getAllOnboardingSessions(): Promise<OnboardingSession[]> {
    return Array.from(this.onboardingSessions.values());
  }

  async getOnboardingSessionsByCompany(companyId: number): Promise<OnboardingSession[]> {
    const sessions = Array.from(this.onboardingSessions.values());
    const companySessions = [];

    for (const session of sessions) {
      const member = await this.getMember(session.memberId);
      if (member && member.companyId === companyId) {
        companySessions.push(session);
      }
    }

    return companySessions;
  }

  async createOnboardingSession(session: InsertOnboardingSession): Promise<OnboardingSession> {
    const id = this.onboardingSessionId++;
    const newSession: OnboardingSession = {
      ...session,
      id,
      startDate: session.startDate || new Date(),
      completionDate: session.completionDate || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingSessions.set(id, newSession);
    return newSession;
  }

  async updateOnboardingSession(id: number, updates: Partial<OnboardingSession>): Promise<OnboardingSession> {
    const session = this.onboardingSessions.get(id);
    if (!session) {
      throw new Error(`Onboarding session with ID ${id} not found`);
    }

    const updatedSession: OnboardingSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    this.onboardingSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Onboarding Tasks
  async getOnboardingTask(id: number): Promise<OnboardingTask | undefined> {
    return this.onboardingTasks.get(id);
  }

  async getOnboardingTasksBySession(sessionId: number): Promise<OnboardingTask[]> {
    return Array.from(this.onboardingTasks.values()).filter(
      task => task.sessionId === sessionId
    );
  }

  async getOnboardingTasksBySessionAndDay(sessionId: number, dayNumber: number): Promise<OnboardingTask[]> {
    return Array.from(this.onboardingTasks.values()).filter(
      task => task.sessionId === sessionId && task.dayNumber === dayNumber
    );
  }

  async createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask> {
    const id = this.onboardingTaskId++;
    const newTask: OnboardingTask = {
      ...task,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingTasks.set(id, newTask);
    return newTask;
  }

  async updateOnboardingTask(id: number, updates: Partial<OnboardingTask>): Promise<OnboardingTask> {
    const task = this.onboardingTasks.get(id);
    if (!task) {
      throw new Error(`Onboarding task with ID ${id} not found`);
    }

    const updatedTask: OnboardingTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    this.onboardingTasks.set(id, updatedTask);
    return updatedTask;
  }

  async createOnboardingTasksForDay(memberId: number, dayNumber: number): Promise<OnboardingTask[]> {
    const session = await this.getOnboardingSessionByMember(memberId);
    if (!session) {
      throw new Error(`No onboarding session found for member ${memberId}`);
    }

    const dayTasks = this.getTasksForDay(dayNumber);
    const createdTasks = [];

    for (const taskData of dayTasks) {
      const task = await this.createOnboardingTask({
        sessionId: session.id,
        dayNumber,
        taskType: taskData.taskType,
        title: taskData.title,
        description: taskData.description,
        completionStatus: false,
        pointsEarned: 0,
        taskData: JSON.stringify(taskData.taskData || {})
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }

  private getTasksForDay(dayNumber: number) {
    const tasksByDay = {
      1: [
        {
          taskType: 'profile_completion' as const,
          title: 'Complete Your Profile',
          description: 'Add your personal details, contact information, and emergency contacts.',
          taskData: { required: true, points: 20 }
        },
        {
          taskType: 'document_upload' as const,
          title: 'Upload Government ID',
          description: 'Upload a clear photo of your government-issued identification.',
          taskData: { required: true, points: 15 }
        }
      ],
      2: [
        {
          taskType: 'benefits_education' as const,
          title: 'Explore Your Benefits',
          description: 'Learn about your health insurance coverage and benefits.',
          taskData: { required: true, points: 10 }
        },
        {
          taskType: 'document_upload' as const,
          title: 'Upload Proof of Address',
          description: 'Upload a recent utility bill or bank statement.',
          taskData: { required: false, points: 10 }
        }
      ],
      3: [
        {
          taskType: 'dependent_registration' as const,
          title: 'Register Dependents',
          description: 'Add your spouse and children to your insurance coverage.',
          taskData: { required: false, points: 15 }
        },
        {
          taskType: 'wellness_setup' as const,
          title: 'Set Wellness Goals',
          description: 'Define your health and wellness objectives for the year.',
          taskData: { required: false, points: 10 }
        }
      ],
      4: [
        {
          taskType: 'emergency_setup' as const,
          title: 'Set Emergency Contacts',
          description: 'Designate emergency contacts and medical preferences.',
          taskData: { required: true, points: 15 }
        },
        {
          taskType: 'benefits_education' as const,
          title: 'Learn About Preventive Care',
          description: 'Discover covered preventive services and screenings.',
          taskData: { required: false, points: 10 }
        }
      ],
      5: [
        {
          taskType: 'document_upload' as const,
          title: 'Upload Insurance Card',
          description: 'Upload your insurance card for quick access.',
          taskData: { required: false, points: 5 }
        },
        {
          taskType: 'wellness_setup' as const,
          title: 'Complete Health Assessment',
          description: 'Take a comprehensive health risk assessment.',
          taskData: { required: false, points: 20 }
        }
      ],
      6: [
        {
          taskType: 'benefits_education' as const,
          title: 'Understand Claims Process',
          description: 'Learn how to submit claims and track their status.',
          taskData: { required: false, points: 10 }
        },
        {
          taskType: 'wellness_setup' as const,
          title: 'Join Wellness Program',
          description: 'Enroll in available wellness programs and challenges.',
          taskData: { required: false, points: 15 }
        }
      ],
      7: [
        {
          taskType: 'completion' as const,
          title: 'Review Coverage Summary',
          description: 'Review your complete coverage and understand your benefits.',
          taskData: { required: true, points: 20 }
        },
        {
          taskType: 'completion' as const,
          title: 'Complete Onboarding',
          description: 'Finish your onboarding journey and unlock all features.',
          taskData: { required: true, points: 25 }
        }
      ]
    };

    return tasksByDay[dayNumber as keyof typeof tasksByDay] || [];
  }

  // Member Documents
  async getMemberDocument(id: number): Promise<MemberDocument | undefined> {
    return this.memberDocuments.get(id);
  }

  async getMemberDocuments(memberId: number): Promise<MemberDocument[]> {
    return Array.from(this.memberDocuments.values()).filter(
      document => document.memberId === memberId
    );
  }

  async getMemberDocumentsByStatus(memberId: number, status: string): Promise<MemberDocument[]> {
    return Array.from(this.memberDocuments.values()).filter(
      document => document.memberId === memberId && document.verificationStatus === status
    );
  }

  async getAllMemberDocuments(): Promise<MemberDocument[]> {
    return Array.from(this.memberDocuments.values());
  }

  async getPendingDocuments(): Promise<MemberDocument[]> {
    return Array.from(this.memberDocuments.values()).filter(
      document => document.verificationStatus === 'pending'
    );
  }

  async createMemberDocument(document: InsertMemberDocument): Promise<MemberDocument> {
    const id = this.memberDocumentId++;
    const newDocument: MemberDocument = {
      ...document,
      id,
      uploadDate: document.uploadDate || new Date(),
      verificationDate: document.verificationDate || null,
      expiresAt: document.expiresAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.memberDocuments.set(id, newDocument);
    return newDocument;
  }

  async updateMemberDocument(id: number, updates: Partial<MemberDocument>): Promise<MemberDocument> {
    const document = this.memberDocuments.get(id);
    if (!document) {
      throw new Error(`Member document with ID ${id} not found`);
    }

    const updatedDocument: MemberDocument = {
      ...document,
      ...updates,
      updatedAt: new Date()
    };

    this.memberDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  // Onboarding Preferences
  async getOnboardingPreference(id: number): Promise<OnboardingPreference | undefined> {
    return this.onboardingPreferences.get(id);
  }

  async getOnboardingPreferencesByMember(memberId: number): Promise<OnboardingPreference | undefined> {
    return Array.from(this.onboardingPreferences.values()).find(
      preference => preference.memberId === memberId
    );
  }

  async createOnboardingPreference(preference: InsertOnboardingPreference): Promise<OnboardingPreference> {
    const id = this.onboardingPreferenceId++;
    const newPreference: OnboardingPreference = {
      ...preference,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.onboardingPreferences.set(id, newPreference);
    return newPreference;
  }

  async updateOnboardingPreference(id: number, updates: Partial<OnboardingPreference>): Promise<OnboardingPreference> {
    const preference = this.onboardingPreferences.get(id);
    if (!preference) {
      throw new Error(`Onboarding preference with ID ${id} not found`);
    }

    const updatedPreference: OnboardingPreference = {
      ...preference,
      ...updates,
      updatedAt: new Date()
    };

    this.onboardingPreferences.set(id, updatedPreference);
    return updatedPreference;
  }

  // Activation Tokens
  async getActivationToken(id: number): Promise<ActivationToken | undefined> {
    return this.activationTokens.get(id);
  }

  async getActivationToken(tokenHash: string): Promise<ActivationToken | undefined> {
    return Array.from(this.activationTokens.values()).find(
      token => token.tokenHash === tokenHash
    );
  }

  async createActivationToken(token: InsertActivationToken): Promise<ActivationToken> {
    const id = this.activationTokenId++;
    const newToken: ActivationToken = {
      ...token,
      id,
      usedAt: token.usedAt || null,
      createdAt: new Date()
    };
    this.activationTokens.set(id, newToken);
    return newToken;
  }

  async updateActivationToken(id: number, updates: Partial<ActivationToken>): Promise<ActivationToken> {
    const token = this.activationTokens.get(id);
    if (!token) {
      throw new Error(`Activation token with ID ${id} not found`);
    }

    const updatedToken: ActivationToken = {
      ...token,
      ...updates
    };

    this.activationTokens.set(id, updatedToken);
    return updatedToken;
  }

  // Personalization System Implementation

  // Member Preferences
  async getMemberPreference(id: number): Promise<MemberPreference | undefined> {
    return this.memberPreferences.get(id);
  }

  async getMemberPreferences(memberId: number): Promise<MemberPreference | undefined> {
    return Array.from(this.memberPreferences.values()).find(
      preference => preference.memberId === memberId
    );
  }

  async createMemberPreference(preference: InsertMemberPreference): Promise<MemberPreference> {
    const id = this.memberPreferenceId++;
    const newPreference: MemberPreference = {
      ...preference,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.memberPreferences.set(id, newPreference);
    return newPreference;
  }

  async updateMemberPreferences(memberId: number, updates: Partial<MemberPreference>): Promise<MemberPreference> {
    const preference = await this.getMemberPreferences(memberId);
    if (!preference) {
      throw new Error(`Member preference for member ${memberId} not found`);
    }

    const updatedPreference: MemberPreference = {
      ...preference,
      ...updates,
      updatedAt: new Date()
    };

    this.memberPreferences.set(preference.id, updatedPreference);
    return updatedPreference;
  }

  // Behavior Analytics
  async getBehaviorAnalytic(id: number): Promise<BehaviorAnalytic | undefined> {
    return this.behaviorAnalytics.get(id);
  }

  async getBehaviorAnalyticsByMember(memberId: number): Promise<BehaviorAnalytic[]> {
    return Array.from(this.behaviorAnalytics.values())
      .filter(analytic => analytic.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getBehaviorAnalyticsBySession(memberId: number, sessionId: string, limit?: number): Promise<BehaviorAnalytic[]> {
    let analytics = Array.from(this.behaviorAnalytics.values()).filter(
      analytic => analytic.memberId === memberId && analytic.sessionId === sessionId
    );

    analytics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (limit) {
      analytics = analytics.slice(0, limit);
    }

    return analytics;
  }

  async getBehaviorAnalyticsByType(memberId: number, eventType: string, limit?: number): Promise<BehaviorAnalytic[]> {
    let analytics = Array.from(this.behaviorAnalytics.values()).filter(
      analytic => analytic.memberId === memberId && analytic.eventType === eventType
    );

    analytics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (limit) {
      analytics = analytics.slice(0, limit);
    }

    return analytics;
  }

  async getRecentBehaviorAnalytics(memberId: number, limit?: number): Promise<BehaviorAnalytic[]> {
    let analytics = Array.from(this.behaviorAnalytics.values())
      .filter(analytic => analytic.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (limit) {
      analytics = analytics.slice(0, limit);
    }

    return analytics;
  }

  async createBehaviorAnalytic(analytic: InsertBehaviorAnalytic): Promise<BehaviorAnalytic> {
    const id = this.behaviorAnalyticId++;
    const newAnalytic: BehaviorAnalytic = {
      ...analytic,
      id,
      timestamp: analytic.timestamp || new Date(),
      coordinates: analytic.coordinates || null,
      createdAt: new Date()
    };
    this.behaviorAnalytics.set(id, newAnalytic);
    return newAnalytic;
  }

  // Personalization Scores
  async getPersonalizationScore(id: number): Promise<PersonalizationScore | undefined> {
    return this.personalizationScores.get(id);
  }

  async getPersonalizationScores(memberId: number): Promise<PersonalizationScore[]> {
    return Array.from(this.personalizationScores.values()).filter(
      score => score.memberId === memberId
    );
  }

  async createPersonalizationScore(score: InsertPersonalizationScore): Promise<PersonalizationScore> {
    const id = this.personalizationScoreId++;
    const newScore: PersonalizationScore = {
      ...score,
      id,
      lastCalculated: score.lastCalculated || new Date(),
      expiresAt: score.expiresAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.personalizationScores.set(id, newScore);
    return newScore;
  }

  async updatePersonalizationScore(id: number, updates: Partial<PersonalizationScore>): Promise<PersonalizationScore> {
    const score = this.personalizationScores.get(id);
    if (!score) {
      throw new Error(`Personalization score with ID ${id} not found`);
    }

    const updatedScore: PersonalizationScore = {
      ...score,
      ...updates,
      updatedAt: new Date()
    };

    this.personalizationScores.set(id, updatedScore);
    return updatedScore;
  }

  // Journey Stages
  async getJourneyStage(id: number): Promise<JourneyStage | undefined> {
    return this.journeyStages.get(id);
  }

  async getJourneyStageByMember(memberId: number): Promise<JourneyStage | undefined> {
    return Array.from(this.journeyStages.values()).find(
      stage => stage.memberId === memberId
    );
  }

  async createJourneyStage(stage: InsertJourneyStage): Promise<JourneyStage> {
    const id = this.journeyStageId++;
    const newStage: JourneyStage = {
      ...stage,
      id,
      progressPercentage: stage.progressPercentage || 0,
      milestonesCompleted: stage.milestonesCompleted || null,
      nextMilestone: stage.nextMilestone || null,
      estimatedCompletion: stage.estimatedCompletion || null,
      transitionCriteria: stage.transitionCriteria || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.journeyStages.set(id, newStage);
    return newStage;
  }

  async updateJourneyStage(id: number, updates: Partial<JourneyStage>): Promise<JourneyStage> {
    const stage = this.journeyStages.get(id);
    if (!stage) {
      throw new Error(`Journey stage with ID ${id} not found`);
    }

    const updatedStage: JourneyStage = {
      ...stage,
      ...updates,
      updatedAt: new Date()
    };

    this.journeyStages.set(id, updatedStage);
    return updatedStage;
  }

  // Recommendation History
  async getRecommendationHistory(id: number): Promise<RecommendationHistory | undefined> {
    return this.recommendationHistory.get(id);
  }

  async getActiveRecommendations(memberId: number, limit?: number): Promise<RecommendationHistory[]> {
    let recommendations = Array.from(this.recommendationHistory.values())
      .filter(rec =>
        rec.memberId === memberId &&
        (!rec.validUntil || new Date(rec.validUntil) > new Date())
      )
      .sort((a, b) => new Date(b.shownAt).getTime() - new Date(a.shownAt).getTime());

    if (limit) {
      recommendations = recommendations.slice(0, limit);
    }

    return recommendations;
  }

  async getRecommendationsByType(memberId: number, type: string, limit?: number): Promise<RecommendationHistory[]> {
    let recommendations = Array.from(this.recommendationHistory.values())
      .filter(rec => rec.memberId === memberId && rec.recommendationType === type)
      .sort((a, b) => new Date(b.shownAt).getTime() - new Date(a.shownAt).getTime());

    if (limit) {
      recommendations = recommendations.slice(0, limit);
    }

    return recommendations;
  }

  async createRecommendationHistory(recommendation: InsertRecommendationHistory): Promise<RecommendationHistory> {
    const id = this.recommendationHistoryId++;
    const newRecommendation: RecommendationHistory = {
      ...recommendation,
      id,
      priority: recommendation.priority || 0,
      validUntil: recommendation.validUntil || null,
      memberResponse: recommendation.memberResponse || null,
      responseDate: recommendation.responseDate || null,
      feedbackRating: recommendation.feedbackRating || null,
      feedbackText: recommendation.feedbackText || null,
      effectiveness: recommendation.effectiveness || null,
      shownAt: recommendation.shownAt || new Date(),
      createdAt: new Date()
    };
    this.recommendationHistory.set(id, newRecommendation);
    return newRecommendation;
  }

  async updateRecommendationFeedback(id: number, updates: Partial<RecommendationHistory>): Promise<RecommendationHistory> {
    const recommendation = this.recommendationHistory.get(id);
    if (!recommendation) {
      throw new Error(`Recommendation history with ID ${id} not found`);
    }

    const updatedRecommendation: RecommendationHistory = {
      ...recommendation,
      ...updates
    };

    this.recommendationHistory.set(id, updatedRecommendation);
    return updatedRecommendation;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Enhanced Claims Processing Methods Implementation

  // Claim Adjudication Results
  async getClaimAdjudicationResults(): Promise<ClaimAdjudicationResult[]> {
    return Array.from(this.claimAdjudicationResults.values());
  }

  async getClaimAdjudicationResult(id: number): Promise<ClaimAdjudicationResult | undefined> {
    return this.claimAdjudicationResults.get(id);
  }

  async getClaimAdjudicationResultsByClaim(claimId: number): Promise<ClaimAdjudicationResult[]> {
    return Array.from(this.claimAdjudicationResults.values()).filter(
      result => result.claimId === claimId
    );
  }

  async createClaimAdjudicationResult(result: InsertClaimAdjudicationResult): Promise<ClaimAdjudicationResult> {
    const id = this.claimAdjudicationResultId++;
    const newResult: ClaimAdjudicationResult = {
      ...result,
      id,
      adjudicationDate: result.adjudicationDate || new Date(),
      createdAt: new Date()
    };
    this.claimAdjudicationResults.set(id, newResult);
    return newResult;
  }

  // Medical Necessity Validations
  async getMedicalNecessityValidations(): Promise<MedicalNecessityValidation[]> {
    return Array.from(this.medicalNecessityValidations.values());
  }

  async getMedicalNecessityValidation(id: number): Promise<MedicalNecessityValidation | undefined> {
    return this.medicalNecessityValidations.get(id);
  }

  async getMedicalNecessityValidationsByClaim(claimId: number): Promise<MedicalNecessityValidation[]> {
    return Array.from(this.medicalNecessityValidations.values()).filter(
      validation => validation.claimId === claimId
    );
  }

  async createMedicalNecessityResult(validation: InsertMedicalNecessityValidation): Promise<MedicalNecessityValidation> {
    const id = this.medicalNecessityValidationId++;
    const newValidation: MedicalNecessityValidation = {
      ...validation,
      id,
      createdAt: new Date()
    };
    this.medicalNecessityValidations.set(id, newValidation);
    return newValidation;
  }

  // Fraud Detection Results
  async getFraudDetectionResults(): Promise<FraudDetectionResult[]> {
    return Array.from(this.fraudDetectionResults.values());
  }

  async getFraudDetectionResult(id: number): Promise<FraudDetectionResult | undefined> {
    return this.fraudDetectionResults.get(id);
  }

  async getFraudDetectionResultsByClaim(claimId: number): Promise<FraudDetectionResult[]> {
    return Array.from(this.fraudDetectionResults.values()).filter(
      result => result.claimId === claimId
    );
  }

  async createFraudDetectionResult(result: InsertFraudDetectionResult): Promise<FraudDetectionResult> {
    const id = this.fraudDetectionResultId++;
    const newResult: FraudDetectionResult = {
      ...result,
      id,
      detectionDate: result.detectionDate || new Date(),
      createdAt: new Date()
    };
    this.fraudDetectionResults.set(id, newResult);
    return newResult;
  }

  // Explanation of Benefits
  async getExplanationOfBenefits(): Promise<ExplanationOfBenefits[]> {
    return Array.from(this.explanationOfBenefits.values());
  }

  async getExplanationOfBenefits(id: number): Promise<ExplanationOfBenefits | undefined> {
    return this.explanationOfBenefits.get(id);
  }

  async getExplanationOfBenefitsByClaim(claimId: number): Promise<ExplanationOfBenefits[]> {
    return Array.from(this.explanationOfBenefits.values()).filter(
      eob => eob.claimId === claimId
    );
  }

  async getExplanationOfBenefitsByMember(memberId: number): Promise<ExplanationOfBenefits[]> {
    return Array.from(this.explanationOfBenefits.values()).filter(
      eob => eob.memberId === memberId
    );
  }

  async createExplanationOfBenefits(eob: InsertExplanationOfBenefits): Promise<ExplanationOfBenefits> {
    const id = this.explanationOfBenefitsId++;
    const newEOB: ExplanationOfBenefits = {
      ...eob,
      id,
      eobDate: eob.eobDate || new Date(),
      createdAt: new Date()
    };
    this.explanationOfBenefits.set(id, newEOB);
    return newEOB;
  }

  // Claim Audit Trails
  async getClaimAuditTrails(): Promise<ClaimAuditTrail[]> {
    return Array.from(this.claimAuditTrails.values());
  }

  async getClaimAuditTrail(id: number): Promise<ClaimAuditTrail | undefined> {
    return this.claimAuditTrails.get(id);
  }

  async getClaimAuditTrailsByClaim(claimId: number): Promise<ClaimAuditTrail[]> {
    return Array.from(this.claimAuditTrails.values())
      .filter(trail => trail.claimId === claimId)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }

  async createClaimAuditTrail(audit: InsertClaimAuditTrail): Promise<ClaimAuditTrail> {
    const id = this.claimAuditTrailId++;
    const newAudit: ClaimAuditTrail = {
      ...audit,
      id,
      eventDate: audit.eventDate || new Date(),
      createdAt: new Date()
    };
    this.claimAuditTrails.set(id, newAudit);
    return newAudit;
  }

  // Benefit Utilization
  async getBenefitUtilization(): Promise<BenefitUtilization[]> {
    return Array.from(this.benefitUtilization.values());
  }

  async getBenefitUtilizationById(id: number): Promise<BenefitUtilization | undefined> {
    return this.benefitUtilization.get(id);
  }

  async getBenefitUtilizationByMember(memberId: number): Promise<BenefitUtilization[]> {
    return Array.from(this.benefitUtilization.values()).filter(
      utilization => utilization.memberId === memberId
    );
  }

  async getBenefitUtilizationByMemberAndBenefit(memberId: number, benefitId: number): Promise<BenefitUtilization | undefined> {
    return Array.from(this.benefitUtilization.values()).find(
      utilization => utilization.memberId === memberId && utilization.benefitId === benefitId
    );
  }

  async createBenefitUtilization(utilization: InsertBenefitUtilization): Promise<BenefitUtilization> {
    const id = this.benefitUtilizationId++;
    const newUtilization: BenefitUtilization = {
      ...utilization,
      id,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    this.benefitUtilization.set(id, newUtilization);
    return newUtilization;
  }

  async updateBenefitUtilization(id: number, usedAmount: number): Promise<BenefitUtilization> {
    const utilization = this.benefitUtilization.get(id);
    if (!utilization) {
      throw new Error(`Benefit utilization with ID ${id} not found`);
    }

    const updatedUtilization: BenefitUtilization = {
      ...utilization,
      usedAmount,
      lastUpdated: new Date()
    };

    // Recalculate remaining amount and percentage
    if (utilization.limitAmount) {
      updatedUtilization.remainingAmount = Math.max(0, utilization.limitAmount - usedAmount);
      updatedUtilization.utilizationPercentage = (usedAmount / utilization.limitAmount) * 100;
    }

    this.benefitUtilization.set(id, updatedUtilization);
    return updatedUtilization;
  }

  // Card Management System Implementation

  // Initialize Card Management Storage
  private initializeCardManagement() {
    // Initialize card management storage if not already done
    if (!this.memberCards) {
      this.memberCards = new Map();
      this.cardTemplates = new Map();
      this.cardVerificationEvents = new Map();
      this.cardProductionBatches = new Map();
    }
  }

  // Member Cards
  async getMemberCards(): Promise<MemberCard[]> {
    return Array.from(this.memberCards.values());
  }

  async getMemberCard(id: number): Promise<MemberCard | undefined> {
    return this.memberCards.get(id);
  }

  async getMemberCardsByMember(memberId: number): Promise<MemberCard[]> {
    return Array.from(this.memberCards.values()).filter(
      card => card.memberId === memberId
    );
  }

  async getMemberCardsByStatus(status: string): Promise<MemberCard[]> {
    return Array.from(this.memberCards.values()).filter(
      card => card.cardStatus === status
    );
  }

  async getActiveMemberCards(memberId: number): Promise<MemberCard[]> {
    return Array.from(this.memberCards.values()).filter(
      card => card.memberId === memberId && card.cardStatus === 'active'
    );
  }

  async createMemberCard(card: InsertMemberCard): Promise<MemberCard> {
    const id = this.memberCardId++;
    const newCard: MemberCard = {
      ...card,
      id,
      issuedAt: new Date(),
      expiresAt: card.expiresAt || new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years default
      lastUsedAt: null,
      deactivatedAt: null,
      deactivationReason: null,
      replacedByCardId: null,
      qrCodeData: card.qrCodeData || this.generateQRCodeData(id),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.memberCards.set(id, newCard);
    return newCard;
  }

  async updateMemberCard(id: number, updates: Partial<MemberCard>): Promise<MemberCard> {
    const card = this.memberCards.get(id);
    if (!card) {
      throw new Error(`Member card with ID ${id} not found`);
    }

    const updatedCard: MemberCard = {
      ...card,
      ...updates,
      updatedAt: new Date()
    };

    this.memberCards.set(id, updatedCard);
    return updatedCard;
  }

  async deactivateMemberCard(id: number, reason: string): Promise<MemberCard> {
    const card = this.memberCards.get(id);
    if (!card) {
      throw new Error(`Member card with ID ${id} not found`);
    }

    const updatedCard: MemberCard = {
      ...card,
      cardStatus: 'inactive',
      deactivatedAt: new Date(),
      deactivationReason: reason,
      updatedAt: new Date()
    };

    this.memberCards.set(id, updatedCard);
    return updatedCard;
  }

  async replaceMemberCard(id: number, newCardData: InsertMemberCard): Promise<{ oldCard: MemberCard, newCard: MemberCard }> {
    const oldCard = this.memberCards.get(id);
    if (!oldCard) {
      throw new Error(`Member card with ID ${id} not found`);
    }

    // Deactivate the old card
    const deactivatedOldCard = await this.deactivateMemberCard(id, 'card_replacement');

    // Create the new card
    const newCard = await this.createMemberCard({
      ...newCardData,
      memberId: oldCard.memberId,
      cardType: oldCard.cardType
    });

    // Update old card to reference the replacement
    await this.updateMemberCard(id, { replacedByCardId: newCard.id });

    return {
      oldCard: deactivatedOldCard,
      newCard
    };
  }

  // Card Templates
  async getCardTemplates(): Promise<CardTemplate[]> {
    return Array.from(this.cardTemplates.values());
  }

  async getCardTemplate(id: number): Promise<CardTemplate | undefined> {
    return this.cardTemplates.get(id);
  }

  async getCardTemplatesByCompany(companyId: number): Promise<CardTemplate[]> {
    return Array.from(this.cardTemplates.values()).filter(
      template => template.companyId === companyId
    );
  }

  async getCardTemplatesByType(templateType: string): Promise<CardTemplate[]> {
    return Array.from(this.cardTemplates.values()).filter(
      template => template.templateType === templateType
    );
  }

  async getActiveCardTemplates(): Promise<CardTemplate[]> {
    return Array.from(this.cardTemplates.values()).filter(
      template => template.isActive
    );
  }

  async createCardTemplate(template: InsertCardTemplate): Promise<CardTemplate> {
    const id = this.cardTemplateId++;
    const newTemplate: CardTemplate = {
      ...template,
      id,
      isActive: template.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cardTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateCardTemplate(id: number, updates: Partial<CardTemplate>): Promise<CardTemplate> {
    const template = this.cardTemplates.get(id);
    if (!template) {
      throw new Error(`Card template with ID ${id} not found`);
    }

    const updatedTemplate: CardTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.cardTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deactivateCardTemplate(id: number): Promise<CardTemplate> {
    const template = this.cardTemplates.get(id);
    if (!template) {
      throw new Error(`Card template with ID ${id} not found`);
    }

    const updatedTemplate: CardTemplate = {
      ...template,
      isActive: false,
      updatedAt: new Date()
    };

    this.cardTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  // Card Verification Events
  async getCardVerificationEvents(): Promise<CardVerificationEvent[]> {
    return Array.from(this.cardVerificationEvents.values());
  }

  async getCardVerificationEvent(id: number): Promise<CardVerificationEvent | undefined> {
    return this.cardVerificationEvents.get(id);
  }

  async getCardVerificationEventsByCard(cardId: number): Promise<CardVerificationEvent[]> {
    return Array.from(this.cardVerificationEvents.values()).filter(
      event => event.cardId === cardId
    ).sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
  }

  async getCardVerificationEventsByMember(memberId: number): Promise<CardVerificationEvent[]> {
    return Array.from(this.cardVerificationEvents.values()).filter(
      event => event.memberId === memberId
    ).sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
  }

  async getCardVerificationEventsByDateRange(startDate: Date, endDate: Date): Promise<CardVerificationEvent[]> {
    return Array.from(this.cardVerificationEvents.values()).filter(
      event => {
        const eventDate = new Date(event.verifiedAt);
        return eventDate >= startDate && eventDate <= endDate;
      }
    ).sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
  }

  async createCardVerificationEvent(event: InsertCardVerificationEvent): Promise<CardVerificationEvent> {
    const id = this.cardVerificationEventId++;
    const newEvent: CardVerificationEvent = {
      ...event,
      id,
      verifiedAt: event.verifiedAt || new Date(),
      createdAt: new Date()
    };
    this.cardVerificationEvents.set(id, newEvent);
    return newEvent;
  }

  // Card Production Batches
  async getCardProductionBatches(): Promise<CardProductionBatch[]> {
    return Array.from(this.cardProductionBatches.values());
  }

  async getCardProductionBatch(id: number): Promise<CardProductionBatch | undefined> {
    return this.cardProductionBatches.get(id);
  }

  async getCardProductionBatchesByStatus(status: string): Promise<CardProductionBatch[]> {
    return Array.from(this.cardProductionBatches.values()).filter(
      batch => batch.batchStatus === status
    );
  }

  async getCardProductionBatchesByDateRange(startDate: Date, endDate: Date): Promise<CardProductionBatch[]> {
    return Array.from(this.cardProductionBatches.values()).filter(
      batch => {
        const batchDate = new Date(batch.createdAt);
        return batchDate >= startDate && batchDate <= endDate;
      }
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createCardProductionBatch(batch: InsertCardProductionBatch): Promise<CardProductionBatch> {
    const id = this.cardProductionBatchId++;
    const newBatch: CardProductionBatch = {
      ...batch,
      id,
      batchStatus: batch.batchStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cardProductionBatches.set(id, newBatch);
    return newBatch;
  }

  async updateCardProductionBatch(id: number, updates: Partial<CardProductionBatch>): Promise<CardProductionBatch> {
    const batch = this.cardProductionBatches.get(id);
    if (!batch) {
      throw new Error(`Card production batch with ID ${id} not found`);
    }

    const updatedBatch: CardProductionBatch = {
      ...batch,
      ...updates,
      updatedAt: new Date()
    };

    this.cardProductionBatches.set(id, updatedBatch);
    return updatedBatch;
  }

  // Helper Methods for Card Management
  private generateQRCodeData(cardId: number): string {
    // Generate a unique QR code data for the card
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `MC-${cardId}-${timestamp}-${random}`;
  }

  // Method to validate card eligibility and status
  async validateCardForTransaction(cardId: number): Promise<{ valid: boolean; reason?: string }> {
    const card = await this.getMemberCard(cardId);
    if (!card) {
      return { valid: false, reason: 'Card not found' };
    }

    if (card.cardStatus !== 'active') {
      return { valid: false, reason: `Card is ${card.cardStatus}` };
    }

    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      return { valid: false, reason: 'Card has expired' };
    }

    // Validate member eligibility
    const member = await this.getMember(card.memberId);
    if (!member) {
      return { valid: false, reason: 'Member not found' };
    }

    // Check if member is active and in good standing
    // This would integrate with the eligibility engine
    return { valid: true };
  }

  // Method to record card verification for provider use
  async recordCardVerification(
    cardId: number,
    memberId: number,
    providerId: string,
    verificationType: string,
    location?: string,
    deviceInfo?: string
  ): Promise<CardVerificationEvent> {
    return await this.createCardVerificationEvent({
      cardId,
      memberId,
      verifiedBy: providerId,
      verificationType,
      verificationResult: 'success',
      location,
      deviceInfo,
      additionalData: JSON.stringify({
        timestamp: new Date().toISOString(),
        verificationSource: 'provider_portal'
      })
    });
  }
}

import { DatabaseStorage } from './databaseStorage';

// If using DATABASE_URL, use DatabaseStorage, otherwise use MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
