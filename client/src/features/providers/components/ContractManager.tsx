import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Plus,
  Edit,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';

interface ContractInfo {
  providerId: number;
  contractStatus: string;
  contractType: string;
  reimbursementMethod: string;
  reimbursementRate: number;
  capitationRate?: number;
  contractStartDate: string;
  contractEndDate: string;
  terms?: string;
}

interface ServiceRate {
  serviceCode: string;
  serviceName: string;
  standardRate: number;
  contractedRate: number;
  effectiveDate: string;
}

interface ContractFormData {
  contractType: string;
  reimbursementMethod: string;
  standardRates: ServiceRate[];
  capitationRate?: number;
  qualityMetrics: Array<{
    metric: string;
    target: number;
    weight: number;
  }>;
  startDate: string;
  endDate: string;
  terms: string;
  status: string;
}

const ContractManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchContractInfo(parseInt(id));
    }
  }, [id]);

  const fetchContractInfo = async (providerId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers/${providerId}/contracts`);
      const data = await response.json();

      if (data.success) {
        setContract(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch contract info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getContractStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4" />;
      case 'terminated':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contract Found</h3>
          <p className="text-gray-600 text-center mb-4">
            This provider doesn't have any contract information on file.
          </p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <CreateContractForm
                providerId={parseInt(id!)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchContractInfo(parseInt(id!));
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const daysUntilExpiry = calculateDaysUntilExpiry(contract.contractEndDate);
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 90;

  return (
    <div className="space-y-6">
      {/* Contract Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Provider Contract Management
              </CardTitle>
              <CardDescription>
                Manage contracts, reimbursement rates, and payment terms
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contract
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <CreateContractForm
                  providerId={parseInt(id!)}
                  onSuccess={() => fetchContractInfo(parseInt(id!))}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={getContractStatusColor(contract.contractStatus)}>
              <span className="flex items-center gap-1">
                {getContractStatusIcon(contract.contractStatus)}
                {contract.contractStatus.replace('_', ' ')}
              </span>
            </Badge>
            {isExpiringSoon && (
              <Badge variant="outline" className="border-orange-200 text-orange-800 bg-orange-50">
                <AlertCircle className="h-3 w-3 mr-1" />
                Expires in {daysUntilExpiry} days
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contract Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Contract Type</p>
                <p className="text-lg font-bold capitalize">{contract.contractType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Reimbursement Method</p>
                <p className="text-lg font-bold capitalize">{contract.reimbursementMethod}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Reimbursement Rate</p>
                <p className="text-lg font-bold">{contract.reimbursementRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Contract Period</p>
                <p className="text-sm font-bold">
                  {formatDate(contract.contractStartDate)} - {formatDate(contract.contractEndDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Contract Details</TabsTrigger>
          <TabsTrigger value="rates">Service Rates</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="history">Contract History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Type</Label>
                    <p className="font-medium capitalize">{contract.contractType}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getContractStatusColor(contract.contractStatus)}>
                      {contract.contractStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label>Reimbursement Method</Label>
                    <p className="font-medium capitalize">{contract.reimbursementMethod}</p>
                  </div>
                  <div>
                    <Label>Reimbursement Rate</Label>
                    <p className="font-medium">{contract.reimbursementRate}%</p>
                  </div>
                </div>

                {contract.capitationRate && (
                  <div>
                    <Label>Capitation Rate</Label>
                    <p className="font-medium">{formatCurrency(contract.capitationRate)}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <Label>Contract Period</Label>
                    <p className="font-medium">
                      {formatDate(contract.contractStartDate)} - {formatDate(contract.contractEndDate)}
                    </p>
                  </div>
                  {isExpiringSoon && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        This contract expires in {daysUntilExpiry} days. Consider renewal negotiations.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contract Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {contract.terms ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {contract.terms}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No contract terms specified
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Standard Service Rates</CardTitle>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Rates
                </Button>
              </div>
              <CardDescription>
                Standard reimbursement rates for common services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Code</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Standard Rate</TableHead>
                    <TableHead>Contracted Rate</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Effective Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Service rates will be available once the contract is fully configured.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Quality metrics and performance bonuses included in this contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Performance metrics will be configured during contract setup.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract History</CardTitle>
              <CardDescription>
                Previous contracts and amendments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Contract history will be available once multiple contracts have been created.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Create Contract Form Component
const CreateContractForm: React.FC<{
  providerId: number;
  onSuccess: () => void;
}> = ({ providerId, onSuccess }) => {
  const [formData, setFormData] = useState<ContractFormData>({
    contractType: 'standard',
    reimbursementMethod: 'fee_for_service',
    standardRates: [],
    startDate: '',
    endDate: '',
    terms: '',
    status: 'draft'
  });

  const [newServiceRate, setNewServiceRate] = useState<ServiceRate>({
    serviceCode: '',
    serviceName: '',
    standardRate: 0,
    contractedRate: 0,
    effectiveDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/providers/${providerId}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };

  const addServiceRate = () => {
    if (newServiceRate.serviceCode && newServiceRate.serviceName) {
      setFormData(prev => ({
        ...prev,
        standardRates: [...prev.standardRates, { ...newServiceRate }]
      }));
      setNewServiceRate({
        serviceCode: '',
        serviceName: '',
        standardRate: 0,
        contractedRate: 0,
        effectiveDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const removeServiceRate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      standardRates: prev.standardRates.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create New Provider Contract</DialogTitle>
        <DialogDescription>
          Set up a new contract with reimbursement rates and terms.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contractType">Contract Type</Label>
          <Select value={formData.contractType} onValueChange={(value) => setFormData(prev => ({ ...prev, contractType: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="capitation">Capitation</SelectItem>
              <SelectItem value="bundled">Bundled</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="reimbursementMethod">Reimbursement Method</Label>
          <Select value={formData.reimbursementMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, reimbursementMethod: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fee_for_service">Fee for Service</SelectItem>
              <SelectItem value="capitation">Capitation</SelectItem>
              <SelectItem value="bundled">Bundled</SelectItem>
              <SelectItem value="value_based">Value Based</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            required
          />
        </div>
      </div>

      {formData.contractType === 'capitation' && (
        <div>
          <Label htmlFor="capitationRate">Capitation Rate</Label>
          <Input
            id="capitationRate"
            type="number"
            step="0.01"
            placeholder="Enter capitation rate"
            value={formData.capitationRate || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, capitationRate: parseFloat(e.target.value) || undefined }))}
          />
        </div>
      )}

      {/* Service Rates */}
      {formData.reimbursementMethod === 'fee_for_service' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Rates</CardTitle>
            <CardDescription>
              Define reimbursement rates for specific services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              <div>
                <Label htmlFor="serviceCode">Service Code</Label>
                <Input
                  id="serviceCode"
                  placeholder="e.g., 99213"
                  value={newServiceRate.serviceCode}
                  onChange={(e) => setNewServiceRate(prev => ({ ...prev, serviceCode: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="serviceName">Service Name</Label>
                <Input
                  id="serviceName"
                  placeholder="e.g., Office Visit"
                  value={newServiceRate.serviceName}
                  onChange={(e) => setNewServiceRate(prev => ({ ...prev, serviceName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="standardRate">Standard Rate</Label>
                <Input
                  id="standardRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newServiceRate.standardRate || ''}
                  onChange={(e) => setNewServiceRate(prev => ({ ...prev, standardRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="contractedRate">Contracted Rate</Label>
                <Input
                  id="contractedRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newServiceRate.contractedRate || ''}
                  onChange={(e) => setNewServiceRate(prev => ({ ...prev, contractedRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addServiceRate} className="w-full">
                  Add
                </Button>
              </div>
            </div>

            {formData.standardRates.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Code</TableHead>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Standard Rate</TableHead>
                      <TableHead>Contracted Rate</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.standardRates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell>{rate.serviceCode}</TableCell>
                        <TableCell>{rate.serviceName}</TableCell>
                        <TableCell>${rate.standardRate.toFixed(2)}</TableCell>
                        <TableCell>${rate.contractedRate.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeServiceRate(index)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <Label htmlFor="terms">Contract Terms & Conditions</Label>
        <Textarea
          id="terms"
          placeholder="Enter contract terms and conditions..."
          rows={6}
          value={formData.terms}
          onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline">
          Save as Draft
        </Button>
        <Button type="submit">
          Create Contract
        </Button>
      </div>
    </form>
  );
};

export default ContractManager;