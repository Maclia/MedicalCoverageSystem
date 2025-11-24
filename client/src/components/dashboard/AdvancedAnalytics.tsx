import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/utils/format";

interface KPIData {
  current: number;
  previous: number;
  projected: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export default function AdvancedAnalytics() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '1y'>('90d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Enhanced analytics queries
  const { data: claimsAnalytics, isLoading: claimsLoading } = useQuery({
    queryKey: ['/api/analytics/claims-frequence', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/claims-frequency?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch claims analytics');
      return response.json();
    },
    refetchInterval: autoRefresh ? 15000 : false, // 15-second refresh for real-time data
  });

  const { data: costProjections, isLoading: costsLoading } = useQuery({
    queryKey: ['/api/analytics/cost-projections', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/cost-projections?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch cost projections');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30-second refresh
  });

  const { data: memberMetrics, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/analytics/member-health-metrics', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/member-health-metrics?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch member metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? 20000 : false, // 20-second refresh
  });

  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['/api/analytics/utilization-rates', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/utilization-rates?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch utilization data');
      return response.json();
    },
    refetchInterval: autoRefresh ? 25000 : false, // 25-second refresh
  });

  const { data: roiAnalysis, isLoading: roiLoading } = useQuery({
    queryKey: ['/api/analytics/premium-roi', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/premium-roi?range=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch ROI analysis');
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false, // 1-minute refresh for less frequently changing data
  });

  const formatTrendBadge = (trend: string, changePercent: number) => {
    const baseClasses = "text-xs font-medium px-2 py-1 rounded";
    switch (trend) {
      case 'up':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'down':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '📊';
    }
  };

  if (claimsLoading || costsLoading || membersLoading || utilizationLoading || roiLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
            <p className="ml-4 text-lg font-medium">Loading advanced analytics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Advanced Analytics Dashboard
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Auto-refresh:</span>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? '🔄 On' : '⏸️ Off'}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Time Range:</span>
                {['30d', '90d', '1y'].map((range) => (
                  <Button
                    key={range}
                    variant={selectedTimeRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeRange(range as any)}
                  >
                    {range === '30d' ? '30 Days' :
                     range === '90d' ? '90 Days' : '1 Year'}
                  </Button>
                ))}
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time KPI tracking with AI-powered projections and industry benchmarking
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Claims Frequency</p>
                <p className="text-2xl font-bold text-gray-900">
                  {claimsAnalytics?.frequency?.current || 0}
                </p>
              </div>
              <div className="text-right">
                <Badge className={formatTrendBadge(
                  claimsAnalytics?.frequency?.trend || 'stable',
                  claimsAnalytics?.frequency?.changePercent || 0
                )}>
                  {getTrendIcon(claimsAnalytics?.frequency?.trend || 'stable')}
                  {' '}
                  {Math.abs(claimsAnalytics?.frequency?.changePercent || 0).toFixed(1)}%
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {claimsAnalytics?.frequency?.periodDescription}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Claim Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(costProjections?.averageCost?.current || 0)}
                </p>
              </div>
              <div className="text-right">
                <Badge className={formatTrendBadge(
                  costProjections?.averageCost?.trend || 'stable',
                  costProjections?.averageCost?.changePercent || 0
                )}>
                  {getTrendIcon(costProjections?.averageCost?.trend || 'stable')}
                  {' '}
                  {Math.abs(costProjections?.averageCost?.changePercent || 0).toFixed(1)}%
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {costProjections?.periodDescription}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Member Health Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {memberMetrics?.healthScore?.current || 0}
                </p>
              </div>
              <div className="text-right">
                <Badge className={formatTrendBadge(
                  memberMetrics?.healthScore?.trend || 'stable',
                  memberMetrics?.healthScore?.changePercent || 0
                )}>
                  {getTrendIcon(memberMetrics?.healthScore?.trend || 'stable')}
                  {' '}
                  {Math.abs(memberMetrics?.healthScore?.changePercent || 0).toFixed(1)}%
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {memberMetrics?.healthDescription}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {utilizationData?.utilizationRate?.current || 0}%
                </p>
              </div>
              <div className="text-right">
                <Badge className={formatTrendBadge(
                  utilizationData?.utilizationRate?.trend || 'stable',
                  utilizationData?.utilizationRate?.changePercent || 0
                )}>
                  {getTrendIcon(utilizationData?.utilizationRate?.trend || 'stable')}
                  {' '}
                  {Math.abs(utilizationData?.utilizationRate?.changePercent || 0).toFixed(1)}%
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {utilizationData?.periodDescription}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Sections */}
      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="claims">Claims Analysis</TabsTrigger>
          <TabsTrigger value="costs">Cost Projections</TabsTrigger>
          <TabsTrigger value="members">Member Metrics</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
        </TabsList>

        {/* Claims Analysis */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Frequency Analysis</CardTitle>
              <CardDescription>
                AI-powered claims pattern analysis with fraud detection indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium mb-4">Monthly Claims Trend</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    {claimsAnalytics?.monthlyTrend?.map((data: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span className="text-sm">{data.month}</span>
                        <div className="flex items-center">
                          <span className="text-lg font-bold mr-2">{data.count}</span>
                          <Badge className={
                            data.anomaly ? 'bg-red-100 text-red-800' :
                            data.trend === 'up' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                          }>
                            {data.anomaly ? '🚨 Anomaly' :
                             data.trend === 'up' ? '📈 Rising' : '✅ Normal'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium mb-4">Fraud Risk Indicators</h4>
                  <div className="space-y-3">
                    {claimsAnalytics?.fraudIndicators?.map((indicator: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{indicator.type}</span>
                          <Badge className={
                            indicator.risk === 'high' ? 'bg-red-100 text-red-800' :
                            indicator.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {indicator.risk.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{indicator.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Projections */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Projections & Forecasting</CardTitle>
              <CardDescription>
                AI-powered cost predictions with seasonal adjustments and market trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Next Quarter Projection</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(costProjections?.nextQuarter || 0)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Based on current trends and seasonal patterns
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Annual Forecast</h4>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(costProjections?.annualForecast || 0)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    12-month projection with 95% confidence
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Cost Savings Opportunities</h4>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(costProjections?.savingsOpportunities || 0)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Identified by AI analysis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Metrics */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Health & Utilization</CardTitle>
              <CardDescription>
                Comprehensive member health scoring with wellness integration insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium mb-4">Health Distribution</h4>
                  <div className="space-y-2">
                    {['Excellent', 'Good', 'Fair', 'Poor'].map((level, index) => (
                      <div key={level} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{level}</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className={`h-2 rounded-full ${
                                level === 'Excellent' ? 'bg-green-500' :
                                level === 'Good' ? 'bg-blue-500' :
                                level === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{
                                width: `${(memberMetrics?.healthDistribution?.[level.toLowerCase()] || 0) * 32}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold">
                            {memberMetrics?.healthDistribution?.[level.toLowerCase()] || 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium mb-4">Utilization Trends</h4>
                  <div className="space-y-3">
                    {memberMetrics?.utilizationCategories?.map((category: any, index: number) => (
                      <div key={index} className="border-b last:border-b-0 pb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{category.name}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold">{category.rate}%</span>
                            <Badge className={
                              category.trend === 'up' ? 'bg-green-100 text-green-800' :
                              category.trend === 'down' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            } className="ml-2">
                              {category.trend === 'up' ? '↑' :
                               category.trend === 'down' ? '↓' : '→'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{category.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Analysis */}
        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premium ROI Analysis</CardTitle>
              <CardDescription>
                Comparative benchmarking against industry standards with performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium mb-4">ROI Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Current ROI</span>
                      <span className="text-lg font-bold text-green-600">
                        {roiAnalysis?.currentROI || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Industry Average</span>
                      <span className="text-lg font-bold">
                        {roiAnalysis?.industryAverageROI || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Performance vs Industry</span>
                      <Badge className={
                        (roiAnalysis?.currentROI || 0) > (roiAnalysis?.industryAverageROI || 0)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }>
                        {(roiAnalysis?.currentROI || 0) > (roiAnalysis?.industryAverageROI || 0)
                          ? 'Above Average' : 'Below Average'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium mb-4">Optimization Recommendations</h4>
                  <div className="space-y-2">
                    {roiAnalysis?.recommendations?.map((rec: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-start">
                          <span className="text-lg mr-2">💡</span>
                          <div>
                            <p className="text-sm font-medium text-yellow-800">{rec.title}</p>
                            <p className="text-xs text-yellow-600">{rec.description}</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Potential Savings: {formatCurrency(rec.potentialSavings)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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