/**
 * API Clients Barrel File
 * Centralized export for all API service clients
 */

export { adminApi } from './adminApi';
export { analyticsApi } from './analyticsApi';
export { benefitsApi } from './benefitsApi';
export { billingApi } from './billingApi';
export { claimsApi } from './claimsApi';
export { communicationApi } from './communicationApi';
export { corporateMembersApi } from './corporateMembersApi';
export { crmApi } from './crmApi';
export { financeApi } from './financeApi';
export { fraudApi } from './fraudApi';
export { hospitalApi } from './hospitalApi';
export { insuranceApi } from './insuranceApi';
export { membersApi } from './membersApi';
export { providersApi } from './providersApi';
export { riskApi } from './riskApi';
export { schemesApi } from './schemesApi';
export { systemIntegrationApi } from './systemIntegrationApi';
export { tokensApi } from './tokensApi';
export { wellnessApi } from './wellnessApi';

// Default export object with all API clients
export const api = {
  admin: adminApi,
  analytics: analyticsApi,
  benefits: benefitsApi,
  billing: billingApi,
  claims: claimsApi,
  communication: communicationApi,
  corporateMembers: corporateMembersApi,
  crm: crmApi,
  finance: financeApi,
  fraud: fraudApi,
  hospital: hospitalApi,
  insurance: insuranceApi,
  members: membersApi,
  providers: providersApi,
  risk: riskApi,
  schemes: schemesApi,
  systemIntegration: systemIntegrationApi,
  tokens: tokensApi,
  wellness: wellnessApi,
};

export default api;