import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { useAuth } from '@/features/actions/contexts/AuthContext';
import { analyticsApi } from '../../services/api/analyticsApi';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const CompanyDashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch dashboard statistics from backend API
  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['companyDashboardStats'],
    queryFn: () => analyticsApi.getCompanyDashboardStats()
  });
  const stats = statsResponse?.data as any;

  // Fetch recent claims from backend API
  const { data: claimsResponse, isLoading: claimsLoading, error: claimsError } = useQuery({
    queryKey: ['companyRecentClaims'],
    queryFn: () => analyticsApi.getClaimsAnalytics({ groupBy: 'status' })
  });
  const recentClaims = Array.isArray(claimsResponse?.data) ? claimsResponse.data : [];

  const loading = statsLoading || claimsLoading;
  const error = statsError || claimsError;

  const quickActions = [
    {
      title: 'View Employees',
      description: 'Manage covered employees',
      icon: UserGroupIcon,
      href: '/members',
      color: 'blue',
    },
    {
      title: 'Fund Utilization',
      description: 'View spending breakdown',
      icon: ChartBarIcon,
      href: '/finance',
      color: 'green',
    },
    {
      title: 'View Claims',
      description: 'Track all claim statuses',
      icon: ClipboardDocumentListIcon,
      href: '/claims',
      color: 'purple',
    },
    {
      title: 'Benefit Plans',
      description: 'Manage coverage benefits',
      icon: DocumentTextIcon,
      href: '/benefits',
      color: 'orange',
    },
    {
      title: 'Premium Payments',
      description: 'View payment history',
      icon: CurrencyDollarIcon,
      href: '/premiums',
      color: 'teal',
    },
    {
      title: 'Scheme Settings',
      description: 'Configure plan settings',
      icon: CreditCardIcon,
      href: '/schemes-management',
      color: 'gray',
    },
  ];

  const getStatusColor = (status: 'completed' | 'pending' | 'scheduled' | 'failed' | string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionColor = (color: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'gray' | string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
      gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
    };
    return colors[color] || 'bg-gray-50 text-gray-600 hover:bg-gray-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'Company Admin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Current Period: April 2026
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalEmployees} total employees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund Utilization</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fundUtilization}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${stats.fundUtilization}%` }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <ClipboardDocumentListIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClaims}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-yellow-600">{stats.pendingClaims} pending</span> · {stats.approvedClaims} approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {stats.remainingBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly premium: KSh {stats.monthlyPremium.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getActionColor(action.color)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claims">Recent Claims</TabsTrigger>
          <TabsTrigger value="utilization">Utilization Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>Latest claims submitted for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                      <p className="font-medium">{claim.employee}</p>
                      <p className="text-sm text-muted-foreground">{claim.service}</p>
                      <p className="text-xs text-muted-foreground">{claim.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">KSh {claim.amount.toLocaleString()}</p>
                        <Badge className={getStatusColor(claim.status)}>
                          {claim.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">View All Claims</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle>Fund Utilization Breakdown</CardTitle>
              <CardDescription>Current period spending by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Outpatient</span>
                  <span className="font-semibold">KSh 1,245,000 (38%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '38%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Inpatient</span>
                  <span className="font-semibold">KSh 980,000 (30%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Dental</span>
                  <span className="font-semibold">KSh 425,000 (13%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '13%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Optical</span>
                  <span className="font-semibold">KSh 340,000 (11%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '11%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Maternity</span>
                  <span className="font-semibold">KSh 255,000 (8%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Premium Payment History</CardTitle>
              <CardDescription>Your monthly premium payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { month: 'April 2026', amount: 485000, status: 'paid', dueDate: '2026-04-01' },
                  { month: 'March 2026', amount: 485000, status: 'paid', dueDate: '2026-03-01' },
                  { month: 'February 2026', amount: 475000, status: 'paid', dueDate: '2026-02-01' },
                  { month: 'January 2026', amount: 475000, status: 'paid', dueDate: '2026-01-01' },
                ].map((payment, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-medium">{payment.month}</p>
                      <p className="text-sm text-muted-foreground">Due: {payment.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">KSh {payment.amount.toLocaleString()}</p>
                      <Badge className="bg-green-100 text-green-800">{payment.status}</Badge>
                    </div>
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

export default CompanyDashboard;