import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  Calendar,
  Activity,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { EmailManagement } from './EmailManagement';
import { OnboardingManagement } from './OnboardingManagement';
import { DocumentReviewQueue } from './DocumentReviewQueue';

interface AdminDashboardProps {
  userRole: string;
  userName?: string;
}

interface QuickStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userRole, userName }) => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - in a real app, this would come from APIs
  const quickStats: QuickStat[] = [
    {
      label: 'Active Members',
      value: '2,451',
      change: '+12%',
      trend: 'up',
      icon: <Users className="h-5 w-5" />
    },
    {
      label: 'Onboarding Completion',
      value: '87%',
      change: '+5%',
      trend: 'up',
      icon: <TrendingUp className="h-5 w-5" />
    },
    {
      label: 'Pending Documents',
      value: '34',
      change: '-8%',
      trend: 'down',
      icon: <FileText className="h-5 w-5" />
    },
    {
      label: 'Email Sent Today',
      value: '1,124',
      change: '+18%',
      trend: 'up',
      icon: <Mail className="h-5 w-5" />
    }
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
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
                  </div>
                </div>
                <div className={`text-right ${getTrendColor(stat.trend)}`}>
                  <div className="flex items-center space-x-1">
                    <span>{getTrendIcon(stat.trend)}</span>
                    <span className="text-sm font-medium">{stat.change}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              onClick={() => setActiveTab('onboarding')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-2"
            >
              <Users className="h-6 w-6" />
              <span>Onboarding</span>
            </Button>
            <Button
              onClick={() => setActiveTab('email')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-2"
            >
              <Mail className="h-6 w-6" />
              <span>Email</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/members')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-2"
            >
              <Eye className="h-6 w-6" />
              <span>Members</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/analytics')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-2"
            >
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button
              onClick={() => navigate('/admin/documents')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center space-y-2"
            >
              <FileText className="h-6 w-6" />
              <span>Documents</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">All Systems Operational</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-600">Email Service</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Active</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-600">Background Jobs</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Running</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-600">Database</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">New member registered</p>
                      <p className="text-sm text-blue-700">John Doe completed onboarding Day 1</p>
                      <p className="text-xs text-blue-600">2 minutes ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border-l-4 border-green-500 bg-green-50">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Onboarding completed</p>
                      <p className="text-sm text-green-700">Jane Smith finished 7-day journey</p>
                      <p className="text-xs text-green-600">15 minutes ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border-l-4 border-yellow-500 bg-yellow-50">
                    <div className="flex-shrink-0">
                      <Mail className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">Email campaign sent</p>
                      <p className="text-sm text-yellow-700">Weekly progress reminder to 25 members</p>
                      <p className="text-xs text-yellow-600">1 hour ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border-l-4 border-purple-500 bg-purple-50">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">Document review queue</p>
                      <p className="text-sm text-purple-700">12 documents pending verification</p>
                      <p className="text-xs text-purple-600">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">7-Day Completion Rate</span>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Days to Complete</span>
                      <span className="text-sm font-medium">5.2</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '74%' }}></div>
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
                      <span className="text-sm font-medium">1,247</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '51%' }}></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Portal Adoption Rate</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingManagement userRole={userRole} />
        </TabsContent>

        <TabsContent value="email">
          <EmailManagement userRole={userRole} />
        </TabsContent>

        <TabsContent value="system">
          <div className="space-y-6">
            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Email Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Email Service</label>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Daily Digest</label>
                        <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Automatic Reminders</label>
                        <Badge className="bg-blue-100 text-blue-800">Enabled</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Background Jobs</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Email Queue Processor</label>
                        <Badge className="bg-green-100 text-green-800">Running</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Data Cleanup</label>
                        <Badge className="bg-green-100 text-green-800">Scheduled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Score Updates</label>
                        <Badge className="bg-green-100 text-green-800">Running</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Environment</span>
                        <Badge className="bg-blue-100 text-blue-800">Development</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Version</span>
                        <span className="text-sm font-medium">v2.1.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Updated</span>
                        <span className="text-sm font-medium">{new Date().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Database Status</span>
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};