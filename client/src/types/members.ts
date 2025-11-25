// Enhanced Member Types based on the new database schema

// Core Member interface with enhanced fields
export interface Member {
  id: number;
  companyId: number;
  memberType: 'principal' | 'dependent';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;

  // Enhanced demographic fields
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;

  // Member lifecycle fields
  membershipStatus?: 'active' | 'pending' | 'suspended' | 'terminated' | 'expired';
  activationDate?: string;
  suspensionDate?: string;
  terminationDate?: string;
  renewalDate?: string;
  lastRenewalDate?: string;
  nextRenewalDate?: string;

  // Dependent-specific fields
  principalId?: number;
  dependentType?: 'spouse' | 'child' | 'parent' | 'guardian';
  hasDisability?: boolean;
  disabilityDetails?: string;
  relationshipProofDocument?: string;

  // Business-specific fields
  employeeGrade?: string;
  department?: string;
  jobTitle?: string;
  workLocation?: string;

  // System fields
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

// Company interface with enhanced fields
export interface Company {
  id: number;
  name: string;
  registrationNumber: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;

  // Enhanced corporate fields
  clientType: 'individual' | 'corporate' | 'sme' | 'government' | 'education' | 'association';
  billingFrequency: 'monthly' | 'quarterly' | 'annual' | 'pro_rata';
  employerContributionPercentage?: number;
  experienceRatingEnabled: boolean;
  customBenefitStructure: boolean;
  gradeBasedBenefits: boolean;
  registrationExpiryDate?: string;

  // Business-specific fields
  industry?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  isVatRegistered?: boolean;
  taxIdNumber?: string;

  // System fields
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

// Document Management Types
export interface MemberDocument {
  id: number;
  memberId: number;
  documentType: 'kyc' | 'medical' | 'insurance' | 'employment' | 'proof_of_relationship' | 'consent_form' | 'disability_proof';
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  isRequired: boolean;
  expiryDate?: string;
  isVerified: boolean;
  verificationDate?: string;
  verifiedBy?: number;
  uploadedAt: string;
  uploadedBy: number;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
}

// Consent Management Types
export interface MemberConsent {
  id: number;
  memberId: number;
  consentType: 'data_processing' | 'marketing_communications' | 'data_sharing_providers' | 'data_sharing_partners' | 'wellness_programs';
  consentGiven: boolean;
  consentDate: string;
  expiryDate?: string;
  ipAddress: string;
  userAgent: string;
  consentText?: string;
  version: number;
  withdrawnAt?: string;
  withdrawnReason?: string;
  withdrawnBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  entityType: 'member' | 'company' | 'benefit' | 'claim' | 'document' | 'consent';
  entityId: number;
  action: 'create' | 'read' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'access_attempt';
  userId?: number;
  userEmail?: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  riskLevel: 'low' | 'medium' | 'high';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

// Communication Log Types
export interface CommunicationLog {
  id: number;
  memberId?: number;
  companyId?: number;
  communicationType: 'sms' | 'email' | 'whatsapp' | 'mobile_app' | 'postal' | 'phone_call';
  templateId?: number;
  templateName?: string;
  subject?: string;
  message: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string;
  sentBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Life Event Types
export interface MemberLifeEvent {
  id: number;
  memberId: number;
  eventType: 'birth' | 'marriage' | 'divorce' | 'death' | 'job_change' | 'address_change' | 'retirement' | 'new_dependent' | 'dependent_removal';
  eventDate: string;
  description?: string;
  supportingDocuments?: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: number;
  verifiedAt?: string;
  rejectionReason?: string;
  impactOnCoverage?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy?: number;
}

// Employee Grade Types
export interface EmployeeGrade {
  id: number;
  companyId: number;
  gradeName: string;
  gradeCode: string;
  gradeLevel: number;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  benefitMultiplier: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dependent Validation Rules
export interface DependentRule {
  id: number;
  companyId: number;
  dependentType: 'spouse' | 'child' | 'parent' | 'guardian';
  maxAge?: number;
  minAge?: number;
  maxNumberAllowed?: number;
  proofRequired: boolean;
  allowedRelationshipTypes: string[];
  conditions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types for Members
export interface CreateMemberRequest {
  companyId: number;
  memberType: 'principal' | 'dependent';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  principalId?: number;
  dependentType?: 'spouse' | 'child' | 'parent' | 'guardian';
  hasDisability?: boolean;
  disabilityDetails?: string;
  consents?: {
    consentType: string;
    consentGiven: boolean;
  }[];
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  id: number;
}

export interface MemberLifecycleRequest {
  memberId: number;
  action: 'activate' | 'suspend' | 'reinstate' | 'terminate' | 'renew';
  reason?: string;
  effectiveDate?: string;
  notes?: string;
}

export interface BulkMemberRequest {
  companyId: number;
  members: Omit<CreateMemberRequest, 'companyId'>[];
  validateOnly?: boolean;
}

export interface MemberSearchRequest {
  companyId?: number;
  memberType?: 'principal' | 'dependent';
  membershipStatus?: string;
  searchTerm?: string;
  dateOfBirthFrom?: string;
  dateOfBirthTo?: string;
  gender?: string;
  hasDisability?: boolean;
  city?: string;
  country?: string;
  employeeId?: string;
  dependentType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MemberSearchResponse {
  members: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Consent Management API Types
export interface ConsentRequest {
  memberId: number;
  consentType: string;
  consentGiven: boolean;
  consentText?: string;
  expiryDate?: string;
}

export interface BulkConsentRequest {
  memberIds: number[];
  consentType: string;
  action: 'grant' | 'withdraw' | 'renew';
  message?: string;
}

// Document Management API Types
export interface DocumentUploadRequest {
  memberId: number;
  documentType: string;
  documentName: string;
  description?: string;
  isRequired?: boolean;
  expiryDate?: string;
}

export interface DocumentVerificationRequest {
  documentId: number;
  isVerified: boolean;
  notes?: string;
}

// Communication API Types
export interface BulkCommunicationRequest {
  recipientType: 'all_members' | 'company_members' | 'specific_members';
  recipientIds?: number[];
  companyId?: number;
  communicationType: string;
  templateId?: number;
  subject?: string;
  message: string;
  scheduledFor?: string;
}

// Dashboard Statistics Types
export interface DashboardStats {
  totalCompanies: number;
  activeMembers: number;
  principalMembers: number;
  dependents: number;
  activePremiums: number;
  documentsProcessed: number;
  consentCoverage: number;
  recentRegistrations: {
    id: number;
    companyId: number;
    companyName: string;
    memberName: string;
    memberEmail: string;
    memberType: 'principal' | 'dependent';
    dependentType?: string;
    principalName?: string;
    membershipStatus?: string;
    documentCount?: number;
    consentCoverage?: number;
    city?: string;
    createdAt: string;
  }[];
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface MemberApiError {
  error: string;
  message: string;
  validationErrors?: ValidationError[];
  statusCode: number;
}

// Utility Types
export type MemberStatus = Member['membershipStatus'];
export type DependentType = Member['dependentType'];
export type DocumentType = MemberDocument['documentType'];
export type ConsentType = MemberConsent['consentType'];
export type CommunicationType = CommunicationLog['communicationType'];