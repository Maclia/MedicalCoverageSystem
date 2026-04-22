# 📄 PAGES FOLDER MIGRATION GUIDE

---

## ✅ **MIGRATION PATTERN**
**Pages should be thin routing entry points only.** Move page components inside their respective feature folders.

| Current Location | New Location |
|------------------|--------------|
| `client/src/pages/[Feature].tsx` | `client/src/features/[feature]/[Feature]Page.tsx` |

---

## 🔹 **PAGE TO FEATURE MAPPING**

| Page File | Moves to Feature Folder |
|-----------|-------------------------|
| ✅ `Members.tsx` | `/features/members/MembersPage.tsx` ✅ **ALREADY MIGRATED** |
| `Claims.tsx` | `/features/claims/ClaimsPage.tsx` |
| `ClaimsManagement.tsx` | `/features/claims-management/ClaimsManagementPage.tsx` |
| `Finance.tsx` | `/features/finance/FinancePage.tsx` |
| `Premiums.tsx` | `/features/premiums/PremiumsPage.tsx` |
| `Companies.tsx` | `/features/companies/CompaniesPage.tsx` |
| `CompanyDetail.tsx` | `/features/companies/CompanyDetailPage.tsx` |
| `Dependents.tsx` | `/features/dependents/DependentsPage.tsx` |
| `MedicalInstitutions.tsx` | `/features/providers/MedicalInstitutionsPage.tsx` |
| `MedicalPersonnel.tsx` | `/features/providers/MedicalPersonnelPage.tsx` |
| `ProviderPortal.tsx` | `/features/providers/ProviderPortalPage.tsx` |
| `ProviderClaimSubmission.tsx` | `/features/providers/ProviderClaimSubmissionPage.tsx` |
| `ProviderNetworkManagement.tsx` | `/features/providers/ProviderNetworkManagementPage.tsx` |
| `ProviderVerification.tsx` | `/features/providers/ProviderVerificationPage.tsx` |
| `ProviderSchemesManagement.tsx` | `/features/providers/ProviderSchemesManagementPage.tsx` |
| `SchemesManagement.tsx` | `/features/schemes/SchemesManagementPage.tsx` |
| `Wellness.tsx` | `/features/wellness/WellnessPage.tsx` |
| `RiskAssessment.tsx` | `/features/risk-assessment/RiskAssessmentPage.tsx` |
| `Periods.tsx` | `/features/periods/PeriodsPage.tsx` |
| `Regions.tsx` | `/features/regions/RegionsPage.tsx` |
| `ContractManagement.tsx` | `/features/admin/ContractManagementPage.tsx` |
| `MemberDashboard.tsx` | `/features/members/MemberDashboardPage.tsx` |
| `Dashboard.tsx` | `/features/admin/DashboardPage.tsx` |
| `DashboardSelector.tsx` | `/features/admin/DashboardSelectorPage.tsx` |
| `Benefits.tsx` | `/features/members/BenefitsPage.tsx` |
| `Communication.tsx` | `/features/crm/CommunicationPage.tsx` |
| `PanelDocumentation.tsx` | `/shared/components/documentation/` |

---

## 🔹 **REMAINING IN /pages/ FOLDER**
✅ Only keep these files **at root pages level**:
```
pages/
├── index.ts            ✅ Central export point for ALL pages
├── not-found.tsx       ✅ Global 404 page
└── LoginPage.tsx       ✅ Root auth page
```

---

## 🔹 **UPDATED ROUTER IMPORTS**
✅ After migration your router will look like this:
```typescript
import {
  MembersPage,
  ClaimsPage,
  FinancePage,
  PremiumsPage
} from '@features/members'

<Route path="/members" element={<MembersPage />} />
```

❌ **BEFORE (OLD WAY)**
```typescript
import MembersPage from '../pages/Members.tsx'
```

---

## 🔹 **MIGRATION STEPS**

1.  **Move page file:**
    ```batch
    move client/src/pages/Claims.tsx client/src/features/claims/ClaimsPage.tsx
    ```

2.  **Update exports in feature index.ts:**
    ```typescript
    export { default as ClaimsPage } from './ClaimsPage'
    ```

3.  **Remove old page import from router and replace with clean `@features/` import**

4.  **Once all pages are migrated, create pages/index.ts:**
    ```typescript
    export * from '@features/members'
    export * from '@features/claims'
    export * from '@features/finance'
    // etc.
    ```

---

## 💡 **BENEFITS**
✅ No more scattered page files
✅ Every feature owns its own entry pages
✅ Pages are colocated with the components they use
✅ Router imports become clean and maintainable
✅ Deleting a feature deletes its pages automatically
✅ No more broken imports when moving files