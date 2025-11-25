import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  BuildingLibraryIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserCircleIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
// import { useNavigate } from 'wouter';

const InstitutionDashboard: React.FC = () => {
  const { user } = useAuth();
  // const navigate = useNavigate();

  // Mock data - in real app, this would come from API
  const stats = {
    totalProviders: 342,
    activePatients: 15847,
    pendingClaims: 89,
    monthlyRevenue: 1245892,
    bedOccupancy: 87.3,
    averageRating: 4.6,
  };

  const quickActions = [
    {
      title: 'Manage Providers',
      description: 'Add, edit, or remove healthcare providers',
      icon: UserGroupIcon,
      href: '/providers',
      color: 'blue',
    },
    {
      title: 'Submit Claims',
      description: 'Process and submit insurance claims',
      icon: ClipboardDocumentListIcon,
      href: '/claims',
      color: 'green',
    },
    {
      title: 'View Schemes',
      description: 'Browse available insurance schemes',
      icon: ShieldCheckIcon,
      href: '/schemes',
      color: 'purple',
    },
    {
      title: 'Revenue Analytics',
      description: 'Track financial performance',
      icon: ChartBarIcon,
      href: '/analytics',
      color: 'yellow',
    },
    {
      title: 'Hospital Profile',
      description: 'Update institution information',
      icon: BuildingOfficeIcon,
      href: '/profile',
      color: 'indigo',
    },
    {
      title: 'Quality Reports',
      description: 'View quality metrics and reports',
      icon: DocumentTextIcon,
      href: '/quality',
      color: 'red',
    },
  ];

  const recentClaims = [
    { id: 1, patient: 'John Smith', service: 'Cardiac Surgery', amount: 45000, status: 'approved', date: '2024-01-15' },
    { id: 2, patient: 'Sarah Johnson', service: 'MRI Scan', amount: 2500, status: 'pending', date: '2024-01-14' },
    { id: 3, patient: 'Robert Davis', service: 'Emergency Care', amount: 8500, status: 'processing', date: '2024-01-14' },
    { id: 4, patient: 'Maria Garcia', service: 'Maternity Care', amount: 12000, status: 'approved', date: '2024-01-13' },
    { id: 5, patient: 'James Wilson', service: 'Knee Replacement', amount: 28000, status: 'rejected', date: '2024-01-13' },
  ];

  const departments = [
    { name: 'Emergency', patients: 45, capacity: 60, occupancy: 75 },
    { name: 'ICU', patients: 18, capacity: 20, occupancy: 90 },
    { name: 'General Ward', patients: 156, capacity: 200, occupancy: 78 },
    { name: 'Maternity', patients: 32, capacity: 40, occupancy: 80 },
    { name: 'Pediatrics', patients: 28, capacity: 35, occupancy: 80 },
  ];

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      yellow: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
      indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      red: 'bg-red-50 text-red-600 hover:bg-red-100',
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-red-500';
    if (occupancy >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BuildingLibraryIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Medical Institution Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.entityData?.name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <BellIcon className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  5
                </span>
              </Button>
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <Badge variant="outline" className="text-xs">Institution Admin</Badge>
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
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Providers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProviders}</p>
                  <p className="text-xs text-green-600">+8 from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <BuildingLibraryIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activePatients.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
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
                  <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingClaims}</p>
                  <p className="text-xs text-yellow-600">-5 from last week</p>
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
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+18% from last month</p>
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
                        // onClick={() => navigate(action.href)}
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

          {/* Department Status */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Department Status</CardTitle>
                <CardDescription>Current occupancy levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map((department, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{department.name}</span>
                        <span className="text-sm text-gray-500">
                          {department.patients}/{department.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getOccupancyColor(department.occupancy)}`}
                          style={{ width: `${department.occupancy}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{department.occupancy}% occupied</span>
                        {department.occupancy >= 90 && (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Claims Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
            <CardDescription>Latest insurance claim submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Patient</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Service</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{claim.patient}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{claim.service}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">${claim.amount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{claim.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => navigate('/claims')}>
                View All Claims
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quality Metrics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Patient Satisfaction</span>
                  <Badge className="bg-green-100 text-green-800">{stats.averageRating}/5.0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Readmission Rate</span>
                  <Badge className="bg-green-100 text-green-800">2.1%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Infection Control</span>
                  <Badge className="bg-green-100 text-green-800">98.5%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <Badge className="bg-blue-100 text-blue-800">4.2 min</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">HIPAA Compliance</span>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accreditation</span>
                  <Badge className="bg-blue-100 text-blue-800">JCI Certified</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Inspection</span>
                  <Badge className="bg-blue-100 text-blue-800">30 days ago</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Safety Score</span>
                  <Badge className="bg-green-100 text-green-800">A+</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bed Occupancy</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.bedOccupancy}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average LOS</span>
                  <Badge className="bg-blue-100 text-blue-800">4.8 days</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ER Wait Time</span>
                  <Badge className="bg-green-100 text-green-800">18 min</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Staff Satisfaction</span>
                  <Badge className="bg-green-100 text-green-800">92%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDashboard;