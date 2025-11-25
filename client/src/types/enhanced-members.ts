// Enhanced TypeScript interfaces for Members & Clients Module
// Complete type definitions for all enhanced functionality

export interface Member {
  id: number;
  companyId: number;
  memberType: "principal" | "dependent";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  // Enhanced fields for Members & Clients module
  gender?: "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  status: "active" | "pending" | "suspended" | "terminated" | "expired";
  enrollmentDate?: string;
  terminationDate?: string;
  renewalDate?: string;
  lastSuspensionDate?: string;
  suspensionReason?: string;
  deathDate?: string;
  deathCertificateNumber?: string;
  beneficiaryName?: string;
  beneficiaryRelationship?: string;
  beneficiaryContact?: string;
  // Relationships
  principalId?: number;
  dependentType?: "spouse" | "child" | "parent" | "guardian";
  hasDisability?: boolean;
  disabilityDetails?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  registrationNumber: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  // Enhanced company fields
  clientType: "individual" | "corporate" | "sme" | "government" | "education" | "association";
  billingFrequency: "monthly" | "quarterly" | "annual" | "pro_rata";
  employerContributionPercentage?: number;
  experienceRatingEnabled?: boolean;
  customBenefitStructure?: boolean;
  gradeBasedBenefits?: boolean;
  registrationExpiryDate?: Date;
  isVatRegistered?: boolean;
  taxIdNumber?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface MemberLifeEvent {
  id: number;
  memberId: number;
  eventType: "enrollment" | "activation" | "suspension" | "upgrade" | "downgrade" | "renewal" | "transfer" | "termination" | "reinstatement" | "death";
  eventDate: Date;
  description?: string;
  oldValues?: string;
  newValues?: string;
  effectiveDate?: Date;
  processedBy: number;
  createdAt: string;
}

export interface DependentRule {
  id: number;
  companyId: number;
  dependentType: "spouse" | "child" | "parent" | "guardian";
  maxAge?: number;
  maxCount?: number;
  documentationRequired?: string[]; // JSON array of required documents
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeGrade {
  id: number;
  companyId: number;
  gradeCode: string;
  gradeName: string;
  level: number;
  description?: string;
  createdAt: string;
}

export interface MemberDocument {
  id: number;
  memberId: number;
  documentType: "national_id" | "passport" | "birth_certificate" | "marriage_certificate" | "employment_letter" | "medical_report" | "student_letter" | "government_id" | "proof_of_address" | "insurance_card" | "dependent_document" | "other";
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  expiresAt?: Date;
  isActive: boolean;
  uploadedBy?: number;
}

export interface CommunicationLog {
  id: number;
  memberId?: number;
  companyId?: number;
  communicationType: "enrollment_confirmation" | "renewal_notification" | "card_generation" | "pre_auth_update" | "limit_reminder" | "payment_due" | "suspension_notice" | "termination_notice";
  channel: "sms" | "email" | "mobile_app" | "postal" | "provider_notification";
  recipient?: string;
  subject?: string;
  content: string;
  sentAt: string;
  deliveryStatus: "pending" | "sent" | "delivered" | "failed" | "bounced";
  errorMessage?: string;
  templateId?: number;
}

export interface MemberConsent {
  id: number;
  memberId: number;
  consentType: "data_processing" | "marketing_communications" | "data_sharing_providers" | "data_sharing_partners" | "wellness_programs";
  consentGiven: boolean;
  consentDate: string;
  expiryDate?: Date;
  ipAddress?: string;
  userAgent?: string;
  documentVersion?: string;
  withdrawnAt?: Date;
  withdrawnReason?: string;
}

export interface AuditLog {
  id: number;
  entityType: "member" | "company" | "benefit" | "claim" | "document";
  entityId: number;
  action: "create" | "read" | "update" | "delete" | "view";
  oldValues?: string; // JSON
  newValues?: string; // JSON
  performedBy?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  description?: string;
}

// Wellness Module Interfaces
export interface WellnessActivity {
  id: number;
  memberId: number;
  activityType: "exercise" | "health_screening" | "vaccination" | "checkup" | "nutrition" | "score_update";
  wellnessScore?: number;
  duration?: number; // Duration in minutes
  calories?: number;
  steps?: number;
  heartRate?: number;
  activityDate: Date;
  notes?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  id: number;
  memberId: number;
  riskScore: number; // 0-100
  riskCategory: "low" | "medium" | "high" | "very_high";
  assessmentDate: Date;
  nextReviewDate?: Date;
  factors?: string; // JSON object
  recommendations?: string; // JSON array
  assessorId?: number;
  assessmentType: "initial" | "periodic" | "event_based";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Provider Module Interfaces
export interface Provider {
  id: number;
  name: string;
  providerCode: string;
  networkStatus: "active" | "inactive" | "pending" | "suspended";
  specialties: string[];
  locations: string[];
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  contractStatus: "draft" | "active" | "expired" | "terminated" | "renewal_pending";
  contractType: "standard" | "capitated" | "fee_for_service";
  reimbursementRate: number; // Percentage
  capitationRate?: number; // Monthly rate per member
  contractStartDate?: Date;
  contractEndDate?: Date;
  networkTier: "tier_1" | "tier_2" | "tier_3" | "premium" | "basic" | "standard";
  participationLevel: "full" | "partial" | "limited";
  qualityScore: number; // 0-5 quality rating
  complianceScore: number; // 0-5 compliance rating
  satisfactionScore: number; // 0-5 patient satisfaction
  accreditationNumber?: string;
  licenseNumber: string;
  licenseExpiryDate?: Date;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Enhanced Claims Interface
export interface Claim {
  id: number;
  claimNumber: string; // Unique claim identifier
  institutionId: number;
  personnelId: number;
  providerId: number; // Link to providers table
  memberId: number;
  schemeId: number; // Link to schemes table
  benefitId: number;
  claimDate: string;
  serviceDate: string;
  // Enhanced fields for integration
  memberName: string; // Denormalized for easier integration
  serviceType: string; // Service type categorization
  totalAmount: number; // Total claim amount
  approvedAmount: number; // Approved amount after adjudication
  coveredAmount: number; // Amount covered by insurance
  patientAmount: number; // Patient responsibility amount
  procedureCode?: string; // Medical procedure code
  preAuthRequired: boolean;
  preAuthApproved: boolean;
  preAuthNumber?: string;
  // Original fields
  amount: number;
  description: string;
  diagnosis: string;
  diagnosisCode: string; // ICD-10 or ICD-11 code
  diagnosisCodeType: string; // Type of diagnosis code
  treatmentDetails?: string;
  status: "submitted" | "under_review" | "approved" | "rejected" | "paid" | "fraud_review" | "fraud_confirmed";
  reviewDate?: string;
  reviewerNotes?: string;
  paymentDate?: string;
  paymentReference?: string;
  // Provider verification fields
  providerVerified: boolean;
  requiresHigherApproval: boolean;
  approvedByAdmin: boolean;
  adminApprovalDate?: string;
  adminReviewNotes?: string;
  // Fraud detection fields
  fraudRiskLevel: "none" | "low" | "medium" | "high";
  fraudRiskFactors?: string;
  fraudReviewDate?: string;
  fraudReviewerId?: number;
  createdAt: string;
  updatedAt?: string;
}

// Premium Interfaces
export interface Premium {
  id: number;
  memberId: number;
  amount: number;
  currency: string;
  paymentDate?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  dueDate: Date;
  status: "pending" | "paid" | "overdue" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface PremiumCalculation {
  basePremium: number;
  riskAdjustment: {
    score: number;
    multiplier: number;
    adjustment: number;
  };
  wellnessAdjustment: {
    score: number;
    discount: number;
    amount: number;
  };
  schemeAdjustment: {
    multiplier: number;
    adjustment: number;
  };
  calculatedPremium: number;
  currentPremium?: number;
  difference: number;
}

// API Request/Response Types
export interface CreateMemberRequest {
  companyId: number;
  memberType: "principal" | "dependent";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  // Enhanced fields
  gender?: "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  // Dependent specific
  principalId?: number;
  dependentType?: "spouse" | "child" | "parent" | "guardian";
  hasDisability?: boolean;
  disabilityDetails?: string;
  // Consent management
  consents: Array<{
    consentType: string;
    consentGiven: boolean;
  }>;
}

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  membershipStatus?: "active" | "pending" | "suspended" | "terminated" | "expired";
  hasDisability?: boolean;
  disabilityDetails?: string;
}

export interface MemberSearchRequest {
  query?: string;
  companyId?: number;
  membershipStatus?: string;
  memberType?: "principal" | "dependent";
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  page?: number;
  limit?: number;
  sortBy?: "firstName" | "lastName" | "email" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface MemberSearchResponse {
  members: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MemberLifecycleRequest {
  memberId: number;
  action: "activate" | "suspend" | "reinstate" | "terminate" | "renew" | "transfer";
  reason?: string;
  notes?: string;
  effectiveDate?: string;
  terminationDate?: string;
  renewalPeriod?: number;
  newCompanyId?: number;
  beneficiaryInfo?: {
    name: string;
    relationship: string;
    contact: string;
  };
}

export interface BulkMemberRequest {
  companyId: number;
  members: CreateMemberRequest[];
  autoActivate?: boolean;
  sendWelcomeNotifications?: boolean;
}

export interface DocumentUploadRequest {
  documentType: string;
  documentName: string;
  description?: string;
  required?: boolean;
  expiryDate?: string;
  isTemporary?: boolean;
}

export interface DocumentVerificationRequest {
  verified: boolean;
  notes?: string;
  verificationDate: string;
  verifiedBy: number;
}

export interface ConsentRequest {
  consentType: string;
  consentGiven: boolean;
  expiryDate?: string;
}

export interface BulkConsentRequest {
  consentType: string;
  memberIds: number[];
  consentGiven: boolean;
  expiryDate?: string;
}

export interface CommunicationRequest {
  communicationType: string;
  channel: "sms" | "email" | "mobile_app" | "postal" | "provider_notification";
  subject: string;
  content: string;
  recipient?: string;
  templateId?: number;
}

export interface BulkCommunicationRequest {
  communicationType: string;
  channel: "sms" | "email" | "mobile_app" | "postal" | "provider_notification";
  subject: string;
  content: string;
  sendToAllMembers?: boolean;
  memberIds?: number[];
  companyId?: number;
}

export interface DashboardStats {
  totalCompanies: number;
  activeMembers: number;
  principalMembers: number;
  dependents: number;
  activePremiums: number;
  documentsProcessed: number;
  consentCoverage: number;
  recentRegistrations: Array<{
    id: number;
    companyId: number;
    companyName: string;
    memberName: string;
    memberEmail: string;
    memberType: string;
    membershipStatus: string;
    documentCount: number;
    consentCoverage: number;
    city: string;
    createdAt: string;
  }>;
}

// Corporate-specific types
export interface CorporateMemberBulkEnroll {
  companyId: number;
  members: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    employeeId: string;
    memberType: "principal" | "dependent";
    principalId?: number;
    dependentType?: "spouse" | "child" | "parent" | "guardian";
    gender?: "male" | "female" | "other";
    maritalStatus?: "single" | "married" | "divorced" | "widowed";
    nationalId?: string;
    gradeId?: number;
    department?: string;
    jobTitle?: string;
  }>;
  autoActivate?: boolean;
  sendWelcomeNotifications?: boolean;
}

export interface EmployeeGrade {
  gradeCode: string;
  gradeName: string;
  level: number;
  description?: string;
  premiumMultiplier?: number;
  benefitPackage?: string;
}

export interface DependentCoverageRule {
  dependentType: "spouse" | "child" | "parent" | "guardian";
  maxAge?: number;
  maxCount?: number;
  documentationRequired: string[];
  isActive: boolean;
}

export interface BulkOperationResult {
  successful: Array<any>;
  failed: Array<{
    member?: any;
    memberId?: number;
    error: string;
  }>;
  totalProcessed: number;
}

// Integration data types
export interface IntegrationData<T = any> {
  success: boolean;
  data: T;
  message: string;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}