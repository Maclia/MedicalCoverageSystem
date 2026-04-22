import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network,
  MapPin,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Filter
} from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface NetworkAnalysis {
  totalProviders: number;
  activeProviders: number;
  pendingProviders: number;
  inactiveProviders: number;
  providersByTier: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  providersBySpecialty: Array<{
    specialty: string;
    count: number;
    percentage: number;
  }>;
  providersByLocation: Array<{
    state: string;
    city: string;
    count: number;
  }>;
  networkUtilization: {
    averageClaimsPerProvider: number;
    topPerformingProviders: Array<{
      id: number;
      name: string;
      claims: number;
      satisfaction: number;
    }>;
    underutilizedProviders: Array<{
      id: number;
      name: string;
      claims: number;
      potential: number;
    }>;
  };
  networkGaps: Array<{
    specialty: string;
    location: string;
    severity: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
}

const NetworkAnalyzer: React.FC = () => {
  const [analysis, setAnalysis] = useState<NetworkAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'specialties' | 'locations' | 'performance'>('overview');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  useEffect(() => {
    fetchNetworkAnalysis();
  }, [selectedRegion]);

  const fetchNetworkAnalysis = async () => {
    try {
      setLoading(true);
      // Mock data for now - in real implementation, this would fetch from API
      const mockData: NetworkAnalysis = {
        totalProviders: 1247,
        activeProviders: 1089,
        pendingProviders: 89,
        inactiveProviders: 69,
        providersByTier: {
          tier1: 523,
          tier2: 412,
          tier3: 312
        },
        providersBySpecialty: [
          { specialty: 'Family Medicine', count: 342, percentage: 27.4 },
          { specialty: 'Internal Medicine', count: 276, percentage: 22.1 },
          { specialty: 'Pediatrics', count: 198, percentage: 15.9 },
          { specialty: 'Cardiology', count: 145, percentage: 11.6 },
          { specialty: 'Dermatology', count: 89, percentage: 7.1 },
          { specialty: 'Psychiatry', count: 76, percentage: 6.1 },
          { specialty: 'Surgery', count: 65, percentage: 5.2 },
          { specialty: 'Other', count: 56, percentage: 4.5 }
        ],
        providersByLocation: [
          { state: 'CA', city: 'Los Angeles', count: 234 },
          { state: 'CA', city: 'San Francisco', count: 187 },
          { state: 'NY', city: 'New York', count: 298 },
          { state: 'TX', city: 'Houston', count: 145 },
          { state: 'FL', city: 'Miami', count: 167 },
          { state: 'IL', city: 'Chicago', count: 128 }
        ],
        networkUtilization: {
          averageClaimsPerProvider: 45.6,
          topPerformingProviders: [
            { id: 1, name: 'Dr. Sarah Johnson', claims: 234, satisfaction: 4.8 },
            { id: 2, name: 'Dr. Michael Chen', claims: 198, satisfaction: 4.7 },
            { id: 3, name: 'Dr. Emily Davis', claims: 187, satisfaction: 4.9 },
            { id: 4, name: 'Dr. James Wilson', claims: 176, satisfaction: 4.6 },
            { id: 5, name: 'Dr. Maria Garcia', claims: 165, satisfaction: 4.8 }
          ],
          underutilizedProviders: [
            { id: 6, name: 'Dr. Robert Taylor', claims: 8, potential: 45 },
            { id: 7, name: 'Dr. Lisa Anderson', claims: 12, potential: 38 },
            { id: 8, name: 'Dr. David Brown', claims: 15, potential: 42 }
          ]
        },
        networkGaps: [
          {
            specialty: 'Pediatrics',
            location: 'Rural Areas',
            severity: 'high',
            recommendation: 'Recruit 15-20 pediatricians for underserved rural communities'
          },
          {
            specialty: 'Mental Health',
            location: 'All Regions',
            severity: 'high',
            recommendation: 'Expand mental health network by 25% to meet growing demand'
          },
          {
            specialty: 'Cardiology',
            location: 'Northern Region',
            severity: 'medium',
            recommendation: 'Add 5-8 cardiologists in northern metropolitan areas'
          }
        ]
      };

      setAnalysis(mockData);
    } catch (error) {
      console.error('Failed to fetch network analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const tierData = [
    { name: 'Tier 1', value: analysis?.providersByTier.tier1 || 0, fill: '#3b82f6' },
    { name: 'Tier 2', value: analysis?.providersByTier.tier2 || 0, fill: '#10b981' },
    { name: 'Tier 3', value: analysis?.providersByTier.tier3 || 0, fill: '#f59e0b' }
  ];

  const statusData = [
    { name: 'Active', value: analysis?.activeProviders || 0, fill: '#10b981' },
    { name: 'Pending', value: analysis?.pendingProviders || 0, fill: '#f59e0b' },
    { name: 'Inactive', value: analysis?.inactiveProviders || 0, fill: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Network className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Network Data Available</h3>
          <p className="text-gray-600 text-center">
            Network analysis will be available once provider data is populated.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Provider Network Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of provider network performance and optimization opportunities
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="region">Region:</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="northeast">Northeast</SelectItem>
                    <SelectItem value="southeast">Southeast</SelectItem>
                    <SelectItem value="midwest">Midwest</SelectItem>
                    <SelectItem value="southwest">Southwest</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>
                <Filter className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-2xl font-bold">{analysis.totalProviders.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {analysis.activeProviders} active ({((analysis.activeProviders / analysis.totalProviders) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Network Health</p>
                <p className="text-2xl font-bold text-green-600">Excellent</p>
                <p className="text-xs text-gray-500">
                  {((analysis.activeProviders / analysis.totalProviders) * 100).toFixed(1)}% activation rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Claims/Provider</p>
                <p className="text-2xl font-bold">{analysis.networkUtilization.averageClaimsPerProvider}</p>
                <p className="text-xs text-gray-500">Per month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Network Gaps</p>
                <p className="text-2xl font-bold text-red-600">{analysis.networkGaps.length}</p>
                <p className="text-xs text-gray-500">Critical areas identified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specialties">Specialties</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Distribution by Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Distribution by Tier</CardTitle>
                <CardDescription>Network composition across different provider tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {tierData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.fill }}></div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Provider Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Status Distribution</CardTitle>
                <CardDescription>Current status of all providers in the network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.fill }}></div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Network Gaps Analysis
              </CardTitle>
              <CardDescription>
                Critical areas requiring provider recruitment and network expansion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.networkGaps.map((gap, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{gap.specialty} - {gap.location}</h4>
                          <Badge className={getSeverityColor(gap.severity)}>
                            {gap.severity} severity
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{gap.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Distribution by Specialty</CardTitle>
              <CardDescription>Breakdown of providers by medical specialty</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.providersBySpecialty} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="specialty" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.providersBySpecialty.map((specialty) => (
              <Card key={specialty.specialty}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{specialty.specialty}</h3>
                      <p className="text-2xl font-bold">{specialty.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">of network</p>
                      <p className="text-lg font-semibold">{specialty.percentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution
              </CardTitle>
              <CardDescription>Provider coverage across different locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.providersByLocation.map((location) => (
                  <Card key={`${location.state}-${location.city}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{location.city}</h3>
                          <p className="text-sm text-gray-600">{location.state}</p>
                          <p className="text-2xl font-bold">{location.count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performing Providers
                </CardTitle>
                <CardDescription>Providers with highest claim volumes and satisfaction scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.networkUtilization.topPerformingProviders.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-600">{provider.claims} claims/month</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600">
                          {provider.satisfaction.toFixed(1)} ★
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Underutilized Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Underutilized Providers
                </CardTitle>
                <CardDescription>Providers with potential for increased utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.networkUtilization.underutilizedProviders.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-600">{provider.claims} claims/month</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">
                          Potential: {provider.potential}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((provider.potential - provider.claims) / provider.potential * 100).toFixed(0)}% growth
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkAnalyzer;