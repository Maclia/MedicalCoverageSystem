import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Clock,
  Star,
  Award,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Settings,
  Activity,
  DollarSign
} from 'lucide-react';

interface ProviderDetail {
  id: number;
  npiNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  specialties: string[];
  credentials: Array<{
    type: string;
    number: string;
    issuedBy: string;
    issuedDate: string;
    expiryDate: string;
  }>;
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax?: string;
    isPrimary: boolean;
  }>;
  networkStatus: 'active' | 'pending' | 'inactive' | 'suspended';
  networkTier: 'tier1' | 'tier2' | 'tier3';
  participationLevel: 'full' | 'partial' | 'limited';
  acceptanceStatus: string;
  taxId: string;
  entityType: 'individual' | 'group' | 'facility';
  contractStatus: string;
  contractType: string;
  reimbursementMethod: string;
  reimbursementRate: number;
  capitationRate?: number;
  contractStartDate: string;
  contractEndDate: string;
  satisfactionScore: number;
  qualityScore: number;
  complianceScore: number;
  credentialingStatus: string;
  createdAt: string;
  updatedAt: string;
  metrics: {
    totalClaims: number;
    approvedClaims: number;
    deniedClaims: number;
    pendingClaims: number;
    totalAmount: number;
    averageProcessingTime: number;
    denialRate: number;
  };
  recentClaims: Array<{
    id: number;
    claimNumber: string;
    memberName: string;
    serviceType: string;
    status: string;
    totalAmount: number;
    serviceDate: string;
    createdAt: string;
  }>;
}

const ProviderProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProviderDetails(parseInt(id));
    }
  }, [id]);

  const fetchProviderDetails = async (providerId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers/${providerId}`);
      const data = await response.json();

      if (data.success) {
        setProvider(data.data);
      } else {
        setError(data.error || 'Failed to fetch provider details');
      }
    } catch (error) {
      console.error('Failed to fetch provider details:', error);
      setError('Failed to load provider information');
    } finally {
      setLoading(false);
    }
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

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Provider</h3>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <Button onClick={() => window.location.href = '/providers'}>
            Back to Provider Directory
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-lg">
                  {provider.firstName[0]}{provider.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {provider.firstName} {provider.lastName}, {provider.specialization}
                </h1>
                <p className="text-gray-600">{provider.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getNetworkStatusColor(provider.networkStatus)}>
                    <span className="flex items-center gap-1">
                      {getNetworkStatusIcon(provider.networkStatus)}
                      {provider.networkStatus}
                    </span>
                  </Badge>
                  <Badge variant="outline" className={getTierColor(provider.networkTier)}>
                    {provider.networkTier}
                  </Badge>
                  <Badge variant="outline" className={getContractStatusColor(provider.contractStatus)}>
                    {provider.contractStatus}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <EditProviderForm provider={provider} onSave={() => fetchProviderDetails(provider.id)} />
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold">{provider.metrics.totalClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold">
                  {provider.metrics.totalClaims > 0
                    ? ((provider.metrics.approvedClaims / provider.metrics.totalClaims) * 100).toFixed(1)
                    : 0}%
                </p>
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
                <p className="text-2xl font-bold">{provider.satisfactionScore.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(provider.metrics.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="claims">Recent Claims</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NPI Number</Label>
                    <p className="font-medium">{provider.npiNumber}</p>
                  </div>
                  <div>
                    <Label>Tax ID</Label>
                    <p className="font-medium">{provider.taxId}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="font-medium">{provider.phone}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{provider.email}</p>
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <p className="font-medium capitalize">{provider.entityType}</p>
                  </div>
                  <div>
                    <Label>Acceptance Status</Label>
                    <p className="font-medium">{provider.acceptanceStatus}</p>
                  </div>
                  <div>
                    <Label>Participation Level</Label>
                    <p className="font-medium capitalize">{provider.participationLevel}</p>
                  </div>
                  <div>
                    <Label>Credentialing Status</Label>
                    <p className="font-medium capitalize">{provider.credentialingStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specialties */}
            <Card>
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="mb-3">
                    <Label>Primary Specialization</Label>
                    <p className="text-lg font-medium">{provider.specialization}</p>
                  </div>
                  <div>
                    <Label>Additional Specialties</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {provider.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {provider.locations.map((location, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-lg">{location.name}</h3>
                    {location.isPrimary && (
                      <Badge variant="default">Primary Location</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm">{location.address}</p>
                        <p className="text-sm">{location.city}, {location.state} {location.zipCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{location.phone}</span>
                    </div>
                    {location.fax && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>Fax: {location.fax}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          {provider.credentials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provider.credentials.map((credential, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{credential.type}</h3>
                        <Award className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label>Number</Label>
                          <p className="font-medium">{credential.number}</p>
                        </div>
                        <div>
                          <Label>Issued By</Label>
                          <p className="font-medium">{credential.issuedBy}</p>
                        </div>
                        <div>
                          <Label>Issued Date</Label>
                          <p className="font-medium">{formatDate(credential.issuedDate)}</p>
                        </div>
                        <div>
                          <Label>Expiry Date</Label>
                          <p className="font-medium">{formatDate(credential.expiryDate)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Credentials On File</h3>
                <p className="text-gray-600 text-center">
                  Credentials information will be available once the provider completes the credentialing process.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claims Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Claims Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{provider.metrics.totalClaims}</p>
                    <p className="text-sm text-gray-600">Total Claims</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{provider.metrics.approvedClaims}</p>
                    <p className="text-sm text-gray-600">Approved Claims</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{provider.metrics.pendingClaims}</p>
                    <p className="text-sm text-gray-600">Pending Claims</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{provider.metrics.deniedClaims}</p>
                    <p className="text-sm text-gray-600">Denied Claims</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Approval Rate</span>
                    <span className="font-medium">
                      {provider.metrics.totalClaims > 0
                        ? ((provider.metrics.approvedClaims / provider.metrics.totalClaims) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Denial Rate</span>
                    <span className="font-medium">{provider.metrics.denialRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Processing Time</span>
                    <span className="font-medium">{provider.metrics.averageProcessingTime.toFixed(1)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Satisfaction Score</span>
                      <span className="font-medium">{provider.satisfactionScore.toFixed(1)}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(provider.satisfactionScore / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Quality Score</span>
                      <span className="font-medium">{provider.qualityScore.toFixed(1)}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(provider.qualityScore / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Compliance Score</span>
                      <span className="font-medium">{provider.complianceScore.toFixed(1)}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(provider.complianceScore / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {provider.recentClaims.length > 0 ? (
            <div className="space-y-3">
              {provider.recentClaims.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">Claim #{claim.claimNumber}</p>
                          <p className="text-sm text-gray-600">
                            {claim.memberName} • {claim.serviceType}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span>Service: {formatDate(claim.serviceDate)}</span>
                            <span>Submitted: {formatDate(claim.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={claim.status === 'approved' ? 'default' :
                                  claim.status === 'denied' ? 'destructive' : 'secondary'}
                        >
                          {claim.status}
                        </Badge>
                        <p className="text-lg font-bold mt-1">{formatCurrency(claim.totalAmount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Claims</h3>
                <p className="text-gray-600 text-center">
                  This provider doesn't have any recent claims in the system.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contract" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Status</Label>
                    <Badge className={getContractStatusColor(provider.contractStatus)}>
                      {provider.contractStatus}
                    </Badge>
                  </div>
                  <div>
                    <Label>Contract Type</Label>
                    <p className="font-medium capitalize">{provider.contractType}</p>
                  </div>
                  <div>
                    <Label>Reimbursement Method</Label>
                    <p className="font-medium capitalize">{provider.reimbursementMethod}</p>
                  </div>
                  <div>
                    <Label>Reimbursement Rate</Label>
                    <p className="font-medium">{provider.reimbursementRate}%</p>
                  </div>
                  {provider.capitationRate && (
                    <div>
                      <Label>Capitation Rate</Label>
                      <p className="font-medium">{formatCurrency(provider.capitationRate)}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Contract Period</Label>
                    <p className="font-medium">
                      {formatDate(provider.contractStartDate)} - {formatDate(provider.contractEndDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Network Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Network Status</Label>
                    <Badge className={getNetworkStatusColor(provider.networkStatus)}>
                      {provider.networkStatus}
                    </Badge>
                  </div>
                  <div>
                    <Label>Network Tier</Label>
                    <Badge variant="outline" className={getTierColor(provider.networkTier)}>
                      {provider.networkTier}
                    </Badge>
                  </div>
                  <div>
                    <Label>Participation Level</Label>
                    <p className="font-medium capitalize">{provider.participationLevel}</p>
                  </div>
                  <div>
                    <Label>Joined Network</Label>
                    <p className="font-medium">{formatDate(provider.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Edit Provider Form Component
const EditProviderForm: React.FC<{
  provider: ProviderDetail;
  onSave: () => void;
}> = ({ provider, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: provider.firstName,
    lastName: provider.lastName,
    email: provider.email,
    phone: provider.phone,
    specialization: provider.specialization,
    networkTier: provider.networkTier,
    participationLevel: provider.participationLevel
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
        // Close dialog - this will be handled by the parent component
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit Provider Information</DialogTitle>
        <DialogDescription>
          Update the provider's basic information and network settings.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="specialization">Specialization</Label>
        <Input
          id="specialization"
          value={formData.specialization}
          onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="networkTier">Network Tier</Label>
          <Select value={formData.networkTier} onValueChange={(value) => setFormData(prev => ({ ...prev, networkTier: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tier1">Tier 1</SelectItem>
              <SelectItem value="tier2">Tier 2</SelectItem>
              <SelectItem value="tier3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="participationLevel">Participation Level</Label>
          <Select value={formData.participationLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, participationLevel: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default ProviderProfile;