import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
// import { useLocation, useNavigate } from 'wouter';

const InsuranceDashboard: React.FC = () => {
  const { user } = useAuth();
  // const [location] = useLocation();
  // const navigate = useNavigate();

  // Mock data - in real app, this would come from API
  const stats = {
    totalCompanies: 156,
    totalMembers: 124589,
    activeClaims: 1247,
    monthlyPremium: 2847592,
    satisfactionRate: 94.2,
  };

  const recentActivity = [
    { id: 1, type: 'company', action: 'New company onboarded', entity: 'Acme Corp', time: '2 hours ago', status: 'completed' },
    { id: 2, type: 'claim', action: 'High value claim submitted', entity: 'John Doe - $45,000', time: '4 hours ago', status: 'pending' },
    { id: 3, type: 'premium', action: 'Premium calculation completed', entity: 'Q4 2024 Rates', time: '6 hours ago', status: 'completed' },
    { id: 4, type: 'member', action: 'Batch member import', entity: '2,500 members', time: '1 day ago', status: 'completed' },
    { id: 5, type: 'system', action: 'Scheduled maintenance', entity: 'Database backup', time: '2 days ago', status: 'scheduled' },
  ];

  const quickActions = [
    {
      title: 'Add New Company',
      description: 'Register a new corporate client',
      icon: BuildingOfficeIcon,
      href: '/companies?action=new',
      color: 'blue',
    },
    {
      title: 'Manage Members',
      description: 'View and manage member enrollment',
      icon: UserGroupIcon,
      href: '/members',
      color: 'green',
    },
    {
      title: 'Process Claims',
      description: 'Review and process insurance claims',
      icon: ClipboardDocumentListIcon,
      href: '/claims',
      color: 'purple',
    },
    {
      title: 'Calculate Premiums',
      description: 'Generate premium calculations',
      icon: CurrencyDollarIcon,
      href: '/premiums',
      color: 'yellow',
    },
    {
      title: 'View Analytics',
      description: 'Access comprehensive reports',
      icon: ChartBarIcon,
      href: '/analytics',
      color: 'indigo',
    },
    {
      title: 'System Settings',
      description: 'Configure system parameters',
      icon: CogIcon,
      href: '/settings',
      color: 'gray',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      yellow: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
      indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Insurance Provider Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.entityData?.name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <BellIcon className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <Badge variant="outline" className="text-xs">Administrator</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMembers.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+8% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Claims</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeClaims.toLocaleString()}</p>
                  <p className="text-xs text-yellow-600">+5% from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Premium</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.monthlyPremium.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+15% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and management tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={`h-auto p-4 justify-start ${getActionColor(action.color)}`}
                        onClick={() => navigate(action.href)}
                      >
                        <Icon className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm opacity-75">{action.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system updates and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'company' ? 'bg-blue-100' :
                        activity.type === 'claim' ? 'bg-purple-100' :
                        activity.type === 'premium' ? 'bg-yellow-100' :
                        activity.type === 'member' ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        {
                          activity.type === 'company' ? <BuildingOfficeIcon className="h-4 w-4 text-blue-600" /> :
                          activity.type === 'claim' ? <ClipboardDocumentListIcon className="h-4 w-4 text-purple-600" /> :
                          activity.type === 'premium' ? <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" /> :
                          activity.type === 'member' ? <UserGroupIcon className="h-4 w-4 text-green-600" /> :
                          <CogIcon className="h-4 w-4 text-gray-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.entity}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Dashboard Sections */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database Status</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <Badge className="bg-green-100 text-green-800">124ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <Badge className="bg-blue-100 text-blue-800">1,247</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <Badge className="bg-green-100 text-green-800">2 hours ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ACA Compliance</span>
                  <div className="flex items-center">
                    <div className="h-2 w-24 bg-gray-200 rounded-full mr-2">
                      <div className="h-2 w-20 bg-green-500 rounded-full"></div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">98%</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Security</span>
                  <div className="flex items-center">
                    <div className="h-2 w-24 bg-gray-200 rounded-full mr-2">
                      <div className="h-2 w-24 bg-green-500 rounded-full"></div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">100%</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Audit Ready</span>
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Audit</span>
                  <Badge className="bg-blue-100 text-blue-800">45 days ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InsuranceDashboard;