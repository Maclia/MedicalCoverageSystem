import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  Users,
  Award,
  AlertCircle,
  Target,
  BarChart3,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceMetrics {
  period: string;
  totalClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  approvalRate: number;
  denialRate: number;
  totalReimbursed: number;
  averageClaimAmount: number;
  averageProcessingTime: number;
  qualityScores: {
    overall: number;
    satisfaction: number;
    compliance: number;
  };
  monthlyTrends: Array<{
    month: string;
    totalClaims: number;
    approvedClaims: number;
    deniedClaims: number;
    totalAmount: number;
  }>;
}

const PerformanceTracker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');

  useEffect(() => {
    if (id) {
      fetchPerformanceMetrics(parseInt(id), selectedPeriod);
    }
  }, [id, selectedPeriod]);

  const fetchPerformanceMetrics = async (providerId: number, period: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers/${providerId}/performance?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Available</h3>
          <p className="text-gray-600 text-center">
            Performance metrics will be available once the provider has processed claims.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Provider Performance Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive performance metrics and trend analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="period">Period:</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold">{metrics.totalClaims}</p>
                <p className="text-xs text-gray-500">
                  {metrics.approvedClaims} approved, {metrics.deniedClaims} denied
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold">{metrics.approvalRate.toFixed(1)}%</p>
                <p className="text-xs text-red-600">
                  Denial rate: {metrics.denialRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold">{metrics.averageProcessingTime.toFixed(1)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Reimbursed</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalReimbursed)}</p>
                <p className="text-xs text-gray-500">
                  Avg: {formatCurrency(metrics.averageClaimAmount)} per claim
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Scores</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claims Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Claims Performance</CardTitle>
                <CardDescription>Detailed breakdown of claims processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Claims Processed</span>
                    <span className="font-bold">{metrics.totalClaims}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved Claims</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">{metrics.approvedClaims}</span>
                      <Badge variant="outline" className="text-green-600">
                        {metrics.approvalRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Denied Claims</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">{metrics.deniedClaims}</span>
                      <Badge variant="outline" className="text-red-600">
                        {metrics.denialRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Processing Time</span>
                    <span className="font-bold">{metrics.averageProcessingTime.toFixed(1)} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Claim Amount</span>
                    <span className="font-bold">{formatCurrency(metrics.averageClaimAmount)}</span>
                  </div>
                </div>

                {metrics.denialRate > 15 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      High denial rate detected. Consider reviewing submission patterns.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Revenue and financial metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Reimbursed</span>
                    <span className="font-bold text-lg">{formatCurrency(metrics.totalReimbursed)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Claim Amount</span>
                    <span className="font-bold">{formatCurrency(metrics.averageClaimAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue per Month</span>
                    <span className="font-bold">
                      {formatCurrency(metrics.totalReimbursed / Math.max(metrics.monthlyTrends.length, 1))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue Trend</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(
                        metrics.monthlyTrends[metrics.monthlyTrends.length - 1]?.totalAmount || 0,
                        metrics.monthlyTrends[metrics.monthlyTrends.length - 2]?.totalAmount || 0
                      )}
                      <span className="font-bold">
                        {calculateTrend(
                          metrics.monthlyTrends[metrics.monthlyTrends.length - 1]?.totalAmount || 0,
                          metrics.monthlyTrends[metrics.monthlyTrends.length - 2]?.totalAmount || 0
                        ).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Overall Quality Score</h3>
                  <p className={`text-3xl font-bold ${getScoreColor(metrics.qualityScores.overall)}`}>
                    {metrics.qualityScores.overall.toFixed(1)}/5
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Combined performance rating</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Patient Satisfaction</h3>
                  <p className={`text-3xl font-bold ${getScoreColor(metrics.qualityScores.satisfaction)}`}>
                    {metrics.qualityScores.satisfaction.toFixed(1)}/5
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Based on patient feedback</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Compliance Score</h3>
                  <p className={`text-3xl font-bold ${getScoreColor(metrics.qualityScores.compliance)}`}>
                    {metrics.qualityScores.compliance.toFixed(1)}/5
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Regulatory compliance rating</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Progress Bars */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Quality</span>
                  <span className="text-sm font-medium">{metrics.qualityScores.overall.toFixed(1)}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${(metrics.qualityScores.overall / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Patient Satisfaction</span>
                  <span className="text-sm font-medium">{metrics.qualityScores.satisfaction.toFixed(1)}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${(metrics.qualityScores.satisfaction / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Compliance</span>
                  <span className="text-sm font-medium">{metrics.qualityScores.compliance.toFixed(1)}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full"
                    style={{ width: `${(metrics.qualityScores.compliance / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Trends
              </CardTitle>
              <CardDescription>
                Claims volume and revenue trends over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.monthlyTrends.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total Amount']} />
                      <Bar dataKey="totalAmount" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No trend data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Claims Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.monthlyTrends.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="totalClaims" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="approvedClaims" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="deniedClaims" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No claims volume data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.monthlyTrends.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={
                        metrics.monthlyTrends.map(trend => ({
                          ...trend,
                          approvalRate: trend.totalClaims > 0 ? (trend.approvedClaims / trend.totalClaims) * 100 : 0
                        }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Approval Rate']} />
                        <Line type="monotone" dataKey="approvalRate" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No approval rate data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Comparison</CardTitle>
              <CardDescription>
                Compare provider performance against network averages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Benchmark comparison data will be available once network baselines are established.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceTracker;