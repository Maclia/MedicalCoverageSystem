import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { Badge } from '@/ui/badge';
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  Activity,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { DocumentReviewQueue } from './DocumentReviewQueue';
import ComplianceDashboard from './ComplianceDashboard';
import { useAdminDashboardSummary, useAdminServicesHealth } from '../../../services/api/adminApi';

interface AdminDashboardProps {
  userRole: string;
  userName?: string;
}

interface QuickStat {
  label: string;
  value: string;
  helper: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const toneClasses: Record<string, string> = {
  blue: 'border-l-4 border-blue-500 bg-blue-50 text-blue-900',
  green: 'border-l-4 border-green-500 bg-green-50 text-green-900',
  yellow: 'border-l-4 border-yellow-500 bg-yellow-50 text-yellow-900',
  purple: 'border-l-4 border-purple-500 bg-purple-50 text-purple-900',
  red: 'border-l-4 border-red-500 bg-red-50 text-red-900',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userRole, userName }) => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useAdminDashboardSummary();
  const { data: servicesHealth, isLoading: isLoadingServices, refetch: refetchServices } = useAdminServicesHealth();

  const quickStats = useMemo<QuickStat[]>(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Active Members',
        value: summary.quickStats.activeMembers.toLocaleString(),
        helper: `${summary.performance.dailyActiveUsers.toLocaleString()} engaged today`,
        trend: 'up',
        icon: <Users className="h-5 w-5" />,
      },
      {
        label: 'Onboarding Completion',
        value: `${summary.quickStats.onboardingCompletionRate}%`,
        helper: `${summary.performance.averageDaysToComplete} average days`,
        trend: summary.quickStats.onboardingCompletionRate >= 70 ? 'up' : 'neutral',
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: 'Pending Documents',
        value: summary.quickStats.pendingDocuments.toLocaleString(),
        helper: `${summary.documentSummary.needsMoreInfo} need more info`,
        trend: summary.quickStats.pendingDocuments > 0 ? 'down' : 'neutral',
        icon: <FileText className="h-5 w-5" />,
      },
      {
        label: 'Email Sent Today',
        value: summary.quickStats.emailsSentToday.toLocaleString(),
        helper: `${summary.performance.portalAdoptionRate}% portal adoption`,
        trend: 'up',
        icon: <BarChart3 className="h-5 w-5" />,
      },
    ];
  }, [summary]);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const healthyServices = servicesHealth?.filter((service) => service.healthy && !service.circuitBreakerOpen) ?? [];
  const hasServiceIssues = (servicesHealth?.length ?? 0) > healthyServices.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {userName || 'Admin'}! Manage your health coverage platform.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">
            <Shield className="h-3 w-3 mr-1" />
            {userRole}
          </Badge>
          <Button
            variant="outline"
            onClick={() => {
              refetchSummary();
              refetchServices();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingSummary
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="h-16 animate-pulse rounded bg-gray-100" />
                </CardContent>
              </Card>
            ))
          : quickStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.helper}</p>
                      </div>
                    </div>
                    <div className={`text-right ${getTrendColor(stat.trend)}`}>
                      <div className="flex items-center space-x-1">
                        <span>{getTrendIcon(stat.trend)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button onClick={() => setActiveTab('overview')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Users className="h-6 w-6" />
              <span>Overview</span>
            </Button>
            <Button onClick={() => navigate('/admin/members')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Eye className="h-6 w-6" />
              <span>Members</span>
            </Button>
            <Button onClick={() => navigate('/admin/analytics')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button onClick={() => setActiveTab('documents')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6" />
              <span>Documents</span>
            </Button>
            <Button onClick={() => setActiveTab('compliance')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Shield className="h-6 w-6" />
              <span>Compliance</span>
            </Button>
            <Button onClick={() => setActiveTab('system')} variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Settings className="h-6 w-6" />
              <span>System</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-3 rounded-lg border ${hasServiceIssues ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center space-x-2">
                {hasServiceIssues ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <span className={`font-medium ${hasServiceIssues ? 'text-yellow-900' : 'text-green-900'}`}>
                  {hasServiceIssues ? 'Some services need attention' : 'All monitored services operational'}
                </span>
              </div>
              <Badge className={hasServiceIssues ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                {healthyServices.length}/{servicesHealth?.length ?? 0} healthy
              </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {isLoadingServices ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                ))
              ) : (
                (servicesHealth ?? []).slice(0, 3).map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-gray-600 capitalize">{service.name} Service</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${service.healthy && !service.circuitBreakerOpen ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className={`text-sm ${service.healthy && !service.circuitBreakerOpen ? 'text-green-600' : 'text-yellow-600'}`}>
                        {service.healthy && !service.circuitBreakerOpen ? 'Healthy' : 'Attention'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest persisted member, document, and communication events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(summary?.recentActivity ?? []).map((item) => (
                    <div key={item.id} className={`flex items-center space-x-3 p-3 ${toneClasses[item.tone] || toneClasses.blue}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-sm opacity-90">{item.description}</p>
                        <p className="text-xs opacity-75">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {!isLoadingSummary && (summary?.recentActivity?.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-500">No recent admin activity was found.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">7-Day Completion Rate</span>
                      <span className="text-sm font-medium">{summary?.performance.sevenDayCompletionRate ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${summary?.performance.sevenDayCompletionRate ?? 0}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Days to Complete</span>
                      <span className="text-sm font-medium">{summary?.performance.averageDaysToComplete ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(((summary?.performance.averageDaysToComplete ?? 0) / 7) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Member Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Active Users</span>
                      <span className="text-sm font-medium">{summary?.performance.dailyActiveUsers ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(summary?.performance.portalAdoptionRate ?? 0, 100)}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Portal Adoption Rate</span>
                      <span className="text-sm font-medium">{summary?.performance.portalAdoptionRate ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(summary?.performance.portalAdoptionRate ?? 0, 100)}%` }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentReviewQueue userRole={userRole} />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Service Health</span>
              </CardTitle>
              <CardDescription>Live health data from the API gateway service registry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(servicesHealth ?? []).map((service) => (
                  <div key={service.name} className="flex justify-between border rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium capitalize">{service.name}</p>
                      <p className="text-sm text-gray-500">Response time: {service.responseTime}ms</p>
                    </div>
                    <Badge className={service.healthy && !service.circuitBreakerOpen ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {service.healthy && !service.circuitBreakerOpen ? 'Healthy' : 'Attention'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
