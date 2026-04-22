/**
 * Pages Index
 * Central export point for all page components
 * Organized by functional domain
 */

// ===== Core Pages =====
export { default as Dashboard } from '../../../pages/Dashboard';
export { default as NotFound } from '../../../pages/not-found';

// ===== Company & Member Management =====
export { default as Companies } from '../../../pages/Companies';
export { default as CompanyDetail } from '../../../pages/CompanyDetail';
export { default as Members } from '../../../pages/Members';
export { default as Dependents } from '../../../pages/Dependents';
export { default as MemberDashboard } from '../../../pages/MemberDashboard';

// ===== Financial Management =====
export { default as Finance } from '../../../pages/Finance';
export { default as Premiums } from '../../../pages/Premiums';
export { default as Periods } from '../../periods/components/Periods';

// ===== Benefits & Schemes =====
export { default as Benefits } from '../../../pages/Benefits';
export { default as SchemesManagement } from '../../schemes/components/SchemesManagement';
export { default as ProviderSchemesManagement } from './ProviderSchemesManagement';

// ===== Claims Management =====
export { default as Claims } from '../../claims/components/Claims';
export { ClaimsManagement } from '../../claims/components/ClaimsManagement';
export { default as ProviderClaimSubmission } from './ProviderClaimSubmission';

// ===== Provider Network =====
export { default as ProviderNetworkManagement } from './ProviderNetworkManagement';
export { default as ProviderPortal } from './ProviderPortal';
export { default as ProviderVerification } from './ProviderVerification';
export { default as ContractManagement } from '../../../pages/ContractManagement';

// ===== Medical Panel =====
export { default as MedicalInstitutions } from '../../../pages/MedicalInstitutions';
export { default as MedicalPersonnel } from '../../../pages/MedicalPersonnel';
export { default as PanelDocumentation } from '../../../pages/PanelDocumentation';
export { default as Regions } from '../../../pages/Regions';

// ===== Communication & Wellness =====
export { default as Communication } from '../../../pages/Communication';
export { default as Wellness } from '../../wellness/components/Wellness';
export { default as RiskAssessment } from '../../risk-assessment/components/RiskAssessment';

// ===== Token Management =====
export { default as TokenPurchasePage } from '../../auth/tokens/TokenPurchasePage';
export { default as PurchaseHistoryPage } from '../../auth/tokens/PurchaseHistoryPage';
export { default as BalanceHistoryPage } from '../../auth/tokens/BalanceHistoryPage';
export { default as SubscriptionManagementPage } from '../../auth/tokens/SubscriptionManagementPage';
export { default as TokenSettingsPage } from '../../auth/tokens/TokenSettingsPage';

// ===== CRM =====
export { default as LeadManagement } from '../../crm/components/LeadManagement';
export { default as AgentPortal } from '../../crm/components/AgentPortal';
