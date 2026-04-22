/**
 * API Clients Barrel File
 * Centralized export for all API service clients
 */

import * as adminApi from './adminApi';
import { analyticsApi } from './analyticsApi';
import * as benefitsApi from './benefitsApi';
import { billingApi } from './billingApi';
import { claimsApi } from './claimsApi';
import { communicationApi } from './communicationApi';
import { corporateMembersAPI as corporateMembersApi } from './corporateMembersApi';
import { crmApi } from './crmApi';
import financeApi from './financeApi';
import { fraudApi } from './fraudApi';
import { hospitalApi } from './hospitalApi';
import { insuranceApi } from './insuranceApi';
import * as membershipApi from './memberApi';
import { membersAPI as membersApi } from './membersApi';
import { providersApi } from './providersApi';
import { riskApi } from './riskApi';
import { schemesAPI as schemesApi } from './schemesApi';
import { systemIntegrationAPI as systemIntegrationApi } from './systemIntegrationApi';
import { tokensAPI as tokensApi } from './tokensApi';
import { wellnessApi } from './wellnessApi';

export {
  adminApi,
  analyticsApi,
  benefitsApi,
  billingApi,
  claimsApi,
  communicationApi,
  corporateMembersApi,
  crmApi,
  financeApi,
  fraudApi,
  hospitalApi,
  insuranceApi,
  membershipApi,
  membersApi,
  providersApi,
  riskApi,
  schemesApi,
  systemIntegrationApi,
  tokensApi,
  wellnessApi,
};

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
  membership: membershipApi,
  members: membersApi,
  providers: providersApi,
  risk: riskApi,
  schemes: schemesApi,
  systemIntegration: systemIntegrationApi,
  tokens: tokensApi,
  wellness: wellnessApi,
};

export default api;
