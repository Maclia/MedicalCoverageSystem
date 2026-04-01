/**
 * Frontend API Configuration
 * Centralized API endpoint management for React components
 */

// API Base URL - uses environment variable or defaults to localhost
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Create a full API URL from an endpoint
 */
export const createApiUrl = (endpoint: string): string => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};

/**
 * API Endpoints - organized by service domain
 * All endpoints go through the API Gateway
 */
export const API_ENDPOINTS = {
  // Core Service Endpoints
  core: {
    members: '/api/core/members',
    memberById: (id: number) => `/api/core/members/${id}`,
    companies: '/api/core/companies',
    companyById: (id: number) => `/api/core/companies/${id}`,
    cards: '/api/core/cards',
  },

  // Billing Service Endpoints
  billing: {
    invoices: '/api/billing/invoices',
    invoiceById: (id: number) => `/api/billing/invoices/${id}`,
    payments: '/api/billing/payments',
    paymentById: (id: number) => `/api/billing/payments/${id}`,
    paymentMethods: '/api/billing/payment-methods',
  },

  // CRM Service Endpoints
  crm: {
    leads: '/api/crm/leads',
    leadById: (id: number) => `/api/crm/leads/${id}`,
    agents: '/api/crm/agents',
    agentById: (id: number) => `/api/crm/agents/${id}`,
    commissions: '/api/crm/commissions',
  },

  // Insurance Service Endpoints
  insurance: {
    policies: '/api/insurance/policies',
    policyById: (id: number) => `/api/insurance/policies/${id}`,
    claims: '/api/insurance/claims',
    claimById: (id: number) => `/api/insurance/claims/${id}`,
    benefitPlans: '/api/insurance/benefit-plans',
  },

  // Finance Service Endpoints
  finance: {
    transactions: '/api/finance/transactions',
    transactionById: (id: number) => `/api/finance/transactions/${id}`,
    reports: '/api/finance/reports',
    ledger: '/api/finance/ledger',
    settlements: '/api/finance/settlements',
  },

  // Membership Service Endpoints
  membership: {
    memberships: '/api/membership/memberships',
    membershipById: (id: number) => `/api/membership/memberships/${id}`,
    enrollments: '/api/membership/enrollments',
    renewals: '/api/membership/renewals',
  },

  // Hospital Service Endpoints
  hospital: {
    hospitals: '/api/hospital/hospitals',
    hospitalById: (id: number) => `/api/hospital/hospitals/${id}`,
    departments: '/api/hospital/departments',
    providers: '/api/hospital/providers',
  },

  // Wellness Service Endpoints
  wellness: {
    programs: '/api/wellness/programs',
    programById: (id: number) => `/api/wellness/programs/${id}`,
    incentives: '/api/wellness/incentives',
    participants: '/api/wellness/participants',
  },

  // System Endpoints
  system: {
    health: '/health',
    systemHealth: '/api/system/health',
    status: '/api/system/status',
    version: '/api/system/version',
    serviceRegistry: '/api/system/services',
  },

  // Authentication Endpoints
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    profile: '/api/auth/profile',
    verify: '/api/auth/verify',
  },
} as const;

/**
 * Service URLs for direct service communication (internal use)
 */
export const SERVICE_URLS = {
  apiGateway: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  core: import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:3003',
  billing: import.meta.env.VITE_BILLING_SERVICE_URL || 'http://localhost:3002',
  crm: import.meta.env.VITE_CRM_SERVICE_URL || 'http://localhost:3005',
  insurance: import.meta.env.VITE_INSURANCE_SERVICE_URL || 'http://localhost:3008',
  hospital: import.meta.env.VITE_HOSPITAL_SERVICE_URL || 'http://localhost:3007',
  finance: import.meta.env.VITE_FINANCE_SERVICE_URL || 'http://localhost:3004',
  membership: import.meta.env.VITE_MEMBERSHIP_SERVICE_URL || 'http://localhost:3006',
  wellness: import.meta.env.VITE_WELLNESS_SERVICE_URL || 'http://localhost:3009',
} as const;

/**
 * Get the API endpoint URL
 */
export const getApiUrl = (endpoint: keyof typeof API_ENDPOINTS | string): string => {
  if (typeof endpoint === 'function') {
    return createApiUrl(endpoint);
  }
  return createApiUrl(endpoint as string);
};

/**
 * Verify API connectivity
 */
export const verifyApiConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch(createApiUrl(API_ENDPOINTS.system.health), {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    console.error('API connectivity check failed:', error);
    return false;
  }
};
