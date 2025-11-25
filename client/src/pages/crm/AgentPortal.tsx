import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Building
} from "lucide-react";
import { format } from "date-fns";

interface AgentPerformance {
  agentId: string;
  period: string;
  ytdPremium: number;
  ytdCommission: number;
  leadConversionRate: number;
  averageDealSize: number;
  commissionRate: number;
  tierBonusEligible: boolean;
  nextTierTarget: number;
  nextTierBonus?: number;
}

interface CommissionTransaction {
  id: string;
  amount: number;
  paymentDate: string;
  paymentStatus: string;
  paymentReference?: string;
  commissionPeriod: string;
  transactionType: string;
  createdAt: string;
}

interface Client {
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipStatus: string;
  enrollmentDate: string;
  renewalDate?: string;
  companyName?: string;
}

interface AgentDetail {
  id: string;
  agentCode: string;
  agentType: string;
  targetAnnualPremium: number;
  ytdPremium: number;
  ytdCommission: number;
  isActive: boolean;
  joinDate: string;
  userEmail: string;
  teamName?: string;
  tierName?: string;
  tierBaseRate?: number;
  tierBonusThreshold?: number;
  tierBonusRate?: number;
  performance: AgentPerformance;
  recentTransactions: CommissionTransaction[];
  clientPortfolio: Client[];
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  held: "bg-gray-100 text-gray-800"
};

const membershipStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-orange-100 text-orange-800",
  terminated: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800"
};

export default function AgentPortal() {
  const [agentId, setAgentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const queryClient = useQueryClient();

  // Mock agent ID - in a real app, this would come from authentication
  const mockAgentId = "1";

  // Fetch agent details
  const { data: agentData, isLoading, error } = useQuery({
    queryKey: ['/api/crm/agents', mockAgentId],
    queryFn: async () => {
      const response = await fetch(`/api/crm/agents/${mockAgentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent data');
      }
      return response.json();
    },
    enabled: !!mockAgentId
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KES', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading agent portal...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading agent portal: {(error as Error).message}</div>;
  }

  const agent: AgentDetail = agentData?.data;
  const performance = agent?.performance || {};
  const transactions = agent?.recentTransactions || [];
  const clients = agent?.clientPortfolio || [];

  const recentTransactions = transactions.slice(0, 10);
  const recentClients = clients.slice(0, 10);

  const commissionSummary = useMemo(() => {
    const pending = transactions.filter(t => t.paymentStatus === 'pending');
    const approved = transactions.filter(t => t.paymentStatus === 'approved');
    const paid = transactions.filter(t => t.paymentStatus === 'paid');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, t) => sum + t.amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, t) => sum + t.amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, t) => sum + t.amount, 0)
    };
  }, [transactions]);

  const clientMetrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.membershipStatus === 'active').length;
    const corporate = clients.filter(c => c.companyName).length;
    const upcomingRenewals = clients.filter(c => {
      if (!c.renewalDate) return false;
      const renewalDate = new Date(c.renewalDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
    }).length;

    return { total, active, corporate, upcomingRenewals };
  }, [clients]);

  if (!agent) {
    return <div className="text-center py-12">
      <div className="text-gray-500">Agent not found</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Portal</h1>
            <p className="text-blue-100">Welcome back, {agent.userEmail}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-white text-blue-900">
                {agent.agentCode}
              </Badge>
              <Badge variant="secondary" className="bg-white text-blue-900 capitalize">
                {agent.agentType.replace('_', ' ')}
              </Badge>
              {agent.teamName && (
                <Badge variant="secondary" className="bg-white text-blue-900">
                  {agent.teamName}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Member Since</div>
            <div className="text-lg font-medium">
              {format(new Date(agent.joinDate), 'MMM yyyy')}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Annual Target</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(agent.targetAnnualPremium)}
                    </p>
                    <Progress
                      value={(performance.ytdPremium / agent.targetAnnualPremium) * 100}
                      className="mt-2 h-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage((performance.ytdPremium / agent.targetAnnualPremium) * 100)} achieved
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">YTD Commission</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performance.ytdCommission)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage(performance.commissionRate)} rate
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{clientMetrics.active}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {clientMetrics.total} total clients
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tier Bonus</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {performance.tierBonusEligible ? 'Eligible' : 'Not Eligible'}
                    </p>
                    {performance.nextTierTarget > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(performance.nextTierTarget - performance.ytdPremium)} to go
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Commission Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-sm">No recent transactions</div>
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={paymentStatusColors[transaction.paymentStatus]}>
                            {transaction.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Renewals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientMetrics.upcomingRenewals === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-sm">No upcoming renewals</div>
                    </div>
                  ) : (
                    clients
                      .filter(client => {
                        if (!client.renewalDate) return false;
                        const renewalDate = new Date(client.renewalDate);
                        const thirtyDaysFromNow = new Date();
                        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                        return renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
                      })
                      .slice(0, 5)
                      .map((client) => (
                        <div key={client.memberId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {client.firstName[0]}{client.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {client.firstName} {client.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {client.companyName || 'Individual'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Renews</div>
                            <div className="font-medium">
                              {format(new Date(client.renewalDate!), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commission Tab */}
        <TabsContent value="commission" className="space-y-6">
          {/* Commission Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {formatCurrency(commissionSummary.pendingAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {commissionSummary.pendingCount} transactions
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(commissionSummary.approvedAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {commissionSummary.approvedCount} transactions
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(commissionSummary.paidAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {commissionSummary.paidCount} transactions
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Tier Details */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Tier Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPercentage(agent.tierBaseRate || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Base Rate</div>
                </div>
                {agent.tierBonusThreshold && (
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(agent.tierBonusThreshold)}
                    </div>
                    <div className="text-sm text-gray-500">Bonus Threshold</div>
                  </div>
                )}
                {agent.tierBonusRate && (
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPercentage(agent.tierBonusRate)}
                    </div>
                    <div className="text-sm text-gray-500">Bonus Rate</div>
                  </div>
                )}
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {performance.tierBonusEligible ? (
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-orange-600 mx-auto" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {performance.tierBonusEligible ? 'Bonus Eligible' : 'Target Not Met'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Period</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-left p-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="p-2">
                          {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="p-2 capitalize">
                          {transaction.transactionType.replace('_', ' ')}
                        </td>
                        <td className="p-2">{transaction.commissionPeriod}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="p-2">
                          <Badge className={paymentStatusColors[transaction.paymentStatus]}>
                            {transaction.paymentStatus}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm text-gray-500">
                          {transaction.paymentReference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          {/* Client Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{clientMetrics.total}</p>
                    <p className="text-sm text-gray-600">Total Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{clientMetrics.active}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Building className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{clientMetrics.corporate}</p>
                    <p className="text-sm text-gray-600">Corporate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{clientMetrics.upcomingRenewals}</p>
                    <p className="text-sm text-gray-600">Renewals Due</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client List */}
          <Card>
            <CardHeader>
              <CardTitle>Client Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-sm">No clients yet</div>
                  </div>
                ) : (
                  recentClients.map((client) => (
                    <div key={client.memberId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {client.firstName[0]}{client.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {client.firstName} {client.lastName}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Mail className="w-3 h-3" />
                            {client.email}
                            {client.phone && (
                              <>
                                <Phone className="w-3 h-3 ml-2" />
                                {client.phone}
                              </>
                            )}
                          </div>
                          {client.companyName && (
                            <div className="flex items-center text-sm text-blue-600">
                              <Building className="w-3 h-3 mr-1" />
                              {client.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={membershipStatusColors[client.membershipStatus]}>
                          {client.membershipStatus}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          Enrolled: {format(new Date(client.enrollmentDate), 'MMM yyyy')}
                        </div>
                        {client.renewalDate && (
                          <div className="text-sm text-gray-500">
                            Renews: {format(new Date(client.renewalDate), 'MMM yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPercentage(performance.leadConversionRate)}
                  </div>
                  <div className="text-sm text-gray-500">Lead Conversion Rate</div>
                </div>

                <div className="text-center p-6 border rounded-lg">
                  <DollarSign className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(performance.averageDealSize)}
                  </div>
                  <div className="text-sm text-gray-500">Average Deal Size</div>
                </div>

                <div className="text-center p-6 border rounded-lg">
                  <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPercentage((performance.ytdPremium / agent.targetAnnualPremium) * 100)}
                  </div>
                  <div className="text-sm text-gray-500">Target Achievement</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Agent Code</label>
                    <div className="mt-1 text-lg">{agent.agentCode}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div className="mt-1 text-lg">{agent.userEmail}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Agent Type</label>
                    <div className="mt-1 capitalize">{agent.agentType.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Team</label>
                    <div className="mt-1">{agent.teamName || 'Not Assigned'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Join Date</label>
                    <div className="mt-1">
                      {format(new Date(agent.joinDate), 'MMMM d, yyyy')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Commission Tier</label>
                    <div className="mt-1">{agent.tierName || 'Not Assigned'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={agent.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}