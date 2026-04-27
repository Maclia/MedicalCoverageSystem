// 3rd Party Libraries
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

// Internal Utilities
import { queryClient } from "./lib/queryClient";

// UI Components
import { Toaster } from "@/ui/toaster";
import NetworkStatusIndicator from "./components/NetworkStatusIndicator";

// Context Providers
import { AuthProvider } from "@/features/actions/contexts/AuthContext";
import { FinanceProvider } from "@/features/actions/contexts/FinanceContext";

// Auth & Layout
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import Login from "@/pages/Login";
import AppLayout from "@/features/layout/AppLayout";

// Dashboard Components
import Dashboard from "@/features/dashboards/Dashboard";
import InsuranceDashboard from "@/features/dashboards/InsuranceDashboard";
import InstitutionDashboard from "@/features/dashboards/InstitutionDashboard";
import ProviderDashboard from "@/features/dashboards/ProviderDashboard";

// Companies Feature
import Companies from "@/features/companies/components/Companies";
import CompanyDetail from "@/features/companies/components/CompanyDetail";
import Benefits from "@/features/companies/components/Benefits";
import MedicalInstitutions from "@/features/companies/components/MedicalInstitutions";
import Communication from "@/features/companies/components/Communication";

// Members Feature
import Members from "@/features/members/Members";
import Dependents from "@/features/members/Dependents";
import MemberDashboard from "@/features/members/MemberDashboard";

// Premiums & Periods
import Premiums from "@/features/premiums/components/Premiums";
import Periods from "@/features/periods/components/Periods";

// Regions Feature
import Regions from "@/features/regions/components/Regions";

// Providers Feature
import MedicalPersonnel from "@/features/providers/components/MedicalPersonnel";
import PanelDocumentation from "@/features/providers/components/PanelDocumentation";
import ProviderClaimSubmission from "@/features/providers/components/ProviderClaimSubmission";
import ProviderSchemesManagement from "@/features/providers/components/ProviderSchemesManagement";

// Claims Feature
import Claims from "@/features/claims/components/Claims";
import { ClaimsManagement } from "@/features/claims-management/components/ClaimsManagement";

// Schemes Feature
import SchemesManagement from "@/features/schemes/components/SchemesManagement";

// Wellness Feature
import Wellness from "@/features/wellness/components/Wellness";

// Risk Assessment
import RiskAssessment from "@/features/risk-assessment/components/RiskAssessment";

// Finance Feature
import Finance from "@/features/finance/components/Finance";

// Utility Pages
import NotFound from "@/pages/not-found";
import UserSettingsPage from "@/features/settings/UserSettingsPage";

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
                  <ClaimsManagement userRole="admin" />
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
                  <UserSettingsPage />
                </ProtectedRoute>
              )} />
              <Route path="/settings" component={() => (
                <ProtectedRoute>
                  <UserSettingsPage />
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
        <NetworkStatusIndicator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;