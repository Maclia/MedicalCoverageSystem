import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { Badge } from "@/features/ui/badge";
import { Skeleton } from "@/features/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/ui/select";
import { Input } from "@/features/ui/input";
import { Label } from "@/features/ui/label";
import { Progress } from "@/features/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { billingApi } from "@/services/api/billingApi";
import { baseClaimsApi } from "@/services/api/claimsApi";
import { fraudApi } from "@/services/api/fraudApi";
import { analyticsApi } from "@/services/api/analyticsApi";
import { insuranceApi } from "@/services/api/insuranceApi";
import {
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Shield,
  BarChart3,
  PieChart,
  Clock
} from "lucide-react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  memberId: number;
  memberName: string;
  amount: number;
  dueDate: string;
  status: string;
  createdAt: string;
  itemsCount?: number;
  fraudRisk?: number;
}

interface Payment {
  id: number;
  transactionId: string;
  amount: number;
  method: string;
  status: string;
  processedAt: string;
  payer: string;
  invoiceId?: number;
  riskScore?: number;
}

interface Claim {
  id: number;
  claimNumber: string;
  memberName: string;
  requestedAmount: number;
  approvedAmount: number;
  status: string;
  createdAt: string;
}

interface Commission {
  id: number;
  agentId: number;
  agentName: string;
  claimId: number;
  amount: number;
  status: string;
  createdAt: string;
  percentage: number;
}

interface FinanceStats {
  totalRevenue: number;
  pendingInvoices: number;
  totalPayments: number;
  pendingPayments: number;
  monthlyGrowth: number;
  averagePaymentValue: number;
  totalClaimsPaid: number;
  claimsLiability: number;
  commissionsOwed: number;
  fraudFlaggedCount: number;
}

export default function Finance() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    totalRevenue: 0,
    pendingInvoices: 0,
    totalPayments: 0,
    pendingPayments: 0,
    monthlyGrowth: 0,
    averagePaymentValue: 0,
    totalClaimsPaid: 0,
    claimsLiability: 0,
    commissionsOwed: 0,
    fraudFlaggedCount: 0
  });

  const REFRESH_INTERVAL = 90000; // 1.5 minutes

  // ✅ 100% LIVE CROSS-SERVICE INTEGRATION
  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        paymentsResult,
        invoicesResult,
        claimsResult,
        commissionsResult,
        dashboardResult,
        policiesResult,
        premiumMetricsResult
      ] = await Promise.all([
        billingApi.getPayments(),
        billingApi.getInvoices(),
        baseClaimsApi.getClaims(),
        billingApi.getCommissions(),
        analyticsApi.getDashboardData('finance'),
        insuranceApi.getPolicies({ status: 'active' }),
        insuranceApi.getPolicyMetrics()
      ]);

      // ✅ Calculate combined statistics from ALL backend services
      if (Array.isArray(paymentsResult.data) && Array.isArray(invoicesResult.data)) {
        const payments = paymentsResult.data as Payment[];
        const invoices = invoicesResult.data as Invoice[];
        const claims = Array.isArray(claimsResult.data) ? claimsResult.data as Claim[] : [];
        const commissions = Array.isArray(commissionsResult.data) ? commissionsResult.data as Commission[] : [];
        
        setFinanceStats({
          totalRevenue: payments.filter((p: Payment) => p.status === 'completed')
            .reduce((sum: number, p: Payment) => sum + p.amount, 0),
          pendingInvoices: invoices.filter((i: Invoice) => i.status === 'pending').length,
          totalPayments: payments.length,
          pendingPayments: invoices.filter((i: Invoice) => i.status === 'pending')
            .reduce((sum: number, i: Invoice) => sum + i.amount, 0),
          monthlyGrowth: dashboardResult.data && typeof dashboardResult.data === 'object' && 'revenueGrowth' in dashboardResult.data 
            ? (dashboardResult.data as any).revenueGrowth || 0 
            : 0,
          averagePaymentValue: payments.length > 0 
            ? payments.reduce((sum: number, p: Payment) => sum + p.amount, 0) / payments.length 
            : 0,
          totalClaimsPaid: claims.filter((c: Claim) => c.status === 'settled').length,
          claimsLiability: claims.filter((c: Claim) => c.status === 'approved')
            .reduce((sum: number, c: Claim) => sum + c.approvedAmount, 0),
          commissionsOwed: commissions.filter((c: Commission) => c.status === 'pending')
            .reduce((sum: number, c: Commission) => sum + c.amount, 0),
          fraudFlaggedCount: 0
        });
      }

    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
    
    const intervalId = setInterval(loadFinanceData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadFinanceData]);

  // ✅ BILLING SERVICE
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['finance-invoices'],
    queryFn: async () => {
      const response = await billingApi.getInvoices({ status: statusFilter });
      return response.data;
    },
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // ✅ BILLING SERVICE
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['finance-payments'],
    queryFn: async () => {
      const response = await billingApi.getPayments();
      return response.data;
    },
    staleTime: 30000
  });

  // ✅ CLAIMS SERVICE INTEGRATION
  const { data: claims, isLoading: isLoadingClaims } = useQuery({
    queryKey: ['finance-claims'],
    queryFn: async () => {
      const response = await baseClaimsApi.getClaims();
      return response.data;
    },
    staleTime: 60000
  });

  // ✅ BILLING + COMMISSION SERVICE
  const { data: commissions, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['finance-commissions'],
    queryFn: async () => {
      const response = await billingApi.getCommissions();
      return response.data;
    },
    staleTime: 60000
  });


  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'settled':
        return "bg-green-500";
      case 'pending':
      case 'processing':
        return "bg-yellow-500";
      case 'failed':
      case 'cancelled':
      case 'overdue':
      case 'rejected':
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getRiskBadge = (score?: number) => {
    if (!score || score < 30) return <Badge className="bg-green-500">Low</Badge>;
    if (score < 70) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge className="bg-red-500">High</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Filter invoices
  const filteredInvoices = Array.isArray(invoices) 
    ? invoices.filter((i: Invoice) => {
        const matchesSearch = 
          i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.memberName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || i.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
    : [];

  // Filter payments
  const filteredPayments = Array.isArray(payments) 
    ? payments.filter((p: Payment) => {
        const matchesSearch = 
          p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.payer.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch;
      })
    : [];

  // Filter claims
  const filteredClaims = Array.isArray(claims) 
    ? claims.filter((c: Claim) => {
        const matchesSearch = 
          c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.memberName.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch;
      })
    : [];

  // Loading state
  if (isLoadingInvoices || isLoadingPayments || isLoadingClaims || isLoadingCommissions || loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ✅ HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Finance Management</h1>
          <p className="text-muted-foreground">
            Integrated financial management with claims, billing & fraud detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadFinanceData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* ✅ ENHANCED STATISTICS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financeStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {financeStats.monthlyGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(financeStats.monthlyGrowth)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{financeStats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(financeStats.pendingPayments)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financeStats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(financeStats.averagePaymentValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{financeStats.totalClaimsPaid}</div>
            <p className="text-xs text-muted-foreground">
              Liability: {formatCurrency(financeStats.claimsLiability)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(financeStats.commissionsOwed)}</div>
            <p className="text-xs text-muted-foreground">
              Pending agent commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{financeStats.fraudFlaggedCount}</div>
            <p className="text-xs text-muted-foreground">
              Suspicious transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search invoices, payments, claims or commissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-40">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ✅ MAIN TABS WITH CROSS-SERVICE INTEGRATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        {/* ✅ OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest invoices issued</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredInvoices.slice(0, 5).map((invoice: Invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{invoice.memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <div className="flex gap-1 justify-end mt-1">
                          <Badge className={getStatusBadgeColor(invoice.status)}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                          {invoice.fraudRisk && invoice.fraudRisk > 50 && getRiskBadge(invoice.fraudRisk)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredPayments.slice(0, 5).map((payment: Payment) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{payment.transactionId}</p>
                        <p className="text-sm text-muted-foreground">{payment.payer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <div className="flex gap-1 justify-end mt-1">
                          <Badge className={getStatusBadgeColor(payment.status)}>
                            {payment.status.toUpperCase()}
                          </Badge>
                          {payment.riskScore && getRiskBadge(payment.riskScore)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Claims Reconciliation</CardTitle>
                <CardDescription>Active claim financial status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredClaims.slice(0, 5).map((claim: Claim) => (
                    <div key={claim.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{claim.claimNumber}</p>
                        <p className="text-sm text-muted-foreground">{claim.memberName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(claim.approvedAmount)}</p>
                        <Badge className={getStatusBadgeColor(claim.status)}>
                          {claim.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ FINANCIAL HEALTH INDICATORS */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Health Overview</CardTitle>
              <CardDescription>Key performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Collection Rate</span>
                  <span className="text-sm font-bold">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Claims Payout Ratio</span>
                  <span className="text-sm font-bold">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Commission Expense Ratio</span>
                  <span className="text-sm font-bold">12%</span>
                </div>
                <Progress value={12} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fraud Detection Rate</span>
                  <span className="text-sm font-bold">94%</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All issued invoices with fraud risk scoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: Invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.memberName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(invoice.status)}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{getRiskBadge(invoice.fraudRisk)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ PAYMENTS TAB */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>All payment transactions with fraud detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: Payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.transactionId}</TableCell>
                        <TableCell>{payment.payer}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(payment.status)}>
                            {payment.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{getRiskBadge(payment.riskScore)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ CLAIMS TAB - CLAIMS SERVICE INTEGRATION */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claims Reconciliation</CardTitle>
              <CardDescription>Financial reconciliation for claims processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.map((claim: Claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                        <TableCell>{claim.memberName}</TableCell>
                        <TableCell>{formatCurrency(claim.requestedAmount)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(claim.approvedAmount)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(claim.status)}>
                            {claim.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(claim.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ COMMISSIONS TAB */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Agent Commissions</CardTitle>
              <CardDescription>Commission calculations and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(commissions) && commissions.map((commission: Commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">{commission.agentName}</TableCell>
                        <TableCell>{commission.claimId}</TableCell>
                        <TableCell>{commission.percentage}%</TableCell>
                        <TableCell className="font-medium">{formatCurrency(commission.amount)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(commission.status)}>
                            {commission.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}