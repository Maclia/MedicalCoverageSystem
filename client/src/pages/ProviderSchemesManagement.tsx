import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building,
  Network,
  TrendingUp,
  FileText,
  Users,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Star,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Award,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Download
} from "lucide-react";

interface Provider {
  id: number;
  name: string;
  type: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive' | 'pending';
  networkAssignments: NetworkAssignment[];
  performanceMetrics: PerformanceMetrics;
}

interface NetworkAssignment {
  networkId: number;
  networkName: string;
  networkType: 'tier_1' | 'tier_2' | 'tier_3' | 'premium';
  discountPercentage: number;
  specializations: string[];
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
}

interface PerformanceMetrics {
  claimsProcessed: number;
  averageProcessingTime: number;
  denialRate: number;
  patientSatisfaction: number;
  qualityScore: number;
  revenue: number;
  networkUtilization: number;
}

interface SchemeIntegration {
  schemeId: number;
  schemeName: string;
  planTiers: {
    tierId: number;
    tierName: string;
    networkAccess: string;
    assignedProviders: number;
    utilizationRate: number;
  }[];
  contractStatus: string;
  lastSyncDate: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export default function ProviderSchemesManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [schemes, setSchemes] = useState<SchemeIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProviderType, setFilterProviderType] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    setTimeout(() => {
      setProviders([
        {
          id: 1,
          name: "City General Hospital",
          type: "hospital",
          address: "123 Main St, Nairobi",
          contactPerson: "Dr. John Smith",
          contactEmail: "john@citygeneral.com",
          contactPhone: "+254-20-1234567",
          status: "active",
          networkAssignments: [
            {
              networkId: 1,
              networkName: "Primary Care Network",
              networkType: "tier_1",
              discountPercentage: 15,
              specializations: ["general_surgery", "internal_medicine", "pediatrics"],
              effectiveDate: "2024-01-01",
              isActive: true
            }
          ],
          performanceMetrics: {
            claimsProcessed: 1245,
            averageProcessingTime: 2.5,
            denialRate: 0.05,
            patientSatisfaction: 4.2,
            qualityScore: 88,
            revenue: 2500000,
            networkUtilization: 0.78
          }
        },
        {
          id: 2,
          name: "HealthPlus Clinic",
          type: "clinic",
          address: "456 Healthcare Ave, Nairobi",
          contactPerson: "Dr. Mary Johnson",
          contactEmail: "mary@healthplus.com",
          contactPhone: "+254-20-7654321",
          status: "active",
          networkAssignments: [
            {
              networkId: 2,
              networkName: "Specialist Network",
              networkType: "tier_2",
              discountPercentage: 10,
              specializations: ["cardiology", "orthopedics", "dermatology"],
              effectiveDate: "2024-01-01",
              isActive: true
            }
          ],
          performanceMetrics: {
            claimsProcessed: 892,
            averageProcessingTime: 1.8,
            denialRate: 0.08,
            patientSatisfaction: 4.5,
            qualityScore: 92,
            revenue: 1800000,
            networkUtilization: 0.85
          }
        },
        {
          id: 3,
          name: "Dental Care Center",
          type: "dental_clinic",
          address: "789 Dental Plaza, Nairobi",
          contactPerson: "Dr. Michael Brown",
          contactEmail: "michael@dentalcare.com",
          contactPhone: "+254-20-9876543",
          status: "active",
          networkAssignments: [
            {
              networkId: 3,
              networkName: "Premium Network",
              networkType: "premium",
              discountPercentage: 20,
              specializations: ["general_dentistry", "orthodontics", "cosmetic_dentistry"],
              effectiveDate: "2024-01-01",
              isActive: true
            }
          ],
          performanceMetrics: {
            claimsProcessed: 567,
            averageProcessingTime: 1.2,
            denialRate: 0.03,
            patientSatisfaction: 4.7,
            qualityScore: 95,
            revenue: 1200000,
            networkUtilization: 0.92
          }
        }
      ]);

      setSchemes([
        {
          schemeId: 1,
          schemeName: "Individual Medical Cover",
          planTiers: [
            {
              tierId: 1,
              tierName: "Bronze Plan",
              networkAccess: "tier_1_only",
              assignedProviders: 1,
              utilizationRate: 0.65
            },
            {
              tierId: 2,
              tierName: "Silver Plan",
              networkAccess: "full_network",
              assignedProviders: 2,
              utilizationRate: 0.72
            },
            {
              tierId: 3,
              tierName: "Gold Plan",
              networkAccess: "premium_network",
              assignedProviders: 3,
              utilizationRate: 0.85
            }
          ],
          contractStatus: "active",
          lastSyncDate: "2024-11-24",
          syncStatus: "synced"
        },
        {
          schemeId: 2,
          schemeName: "Corporate Medical Scheme",
          planTiers: [
            {
              tierId: 4,
              tierName: "Executive Plan",
              networkAccess: "premium_network",
              assignedProviders: 3,
              utilizationRate: 0.90
            },
            {
              tierId: 5,
              tierName: "Staff Plan",
              networkAccess: "full_network",
              assignedProviders: 2,
              utilizationRate: 0.78
            }
          ],
          contractStatus: "active",
          lastSyncDate: "2024-11-24",
          syncStatus: "synced"
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterProviderType || provider.type === filterProviderType;
    const matchesNetwork = !filterNetwork || provider.networkAssignments.some(a => a.networkType === filterNetwork);
    const matchesStatus = !filterStatus || provider.status === filterStatus;

    return matchesSearch && matchesType && matchesNetwork && matchesStatus;
  });

  const getQualityStatusColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getDenialRateStatusColor = (rate: number) => {
    if (rate <= 0.05) return "text-green-600";
    if (rate <= 0.1) return "text-yellow-600";
    return "text-red-600";
  };

  const getNetworkTypeBadge = (type: string) => {
    const colors = {
      tier_1: "bg-blue-100 text-blue-800",
      tier_2: "bg-purple-100 text-purple-800",
      tier_3: "bg-orange-100 text-orange-800",
      premium: "bg-green-100 text-green-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPerformanceRating = (metrics: PerformanceMetrics) => {
    const score = (metrics.qualityScore * 0.4) +
                  ((1 - metrics.denialRate) * 100 * 0.3) +
                  (metrics.patientSatisfaction * 20 * 0.3);

    if (score >= 90) return { rating: "Excellent", icon: "🌟", color: "text-green-600" };
    if (score >= 80) return { rating: "Good", icon: "⭐", color: "text-blue-600" };
    if (score >= 70) return { rating: "Average", icon: "📊", color: "text-yellow-600" };
    return { rating: "Needs Improvement", icon: "⚠️", color: "text-red-600" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading provider schemes data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Provider Schemes Management</h1>
          <p className="text-muted-foreground">
            Manage provider network assignments, contracts, and performance across all schemes
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Providers
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">
              {providers.filter(p => p.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Coverage</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schemes.reduce((sum, s) => sum + s.planTiers.reduce((tierSum, t) => tierSum + t.assignedProviders, 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all schemes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.length > 0
                ? Math.round(providers.reduce((sum, p) => sum + p.performanceMetrics.qualityScore, 0) / providers.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Provider quality rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Utilization</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.length > 0
                ? Math.round(providers.reduce((sum, p) => sum + p.performanceMetrics.networkUtilization, 0) / providers.length * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average utilization rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Provider Network</TabsTrigger>
          <TabsTrigger value="schemes">Scheme Integration</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="optimization">Network Optimization</TabsTrigger>
        </TabsList>

        {/* Provider Network Tab */}
        <TabsContent value="providers" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterProviderType} onValueChange={setFilterProviderType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Provider Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="dental_clinic">Dental Clinic</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem="laboratory">Laboratory</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Networks</SelectItem>
                    <SelectItem value="tier_1">Tier 1</SelectItem>
                    <SelectItem value="tier_2">Tier 2</SelectItem>
                    <SelectItem value="tier_3">Tier 3</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Provider Table */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Network Assignments</CardTitle>
              <CardDescription>
                Manage provider network assignments and monitor performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Networks</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Denial Rate</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => {
                    const performanceRating = getPerformanceRating(provider.performanceMetrics);
                    return (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">{provider.address}</div>
                            <div className="text-sm text-muted-foreground">{provider.contactPerson}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{provider.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {provider.networkAssignments.map((assignment) => (
                              <Badge
                                key={assignment.networkId}
                                className={getNetworkTypeBadge(assignment.networkType)}
                              >
                                {assignment.networkName} ({assignment.discountPercentage}%)
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getQualityStatusColor(provider.performanceMetrics.qualityScore)}`}>
                            {provider.performanceMetrics.qualityScore}/100
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getDenialRateStatusColor(provider.performanceMetrics.denialRate)}`}>
                            {(provider.performanceMetrics.denialRate * 100).toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${provider.performanceMetrics.networkUtilization * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {(provider.performanceMetrics.networkUtilization * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span className="text-lg">{performanceRating.icon}</span>
                            <span className={`text-sm font-medium ${performanceRating.color}`}>
                              {performanceRating.rating}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                            {provider.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProvider(provider)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheme Integration Tab */}
        <TabsContent value="schemes" className="space-y-4">
          <Alert>
            <Network className="h-4 w-4" />
            <AlertDescription>
              Monitor how providers are integrated across different schemes and plan tiers.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {schemes.map((scheme) => (
              <Card key={scheme.schemeId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{scheme.schemeName}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {scheme.syncStatus === 'synced' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : scheme.syncStatus === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={scheme.contractStatus === 'active' ? 'default' : 'secondary'}>
                        {scheme.contractStatus}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Last synced: {scheme.lastSyncDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scheme.planTiers.map((tier) => (
                      <div key={tier.tierId} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{tier.tierName}</h4>
                          <Badge variant="outline">{tier.networkAccess}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Assigned Providers:</span>
                            <span className="font-medium ml-2">{tier.assignedProviders}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Utilization Rate:</span>
                            <span className="font-medium ml-2">{(tier.utilizationRate * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${tier.utilizationRate * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Analytics Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Performance Overview */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Provider Performance Overview</CardTitle>
                <CardDescription>
                  Detailed performance metrics and quality indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredProviders.map((provider) => (
                    <div key={provider.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{provider.name}</h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-lg">{getPerformanceRating(provider.performanceMetrics).icon}</span>
                          <span className={`text-sm ${getPerformanceRating(provider.performanceMetrics).color}`}>
                            {getPerformanceRating(provider.performanceMetrics).rating}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Claims Processed</div>
                          <div className="font-medium">{provider.performanceMetrics.claimsProcessed.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Processing Time</div>
                          <div className="font-medium">{provider.performanceMetrics.averageProcessingTime} days</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Quality Score</div>
                          <div className={`font-medium ${getQualityStatusColor(provider.performanceMetrics.qualityScore)}`}>
                            {provider.performanceMetrics.qualityScore}/100
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Patient Satisfaction</div>
                          <div className="font-medium">{provider.performanceMetrics.patientSatisfaction}/5</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  Ranked by overall performance score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((rank) => {
                    const provider = providers.sort((a, b) =>
                      b.performanceMetrics.qualityScore - a.performanceMetrics.qualityScore
                    )[rank - 1];

                    if (!provider) return null;

                    return (
                      <div key={rank} className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-medium text-sm">
                          {rank}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-muted-foreground">{provider.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{provider.performanceMetrics.qualityScore}/100</div>
                          <div className="text-sm text-muted-foreground">Quality Score</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Manage provider contracts, rates, and compliance across all schemes.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Contract Management</CardTitle>
              <CardDescription>
                Provider contracts and rate structures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Contract Management</h3>
                <p>Provider contracts, rate schedules, and compliance tracking</p>
                <Button className="mt-4">
                  <FileText className="mr-2 h-4 w-4" />
                  View Contracts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              AI-powered recommendations for optimizing provider networks and scheme alignments.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Network Optimization</CardTitle>
                <CardDescription>
                  Recommended improvements for provider network efficiency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: "Network Realignment", description: "3 providers recommended for tier upgrade", impact: "High", priority: "Urgent" },
                    { title: "Discount Optimization", description: "Potential 12% savings through renegotiation", impact: "Medium", priority: "Medium" },
                    { title: "Coverage Gaps", description: "2 geographic areas need additional providers", impact: "Medium", priority: "Low" }
                  ].map((recommendation, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{recommendation.title}</h4>
                        <Badge variant={recommendation.priority === 'Urgent' ? 'destructive' : 'outline'}>
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                      <div className="mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Impact: {recommendation.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Targets</CardTitle>
                <CardDescription>
                  Benchmarks and KPIs for provider network optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { metric: "Network Coverage", current: 78, target: 85, status: "on-track" },
                    { metric: "Quality Score", current: 88, target: 90, status: "on-track" },
                    { metric: "Denial Rate", current: 5.2, target: 4.0, status: "needs-attention" },
                    { metric: "Utilization Rate", current: 72, target: 80, status: "needs-attention" }
                  ].map((kpi, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{kpi.metric}</h4>
                        <Badge variant={kpi.status === 'on-track' ? 'default' : 'destructive'}>
                          {kpi.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            kpi.status === 'on-track' ? 'bg-green-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${(kpi.current / kpi.target) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-sm">
                        <span>Current: {kpi.current}%</span>
                        <span>Target: {kpi.target}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Provider Details Dialog */}
      {selectedProvider && (
        <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProvider.name}</DialogTitle>
              <DialogDescription>
                Detailed provider information and network assignments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <p>{selectedProvider.type}</p>
                  </div>
                  <div>
                    <Label>Contact Person</Label>
                    <p>{selectedProvider.contactPerson}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p>{selectedProvider.contactEmail}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p>{selectedProvider.contactPhone}</p>
                  </div>
                </div>
              </div>

              {/* Network Assignments */}
              <div>
                <h3 className="text-lg font-medium mb-3">Network Assignments</h3>
                <div className="space-y-2">
                  {selectedProvider.networkAssignments.map((assignment) => (
                    <div key={assignment.networkId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{assignment.networkName}</h4>
                          <Badge className={getNetworkTypeBadge(assignment.networkType)}>
                            {assignment.networkType}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{assignment.discountPercentage}% discount</div>
                          <div className="text-sm text-muted-foreground">Network Rate</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {assignment.specializations.map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Claims Processed</div>
                    <div className="text-2xl font-bold">
                      {selectedProvider.performanceMetrics.claimsProcessed.toLocaleString()}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Quality Score</div>
                    <div className={`text-2xl font-bold ${getQualityStatusColor(selectedProvider.performanceMetrics.qualityScore)}`}>
                      {selectedProvider.performanceMetrics.qualityScore}/100
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Patient Satisfaction</div>
                    <div className="text-2xl font-bold">
                      {selectedProvider.performanceMetrics.patientSatisfaction}/5
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                    <div className="text-2xl font-bold">
                      {selectedProvider.performanceMetrics.averageProcessingTime} days
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Denial Rate</div>
                    <div className={`text-2xl font-bold ${getDenialRateStatusColor(selectedProvider.performanceMetrics.denialRate)}`}>
                      {(selectedProvider.performanceMetrics.denialRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Network Utilization</div>
                    <div className="text-2xl font-bold">
                      {(selectedProvider.performanceMetrics.networkUtilization * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Data
                </Button>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Provider
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}