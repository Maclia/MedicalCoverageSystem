/**
 * Pages Index
 * Central export point for all page components
 * Organized by functional domain
 */

// ===== Core Pages =====
export { default as Dashboard } from './Dashboard';
export { default as NotFound } from './not-found';

// ===== Company & Member Management =====
export { default as Companies } from './Companies';
export { default as CompanyDetail } from './CompanyDetail';
export { default as Members } from './Members';
export { default as Dependents } from './Dependents';
export { default as MemberDashboard } from './MemberDashboard';

// ===== Financial Management =====
export { default as Finance } from './Finance';
export { default as Premiums } from './Premiums';
export { default as Periods } from './Periods';

// ===== Benefits & Schemes =====
export { default as Benefits } from './Benefits';
export { default as SchemesManagement } from './SchemesManagement';
export { default as ProviderSchemesManagement } from './ProviderSchemesManagement';

// ===== Claims Management =====
export { default as Claims } from './Claims';
export { ClaimsManagement } from './ClaimsManagement';
export { default as ProviderClaimSubmission } from './ProviderClaimSubmission';

// ===== Provider Network =====
export { default as ProviderNetworkManagement } from './ProviderNetworkManagement';
export { default as ProviderPortal } from './ProviderPortal';
export { default as ProviderVerification } from './ProviderVerification';
export { default as ContractManagement } from './ContractManagement';

// ===== Medical Panel =====
export { default as MedicalInstitutions } from './MedicalInstitutions';
export { default as MedicalPersonnel } from './MedicalPersonnel';
export { default as PanelDocumentation } from './PanelDocumentation';
export { default as Regions } from './Regions';

// ===== Communication & Wellness =====
export { default as Communication } from './Communication';
export { default as Wellness } from './Wellness';
export { default as RiskAssessment } from './RiskAssessment';

// ===== Token Management =====
export { default as TokenPurchasePage } from './tokens/TokenPurchasePage';
export { default as PurchaseHistoryPage } from './tokens/PurchaseHistoryPage';
export { default as BalanceHistoryPage } from './tokens/BalanceHistoryPage';
export { default as SubscriptionManagementPage } from './tokens/SubscriptionManagementPage';
export { default as TokenSettingsPage } from './tokens/TokenSettingsPage';

// ===== CRM =====
export { default as LeadManagement } from './crm/LeadManagement';
export { default as AgentPortal } from './crm/AgentPortal';
