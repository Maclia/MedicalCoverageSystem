import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/companies" component={Companies} />
        <Route path="/companies/:id" component={CompanyDetail} />
        <Route path="/members" component={Members} />
        <Route path="/dependents" component={Dependents} />
        <Route path="/premiums" component={Premiums} />
        <Route path="/periods" component={Periods} />
        <Route path="/benefits" component={Benefits} />
        <Route path="/regions" component={Regions} />
        <Route path="/medical-institutions" component={MedicalInstitutions} />
        <Route path="/medical-personnel" component={MedicalPersonnel} />
        <Route path="/panel-documentation" component={PanelDocumentation} />
        <Route path="/claims" component={Claims} />
        <Route path="/member-dashboard/:id" component={MemberDashboard} />
        <Route path="/provider-claim-submission" component={ProviderClaimSubmission} />
        <Route path="/communication/:id" component={Communication} />
        <Route path="/wellness/:id" component={Wellness} />
        <Route path="/risk-assessment/:id" component={RiskAssessment} />
        <Route path="/claims-management" component={ClaimsManagement} />
        <Route path="/schemes-management" component={SchemesManagement} />
        <Route path="/provider-schemes-management" component={ProviderSchemesManagement} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
