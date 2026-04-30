// 3rd Party Libraries
import { Suspense, lazy } from "react";
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
import AppLayout from "@/features/layout/AppLayout";
import Login from "@/pages/Login";

const Dashboard = lazy(() => import("@/features/dashboards/Dashboard"));
const InsuranceDashboard = lazy(() => import("@/features/dashboards/InsuranceDashboard"));
const InstitutionDashboard = lazy(() => import("@/features/dashboards/InstitutionDashboard"));
const ProviderDashboard = lazy(() => import("@/features/dashboards/ProviderDashboard"));
const Companies = lazy(() => import("@/features/companies/components/Companies"));
const CompanyDetail = lazy(() => import("@/features/companies/components/CompanyDetail"));
const Benefits = lazy(() => import("@/features/companies/components/Benefits"));
const MedicalInstitutions = lazy(() => import("@/features/companies/components/MedicalInstitutions"));
const Communication = lazy(() => import("@/features/companies/components/Communication"));
const Members = lazy(() => import("@/features/members/Members"));
const Dependents = lazy(() => import("@/features/members/Dependents"));
const MemberDashboard = lazy(() => import("@/features/members/MemberDashboard"));
const Premiums = lazy(() => import("@/features/premiums/components/Premiums"));
const Periods = lazy(() => import("@/features/periods/components/Periods"));
const Regions = lazy(() => import("@/features/regions/components/Regions"));
const MedicalPersonnel = lazy(() => import("@/features/providers/components/MedicalPersonnel"));
const PanelDocumentation = lazy(() => import("@/features/providers/components/PanelDocumentation"));
const ProviderClaimSubmission = lazy(() => import("@/features/providers/components/ProviderClaimSubmission"));
const ProviderSchemesManagement = lazy(() => import("@/features/providers/components/ProviderSchemesManagement"));
const Claims = lazy(() => import("@/features/claims/components/Claims"));
const ClaimsManagement = lazy(() =>
  import("@/features/claims-management/components/ClaimsManagement").then((module) => ({
    default: module.ClaimsManagement,
  }))
);
const SchemesManagement = lazy(() => import("@/features/schemes/components/SchemesManagement"));
const Wellness = lazy(() => import("@/features/wellness/components/Wellness"));
const RiskAssessment = lazy(() => import("@/features/risk-assessment/components/RiskAssessment"));
const Finance = lazy(() => import("@/features/finance/components/Finance"));
const ProviderPortal = lazy(() => import("@/features/providers/components/ProviderPortal"));
const ProviderVerification = lazy(() => import("@/features/providers/components/ProviderVerification"));
const LeadManagement = lazy(() => import("@/features/crm/components/LeadManagement"));
const AgentPortal = lazy(() => import("@/features/crm/components/AgentPortal"));
const NotFound = lazy(() => import("@/pages/not-found"));
const UserSettingsPage = lazy(() => import("@/features/settings/UserSettingsPage"));

function RouteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />

      {/* Protected Role-Based Routes */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Suspense fallback={<RouteFallback />}>
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
              <Route path="/provider-portal" component={() => (
                <ProtectedRoute allowedRoles={['provider', 'institution']}>
                  <ProviderPortal />
                </ProtectedRoute>
              )} />
              <Route path="/provider-verification" component={() => (
                <ProtectedRoute allowedRoles={['insurance', 'institution']}>
                  <ProviderVerification />
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

              {/* CRM Routes */}
              <Route path="/crm" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <AgentPortal />
                </ProtectedRoute>
              )} />
              <Route path="/leads" component={() => (
                <ProtectedRoute allowedRoles={['insurance']}>
                  <LeadManagement />
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
            </Suspense>
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
