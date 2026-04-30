/**
 * Pages Index
 * Central export point for routable screens and feature entry components.
 */

// Core pages
export { default as Login } from './Login';
export { default as NotFound } from './not-found';

// Dashboards
export { default as Dashboard } from '../features/dashboards/Dashboard';
export { default as InsuranceDashboard } from '../features/dashboards/InsuranceDashboard';
export { default as InstitutionDashboard } from '../features/dashboards/InstitutionDashboard';
export { default as ProviderDashboard } from '../features/dashboards/ProviderDashboard';

// Company and member management
export { default as Companies } from '../features/companies/components/Companies';
export { default as CompanyDetail } from '../features/companies/components/CompanyDetail';
export { default as Members } from '../features/members/Members';
export { default as MemberDashboard } from '../features/members/MemberDashboard';
export { default as Dependents } from '../features/members/Dependents';

// Financial management
export { default as Finance } from '../features/finance/components/Finance';
export { default as Premiums } from '../features/premiums/components/Premiums';
export { default as Periods } from '../features/periods/components/Periods';

// Benefits and schemes
export { default as Benefits } from '../features/companies/components/Benefits';
export { default as SchemesManagement } from '../features/schemes/components/SchemesManagement';
export { default as ProviderSchemesManagement } from '../features/providers/components/ProviderSchemesManagement';

// Claims
export { default as Claims } from '../features/claims/components/Claims';
export { ClaimsManagement } from '../features/claims-management/components/ClaimsManagement';
export { default as ProviderClaimSubmission } from '../features/providers/components/ProviderClaimSubmission';

// Provider network
export { default as ProviderNetworkManagement } from '../features/providers/components/ProviderNetworkManagement';
export { default as ProviderPortal } from '../features/providers/components/ProviderPortal';
export { default as ProviderVerification } from '../features/providers/components/ProviderVerification';
export { default as ContractManagement } from '../features/companies/components/ContractManagement';

// Medical panel
export { default as MedicalInstitutions } from '../features/companies/components/MedicalInstitutions';
export { default as MedicalPersonnel } from '../features/providers/components/MedicalPersonnel';
export { default as PanelDocumentation } from '../features/providers/components/PanelDocumentation';
export { default as Regions } from '../features/regions/components/Regions';

// Communication and wellness
export { default as Communication } from '../features/companies/components/Communication';
export { default as Wellness } from '../features/wellness/components/Wellness';
export { default as RiskAssessment } from '../features/risk-assessment/components/RiskAssessment';

// Token management
export { default as TokenPurchasePage } from '../features/tokens/TokenPurchasePage';
export { default as PurchaseHistoryPage } from '../features/tokens/PurchaseHistoryPage';
export { default as BalanceHistoryPage } from '../features/tokens/BalanceHistoryPage';
export { default as SubscriptionManagementPage } from '../features/tokens/SubscriptionManagementPage';
export { default as TokenSettingsPage } from '../features/tokens/TokenSettingsPage';

// CRM
export { default as LeadManagement } from '../features/crm/components/LeadManagement';
export { default as AgentPortal } from '../features/crm/components/AgentPortal';
