import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { useAuth } from '@/features/actions/contexts/AuthContext';
import {
  UserCircleIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  CalendarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const MemberDashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock dashboard data for member
  const memberStats = {
    totalBenefits: 150000,
    utilizedBenefits: 67500,
    remainingBenefits: 82500,
    utilizationPercent: 45,
    pendingClaims: 2,
    approvedClaims: 8,
    dependents: 3
  };

  const myClaims = [
    { id: 'CLM-00156', service: 'General Consultation', provider: 'Aga Khan Hospital', amount: 3500, status: 'completed', date: '2026-04-28' },
    { id: 'CLM-00142', service: 'Blood Tests', provider: 'Pathology Labs', amount: 4200, status: 'approved', date: '2026-04-25' },
    { id: 'CLM-00131', service: 'Dental Cleaning', provider: 'Dental Care Centre', amount: 5000, status: 'pending', date: '2026-04-22' },
    { id: 'CLM-00118', service: 'Optical Checkup', provider: 'Optica Vision', amount: 8500, status: 'completed', date: '2026-04-18' },
    { id: 'CLM-00105', service: 'Pharmacy Prescription', provider: 'Good Health Pharmacy', amount: 2800, status: 'completed', date: '2026-04-12' },
  ];

  const benefitCategories = [
    { name: 'Outpatient', total: 75000, utilized: 42000, remaining: 33000, color: 'bg-blue-500' },
    { name: 'Inpatient', total: 50000, utilized: 0, remaining: 50000, color: 'bg-green-500' },
    { name: 'Dental', total: 15000, utilized: 12500, remaining: 2500, color: 'bg-purple-500' },
    { name: 'Optical', total: 10000, utilized: 8500, remaining: 1500, color: 'bg-teal-500' },
  ];

  const quickActions = [
    {
      title: 'My Claims',
      description: 'View all my claim history',
      icon: ClipboardDocumentListIcon,
      href: '/claims',
      color: 'blue',
    },
    {
      title: 'My Benefits',
      description: 'Check coverage details',
      icon: CreditCardIcon,
      href: '/benefits',
      color: 'green',
    },
    {
      title: 'Find Provider',
      description: 'Search approved hospitals',
      icon: BuildingOfficeIcon,
      href: '/provider-portal',
      color: 'purple',
    },
    {
      title: 'Appointments',
      description: 'Book medical appointments',
      icon: CalendarIcon,
      href: '/appointments',
      color: 'teal',
    },
    {
      title: 'My Documents',
      description: 'Download e-card & reports',
      icon: DocumentTextIcon,
      href: '/profile',
      color: 'orange',
    },
    {
      title: 'Wellness Programs',
      description: 'Health & wellness activities',
      icon: HeartIcon,
      href: '/wellness',
      color: 'pink',
    },
  ];

  const getStatusColor = (status: 'completed' | 'pending' | 'approved' | string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
    };
    return colors[color] || 'bg-gray-50 text-gray-600 hover:bg-gray-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'Member'} {user?.lastName || ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            Download e-Card
          </Button>
        </div>
      </div>

      {/* Main Benefit Summary */}
      <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Current Benefit Balance</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">KSh {memberStats.remainingBenefits.toLocaleString()}</span>
                <span className="text-teal-100">remaining</span>
              </div>
              <p className="text-teal-100 mt-1">
                of KSh {memberStats.totalBenefits.toLocaleString()} annual allocation
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Utilization</span>
                <span className="font-semibold">{memberStats.utilizationPercent}%</span>
              </div>
              <div className="w-64 bg-teal-700 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all" 
                  style={{ width: `${memberStats.utilizationPercent}%` }}
                ></div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-teal-100">Pending Claims:</span>{' '}
                  <span className="font-semibold">{memberStats.pendingClaims}</span>
                </div>
                <div>
                  <span className="text-teal-100">Dependents:</span>{' '}
                  <span className="font-semibold">{memberStats.dependents}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Tabs defaultValue="benefits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="benefits">Benefit Breakdown</TabsTrigger>
          <TabsTrigger value="claims">My Claims</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benefit Utilization by Category</CardTitle>
              <CardDescription>Your current period coverage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {benefitCategories.map((category, index) => {
                  const percentage = Math.round((category.utilized / category.total) * 100);
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.name}</span>
                        <div className="text-right">
                          <span className="font-semibold">KSh {category.utilized.toLocaleString()}</span>
                          <span className="text-muted-foreground"> / KSh {category.total.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${category.color} h-2 rounded-full`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Remaining: KSh {category.remaining.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>Your medical claim history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                      <p className="font-medium">{claim.service}</p>
                      <p className="text-sm text-muted-foreground">{claim.provider}</p>
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

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>Your personal details and coverage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center">
                  <UserCircleIcon className="h-10 w-10 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-muted-foreground">Member ID: MED-{user?.id?.toString().padStart(6, '0')}</p>
                  <p className="text-sm text-muted-foreground">Scheme: Corporate Platinum Plan</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employer</p>
                  <p className="font-medium">Tech Solutions Kenya Ltd</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Policy Expiry</p>
                  <p className="font-medium">31 December 2026</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <PhoneIcon className="h-4 w-4" />
                  Contact Member Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberDashboard;