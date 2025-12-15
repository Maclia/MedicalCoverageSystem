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
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Upload,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Building
} from "lucide-react";

interface ProviderContract {
  id: number;
  institutionId: number;
  contractNumber: string;
  contractName: string;
  contractType: string;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewal_pending';
  reimbursementModel: string;
  effectiveDate: string;
  expiryDate?: string;
  autoRenewal: boolean;
  renewalTermMonths: number;
  terminationDays: number;
  negotiatedDiscount: number;
  capitationRate?: number;
  contractValue?: number;
  billingCycle: string;
  paymentTerms: string;
  institutionName: string;
  institutionType: string;
  institutionContactEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface ContractDocument {
  id: number;
  documentType: string;
  documentName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  version: number;
  isActive: boolean;
  uploadDate: string;
  expiryDate?: string;
  required: boolean;
  documentStatus: string;
  approvedDate?: string;
  uploadedBy?: string;
  approvedByEmail?: string;
}

interface ContractSignature {
  id: number;
  signerType: string;
  signerName: string;
  signerTitle?: string;
  signerEmail: string;
  signatureDate: string;
  signatureMethod: string;
  verificationStatus: string;
  verifiedDate?: string;
  documentId: number;
}

const contractStatusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  terminated: { label: 'Terminated', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  renewal_pending: { label: 'Renewal Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
};

const reimbursementModelConfig = {
  fee_for_service: 'Fee for Service',
  capitation: 'Capitation',
  drg: 'DRG',
  per_diem: 'Per Diem',
  package_deal: 'Package Deal'
};

export default function ContractManagement() {
  const [contracts, setContracts] = useState<ProviderContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ProviderContract | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Form states
  const [formData, setFormData] = useState({
    institutionId: 0,
    contractName: '',
    contractType: '',
    reimbursementModel: '' as ProviderContract['reimbursementModel'],
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    autoRenewal: false,
    renewalTermMonths: 12,
    terminationDays: 90,
    negotiatedDiscount: 0,
    capitationRate: 0,
    contractValue: 0,
    billingCycle: 'monthly',
    paymentTerms: 'NET_30',
    specialTerms: '',
    internalNotes: ''
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/provider-contracts');
      const result = await response.json();

      if (result.success) {
        setContracts(result.data);
      } else {
        toast.error('Failed to fetch provider contracts');
      }
    } catch (error) {
      toast.error('Error fetching provider contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractDetails = async (contractId: number) => {
    try {
      const [contractResponse, documentsResponse, signaturesResponse] = await Promise.all([
        fetch(`/api/provider-contracts/${contractId}`),
        fetch(`/api/provider-contracts/${contractId}/documents`),
        fetch(`/api/provider-contracts/${contractId}/signatures`)
      ]);

      const contractResult = await contractResponse.json();
      const documentsResult = await documentsResponse.json();
      const signaturesResult = await signaturesResponse.json();

      if (contractResult.success) {
        setSelectedContract(contractResult.data);
      }

      if (documentsResult.success) {
        setDocuments(documentsResult.data);
      }

      if (signaturesResult.success) {
        setSignatures(signaturesResult.data);
      }
    } catch (error) {
      toast.error('Error fetching contract details');
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/provider-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Contract created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchContracts();
      } else {
        toast.error(result.error || 'Failed to create contract');
      }
    } catch (error) {
      toast.error('Error creating contract');
    }
  };

  const handleActivateContract = async (contractId: number) => {
    try {
      const response = await fetch(`/api/provider-contracts/${contractId}/activate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Contract activated successfully');
        fetchContracts();
        if (selectedContract?.id === contractId) {
          fetchContractDetails(contractId);
        }
      } else {
        toast.error(result.error || 'Failed to activate contract');
      }
    } catch (error) {
      toast.error('Error activating contract');
    }
  };

  const handleDeleteContract = async (contractId: number) => {
    if (!confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    try {
      const response = await fetch(`/api/provider-contracts/${contractId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Contract deleted successfully');
        fetchContracts();
        if (selectedContract?.id === contractId) {
          setSelectedContract(null);
        }
      } else {
        toast.error(result.error || 'Failed to delete contract');
      }
    } catch (error) {
      toast.error('Error deleting contract');
    }
  };

  const resetForm = () => {
    setFormData({
      institutionId: 0,
      contractName: '',
      contractType: '',
      reimbursementModel: '' as ProviderContract['reimbursementModel'],
      effectiveDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      autoRenewal: false,
      renewalTermMonths: 12,
      terminationDays: 90,
      negotiatedDiscount: 0,
      capitationRate: 0,
      contractValue: 0,
      billingCycle: 'monthly',
      paymentTerms: 'NET_30',
      specialTerms: '',
      internalNotes: ''
    });
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.institutionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    const matchesType = filterType === 'all' || contract.contractType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    const config = contractStatusConfig[status as keyof typeof contractStatusConfig];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
          <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
          <p className="text-gray-600">Manage provider contracts, documents, and signatures</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Provider Contract</DialogTitle>
              <DialogDescription>
                Set up a new contract with a provider institution
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institutionId">Institution ID</Label>
                  <Input
                    id="institutionId"
                    type="number"
                    value={formData.institutionId}
                    onChange={(e) => setFormData({ ...formData, institutionId: parseInt(e.target.value) })}
                    placeholder="Enter institution ID"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractName">Contract Name</Label>
                  <Input
                    id="contractName"
                    value={formData.contractName}
                    onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
                    placeholder="e.g., Standard Service Agreement"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractType">Contract Type</Label>
                  <Select value={formData.contractType} onValueChange={(value) => setFormData({ ...formData, contractType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="facility">Facility</SelectItem>
                      <SelectItem value="specialty">Specialty</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reimbursementModel">Reimbursement Model</Label>
                  <Select value={formData.reimbursementModel} onValueChange={(value) => setFormData({ ...formData, reimbursementModel: value as ProviderContract['reimbursementModel'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reimbursementModelConfig).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractValue">Contract Value</Label>
                  <Input
                    id="contractValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.contractValue}
                    onChange={(e) => setFormData({ ...formData, contractValue: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="negotiatedDiscount">Negotiated Discount (%)</Label>
                  <Input
                    id="negotiatedDiscount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.negotiatedDiscount}
                    onChange={(e) => setFormData({ ...formData, negotiatedDiscount: parseFloat(e.target.value) })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select value={formData.billingCycle} onValueChange={(value) => setFormData({ ...formData, billingCycle: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NET_15">Net 15</SelectItem>
                      <SelectItem value="NET_30">Net 30</SelectItem>
                      <SelectItem value="NET_45">Net 45</SelectItem>
                      <SelectItem value="NET_60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRenewal"
                    checked={formData.autoRenewal}
                    onChange={(e) => setFormData({ ...formData, autoRenewal: e.target.checked })}
                    className="mr-2"
                  />
                  <Label htmlFor="autoRenewal">Auto Renewal</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="specialTerms">Special Terms</Label>
                <Textarea
                  id="specialTerms"
                  value={formData.specialTerms}
                  onChange={(e) => setFormData({ ...formData, specialTerms: e.target.value })}
                  placeholder="Any special terms or conditions"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Internal notes and observations"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Contract</Button>
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
            placeholder="Search contracts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
            <SelectItem value="renewal_pending">Renewal Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="facility">Facility</SelectItem>
            <SelectItem value="specialty">Specialty</SelectItem>
            <SelectItem value="network">Network</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No contracts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="cursor-pointer hover:bg-gray-50" onClick={() => fetchContractDetails(contract.id)}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contract.contractNumber}</div>
                        <div className="text-sm text-gray-600">{contract.contractName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{contract.institutionName}</div>
                          <div className="text-sm text-gray-600">{contract.institutionType}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {contract.contractType.charAt(0).toUpperCase() + contract.contractType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(contract.status)}
                        <Badge className={contractStatusConfig[contract.status]?.color} variant="secondary">
                          {contractStatusConfig[contract.status]?.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contract.contractValue ? formatCurrency(contract.contractValue) : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(contract.effectiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {contract.expiryDate ? new Date(contract.expiryDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-1">
                        {contract.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateContract(contract.id);
                            }}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContract(contract.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contract Details Modal */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedContract.contractName}
              </DialogTitle>
              <DialogDescription>
                Contract details, documents, and signatures
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contract Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contract Number:</span>
                        <span className="font-medium">{selectedContract.contractNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contract Type:</span>
                        <span className="font-medium">{selectedContract.contractType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reimbursement Model:</span>
                        <span className="font-medium">
                          {reimbursementModelConfig[selectedContract.reimbursementModel as keyof typeof reimbursementModelConfig]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Billing Cycle:</span>
                        <span className="font-medium">{selectedContract.billingCycle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Terms:</span>
                        <span className="font-medium">{selectedContract.paymentTerms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Auto Renewal:</span>
                        <Badge variant={selectedContract.autoRenewal ? "default" : "secondary"}>
                          {selectedContract.autoRenewal ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contract Value:</span>
                        <span className="font-medium">
                          {selectedContract.contractValue ? formatCurrency(selectedContract.contractValue) : 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Negotiated Discount:</span>
                        <span className="font-medium">{selectedContract.negotiatedDiscount}%</span>
                      </div>
                      {selectedContract.capitationRate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Capitation Rate:</span>
                          <span className="font-medium">{formatCurrency(selectedContract.capitationRate)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-lg font-bold">{documents.length}</p>
                          <p className="text-sm text-gray-600">Documents</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <User className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-lg font-bold">{signatures.length}</p>
                          <p className="text-sm text-gray-600">Signatures</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-lg font-bold">
                            {selectedContract.reimbursementModel === 'fee_for_service' ? 'FFS' :
                             selectedContract.reimbursementModel === 'capitation' ? 'Cap' :
                             selectedContract.reimbursementModel?.toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600">Model</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedContract.specialTerms && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Special Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{selectedContract.specialTerms}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedContract.internalNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Internal Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{selectedContract.internalNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Contract Documents</h3>
                    <Button onClick={() => setIsDocumentDialogOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>

                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No documents uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((document) => (
                        <Card key={document.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{document.documentName}</p>
                                  <p className="text-sm text-gray-600">{document.originalFileName}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(document.fileSize)} • Uploaded by {document.uploadedBy || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  className={document.required ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}
                                  variant="secondary"
                                >
                                  {document.required ? 'Required' : 'Optional'}
                                </Badge>
                                <div className="mt-1">
                                  <Badge
                                    className={
                                      document.documentStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                      document.documentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }
                                    variant="secondary"
                                  >
                                    {document.documentStatus}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="signatures">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contract Signatures</h3>

                  {signatures.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No signatures collected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signatures.map((signature) => (
                        <Card key={signature.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{signature.signerName}</p>
                                {signature.signerTitle && (
                                  <p className="text-sm text-gray-600">{signature.signerTitle}</p>
                                )}
                                <p className="text-sm text-gray-600">{signature.signerEmail}</p>
                                <p className="text-xs text-gray-500">
                                  Signed on {new Date(signature.signatureDate).toLocaleDateString()} •
                                  Method: {signature.signatureMethod}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  className={
                                    signature.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                    signature.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }
                                  variant="secondary"
                                >
                                  {signature.verificationStatus}
                                </Badge>
                                <div className="mt-1 text-sm text-gray-600">
                                  {signature.signerType}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contract Analytics</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">
                              {selectedContract.effectiveDate ?
                                Math.ceil((new Date().getTime() - new Date(selectedContract.effectiveDate).getTime()) / (1000 * 60 * 60 * 24))
                                : 0
                              }
                            </p>
                            <p className="text-sm text-gray-600">Days Active</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <FileText className="w-8 h-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">{documents.length}</p>
                            <p className="text-sm text-gray-600">Total Documents</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <User className="w-8 h-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">{signatures.length}</p>
                            <p className="text-sm text-gray-600">Signatures</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <DollarSign className="w-8 h-8 text-orange-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold">
                              {selectedContract.negotiatedDiscount}%
                            </p>
                            <p className="text-sm text-gray-600">Discount</p>
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