import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, MapPin, TrendingUp, Search, Filter } from "lucide-react";

interface ProviderNetwork {
  id: number;
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'premium' | 'basic' | 'standard';
  description?: string;
  coverageArea?: string;
  isActive: boolean;
  minimumProviders: number;
  maximumProviders?: number;
  qualityThreshold: number;
  costControlLevel: number;
  specialRequirements?: string;
  createdAt: string;
  updatedAt: string;
}

interface NetworkAssignment {
  id: number;
  institutionId: number;
  networkId: number;
  institutionName: string;
  institutionType: string;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  assignmentType: string;
  networkDiscount: number;
}

const networkTierConfig = {
  tier_1: { label: 'Tier 1', color: 'bg-green-100 text-green-800' },
  tier_2: { label: 'Tier 2', color: 'bg-blue-100 text-blue-800' },
  tier_3: { label: 'Tier 3', color: 'bg-yellow-100 text-yellow-800' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800' },
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-800' },
  standard: { label: 'Standard', color: 'bg-orange-100 text-orange-800' }
};

export default function ProviderNetworkManagement() {
  const [networks, setNetworks] = useState<ProviderNetwork[]>([]);
  const [assignments, setAssignments] = useState<NetworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<ProviderNetwork | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    tier: '' as ProviderNetwork['tier'],
    description: '',
    coverageArea: '',
    minimumProviders: 1,
    maximumProviders: undefined as number | undefined,
    qualityThreshold: 0.0,
    costControlLevel: 1,
    specialRequirements: ''
  });

  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      const response = await fetch('/api/provider-networks');
      const result = await response.json();

      if (result.success) {
        setNetworks(result.data);
      } else {
        toast.error('Failed to fetch provider networks');
      }
    } catch (error) {
      toast.error('Error fetching provider networks');
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkAssignments = async (networkId: number) => {
    try {
      const response = await fetch(`/api/provider-networks/${networkId}/providers`);
      const result = await response.json();

      if (result.success) {
        setAssignments(result.data);
      } else {
        toast.error('Failed to fetch network providers');
      }
    } catch (error) {
      toast.error('Error fetching network providers');
    }
  };

  const handleCreateNetwork = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/provider-networks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Provider network created successfully');
        setIsCreateDialogOpen(false);
        setFormData({
          name: '',
          tier: '' as ProviderNetwork['tier'],
          description: '',
          coverageArea: '',
          minimumProviders: 1,
          maximumProviders: undefined,
          qualityThreshold: 0.0,
          costControlLevel: 1,
          specialRequirements: ''
        });
        fetchNetworks();
      } else {
        toast.error(result.error || 'Failed to create provider network');
      }
    } catch (error) {
      toast.error('Error creating provider network');
    }
  };

  const handleDeleteNetwork = async (networkId: number) => {
    if (!confirm('Are you sure you want to delete this provider network?')) {
      return;
    }

    try {
      const response = await fetch(`/api/provider-networks/${networkId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Provider network deleted successfully');
        fetchNetworks();
      } else {
        toast.error(result.error || 'Failed to delete provider network');
      }
    } catch (error) {
      toast.error('Error deleting provider network');
    }
  };

  const handleViewNetwork = (network: ProviderNetwork) => {
    setSelectedNetwork(network);
    fetchNetworkAssignments(network.id);
  };

  const filteredNetworks = networks.filter(network => {
    const matchesSearch = network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (network.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTier = filterTier === 'all' || network.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const getProviderCount = async (networkId: number) => {
    // This would typically be cached or memoized
    try {
      const response = await fetch(`/api/provider-networks/${networkId}/providers`);
      const result = await response.json();
      return result.success ? result.data.length : 0;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Provider Network Management</h1>
          <p className="text-gray-600">Manage provider networks, tiers, and assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Network
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Provider Network</DialogTitle>
              <DialogDescription>
                Set up a new provider network with specific tiers and requirements
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNetwork} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Network Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium Hospital Network"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tier">Network Tier</Label>
                  <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value as ProviderNetwork['tier'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier_1">Tier 1</SelectItem>
                      <SelectItem value="tier_2">Tier 2</SelectItem>
                      <SelectItem value="tier_3">Tier 3</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Network description and purpose"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="coverageArea">Coverage Area</Label>
                <Input
                  id="coverageArea"
                  value={formData.coverageArea}
                  onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                  placeholder="e.g., Metropolitan Area, State-wide"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumProviders">Minimum Providers</Label>
                  <Input
                    id="minimumProviders"
                    type="number"
                    min="1"
                    value={formData.minimumProviders}
                    onChange={(e) => setFormData({ ...formData, minimumProviders: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="maximumProviders">Maximum Providers</Label>
                  <Input
                    id="maximumProviders"
                    type="number"
                    min="1"
                    value={formData.maximumProviders || ''}
                    onChange={(e) => setFormData({ ...formData, maximumProviders: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="qualityThreshold">Quality Threshold</Label>
                  <Input
                    id="qualityThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.qualityThreshold}
                    onChange={(e) => setFormData({ ...formData, qualityThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="costControlLevel">Cost Control Level</Label>
                  <Select value={formData.costControlLevel.toString()} onValueChange={(value) => setFormData({ ...formData, costControlLevel: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (Low)</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                      <SelectItem value="5">Level 5 (High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="specialRequirements">Special Requirements</Label>
                <Textarea
                  id="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                  placeholder="Additional network requirements or constraints"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Network</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search networks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="tier_1">Tier 1</SelectItem>
            <SelectItem value="tier_2">Tier 2</SelectItem>
            <SelectItem value="tier_3">Tier 3</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Networks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNetworks.map((network) => (
          <Card key={network.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{network.name}</CardTitle>
                  <Badge
                    className={networkTierConfig[network.tier].color}
                    variant="secondary"
                  >
                    {networkTierConfig[network.tier].label}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleViewNetwork(network)}>
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteNetwork(network.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {network.description && (
                <CardDescription className="text-sm">
                  {network.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {network.coverageArea || 'No coverage area specified'}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Quality Score:</span>
                  <span className="font-medium">{network.qualityThreshold}/100</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cost Control:</span>
                  <span className="font-medium">Level {network.costControlLevel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={network.isActive ? "default" : "secondary"}>
                    {network.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network Details Modal */}
      {selectedNetwork && (
        <Dialog open={!!selectedNetwork} onOpenChange={() => setSelectedNetwork(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedNetwork.name}</span>
                <Badge className={networkTierConfig[selectedNetwork.tier].color}>
                  {networkTierConfig[selectedNetwork.tier].label}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Network details and assigned providers
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Coverage Area</Label>
                    <p className="text-sm text-gray-600">{selectedNetwork.coverageArea || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label>Quality Threshold</Label>
                    <p className="text-sm text-gray-600">{selectedNetwork.qualityThreshold}/100</p>
                  </div>
                  <div>
                    <Label>Minimum Providers</Label>
                    <p className="text-sm text-gray-600">{selectedNetwork.minimumProviders}</p>
                  </div>
                  <div>
                    <Label>Maximum Providers</Label>
                    <p className="text-sm text-gray-600">
                      {selectedNetwork.maximumProviders || 'No limit'}
                    </p>
                  </div>
                  <div>
                    <Label>Cost Control Level</Label>
                    <p className="text-sm text-gray-600">Level {selectedNetwork.costControlLevel}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm text-gray-600">
                      {selectedNetwork.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {selectedNetwork.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedNetwork.description}</p>
                  </div>
                )}
                {selectedNetwork.specialRequirements && (
                  <div>
                    <Label>Special Requirements</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedNetwork.specialRequirements}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="providers">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Assigned Providers</h3>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Provider
                    </Button>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No providers assigned to this network</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Assignment Type</TableHead>
                          <TableHead>Network Discount</TableHead>
                          <TableHead>Effective Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.institutionName}</TableCell>
                            <TableCell>{assignment.institutionType}</TableCell>
                            <TableCell>{assignment.assignmentType}</TableCell>
                            <TableCell>{assignment.networkDiscount}%</TableCell>
                            <TableCell>{new Date(assignment.effectiveDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={assignment.isActive ? "default" : "secondary"}>
                                {assignment.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Network Analytics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">{assignments.length}</p>
                            <p className="text-sm text-gray-600">Total Providers</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Users className="w-8 h-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">
                              {assignments.filter(a => a.isActive).length}
                            </p>
                            <p className="text-sm text-gray-600">Active Providers</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <MapPin className="w-8 h-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">Multiple</p>
                            <p className="text-sm text-gray-600">Coverage Areas</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}