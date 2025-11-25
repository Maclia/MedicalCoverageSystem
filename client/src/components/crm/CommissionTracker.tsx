import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

interface CommissionTransaction {
  id: string;
  agentId: string;
  memberId: number;
  amount: number;
  rate: number;
  premiumAmount: number;
  baseCommission: number;
  bonusCommission: number;
  overrideCommission: number;
  totalCommission: number;
  paymentDate: string;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'rejected' | 'held';
  paymentReference?: string;
  commissionPeriod: string;
  transactionType: string;
  createdAt: string;
  memberName?: string;
  memberEmail?: string;
  agentName?: string;
  companyName?: string;
}

interface CommissionSummary {
  period: string;
  totalCommission: number;
  totalPremium: number;
  averageCommissionRate: number;
  transactionCount: number;
  paidAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  heldAmount: number;
}

interface AgentCommissionData {
  agentId: string;
  agentName: string;
  agentCode: string;
  teamName?: string;
  ytdPremium: number;
  ytdCommission: number;
  targetAchievement: number;
  commissionRate: number;
  tierBonusEligible: boolean;
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  held: "bg-gray-100 text-gray-800"
};

interface CommissionTrackerProps {
  agentId?: string;
  isAdmin?: boolean;
}

export default function CommissionTracker({ agentId, isAdmin = false }: CommissionTrackerProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedAgent, setSelectedAgent] = useState<string>(agentId || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const queryClient = useQueryClient();

  // Fetch commission transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/crm/agents', selectedAgent, 'commission', selectedPeriod],
    queryFn: async () => {
      const url = selectedAgent === 'all'
        ? `/api/crm/commission-tiers/commission/summary?period=${selectedYear}`
        : `/api/crm/agents/${selectedAgent}/commission?period=${selectedPeriod}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch commission data');
      }
      return response.json();
    },
    enabled: !!selectedAgent
  });

  // Process commission payments mutation
  const processPaymentsMutation = useMutation({
    mutationFn: async (period: string) => {
      const response = await fetch('/api/crm/commission/process-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period })
      });
      if (!response.ok) {
        throw new Error('Failed to process payments');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/commission-tiers'] });
      setIsProcessDialogOpen(false);
    }
  });

  // Mock agent data for admin view - in real app, this would come from API
  const mockAgents: AgentCommissionData[] = [
    {
      agentId: '1',
      agentName: 'agent1@company.com',
      agentCode: 'AGT1234',
      teamName: 'Sales Team A',
      ytdPremium: 2500000,
      ytdCommission: 125000,
      targetAchievement: 83.3,
      commissionRate: 5.0,
      tierBonusEligible: true
    },
    {
      agentId: '2',
      agentName: 'agent2@company.com',
      agentCode: 'AGT5678',
      teamName: 'Sales Team B',
      ytdPremium: 1800000,
      ytdCommission: 90000,
      targetAchievement: 72.0,
      commissionRate: 5.0,
      tierBonusEligible: false
    }
  ];

  const transactions: CommissionTransaction[] = transactionsData?.transactions || [];
  const performance = transactionsData?.performance;
  const summary = transactionsData?.summary;

  // Generate chart data for commission trends
  const chartData = useMemo(() => {
    const months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const monthStr = format(monthDate, 'yyyy-MM');

      // Mock data for demonstration - in real app, this would come from API
      const commission = Math.random() * 50000 + 10000;
      const premium = commission * 20; // Assuming 5% average commission rate

      months.push({
        month: format(monthDate, 'MMM yyyy'),
        commission: Math.round(commission),
        premium: Math.round(premium),
        rate: 5.0 + Math.random() * 2
      });
    }

    return months;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.paymentStatus === selectedStatus);
    }

    return filtered;
  }, [transactions, selectedStatus]);

  const commissionSummary = useMemo(() => {
    const summary = {
      total: filteredTransactions.reduce((sum, t) => sum + t.totalCommission, 0),
      pending: filteredTransactions.filter(t => t.paymentStatus === 'pending').reduce((sum, t) => sum + t.totalCommission, 0),
      approved: filteredTransactions.filter(t => t.paymentStatus === 'approved').reduce((sum, t) => sum + t.totalCommission, 0),
      paid: filteredTransactions.filter(t => t.paymentStatus === 'paid').reduce((sum, t) => sum + t.totalCommission, 0),
      rejected: filteredTransactions.filter(t => t.paymentStatus === 'rejected').reduce((sum, t) => sum + t.totalCommission, 0),
      count: filteredTransactions.length
    };

    return summary;
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KES', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const handleProcessPayments = () => {
    processPaymentsMutation.mutate(selectedYear);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commission Tracker</h1>
          <p className="text-gray-600">
            Monitor and manage commission payments and performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Process Payments
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process Commission Payments</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>
                    This will process all pending commission payments for {selectedYear}.
                    Are you sure you want to continue?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProcessPayments}
                      disabled={processPaymentsMutation.isPending}
                    >
                      {processPaymentsMutation.isPending ? 'Processing...' : 'Process Payments'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {isAdmin && (
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {mockAgents.map((agent) => (
                    <SelectItem key={agent.agentId} value={agent.agentId}>
                      {agent.agentName} ({agent.agentCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 3 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="held">Held</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commission</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(commissionSummary.total)}
                </p>
                <p className="text-sm text-gray-500">
                  {commissionSummary.count} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(commissionSummary.pending)}
                </p>
                <p className="text-sm text-gray-500">
                  {filteredTransactions.filter(t => t.paymentStatus === 'pending').length} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(commissionSummary.paid)}
                </p>
                <p className="text-sm text-gray-500">
                  {filteredTransactions.filter(t => t.paymentStatus === 'paid').length} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(commissionSummary.rejected)}
                </p>
                <p className="text-sm text-gray-500">
                  {filteredTransactions.filter(t => t.paymentStatus === 'rejected').length} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="trends">Commission Trends</TabsTrigger>
          {isAdmin && <TabsTrigger value="agents">Agent Performance</TabsTrigger>}
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  Loading transactions...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Agent</th>
                        <th className="text-left p-3">Member</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-right p-3">Premium</th>
                        <th className="text-right p-3">Commission</th>
                        <th className="text-right p-3">Rate</th>
                        <th className="text-center p-3">Status</th>
                        <th className="text-left p-3">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{transaction.agentName}</div>
                              <div className="text-sm text-gray-500">{transaction.agentName}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{transaction.memberName}</div>
                              <div className="text-sm text-gray-500">{transaction.memberEmail}</div>
                              {transaction.companyName && (
                                <div className="text-sm text-blue-600">{transaction.companyName}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="capitalize text-sm">
                              {transaction.transactionType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(transaction.premiumAmount)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(transaction.totalCommission)}
                          </td>
                          <td className="p-3 text-right">
                            {formatPercentage(transaction.rate / 100)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={paymentStatusColors[transaction.paymentStatus]}>
                              {transaction.paymentStatus}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {transaction.commissionPeriod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Commission"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Premium vs Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="premium" fill="#8884d8" name="Premium" />
                    <Bar dataKey="commission" fill="#82ca9d" name="Commission" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAgents.map((agent) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{agent.agentName}</div>
                          <div className="text-sm text-gray-500">
                            {agent.agentCode} • {agent.teamName}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-right">
                        <div>
                          <div className="font-medium">{formatCurrency(agent.ytdPremium)}</div>
                          <div className="text-sm text-gray-500">YTD Premium</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatCurrency(agent.ytdCommission)}</div>
                          <div className="text-sm text-gray-500">YTD Commission</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatPercentage(agent.commissionRate / 100)}</div>
                          <div className="text-sm text-gray-500">Commission Rate</div>
                        </div>
                        <div>
                          <div className="font-medium">{formatPercentage(agent.targetAchievement / 100)}</div>
                          <div className="text-sm text-gray-500">Target Achievement</div>
                          <Progress value={agent.targetAchievement} className="mt-1 h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}