import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "@/components/auth/Login";
import AppLayout from "@/components/layout/AppLayout";

// Dashboard Components
import InsuranceDashboard from "@/components/dashboards/InsuranceDashboard";
import InstitutionDashboard from "@/components/dashboards/InstitutionDashboard";
import ProviderDashboard from "@/components/dashboards/ProviderDashboard";

// Existing Pages
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import CompanyDetail from "@/pages/CompanyDetail";
import Members from "@/pages/Members";
import Dependents from "@/pages/Dependents";
import Premiums from "@/pages/Premiums";
import Periods from "@/pages/Periods";
import Benefits from "@/pages/Benefits";
import Regions from "@/pages/Regions";
import MedicalInstitutions from "@/pages/MedicalInstitutions";
import MedicalPersonnel from "@/pages/MedicalPersonnel";
import PanelDocumentation from "@/pages/PanelDocumentation";
import Claims from "@/pages/Claims";
import MemberDashboard from "@/pages/MemberDashboard";
import ProviderClaimSubmission from "@/pages/ProviderClaimSubmission";
import Communication from "@/pages/Communication";
import Wellness from "@/pages/Wellness";
import RiskAssessment from "@/pages/RiskAssessment";
import { ClaimsManagement } from "@/pages/ClaimsManagement";
import SchemesManagement from "@/pages/SchemesManagement";
import ProviderSchemesManagement from "@/pages/ProviderSchemesManagement";
import Finance from "@/pages/Finance";
import NotFound from "@/pages/not-found";

// Token System Pages
import TokenPurchasePage from "@/pages/tokens/TokenPurchasePage";
import PurchaseHistoryPage from "@/pages/tokens/PurchaseHistoryPage";
import BalanceHistoryPage from "@/pages/tokens/BalanceHistoryPage";
import SubscriptionManagementPage from "@/pages/tokens/SubscriptionManagementPage";
import TokenSettingsPage from "@/pages/tokens/TokenSettingsPage";

// CRM Pages
import LeadManagement from "@/pages/crm/LeadManagement";
import AgentPortal from "@/pages/crm/AgentPortal";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />

      {/* Protected Role-Based Routes */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              {/* Default Dashboard - redirects to role-specific dashboard */}
              <Route path="/" component={Dashboard} />

              {/* Insurance Provider Routes */}
              <Route path="/dashboard/insurance" component={() => <InsuranceDashboard />} />
              <Route path="/companies" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Companies />
                </ProtectedRoute>
              )} />
              <Route path="/companies/:id" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <CompanyDetail />
                </ProtectedRoute>
              )} />
              <Route path="/members" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Members />
                </ProtectedRoute>
              )} />
              <Route path="/dependents" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Dependents />
                </ProtectedRoute>
              )} />
              <Route path="/premiums" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Premiums />
                </ProtectedRoute>
              )} />
              <Route path="/periods" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Periods />
                </ProtectedRoute>
              )} />
              <Route path="/benefits" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Benefits />
                </ProtectedRoute>
              )} />
              <Route path="/regions" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Regions />
                </ProtectedRoute>
              )} />
              <Route path="/analytics" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <Dashboard />
                </ProtectedRoute>
              )} />
              <Route path="/claims-management" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <ClaimsManagement />
                </ProtectedRoute>
              )} />
              <Route path="/schemes-management" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <SchemesManagement />
                </ProtectedRoute>
              )} />

              {/* Finance Routes */}
              <Route path="/finance" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <FinanceProvider>
                    <Finance />
                  </FinanceProvider>
                </ProtectedRoute>
              )} />

              {/* Token System Routes */}
              <Route path="/tokens/purchase" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <TokenPurchasePage />
                </ProtectedRoute>
              )} />
              <Route path="/tokens/history" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <PurchaseHistoryPage />
                </ProtectedRoute>
              )} />
              <Route path="/tokens/balance-history" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <BalanceHistoryPage />
                </ProtectedRoute>
              )} />
              <Route path="/tokens/subscription" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <SubscriptionManagementPage />
                </ProtectedRoute>
              )} />
              <Route path="/tokens/settings" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <TokenSettingsPage />
                </ProtectedRoute>
              )} />

              {/* CRM Routes */}
              <Route path="/crm/leads" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <LeadManagement />
                </ProtectedRoute>
              )} />
              <Route path="/crm/agent-portal" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <AgentPortal />
                </ProtectedRoute>
              )} />

              {/* Medical Institution Routes */}
              <Route path="/dashboard/institution" component={() => <InstitutionDashboard />} />
              <Route path="/medical-institutions" component={() => (
                <ProtectedRoute allowedRoles={['institution']}>
                  <MedicalInstitutions />
                </ProtectedRoute>
              )} />
              <Route path="/medical-personnel" component={() => (
                <ProtectedRoute allowedRoles={['institution']}>
                  <MedicalPersonnel />
                </ProtectedRoute>
              )} />
              <Route path="/institution-analytics" component={() => (
                <ProtectedRoute allowedRoles={['institution']}>
                  <Dashboard />
                </ProtectedRoute>
              )} />
              <Route path="/quality" component={() => (
                <ProtectedRoute allowedRoles={['institution']}>
                  <PanelDocumentation />
                </ProtectedRoute>
              )} />

              {/* Healthcare Provider Routes */}
              <Route path="/dashboard/provider" component={() => <ProviderDashboard />} />
              <Route path="/provider-claim-submission" component={() => (
                <ProtectedRoute allowedRoles={['provider', 'institution']}>
                  <ProviderClaimSubmission />
                </ProtectedRoute>
              )} />
              <Route path="/provider-schemes-management" component={() => (
                <ProtectedRoute allowedRoles={['provider', 'institution']}>
                  <ProviderSchemesManagement />
                </ProtectedRoute>
              )} />
              <Route path="/appointments" component={() => (
                <ProtectedRoute allowedRoles={['provider']}>
                  <Dashboard />
                </ProtectedRoute>
              )} />
              <Route path="/patients" component={() => (
                <ProtectedRoute allowedRoles={['provider']}>
                  <MemberDashboard />
                </ProtectedRoute>
              )} />
              <Route path="/member-search" component={() => (
                <ProtectedRoute allowedRoles={['provider', 'institution']}>
                  <Members />
                </ProtectedRoute>
              )} />
              <Route path="/earnings" component={() => (
                <ProtectedRoute allowedRoles={['provider']}>
                  <Dashboard />
                </ProtectedRoute>
              )} />
              <Route path="/messages" component={() => (
                <ProtectedRoute allowedRoles={['provider']}>
                  <Communication />
                </ProtectedRoute>
              )} />

              {/* Shared Routes (accessible by multiple roles) */}
              <Route path="/claims" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution', 'provider']}>
                  <Claims />
                </ProtectedRoute>
              )} />
              <Route path="/member-dashboard/:id" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution', 'provider']}>
                  <MemberDashboard />
                </ProtectedRoute>
              )} />
              <Route path="/communication/:id" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution', 'provider']}>
                  <Communication />
                </ProtectedRoute>
              )} />
              <Route path="/wellness/:id" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution', 'provider']}>
                  <Wellness />
                </ProtectedRoute>
              )} />
              <Route path="/risk-assessment/:id" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution']}>
                  <RiskAssessment />
                </ProtectedRoute>
              )} />
              <Route path="/profile" component={() => (
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )} />

              {/* General Dashboard (legacy fallback) */}
              <Route path="/dashboard" component={Dashboard} />

              {/* 404 Not Found */}
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
