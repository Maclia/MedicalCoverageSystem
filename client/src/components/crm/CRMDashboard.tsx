import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Activity,
  Calendar,
  Filter
} from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CRMDashboard() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedAgent, setSelectedAgent] = useState("all");

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/crm/analytics/dashboard', dateRange, selectedAgent],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));

      const params = new URLSearchParams({
        dateRange: `${startDate.toISOString()},${endDate.toISOString()}`,
        ...(selectedAgent !== "all" && { agentId: selectedAgent })
      });

      const response = await fetch(`/api/crm/analytics/dashboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    }
  });

  // Fetch lead source analytics
  const { data: leadSourceData, isLoading: leadSourceLoading } = useQuery({
    queryKey: ['/api/crm/analytics/lead-sources', dateRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, 90); // 90 days for lead source analysis

      const response = await fetch(`/api/crm/analytics/lead-sources?dateRange=${startDate.toISOString()},${endDate.toISOString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead source data');
      }
      return response.json();
    }
  });

  // Fetch sales performance data
  const { data: salesPerformanceData, isLoading: salesPerformanceLoading } = useQuery({
    queryKey: ['/api/crm/analytics/sales-performance', dateRange, selectedAgent],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateRange: dateRange,
        ...(selectedAgent !== "all" && { agentId: selectedAgent })
      });

      const response = await fetch(`/api/crm/analytics/sales-performance?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales performance data');
      }
      return response.json();
    }
  });

  // Fetch pipeline health data
  const { data: pipelineHealthData, isLoading: pipelineHealthLoading } = useQuery({
    queryKey: ['/api/crm/analytics/pipeline-health'],
    queryFn: async () => {
      const response = await fetch('/api/crm/analytics/pipeline-health');
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline health data');
      }
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KES', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (dashboardLoading || leadSourceLoading || salesPerformanceLoading || pipelineHealthLoading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  const kpis = dashboardData?.data?.kpis || {};
  const leadSourceAnalysis = leadSourceData?.data?.leadSourceAnalysis || [];
  const agentPerformance = salesPerformanceData?.data?.agentPerformance || [];
  const teamPerformance = salesPerformanceData?.data?.teamPerformance || [];
  const currentPipeline = pipelineHealthData?.data?.currentPipeline || [];
  const pipelineHealth = pipelineHealthData?.data?.pipelineHealth || {};

  // Prepare chart data
  const leadSourceChartData = leadSourceAnalysis.map(source => ({
    name: source.source.replace('_', ' ').charAt(0).toUpperCase() + source.source.slice(1),
    value: source.totalLeads,
    conversionRate: source.conversionRate
  }));

  const pipelineChartData = currentPipeline.map(stage => ({
    name: stage.stage.replace('_', ' ').charAt(0).toUpperCase() + stage.stage.slice(1),
    value: stage.totalValue || 0,
    count: stage.count,
    weightedValue: stage.weightedValue || 0
  }));

  // Prepare trend data (mock data for now - would come from API)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return {
      date: format(date, 'MMM dd'),
      leads: Math.floor(Math.random() * 20) + 5,
      conversions: Math.floor(Math.random() * 5) + 1,
      value: Math.floor(Math.random() * 500000) + 100000
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your sales performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentPerformance.map((agent: any) => (
                <SelectItem key={agent.agentId} value={agent.agentId.toString()}>
                  {agent.agentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalLeads || 0}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+{kpis.newLeads || 0} new</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.conversionRate || 0}%</p>
                <Progress value={kpis.conversionRate || 0} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(kpis.pipelineValue || 0)}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">
                    {kpis.totalOpportunities || 0} opportunities
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.winRate || 0}%</p>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="text-xs">
                    {kpis.closedWonOpportunities || 0} won
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Lead Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Generation Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="New Leads"
                    />
                    <Line
                      type="monotone"
                      dataKey="conversions"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Conversions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pipeline Value by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Value by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="value" fill="#8884d8" name="Pipeline Value" />
                    <Bar dataKey="weightedValue" fill="#82ca9d" name="Weighted Value" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lead Sources Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadSourceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadSourceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {leadSourceAnalysis.map((source: any, index: number) => (
                    <div key={source.source} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{source.source.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-500">{source.totalLeads} leads</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{source.conversionRate}%</div>
                        <div className="text-sm text-gray-500">conversion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance.map((team: any) => (
                  <div key={team.teamId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{team.teamName}</h3>
                      <Badge variant="outline">{team.agentCount} agents</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Target</div>
                        <div className="font-medium">{formatCurrency(team.totalTarget)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">YTD Premium</div>
                        <div className="font-medium">{formatCurrency(team.totalYtdPremium)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Achievement</div>
                        <div className="font-medium">{team.targetAchievement}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Avg Conversion</div>
                        <div className="font-medium">{team.avgConversionRate}%</div>
                      </div>
                    </div>
                    <Progress value={team.targetAchievement} className="mt-3 h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentPerformance
                  .sort((a: any, b: any) => b.totalYtdPremium - a.totalYtdPremium)
                  .slice(0, 10)
                  .map((agent: any, index: number) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{agent.agentName}</div>
                          <div className="text-sm text-gray-500">{agent.teamName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(agent.totalYtdPremium)}</div>
                        <div className="text-sm text-gray-500">{agent.conversionRate}% conversion</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Pipeline Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{pipelineHealth.totalOpportunities}</div>
                  <div className="text-sm text-gray-500">Total Opportunities</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(pipelineHealth.totalValue)}</div>
                  <div className="text-sm text-gray-500">Total Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(pipelineHealth.weightedValue)}</div>
                  <div className="text-sm text-gray-500">Weighted Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{pipelineHealth.healthScore}%</div>
                  <div className="text-sm text-gray-500">Health Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stage Conversion Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineHealthData?.data?.conversionRates?.map((stage: any) => (
                  <div key={stage.stage} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">{stage.stage.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">
                        {stage.totalDeals} total deals, {stage.wonDeals} won
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{stage.conversionRate}%</div>
                      <Progress value={stage.conversionRate} className="mt-1 h-2 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          {/* Lead Source Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Source</th>
                      <th className="text-right p-2">Total Leads</th>
                      <th className="text-right p-2">Qualified</th>
                      <th className="text-right p-2">Converted</th>
                      <th className="text-right p-2">Conversion Rate</th>
                      <th className="text-right p-2">Avg Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourceAnalysis.map((source: any) => (
                      <tr key={source.source} className="border-b">
                        <td className="p-2 capitalize">{source.source.replace('_', ' ')}</td>
                        <td className="text-right p-2">{source.totalLeads}</td>
                        <td className="text-right p-2">{source.qualifiedLeads}</td>
                        <td className="text-right p-2">{source.convertedLeads}</td>
                        <td className="text-right p-2">
                          <Badge variant={source.conversionRate > 10 ? "default" : "secondary"}>
                            {source.conversionRate}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">{formatCurrency(source.avgValuePerLead)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}