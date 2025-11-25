import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Network, Plus, Search, MapPin, Users, Star } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

interface NetworkAssignmentRequest {
  institutionId: number;
  networkId: number;
  effectiveDate: string;
  expiryDate?: string;
  assignmentType: string;
  coveredSpecializations: string[];
  networkDiscount: number;
  specialTerms?: string;
}

interface ProviderNetworkSelectorProps {
  institutionId: number;
  value?: number;
  onValueChange?: (networkId: number | undefined) => void;
  onAssignmentChange?: (assignment: NetworkAssignmentRequest) => void;
  disabled?: boolean;
  showAssignmentDialog?: boolean;
  className?: string;
}

const networkTierConfig = {
  tier_1: { label: 'Tier 1', color: 'bg-green-100 text-green-800', description: 'Premium providers with highest quality' },
  tier_2: { label: 'Tier 2', color: 'bg-blue-100 text-blue-800', description: 'High-quality providers with good coverage' },
  tier_3: { label: 'Tier 3', color: 'bg-yellow-100 text-yellow-800', description: 'Standard providers with basic coverage' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800', description: 'Exclusive network of top-tier providers' },
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-800', description: 'Essential provider network' },
  standard: { label: 'Standard', color: 'bg-orange-100 text-orange-800', description: 'Balanced provider network' }
};

export default function ProviderNetworkSelector({
  institutionId,
  value,
  onValueChange,
  onAssignmentChange,
  disabled = false,
  showAssignmentDialog = false,
  className
}: ProviderNetworkSelectorProps) {
  const [networks, setNetworks] = useState<ProviderNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetworkDetails, setSelectedNetworkDetails] = useState<ProviderNetwork | null>(null);

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    assignmentType: 'full',
    coveredSpecializations: [] as string[],
    networkDiscount: 0,
    specialTerms: ''
  });

  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      const response = await fetch('/api/provider-networks');
      const result = await response.json();

      if (result.success) {
        // Filter to only active networks
        setNetworks(result.data.filter((network: ProviderNetwork) => network.isActive));
      } else {
        toast.error('Failed to fetch provider networks');
      }
    } catch (error) {
      toast.error('Error fetching provider networks');
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkSelect = async (networkId: string) => {
    const selectedId = networkId ? parseInt(networkId) : undefined;

    if (selectedId) {
      // Fetch network details
      try {
        const response = await fetch(`/api/provider-networks/${selectedId}`);
        const result = await response.json();

        if (result.success) {
          setSelectedNetworkDetails(result.data);
        }
      } catch (error) {
        console.error('Error fetching network details:', error);
      }
    } else {
      setSelectedNetworkDetails(null);
    }

    onValueChange?.(selectedId);

    // Show assignment dialog if enabled and a network is selected
    if (showAssignmentDialog && selectedId) {
      setIsAssignmentDialogOpen(true);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNetworkDetails) {
      toast.error('No network selected');
      return;
    }

    try {
      const assignmentData = {
        institutionId,
        networkId: selectedNetworkDetails.id,
        effectiveDate: assignmentForm.effectiveDate,
        expiryDate: assignmentForm.expiryDate || undefined,
        assignmentType: assignmentForm.assignmentType,
        coveredSpecializations: assignmentForm.coveredSpecializations,
        networkDiscount: assignmentForm.networkDiscount,
        specialTerms: assignmentForm.specialTerms || undefined
      };

      const response = await fetch(`/api/provider-networks/${selectedNetworkDetails.id}/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Provider assigned to network successfully');
        setIsAssignmentDialogOpen(false);
        onAssignmentChange?.(assignmentData);

        // Reset form
        setAssignmentForm({
          effectiveDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          assignmentType: 'full',
          coveredSpecializations: [],
          networkDiscount: 0,
          specialTerms: ''
        });
      } else {
        toast.error(result.error || 'Failed to assign provider to network');
      }
    } catch (error) {
      toast.error('Error assigning provider to network');
    }
  };

  const handleSpecializationToggle = (specialization: string) => {
    setAssignmentForm(prev => ({
      ...prev,
      coveredSpecializations: prev.coveredSpecializations.includes(specialization)
        ? prev.coveredSpecializations.filter(s => s !== specialization)
        : [...prev.coveredSpecializations, specialization]
    }));
  };

  const filteredNetworks = networks.filter(network =>
    network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (network.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (network.coverageArea?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Provider Network</Label>
        <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label>Provider Network</Label>
        <Select
          value={value?.toString() || ''}
          onValueChange={handleNetworkSelect}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider network..." />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search networks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {filteredNetworks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No networks found
              </div>
            ) : (
              filteredNetworks.map((network) => (
                <SelectItem key={network.id} value={network.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{network.name}</span>
                      <Badge
                        className={networkTierConfig[network.tier].color}
                        variant="secondary"
                      >
                        {networkTierConfig[network.tier].label}
                      </Badge>
                    </div>
                    {network.coverageArea && (
                      <span className="text-xs text-gray-500">{network.coverageArea}</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Network Details Preview */}
      {selectedNetworkDetails && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="w-5 h-5" />
                {selectedNetworkDetails.name}
              </CardTitle>
              <Badge
                className={networkTierConfig[selectedNetworkDetails.tier].color}
                variant="secondary"
              >
                {networkTierConfig[selectedNetworkDetails.tier].label}
              </Badge>
            </div>
            {selectedNetworkDetails.description && (
              <CardDescription>
                {selectedNetworkDetails.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedNetworkDetails.coverageArea || 'No coverage area'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Min: {selectedNetworkDetails.minimumProviders} providers
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Quality: {selectedNetworkDetails.qualityThreshold}/100
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedNetworkDetails.isActive ? "default" : "secondary"}>
                  {selectedNetworkDetails.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                {networkTierConfig[selectedNetworkDetails.tier].description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Dialog */}
      {showAssignmentDialog && (
        <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Provider to Network</DialogTitle>
              <DialogDescription>
                Configure the network assignment settings for this provider
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {selectedNetworkDetails && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Assigning to: {selectedNetworkDetails.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    {networkTierConfig[selectedNetworkDetails.tier].description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={assignmentForm.effectiveDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, effectiveDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={assignmentForm.expiryDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, expiryDate: e.target.value })}
                    min={assignmentForm.effectiveDate}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="assignmentType">Assignment Type</Label>
                <Select value={assignmentForm.assignmentType} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, assignmentType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="selective">Selective Access</SelectItem>
                    <SelectItem value="emergency_only">Emergency Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="networkDiscount">Network Discount (%)</Label>
                <Input
                  id="networkDiscount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={assignmentForm.networkDiscount}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, networkDiscount: parseFloat(e.target.value) })}
                  placeholder="0.0"
                />
              </div>

              <div>
                <Label>Covered Specializations</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['General Practice', 'Dental', 'Radiology', 'Maternity', 'Orthopedics', 'Cardiology', 'Pediatrics', 'Surgery', 'Emergency'].map((spec) => (
                    <Button
                      key={spec}
                      type="button"
                      variant={assignmentForm.coveredSpecializations.includes(spec) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSpecializationToggle(spec)}
                      className="h-8"
                    >
                      {spec}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="specialTerms">Special Terms</Label>
                <Textarea
                  id="specialTerms"
                  value={assignmentForm.specialTerms}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, specialTerms: e.target.value })}
                  placeholder="Any special terms or conditions for this assignment"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Assignment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}