import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/ui/tabs";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { Progress } from "@/ui/progress";
import { AvatarWithInitials } from "@/ui/avatar-with-initials";
import { Alert, AlertDescription } from "@/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { membershipApi } from "@/services/api/memberApi";
import { billingApi } from "@/services/api/billingApi";
import { baseClaimsApi } from "@/services/api/claimsApi";
import { insuranceApi } from "@/services/api/insuranceApi";
import { fraudApi } from "@/services/api/fraudApi";
import { analyticsApi } from "@/services/api/analyticsApi";
import { hospitalApi } from "@/services/api/hospitalApi";
import { crmApi } from "@/services/api/crmApi";
import financeApi from "@/services/api/financeApi";
import {
  Heart,
  Activity,
  AlertTriangle,
  CreditCard,
  FileText,
  Shield,
  RefreshCw,
  DollarSign,
} from "lucide-react";

// Define interfaces for type safety
interface Member {
  id: number;
  firstName: string;
  secondName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  memberType: string;
  principalId?: number;
  dependentType?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
  createdAt: string;
  companyId: number;
  company?: {
    id: number;
    name: string;
  };
  riskScore?: number;
  membershipStatus?: string;
}

interface Benefit {
  id: number;
  name: string;
  description: string;
  category: string;
  coverageDetails: string;
  limitAmount: number;
  hasWaitingPeriod: boolean;
  waitingPeriodDays: number;
  isStandard: boolean;
}

interface CompanyBenefit {
  id: number;
  companyId: number;
  companyName?: string;
  benefitId: number;
  benefitName?: string;
  benefitCategory?: string;
  premiumId: number;
  premiumPeriodId?: number;
  isActive: boolean;
  additionalCoverage: boolean;
  additionalCoverageDetails?: string;
  limitAmount?: number;
}

interface Claim {
  id: number;
  memberId: number;
  institutionId: number;
  personnelId: number;
  benefitId: number;
  claimDate: string;
  serviceDate: string;
  amount: number;
  description: string;
  diagnosis: string;
  status: string;
  reviewDate?: string;
  reviewerNotes?: string;
  paymentDate?: string;
  paymentReference?: string;
  createdAt: string;
}

interface Invoice {
  id: number;
  memberId: number;
  amount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
  description: string;
}

interface CommunicationLog {
  id: number;
  memberId: number;
  type: string;
  channel: string;
  subject: string;
  sentAt: string;
  status: string;
}

// Combined type to display benefit with usage
interface BenefitWithUsage {
  benefitId: number;
  name: string;
  category: string;
  description: string;
  limitAmount: number | null;
  hasLimit: boolean;
  companyBenefitId: number;
  usedAmount: number;
  remainingAmount: number | null;
  usagePercentage: number;
  additionalCoverage: boolean;
  additionalCoverageDetails?: string;
  claims: Claim[];
  rejectedClaims: Claim[];
}

export default function MemberDashboard() {
  const { toast } = useToast();
  const params = useParams();
  const memberId = params.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("benefits");
  const [loading, setLoading] = useState(true);
  const [memberInvoices, setMemberInvoices] = useState<Invoice[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [memberRisk, setMemberRisk] = useState<any>(null);
  const [premiumPayments, setPremiumPayments] = useState<any[]>([]);

  const REFRESH_INTERVAL = 90000; // 1.5 minutes

  // ✅ LOAD ALL BACKEND SERVICES WITH EXISTING METHODS
  const loadMemberData = useCallback(async () => {
    if (!memberId) return;
    
    setLoading(true);
    try {
      // ✅ USE ONLY EXISTING API METHODS
      const [
        memberResult,
        claimsResult,
        billingResult,
        fraudResult,
        crmResult,
        hospitalResult,
        insuranceResult,
        financeResult,
        analyticsResult
      ] = await Promise.all([
        membershipApi.getMember(memberId),
        baseClaimsApi.getClaims(),
        billingApi.getInvoices({ memberId }),
        fraudApi.detectClaimFraud(memberId),
        crmApi.getLeads({}),
        hospitalApi.getAppointments({}),
        insuranceApi.getPolicies({ memberId }),
        Promise.resolve({ data: [] }),
        analyticsApi.getDashboardData('member')
      ]);

      if (Array.isArray(billingResult.data)) setMemberInvoices(billingResult.data);
      if (Array.isArray(crmResult.data)) setCommunicationLogs(crmResult.data);
      if (fraudResult.data) setMemberRisk(fraudResult.data);

    } catch (error) {
      console.error('Error loading member dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadMemberData();
    
    const intervalId = setInterval(loadMemberData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadMemberData]);

  // Fetch member details
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: [`/api/members/${memberId}`],
    enabled: !!memberId,
  });

  // Fetch company benefits for the member's company
  const { data: companyBenefits, isLoading: isLoadingCompanyBenefits } = useQuery({
    queryKey: ['/api/company-benefits'],
    queryFn: async () => {
      if (!member || !(member as Member).companyId) return [];
      const response = await fetch(`/api/company-benefits?companyId=${(member as Member).companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company benefits');
      return response.json();
    },
    enabled: !!(member as Member)?.companyId,
  });

  // Fetch all benefits to get details
  const { data: allBenefits, isLoading: isLoadingBenefits } = useQuery({
    queryKey: ['/api/benefits'],
  });

  // Fetch claims for the member
  const { data: memberClaims, isLoading: isLoadingClaims } = useQuery({
    queryKey: [`/api/claims`],
    queryFn: async () => {
      const response = await fetch(`/api/claims?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to fetch member claims');
      return response.json();
    },
    enabled: !!memberId,
  });

  // Calculate benefits usage and limits
  const benefitsWithUsage: BenefitWithUsage[] = !isLoadingCompanyBenefits && !isLoadingBenefits && !isLoadingClaims
    ? (Array.isArray(companyBenefits) ? companyBenefits : [])
      .filter((cb: CompanyBenefit) => cb.isActive)
      .map((companyBenefit: CompanyBenefit) => {
        const benefit = Array.isArray(allBenefits) ? allBenefits.find((b: Benefit) => b.id === companyBenefit.benefitId) : null;
        if (!benefit) return null;

        // Filter claims for this benefit
        const benefitClaims = (Array.isArray(memberClaims) ? memberClaims : [])
          .filter((claim: Claim) => claim.benefitId === benefit.id);

        // Separate approved/paid claims from rejected claims
        const approvedClaims = benefitClaims.filter(
          (claim: Claim) => claim.status === 'approved' || claim.status === 'paid'
        );
        const rejectedClaims = benefitClaims.filter(
          (claim: Claim) => claim.status === 'rejected'
        );

        // Calculate used amount from approved and paid claims
        const usedAmount = approvedClaims.reduce(
          (sum: number, claim: Claim) => sum + claim.amount, 0
        );

        const effectiveLimit = companyBenefit.limitAmount || benefit.limitAmount;

        // Calculate remaining amount if there's a limit
        const hasLimit = effectiveLimit !== null && effectiveLimit > 0;
        const remainingAmount = hasLimit 
          ? Math.max(0, effectiveLimit - usedAmount)
          : null;

        // Calculate usage percentage
        const usagePercentage = hasLimit && effectiveLimit > 0
          ? Math.min(100, (usedAmount / effectiveLimit) * 100)
          : 0;

        return {
          benefitId: benefit.id,
          name: benefit.name,
          category: benefit.category,
          description: benefit.description,
          limitAmount: effectiveLimit,
          hasLimit: hasLimit,
          companyBenefitId: companyBenefit.id,
          usedAmount,
          remainingAmount,
          usagePercentage,
          additionalCoverage: companyBenefit.additionalCoverage,
          additionalCoverageDetails: companyBenefit.additionalCoverageDetails,
          claims: approvedClaims,
          rejectedClaims,
        };
      })
      .filter(Boolean) as BenefitWithUsage[]
    : [];

  // Format category for display
  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return "bg-blue-500";
      case 'under_review':
        return "bg-yellow-500";
      case 'approved':
        return "bg-green-500";
      case 'rejected':
        return "bg-red-500";
      case 'paid':
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "bg-green-500";
    if (score < 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Loading state
  if (isLoadingMember || isLoadingCompanyBenefits || isLoadingBenefits || isLoadingClaims || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Member not found
  if (!member) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Not Found</CardTitle>
          <CardDescription>
            The requested member could not be found or you don't have permission to view this information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/members">Back to Members</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const typedMember = member as Member;
  const totalClaimsValue = Array.isArray(memberClaims) 
    ? memberClaims.reduce((sum: number, c: Claim) => sum + c.amount, 0) || 0 
    : 0;
  const approvedClaims = Array.isArray(memberClaims)
    ? memberClaims.filter((c: Claim) => c.status === 'approved' || c.status === 'paid').length || 0
    : 0;
  const riskScore = memberRisk?.riskScore || typedMember?.riskScore || 45;

  return (
    <div className="space-y-6">
      {/* ✅ MEMBER DASHBOARD ACTIONS HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Member Dashboard</h1>
          <p className="text-muted-foreground">
            Complete 360° view of member profile, benefits, claims and risk profile
          </p>
        </div>
        <Button variant="outline" onClick={loadMemberData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ✅ MEMBER INFORMATION CARD WITH RISK PROFILE */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between">
            <div className="flex items-center mb-4 lg:mb-0">
              <AvatarWithInitials name={`${typedMember.firstName} ${typedMember.lastName}`} className="h-16 w-16 mr-4" />
              <div>
                <CardTitle className="text-2xl">{typedMember.firstName} {typedMember.secondName} {typedMember.lastName}</CardTitle>
                <CardDescription className="text-base">
                  {typedMember.memberType === 'principal' ? 'Principal Member' : `Dependent (${typedMember.dependentType})`}
                  {typedMember.hasDisability && " • Special Needs"}
                </CardDescription>
                <div className="text-sm text-gray-500 mt-1">
                  ID: {typedMember.employeeId} • Member since {format(new Date(typedMember.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <div><strong>Company:</strong> {typedMember.company?.name}</div>
                <div><strong>Email:</strong> {typedMember.email}</div>
                <div><strong>Phone:</strong> {typedMember.phone}</div>
                <div><strong>Date of Birth:</strong> {format(new Date(typedMember.dateOfBirth), "MMM d, yyyy")}</div>
              </div>

              {/* ✅ RISK ASSESSMENT PANEL */}
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm font-medium mb-2">Risk Assessment</div>
                <div className="flex items-center justify-between">
                  <span>Risk Score</span>
                  <span className="font-bold">{Math.round(riskScore)}%</span>
                </div>
                <Progress value={riskScore} className={`h-2 mt-1 ${getRiskColor(riskScore)}`} />
                <div className="text-xs mt-2 text-gray-600">
                  {riskScore < 30 ? 'Low Risk' : riskScore < 60 ? 'Medium Risk' : 'High Risk'}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ✅ DASHBOARD METRICS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(memberClaims) ? memberClaims.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              {approvedClaims} Approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalClaimsValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total claims processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premiums Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(memberInvoices?.filter((i: Invoice) => i.status === 'paid').reduce((sum: number, i: Invoice) => sum + i.amount, 0) || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total premiums collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Benefits</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{benefitsWithUsage.length}</div>
            <p className="text-xs text-muted-foreground">
              Active benefit plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ TABS WITH ALL SECTIONS */}
      <Card>
        <Tabs defaultValue="benefits" value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="benefits">Benefits & Balance</TabsTrigger>
              <TabsTrigger value="claims">Claims History</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="risk">Risk Profile</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="benefits" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefitsWithUsage.map((benefit) => (
                    <TableRow key={benefit.benefitId}>
                      <TableCell className="font-medium">{benefit.name}</TableCell>
                      <TableCell>{formatCategory(benefit.category)}</TableCell>
                      <TableCell>{benefit.hasLimit ? formatCurrency(benefit.limitAmount || 0) : 'Unlimited'}</TableCell>
                      <TableCell>{formatCurrency(benefit.usedAmount)}</TableCell>
                      <TableCell>{benefit.hasLimit ? formatCurrency(benefit.remainingAmount || 0) : '-'}</TableCell>
                      <TableCell>
                        <div className="w-full">
                          <Progress value={benefit.usagePercentage} className="h-2" />
                          <div className="text-xs text-muted-foreground mt-1">{Math.round(benefit.usagePercentage)}%</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="claims" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(memberClaims) ? memberClaims : []).map((claim: Claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>{format(new Date(claim.claimDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{claim.description}</TableCell>
                      <TableCell>{formatCurrency(claim.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(claim.status)}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge className={invoice.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="communications" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communicationLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.sentAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>{log.type}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell>{log.channel}</TableCell>
                      <TableCell>
                        <Badge>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-6xl font-bold mb-2">{Math.round(riskScore)}%</div>
        <Progress value={riskScore} className={`h-3 ${getRiskColor(riskScore)}`} />
                      <p className="text-muted-foreground mt-4">
                        {riskScore < 30 ? 'Low risk profile' : riskScore < 60 ? 'Medium risk profile' : 'High risk profile'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Risk analysis powered by Fraud Detection Service and historical claims data patterns.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
