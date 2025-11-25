import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Star,
  Award,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter
} from 'lucide-react';

interface Provider {
  id: number;
  npiNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  specialties: string[];
  networkStatus: 'active' | 'pending' | 'inactive' | 'suspended';
  networkTier: 'tier1' | 'tier2' | 'tier3';
  participationLevel: 'full' | 'partial' | 'limited';
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    isPrimary: boolean;
  }>;
  performanceMetrics: {
    totalClaims: number;
    averageProcessingTime: number;
    averageClaimAmount: number;
    satisfactionScore: number;
    qualityScore: number;
    complianceScore: number;
  };
  acceptanceStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchFilters {
  query: string;
  specialization: string;
  city: string;
  state: string;
  zipCode: string;
  networkTier: string;
  participationLevel: string;
  networkStatus: string;
}

const ProviderDirectory: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    specialization: '',
    city: '',
    state: '',
    zipCode: '',
    networkTier: '',
    participationLevel: '',
    networkStatus: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchProviders();
  }, [searchFilters, pagination.page]);

  useEffect(() => {
    applyFilters();
  }, [providers, searchFilters]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/providers?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setProviders(data.data.providers);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          totalPages: data.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase();
      filtered = filtered.filter(provider =>
        provider.firstName.toLowerCase().includes(query) ||
        provider.lastName.toLowerCase().includes(query) ||
        provider.specialization.toLowerCase().includes(query) ||
        provider.email.toLowerCase().includes(query)
      );
    }

    setFilteredProviders(filtered);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getNetworkStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNetworkStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'inactive':
        return <XCircle className="h-4 w-4" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'tier1':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tier2':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tier3':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatProcessingTime = (days: number) => {
    if (days < 1) return '< 1 day';
    return `${days.toFixed(1)} days`;
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Provider Directory
          </CardTitle>
          <CardDescription>
            Search and filter through our network of healthcare providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search Providers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, specialty, or email..."
                  value={searchFilters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Select value={searchFilters.specialization} onValueChange={(value) => handleFilterChange('specialization', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Specializations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specializations</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Dermatology">Dermatology</SelectItem>
                  <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                  <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                  <SelectItem value="Surgery">Surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="networkStatus">Network Status</Label>
              <Select value={searchFilters.networkStatus} onValueChange={(value) => handleFilterChange('networkStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Enter city..."
                value={searchFilters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="Enter state..."
                value={searchFilters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="networkTier">Network Tier</Label>
              <Select value={searchFilters.networkTier} onValueChange={(value) => handleFilterChange('networkTier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tiers</SelectItem>
                  <SelectItem value="tier1">Tier 1</SelectItem>
                  <SelectItem value="tier2">Tier 2</SelectItem>
                  <SelectItem value="tier3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredProviders.length} of {pagination.total} providers
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchFilters({
              query: '',
              specialization: '',
              city: '',
              state: '',
              zipCode: '',
              networkTier: '',
              participationLevel: '',
              networkStatus: ''
            })}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {provider.firstName[0]}{provider.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {provider.firstName} {provider.lastName}, {provider.specialization}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{provider.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge className={getNetworkStatusColor(provider.networkStatus)}>
                    <span className="flex items-center gap-1">
                      {getNetworkStatusIcon(provider.networkStatus)}
                      {provider.networkStatus}
                    </span>
                  </Badge>
                  <Badge variant="outline" className={getTierColor(provider.networkTier)}>
                    {provider.networkTier}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{provider.phone}</span>
                </div>
                {provider.locations.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{provider.locations.find(l => l.isPrimary)?.city || provider.locations[0].city}, {provider.locations.find(l => l.isPrimary)?.state || provider.locations[0].state}</span>
                  </div>
                )}
              </div>

              {/* Specialties */}
              {provider.specialties.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Specialties</Label>
                  <div className="flex flex-wrap gap-1">
                    {provider.specialties.slice(0, 3).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {provider.specialties.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{provider.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Performance Metrics</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{formatProcessingTime(provider.performanceMetrics.averageProcessingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span>{provider.performanceMetrics.totalClaims} claims</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className={`h-4 w-4 ${getQualityScoreColor(provider.performanceMetrics.satisfactionScore)}`} />
                    <span className={getQualityScoreColor(provider.performanceMetrics.satisfactionScore)}>
                      {provider.performanceMetrics.satisfactionScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className={`h-4 w-4 ${getQualityScoreColor(provider.performanceMetrics.qualityScore)}`} />
                    <span className={getQualityScoreColor(provider.performanceMetrics.qualityScore)}>
                      {provider.performanceMetrics.qualityScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <ProviderDetailModal provider={provider} />
                  </DialogContent>
                </Dialog>

                <Button size="sm" className="flex-1">
                  View Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {filteredProviders.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
            <p className="text-gray-600 text-center">
              Try adjusting your search filters or check back later for new providers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Provider Detail Modal Component
const ProviderDetailModal: React.FC<{ provider: Provider }> = ({ provider }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {provider.firstName[0]}{provider.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">
              {provider.firstName} {provider.lastName}, {provider.specialization}
            </h2>
            <p className="text-sm text-gray-600">{provider.email}</p>
          </div>
        </DialogTitle>
        <DialogDescription>
          Detailed provider information and performance metrics
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="specialties">Specialties</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>NPI Number</Label>
              <p className="font-medium">{provider.npiNumber}</p>
            </div>
            <div>
              <Label>Phone</Label>
              <p className="font-medium">{provider.phone}</p>
            </div>
            <div>
              <Label>Acceptance Status</Label>
              <p className="font-medium">{provider.acceptanceStatus}</p>
            </div>
            <div>
              <Label>Participation Level</Label>
              <p className="font-medium capitalize">{provider.participationLevel}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="space-y-3">
            {provider.locations.map((location, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{location.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {location.address}<br />
                        {location.city}, {location.state} {location.zipCode}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {location.phone}
                        </span>
                      </div>
                    </div>
                    {location.isPrimary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Claims</p>
                    <p className="text-xl font-bold">{provider.performanceMetrics.totalClaims}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Processing Time</p>
                    <p className="text-xl font-bold">{provider.performanceMetrics.averageProcessingTime.toFixed(1)} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Satisfaction Score</p>
                    <p className="text-xl font-bold">{provider.performanceMetrics.satisfactionScore.toFixed(1)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className="text-xl font-bold">{provider.performanceMetrics.qualityScore.toFixed(1)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Compliance Score</p>
                    <p className="text-xl font-bold">{provider.performanceMetrics.complianceScore.toFixed(1)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Claim Amount</p>
                    <p className="text-xl font-bold">${provider.performanceMetrics.averageClaimAmount.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {provider.specialties.map((specialty, index) => (
              <Badge key={index} variant="outline" className="text-sm">
                {specialty}
              </Badge>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ProviderDirectory;