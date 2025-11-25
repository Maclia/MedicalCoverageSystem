import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserCircleIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
// import { useNavigate } from 'wouter';

const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  // const navigate = useNavigate();

  // Mock data - in real app, this would come from API
  const stats = {
    totalPatients: 1247,
    todayAppointments: 24,
    pendingClaims: 18,
    monthlyEarnings: 28450,
    averageRating: 4.8,
    satisfactionScore: 96,
  };

  const quickActions = [
    {
      title: 'Schedule Appointment',
      description: 'Book new patient appointments',
      icon: CalendarIcon,
      href: '/appointments',
      color: 'blue',
    },
    {
      title: 'Submit Claim',
      description: 'File insurance claims for services',
      icon: ClipboardDocumentListIcon,
      href: '/claims/new',
      color: 'green',
    },
    {
      title: 'Patient Records',
      description: 'Access patient medical history',
      icon: DocumentTextIcon,
      href: '/patients',
      color: 'purple',
    },
    {
      title: 'Find Members',
      description: 'Verify member eligibility',
      icon: MagnifyingGlassIcon,
      href: '/member-search',
      color: 'yellow',
    },
    {
      title: 'Earnings Report',
      description: 'View financial summary',
      icon: CurrencyDollarIcon,
      href: '/earnings',
      color: 'indigo',
    },
    {
      title: 'Messages',
      description: 'Patient communications',
      icon: ChatBubbleLeftRightIcon,
      href: '/messages',
      color: 'red',
    },
  ];

  const todayAppointments = [
    { id: 1, patient: 'John Smith', time: '09:00 AM', type: 'Follow-up', status: 'confirmed' },
    { id: 2, patient: 'Sarah Johnson', time: '10:00 AM', type: 'Initial Consultation', status: 'confirmed' },
    { id: 3, patient: 'Robert Davis', time: '11:00 AM', type: 'Procedure', status: 'pending' },
    { id: 4, patient: 'Maria Garcia', time: '02:00 PM', type: 'Follow-up', status: 'confirmed' },
    { id: 5, patient: 'James Wilson', time: '03:00 PM', type: 'Emergency', status: 'confirmed' },
  ];

  const recentClaims = [
    { id: 1, patient: 'Alice Brown', service: 'Annual Checkup', amount: 250, status: 'approved', submitted: '2 days ago' },
    { id: 2, patient: 'Charles White', service: 'Blood Work', amount: 180, status: 'processing', submitted: '3 days ago' },
    { id: 3, patient: 'Diana Prince', service: 'X-Ray', amount: 450, status: 'pending', submitted: '5 days ago' },
    { id: 4, patient: 'Edward Stark', service: 'Consultation', amount: 350, status: 'approved', submitted: '1 week ago' },
  ];

  const upcomingTasks = [
    { id: 1, task: 'Review lab results', patient: 'John Smith', priority: 'high', due: 'Today' },
    { id: 2, task: 'Follow up on insurance authorization', patient: 'Sarah Johnson', priority: 'medium', due: 'Tomorrow' },
    { id: 3, task: 'Complete treatment plan', patient: 'Robert Davis', priority: 'high', due: 'Today' },
    { id: 4, task: 'Schedule follow-up appointment', patient: 'Maria Garcia', priority: 'low', due: 'Next Week' },
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
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Healthcare Provider Dashboard</h1>
                <p className="text-sm text-gray-500">Dr. {user?.entityData?.name || user?.email}</p>
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
                  <Badge variant="outline" className="text-xs">Healthcare Provider</Badge>
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
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                  <p className="text-xs text-green-600">+15 new this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
                  <p className="text-xs text-gray-600">{stats.todayAppointments - 1} confirmed</p>
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
                  <p className="text-xs text-blue-600">3 need attention</p>
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
                  <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.monthlyEarnings.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
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
                <CardDescription>Common tasks and patient management tools</CardDescription>
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

          {/* Today's Appointments */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your upcoming appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ClockIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{appointment.patient}</p>
                          <p className="text-xs text-gray-500">{appointment.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{appointment.time}</p>
                        <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full" onClick={() => navigate('/appointments')}>
                    View Full Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Pending items that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {task.priority === 'high' ? (
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.task}</p>
                      <p className="text-xs text-gray-500">Patient: {task.patient}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{task.due}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Claims */}
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{claim.patient}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{claim.service}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">${claim.amount}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{claim.submitted}</td>
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

        {/* Performance Metrics */}
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
                  <Badge className="bg-green-100 text-green-800">{stats.satisfactionScore}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Provider Rating</span>
                  <Badge className="bg-blue-100 text-blue-800">{stats.averageRating}/5.0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">On-time Rate</span>
                  <Badge className="bg-green-100 text-green-800">94%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <Badge className="bg-blue-100 text-blue-800">2.3 hours</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-yellow-600" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Month</span>
                  <Badge className="bg-green-100 text-green-800">${stats.monthlyEarnings}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Claims</span>
                  <Badge className="bg-yellow-100 text-yellow-800">${stats.pendingClaims * 250}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg per Claim</span>
                  <Badge className="bg-blue-100 text-blue-800">$285</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <Badge className="bg-green-100 text-green-800">+12%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-purple-600" />
                Patient Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Patients</span>
                  <Badge className="bg-blue-100 text-blue-800">{stats.totalPatients}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">New This Month</span>
                  <Badge className="bg-green-100 text-green-800">15</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Return Rate</span>
                  <Badge className="bg-green-100 text-green-800">87%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">No-Show Rate</span>
                  <Badge className="bg-yellow-100 text-yellow-800">4.2%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;