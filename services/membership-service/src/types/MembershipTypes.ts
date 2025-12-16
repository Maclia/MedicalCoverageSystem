import { z } from 'zod';

// Validation schemas
export const createMemberSchema = z.object({
  companyId: z.number().positive(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^254[7]\d{8}$/),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  nationalId: z.string().regex(/^\d{8}$/).optional(),
  passportNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Kenya'),
  employeeId: z.string().min(1),
  memberType: z.enum(['principal', 'dependent']),
  principalId: z.number().optional(),
  dependentType: z.enum(['spouse', 'child', 'parent']).optional(),
  hasDisability: z.boolean().default(false),
  disabilityDetails: z.string().optional(),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(true),
    push: z.boolean().default(false),
    whatsapp: z.boolean().default(false)
  }).optional(),
  source: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export const suspendMemberSchema = z.object({
  reason: z.string().min(5, 'Suspension reason must be at least 5 characters'),
  notes: z.string().optional()
});

export const renewMemberSchema = z.object({
  renewalDate: z.string().datetime(),
  newBenefitPackage: z.number().optional(),
  notes: z.string().optional()
});

export const bulkUpdateSchema = z.object({
  memberIds: z.array(z.number()).min(1, 'At least one member ID is required'),
  updateType: z.enum(['suspend', 'activate', 'terminate', 'renew']),
  updateData: z.record(z.any())
});

export const searchMembersSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    companyId: z.number().optional(),
    membershipStatus: z.enum(['pending', 'active', 'suspended', 'terminated', 'expired']).optional(),
    memberType: z.enum(['principal', 'dependent']).optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other']).optional()
  }).optional(),
  pagination: z.object({
    page: z.number().positive().default(1),
    limit: z.number().positive().max(100).default(20)
  }).optional()
});

export const memberSearchRequestSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    companyId: z.number().optional(),
    membershipStatus: z.enum(['pending', 'active', 'suspended', 'terminated', 'expired']).optional(),
    memberType: z.enum(['principal', 'dependent']).optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other']).optional()
  }).optional(),
  pagination: z.object({
    page: z.number().positive().default(1),
    limit: z.number().positive().max(100).default(20)
  }).optional()
});

// Request types
export interface CreateMemberRequest {
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  employeeId: string;
  memberType: 'principal' | 'dependent';
  principalId?: number;
  dependentType?: 'spouse' | 'child' | 'parent';
  hasDisability?: boolean;
  disabilityDetails?: string;
  communicationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  };
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
}

export interface MemberSearchRequest {
  query?: string;
  filters?: {
    companyId?: number;
    membershipStatus?: 'pending' | 'active' | 'suspended' | 'completed' | 'terminated' | 'expired';
    memberType?: 'principal' | 'dependent';
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
}

export interface BulkMemberUpdateRequest {
  memberIds: number[];
  updateType: 'suspend' | 'activate' | 'terminate' | 'renew';
  updateData: {
    reason?: string;
    notes?: string;
    renewalDate?: string;
    [key: string]: any;
  };
}

export interface MemberLifecycleEventRequest {
  memberId: number;
  eventType: 'enrollment' | 'activation' | 'suspension' | 'reinstatement' | 'termination' | 'renewal' | 'benefit_change' | 'coverage_update';
  eventDate: Date;
  previousStatus?: string;
  newStatus?: string;
  reason: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface DocumentUploadRequest {
  memberId: number;
  documentType: 'national_id' | 'passport' | 'birth_certificate' | 'marriage_certificate' | 'employment_letter' | 'medical_report' | 'student_letter' | 'disability_certificate' | 'income_proof' | 'address_proof' | 'other';
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiresAt?: string;
}

export interface MemberNotificationRequest {
  memberId: number;
  communicationType: 'enrollment_confirmation' | 'suspension_notice' | 'termination_notice' | 'renewal_notification' | 'benefit_update' | 'policy_update';
  channel?: 'email' | 'sms' | 'push' | 'whatsapp';
  subject?: string;
  content: string;
  recipient?: string;
}

export interface MemberStatsRequest {
  companyId?: number;
  membershipStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MemberEligibilityRequest {
  memberId: number;
  benefitId?: number;
  coverageType?: string;
  serviceType?: string;
}

// Response types
export interface MemberResponse {
  success: boolean;
  data?: any;
  message?: string;
  timestamp: string;
  error?: string;
  details?: any;
}

export interface PaginatedResponse {
  success: boolean;
  data?: any;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  timestamp: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime?: number;
  version?: string;
  checks?: {
    database?: 'healthy' | 'unhealthy';
    cache?: 'healthy' | 'unhealthy';
    memory?: {
      used?: number;
      total?: number;
      percentage?: number;
    };
  };
}