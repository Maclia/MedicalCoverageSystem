import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClaimsProcessingDashboard } from '@/components/claims/ClaimsProcessingDashboard';
import { MemberEOBViewer } from '@/components/claims/MemberEOBViewer';
import {
  FileText,
  Settings,
  BarChart3,
  Users,
  Eye,
  Shield,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ClaimsManagementProps {
  userRole: 'admin' | 'member' | 'provider' | 'adjuster';
  userName?: string;
  userId?: number;
}

export const ClaimsManagement: React.FC<ClaimsManagementProps> = ({
  userRole,
  userName,
  userId
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'eobs' | 'analytics' | 'settings'>('dashboard');

  // Role-based permissions
  const canViewDashboard = ['admin', 'provider', 'adjuster'].includes(userRole);
  const canViewEOBs = ['admin', 'member'].includes(userRole);
  const canViewAnalytics = ['admin', 'provider', 'adjuster'].includes(userRole);
  const canViewSettings = ['admin'].includes(userRole);

  const getRoleBadge = () => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      member: 'bg-blue-100 text-blue-800',
      provider: 'bg-green-100 text-green-800',
      adjuster: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={colors[userRole]}>
        <Shield className="h-3 w-3 mr-1" />
        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
      </Badge>
    );
  };

  const getDashboardStats = () => {
    // These would be real stats from the backend in a production app
    const stats = {
      admin: {
        totalClaims: 2847,
        processedToday: 156,
        pendingReview: 43,
        averageProcessingTime: 2.3,
        approvalRate: 87.5,
        fraudAlerts: 12
      },
      member: {
        totalClaims: 15,
        approvedClaims: 12,
        pendingClaims: 1,
        totalResponsibility: 1250,
        savedAmount: 8750
      },
      provider: {
        totalClaims: 342,
        pendingPayment: 28500,
        averageProcessingTime: 3.1,
        approvalRate: 92.3,
        monthlySubmissions: 28
      },
      adjuster: {
        claimsAssigned: 67,
        claimsReviewed: 45,
        averageReviewTime: 15,
        complexCases: 8,
        accuracyRate: 94.2
      }
    };

    return stats[userRole] || stats.admin;
  };

  const renderQuickStats = () => {
    const stats = getDashboardStats();

    const statCards = {
      admin: [
        { label: 'Total Claims', value: stats.totalClaims, icon: <FileText className="h-5 w-5" /> },
        { label: 'Processed Today', value: stats.processedToday, icon: <Clock className="h-5 w-5" /> },
        { label: 'Pending Review', value: stats.pendingReview, icon: <Eye className="h-5 w-5" /> },
        { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: <Shield className="h-5 w-5" /> }
      ],
      member: [
        { label: 'Total Claims', value: stats.totalClaims, icon: <FileText className="h-5 w-5" /> },
        { label: 'Approved Claims', value: stats.approvedClaims, icon: <TrendingUp className="h-5 w-5" /> },
        { label: 'Your Responsibility', value: `$${stats.totalResponsibility}`, icon: <Users className="h-5 w-5" /> },
        { label: 'Amount Saved', value: `$${stats.savedAmount}`, icon: <BarChart3 className="h-5 w-5" /> }
      ],
      provider: [
        { label: 'Total Claims', value: stats.totalClaims, icon: <FileText className="h-5 w-5" /> },
        { label: 'Pending Payment', value: `$${stats.pendingPayment.toLocaleString()}`, icon: <TrendingUp className="h-5 w-5" /> },
        { label: 'Monthly Submissions', value: stats.monthlySubmissions, icon: <Clock className="h-5 w-5" /> },
        { label: 'Approval Rate', value: `${stats.approvalRate}%`, icon: <BarChart3 className="h-5 w-5" /> }
      ],
      adjuster: [
        { label: 'Claims Assigned', value: stats.claimsAssigned, icon: <FileText className="h-5 w-5" /> },
        { label: 'Claims Reviewed', value: stats.claimsReviewed, icon: <Eye className="h-5 w-5" /> },
        { label: 'Avg Review Time', value: `${stats.averageReviewTime}m`, icon: <Clock className="h-5 w-5" /> },
        { label: 'Accuracy Rate', value: `${stats.accuracyRate}%`, icon: <BarChart3 className="h-5 w-5" /> }
      ]
    };

    const roleStats = statCards[userRole] || statCards.admin;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {roleStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
          <p className="text-gray-600">
            Welcome back, {userName || userRole}! Manage your health insurance claims.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {getRoleBadge()}
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Main Content */}
      {userRole === 'admin' && (
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Processing Dashboard</TabsTrigger>
            <TabsTrigger value="eobs">EOB Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ClaimsProcessingDashboard />
          </TabsContent>

          <TabsContent value="eobs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Explanation of Benefits Management</span>
                </CardTitle>
                <CardDescription>
                  View and manage EOBs for all members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>EOB Management Interface</p>
                  <p className="text-sm mt-2">Search, filter, and manage EOBs across all members</p>
                  <div className="mt-4 flex justify-center space-x-4">
                    <Button>Search EOBs</Button>
                    <Button variant="outline">Generate Reports</Button>
                    <Button variant="outline">Bulk Operations</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Claims Analytics</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive analytics and reporting for claims processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Analytics Dashboard</p>
                  <p className="text-sm mt-2">Detailed insights into claims processing performance</p>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <Button variant="outline">Volume Trends</Button>
                    <Button variant="outline">Financial Analysis</Button>
                    <Button variant="outline">Processing Metrics</Button>
                    <Button variant="outline">MLR Reports</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure claims processing system parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Processing Configuration</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Auto-approval threshold</span>
                          <Badge className="bg-green-100 text-green-800">85%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Fraud detection sensitivity</span>
                          <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Batch processing limit</span>
                          <Badge className="bg-blue-100 text-blue-800">50 claims</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Email notifications</span>
                          <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">SMS alerts</span>
                          <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Real-time updates</span>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button>Update Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {userRole === 'member' && (
        <MemberEOBViewer />
      )}

      {(userRole === 'provider' || userRole === 'adjuster') && (
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Claims Dashboard</TabsTrigger>
            <TabsTrigger value="submissions">New Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Claims Dashboard</span>
                </CardTitle>
                <CardDescription>
                  {userRole === 'provider'
                    ? 'Track and manage your submitted claims'
                    : 'Review and process assigned claims'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Role-specific claims interface</p>
                  <p className="text-sm mt-2">
                    {userRole === 'provider'
                      ? 'Submit new claims, track payment status, and view remittances'
                      : 'Review claims, make adjudication decisions, and manage complex cases'
                    }
                  </p>
                  <div className="mt-4 flex justify-center space-x-4">
                    <Button>View Claims</Button>
                    <Button variant="outline">Submit New Claim</Button>
                    {userRole === 'adjuster' && <Button variant="outline">My Queue</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>New Claim Submissions</CardTitle>
                <CardDescription>
                  {userRole === 'provider'
                    ? 'Submit new claims for services rendered'
                    : 'Upload and process claim documentation'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Claim Submission Interface</p>
                  <p className="text-sm mt-2">
                    {userRole === 'provider'
                      ? 'Electronic claim submission with real-time validation'
                      : 'Batch claim processing and document management'
                    }
                  </p>
                  <div className="mt-4">
                    <Button>Start New Submission</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Analytics</span>
                </CardTitle>
                <CardDescription>
                  {userRole === 'provider'
                    ? 'Track your claims performance metrics'
                    : 'Monitor your review efficiency and accuracy'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Performance Analytics</p>
                  <p className="text-sm mt-2">
                    Detailed insights into your {userRole === 'provider' ? 'claim submission and payment' : 'review and adjudication'} performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};