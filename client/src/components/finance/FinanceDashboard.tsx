import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import financeApi, { billingApi, paymentsApi, commissionsApi, claimsFinancialApi } from '@/services/financeApi';
import type { DashboardAnalytics, MetricCard } from '@/types/finance';

// Import module components
import BillingOverview from './billing/BillingOverview';
import PaymentsOverview from './payments/PaymentsOverview';
import CommissionsOverview from './commissions/CommissionsOverview';
import ClaimsFinancialOverview from './claimsFinancial/ClaimsFinancialOverview';
import TokenRevenueCard from './TokenRevenueCard';

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard analytics
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['finance', 'analytics', 'dashboard'],
    queryFn: () => billingApi.getDashboardAnalytics().then(res => res.data),
  });

  // Get module health status
  const { data: moduleHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['finance', 'modules', 'health'],
    queryFn: () => financeApi.module.getSystemHealth().then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isLoading = analyticsLoading || healthLoading;

  const getModuleStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMetricValue = (metric: MetricCard) => {
    if (typeof metric.value === 'number' && metric.title.toLowerCase().includes('amount')) {
      return formatCurrency(metric.value);
    }
    return metric.value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-300 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Finance Data</h3>
            <p className="text-gray-600">Please check your connection and try again.</p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Module Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Finance Dashboard</CardTitle>
              <p className="text-gray-600 mt-1">
                Complete financial management and analytics platform
              </p>
            </div>
            {moduleHealth && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">System Status:</span>
                <Badge className={getModuleStatusColor(moduleHealth.status)}>
                  {moduleHealth.status.toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.paidAmount > 0 &&
                      `${((analytics.paidAmount / analytics.totalAmount) * 100).toFixed(1)}% collected`
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">💰</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analytics.unpaidAmount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.totalInvoices > 0 &&
                      `${analytics.unpaidAmount > 0 ? Math.round((analytics.agingReport.overdue / analytics.unpaidAmount) * 100) : 0}% overdue`
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.metrics.collectionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg. {analytics.metrics.paymentSpeed} days to pay
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">⚡</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Automation Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.metrics.automationRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.totalInvoices} invoices processed
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🤖</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="claims">Claims Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Aging Report */}
            {analytics && (
              <Card>
                <CardHeader>
                  <CardTitle>Aging Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(analytics.agingReport.current)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Overdue</span>
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(analytics.agingReport.overdue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">30+ Days</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(analytics.agingReport.thirtyDays)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">60+ Days</span>
                      <span className="font-semibold text-red-700">
                        {formatCurrency(analytics.agingReport.sixtyDays)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">90+ Days</span>
                      <span className="font-semibold text-red-800">
                        {formatCurrency(analytics.agingReport.ninetyPlus)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Trends */}
            {analytics && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.trends.monthly.slice(-6).map((month, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{month.month}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(month.amount)}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({month.count} invoices)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Token Revenue Card */}
            <TokenRevenueCard />
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <BillingOverview />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsOverview />
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionsOverview />
        </TabsContent>

        <TabsContent value="claims">
          <ClaimsFinancialOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}