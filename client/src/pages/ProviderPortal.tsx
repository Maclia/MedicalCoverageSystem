import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Award,
  Calendar,
  Download,
  Settings,
  Bell,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Star,
  Target,
  Activity,
  DollarSignIcon
} from 'lucide-react';

interface ProviderData {
  id: number;
  name: string;
  type: string;
  registrationNumber: string;
  status: string;
  qualityScore: number;
  performanceTier: string;
  totalClaims: number;
  totalRevenue: number;
  approvalRate: number;
  averageResponseTime: number;
  networkMemberships: string[];
  lastUpdated: string;
}

interface PerformanceMetric {
  category: string;
  name: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface ClaimData {
  id: number;
  claimNumber: string;
  memberName: string;
  serviceDate: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  processingTime: number;
}

interface NotificationItem {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const ProviderPortal: React.FC = () => {
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [recentClaims, setRecentClaims] = useState<ClaimData[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderData();
    fetchPerformanceMetrics();
    fetchRecentClaims();
    fetchNotifications();
  }, []);

  const fetchProviderData = async () => {
    try {
      // Mock API call - replace with actual API call
      const mockData: ProviderData = {
        id: 1,
        name: 'City General Hospital',
        type: 'Hospital',
        registrationNumber: 'MGH-2024-001',
        status: 'active',
        qualityScore: 87,
        performanceTier: 'good',
        totalClaims: 1250,
        totalRevenue: 2500000,
        approvalRate: 92,
        averageResponseTime: 24,
        networkMemberships: ['Premium National Network', 'Standard Regional Network'],
        lastUpdated: new Date().toISOString()
      };
      setProviderData(mockData);
    } catch (error) {
      console.error('Error fetching provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      // Mock data - replace with actual API call
      const mockMetrics: PerformanceMetric[] = [
        {
          category: 'Quality',
          name: 'Clinical Quality Score',
          current: 87,
          target: 90,
          trend: 'up',
          lastUpdated: new Date().toISOString()
        },
        {
          category: 'Quality',
          name: 'Patient Satisfaction',
          current: 92,
          target: 85,
          trend: 'up',
          lastUpdated: new Date().toISOString()
        },
        {
          category: 'Efficiency',
          name: 'Average Processing Time',
          current: 24,
          target: 48,
          trend: 'up',
          lastUpdated: new Date().toISOString()
        },
        {
          category: 'Financial',
          name: 'Revenue Growth',
          current: 12.5,
          target: 10,
          trend: 'up',
          lastUpdated: new Date().toISOString()
        }
      ];
      setPerformanceMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    }
  };

  const fetchRecentClaims = async () => {
    try {
      // Mock data - replace with actual API call
      const mockClaims: ClaimData[] = [
        {
          id: 1,
          claimNumber: 'CLM-2024-0001',
          memberName: 'John Doe',
          serviceDate: '2024-01-15',
          amount: 5000,
          status: 'approved',
          processingTime: 12
        },
        {
          id: 2,
          claimNumber: 'CLM-2024-0002',
          memberName: 'Jane Smith',
          serviceDate: '2024-01-16',
          amount: 3500,
          status: 'pending',
          processingTime: 24
        }
      ];
      setRecentClaims(mockClaims);
    } catch (error) {
      console.error('Error fetching recent claims:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Mock data - replace with actual API call
      const mockNotifications: NotificationItem[] = [
        {
          id: 1,
          type: 'success',
          title: 'Contract Renewed',
          message: 'Your provider contract has been successfully renewed for 2024.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: false
        },
        {
          id: 2,
          type: 'warning',
          title: 'Quality Review Due',
          message: 'Your quarterly quality review is due next week.',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          read: false
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getPerformanceColor = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'below_average': return 'bg-orange-100 text-orange-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const performanceData = [
    { name: 'Jan', score: 75, target: 80 },
    { name: 'Feb', score: 78, target: 80 },
    { name: 'Mar', score: 82, target: 80 },
    { name: 'Apr', score: 85, target: 80 },
    { name: 'May', score: 87, target: 80 },
    { name: 'Jun', score: 87, target: 80 }
  ];

  const claimsDistribution = [
    { name: 'Approved', value: 92, color: '#10b981' },
    { name: 'Pending', value: 5, color: '#f59e0b' },
    { name: 'Rejected', value: 3, color: '#ef4444' }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 180000 },
    { month: 'Feb', revenue: 195000 },
    { month: 'Mar', revenue: 210000 },
    { month: 'Apr', revenue: 225000 },
    { month: 'May', revenue: 240000 },
    { month: 'Jun', revenue: 250000 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading provider portal...</p>
        </div>
      </div>
    );
  }

  if (!providerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load provider data</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Provider Portal</h1>
            <Badge className={getPerformanceColor(providerData.performanceTier)}>
              {providerData.performanceTier.charAt(0).toUpperCase() + providerData.performanceTier.slice(1)} Performance
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{providerData.name}</p>
                <p className="text-xs text-gray-500">{providerData.registrationNumber}</p>
              </div>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {providerData.name.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="networks">Networks</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Quality Score</p>
                      <p className="text-2xl font-bold text-gray-900">{providerData.qualityScore}%</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Award className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <Progress value={providerData.qualityScore} className="mt-3" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Claims</p>
                      <p className="text-2xl font-bold text-gray-900">{providerData.totalClaims.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span>+12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{providerData.approvalRate}%</p>
                    </div>
                    <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  <Progress value={providerData.approvalRate} className="mt-3" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(providerData.totalRevenue)}</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span>+8% growth</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" name="Score" strokeWidth={2} />
                      <Line type="monotone" dataKey="target" stroke="#ef4444" name="Target" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Claims Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={claimsDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {claimsDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                      notification.type === 'success' ? 'border-green-500 bg-green-50' :
                      notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      notification.type === 'error' ? 'border-red-500 bg-red-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Claims</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Claim
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Claim #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Processing Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentClaims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {claim.claimNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {claim.memberName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {claim.serviceDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(claim.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                              claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {claim.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {claim.processingTime}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{metric.name}</h3>
                        <div className="flex items-center">
                          {metric.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-600 mr-2" />}
                          {metric.trend === 'down' && <TrendingDown className="h-5 w-5 text-red-600 mr-2" />}
                          <span className={`text-sm ${
                            metric.trend === 'up' ? 'text-green-600' :
                            metric.trend === 'down' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {metric.trend}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Current</span>
                          <span className="font-medium">{metric.current}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Target</span>
                          <span className="font-medium">{metric.target}</span>
                        </div>
                        <Progress value={(metric.current / metric.target) * 100} className="mt-2" />
                      </div>

                      <p className="text-xs text-gray-500 mt-4">
                        Last updated: {new Date(metric.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#93c5fd" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Contracts</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Contract
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Premium Network Agreement</h3>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <p className="text-gray-600 mb-2">Comprehensive service agreement with premium network tier</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Contract #PC-2024-1001</span>
                      <span>Valid until Dec 31, 2025</span>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Standard Network Participation</h3>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <p className="text-gray-600 mb-2">Standard tier network participation agreement</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Contract #PC-2024-1002</span>
                      <span>Valid until Jan 31, 2025</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Networks Tab */}
          <TabsContent value="networks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providerData.networkMemberships.map((network, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{network}</h3>
                        <Badge className="bg-blue-100 text-blue-800">Member</Badge>
                      </div>
                      <p className="text-gray-600">Active participation in {network.toLowerCase()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                        <p className="mt-1 text-sm text-gray-900">{providerData.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                        <p className="mt-1 text-sm text-gray-900">{providerData.registrationNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <p className="mt-1 text-sm text-gray-900">{providerData.type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">
                          <Badge className={getStatusColor(providerData.status)}>
                            {providerData.status.charAt(0).toUpperCase() + providerData.status.slice(1)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{providerData.qualityScore}%</div>
                        <div className="text-sm text-gray-600">Quality Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{providerData.approvalRate}%</div>
                        <div className="text-sm text-gray-600">Approval Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{providerData.averageResponseTime}h</div>
                        <div className="text-sm text-gray-600">Avg Response Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderPortal;