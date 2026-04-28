import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Alert, AlertDescription } from '@/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import { Input } from '@/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Printer,
  Share,
  Search,
  Filter
} from 'lucide-react';
import { claimsApi, notificationApi } from '@/services/api/claimsApi';

interface EOBDocument {
  id: string;
  claimId: number;
  memberId: number;
  memberName: string;
  memberAddress?: string;
  memberPhoneNumber?: string;
  institutionId?: number;
  institutionName: string;
  institutionAddress?: string;
  serviceDate: string;
  claimAmount: number;
  approvedAmount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
  status: 'approved' | 'partially_approved' | 'denied';
  explanationText: string;
  appealRights: {
    canAppeal: boolean;
    appealDeadline: string;
    appealInstructions: string;
  };
  services: Array<{
    description: string;
    date: string;
    billedAmount: number;
    allowedAmount: number;
    memberResponsibility: number;
    insurerResponsibility: number;
  }>;
  financialBreakdown: {
    deductible: number;
    copay: number;
    coinsurance: number;
    networkDiscounts: number;
    nonCoveredCharges: number;
    totalMemberResponsibility: number;
    totalInsurerResponsibility: number;
  };
  generatedDate: string;
  format: 'html' | 'pdf';
}

interface Claim {
  id: number;
  submissionDate: string;
  serviceDate: string;
  amount: number;
  status: string;
  processedDate?: string;
  memberId?: number;
  memberName?: string;
  institutionId?: number;
  institutionName?: string;
  institutionAddress?: string;
  approvedAmount?: number;
  patientResponsibility?: number;
  memberResponsibility?: number;
  coveredAmount?: number;
  insurerResponsibility?: number;
  description?: string;
  paymentDate?: string;
}

export const MemberEOBViewer: React.FC = () => {
  const [eobs, setEobs] = useState<EOBDocument[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedEOB, setSelectedEOB] = useState<EOBDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Mock member data - in a real app, this would come from auth/user context
  const [memberId] = useState(1);

  useEffect(() => {
    loadMemberData();
  }, [memberId, dateRange]);

  const loadMemberData = async () => {
    try {
      setLoading(true);
      setError(null);

      const claimsResponse = await fetch(`/api/claims?memberId=${memberId}`, {
        credentials: 'include',
      });

      if (!claimsResponse.ok) {
        throw new Error('Failed to load member claims');
      }

      const claimsPayload = await claimsResponse.json();
      const backendClaims: Claim[] = Array.isArray(claimsPayload)
        ? claimsPayload
        : Array.isArray(claimsPayload?.data)
          ? claimsPayload.data
          : [];

      // Filter claims by date range
      const filteredClaims = backendClaims.filter(claim => {
        const serviceDate = new Date(claim.serviceDate);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return serviceDate >= start && serviceDate <= end;
      });

      setClaims(filteredClaims);

      const generatedEobs: EOBDocument[] = filteredClaims
        .filter((claim) =>
          ['approved', 'partially_approved', 'paid', 'completed'].includes(claim.status.toLowerCase())
        )
        .map((claim) => {
          const approvedAmount = claim.approvedAmount ?? claim.coveredAmount ?? claim.amount;
          const memberResponsibility =
            claim.memberResponsibility ?? claim.patientResponsibility ?? Math.max(claim.amount - approvedAmount, 0);
          const insurerResponsibility =
            claim.insurerResponsibility ?? claim.coveredAmount ?? Math.max(approvedAmount - memberResponsibility, 0);

          return {
            id: `eob_${claim.id}`,
            claimId: claim.id,
            memberId: claim.memberId ?? memberId,
            memberName: claim.memberName ?? `Member #${memberId}`,
            memberAddress: undefined,
            memberPhoneNumber: undefined,
            institutionId: claim.institutionId,
            institutionName: claim.institutionName ?? 'Provider not specified',
            institutionAddress: claim.institutionAddress,
            serviceDate: claim.serviceDate,
            claimAmount: claim.amount,
            approvedAmount,
            memberResponsibility,
            insurerResponsibility,
            status:
              claim.status.toLowerCase() === 'approved'
                ? 'approved'
                : claim.status.toLowerCase() === 'partially_approved'
                  ? 'partially_approved'
                  : 'approved',
            explanationText:
              claim.status.toLowerCase() === 'partially_approved'
                ? 'This claim was partially approved based on your current plan benefits.'
                : 'This claim was processed based on your current plan benefits.',
            appealRights: {
              canAppeal: claim.status.toLowerCase() === 'partially_approved' || claim.status.toLowerCase() === 'denied',
              appealDeadline: '',
              appealInstructions:
                'Contact support or submit an appeal with supporting documentation if you believe this claim was processed incorrectly.',
            },
            services: [
              {
                description: claim.description ?? 'Claimed service',
                date: claim.serviceDate,
                billedAmount: claim.amount,
                allowedAmount: approvedAmount,
                memberResponsibility,
                insurerResponsibility,
              },
            ],
            financialBreakdown: {
              deductible: 0,
              copay: 0,
              coinsurance: 0,
              networkDiscounts: 0,
              nonCoveredCharges: Math.max(claim.amount - approvedAmount, 0),
              totalMemberResponsibility: memberResponsibility,
              totalInsurerResponsibility: insurerResponsibility,
            },
            generatedDate: claim.processedDate ?? claim.paymentDate ?? claim.submissionDate,
            format: 'html',
          };
        });

      setEobs(generatedEobs);
    } catch (err) {
      setError('Failed to load EOB documents');
      console.error('EOB loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle EOB download
  const handleDownloadEOB = async (eob: EOBDocument, format: 'html' | 'pdf' = 'pdf') => {
    try {
      const response = await claimsApi.generateEOB(eob.claimId, format);
      if (response.success) {
        // Create download link
        const blob = new Blob([response.data as any], { type: format === 'pdf' ? 'application/pdf' : 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `EOB_Claim_${eob.claimId}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download EOB');
      console.error('EOB download error:', err);
    }
  };

  // Handle EOB email
  const handleEmailEOB = async (eob: EOBDocument) => {
    try {
      if (!eob.memberId) {
        throw new Error('Missing member information for EOB email');
      }

      await notificationApi.sendTemplateNotification({
        templateId: 'eob_delivery',
        recipient: String(eob.memberId),
        recipientType: 'member',
        variables: {
          memberName: eob.memberName,
          claimId: eob.claimId,
          eobUrl: window.location.href,
          downloadLink: `${window.location.origin}/api/claims/${eob.claimId}/eob?format=pdf`
        }
      });
      alert('EOB has been sent to your email');
    } catch (err) {
      setError('Failed to email EOB');
      console.error('EOB email error:', err);
    }
  };

  // Filter claims and EOBs
  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEOBs = eobs.filter(eob => {
    const matchesSearch = eob.claimId.toString().includes(searchTerm) ||
                         eob.institutionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || eob.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'partially_approved':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Approved</Badge>;
      case 'denied':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      case 'pending':
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading EOB documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Explanation of Benefits</h1>
          <p className="text-gray-600">View and download your EOB documents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by claim ID or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="partially_approved">Partially Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              placeholder="Start date"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              placeholder="End date"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="eobs">
        <TabsList>
          <TabsTrigger value="eobs">Available EOBs</TabsTrigger>
          <TabsTrigger value="claims">All Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="eobs">
          <Card>
            <CardHeader>
              <CardTitle>Your Explanation of Benefits</CardTitle>
              <CardDescription>Documents for your processed claims</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEOBs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No EOB documents found</p>
                  <p className="text-sm">EOBs are generated when your claims are processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEOBs.map((eob) => (
                    <div key={eob.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">Claim #{eob.claimId}</h3>
                            {getStatusBadge(eob.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Provider:</span>
                              <p className="font-medium">{eob.institutionName}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Service Date:</span>
                              <p className="font-medium">{new Date(eob.serviceDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Claim Amount:</span>
                              <p className="font-medium">${eob.claimAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Your Responsibility:</span>
                              <p className="font-medium">${eob.memberResponsibility.toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {eob.explanationText}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedEOB(eob)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Explanation of Benefits - Claim #{eob.claimId}</DialogTitle>
                              </DialogHeader>
                              {selectedEOB && (
                                <div className="space-y-6">
                                  {/* Member Information */}
                                  <div className="border-b pb-4">
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <User className="h-4 w-4 mr-2" />
                                      Member Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Name:</span>
                                        <p className="font-medium">{selectedEOB.memberName}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Address:</span>
                                        <p className="font-medium">{selectedEOB.memberAddress || 'Not available'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Phone:</span>
                                        <p className="font-medium">{selectedEOB.memberPhoneNumber || 'Not available'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Member ID:</span>
                                        <p className="font-medium">#{selectedEOB.memberId}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Provider Information */}
                                  <div className="border-b pb-4">
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <Building className="h-4 w-4 mr-2" />
                                      Provider Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Name:</span>
                                        <p className="font-medium">{selectedEOB.institutionName}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Address:</span>
                                        <p className="font-medium">{selectedEOB.institutionAddress || 'Not available'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Service Details */}
                                  <div className="border-b pb-4">
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Service Details
                                    </h3>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Service Description</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Billed</TableHead>
                                          <TableHead>Allowed</TableHead>
                                          <TableHead>Your Responsibility</TableHead>
                                          <TableHead>Plan Responsibility</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedEOB.services.map((service, index) => (
                                          <TableRow key={index}>
                                            <TableCell>{service.description}</TableCell>
                                            <TableCell>{new Date(service.date).toLocaleDateString()}</TableCell>
                                            <TableCell>${service.billedAmount.toLocaleString()}</TableCell>
                                            <TableCell>${service.allowedAmount.toLocaleString()}</TableCell>
                                            <TableCell>${service.memberResponsibility.toLocaleString()}</TableCell>
                                            <TableCell>${service.insurerResponsibility.toLocaleString()}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  {/* Financial Breakdown */}
                                  <div className="border-b pb-4">
                                    <h3 className="font-semibold mb-3 flex items-center">
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Financial Breakdown
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium mb-2">Your Responsibility</h4>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex justify-between">
                                            <span>Deductible:</span>
                                            <span>${selectedEOB.financialBreakdown.deductible}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Copay:</span>
                                            <span>${selectedEOB.financialBreakdown.copay}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Coinsurance:</span>
                                            <span>${selectedEOB.financialBreakdown.coinsurance}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Non-covered charges:</span>
                                            <span>${selectedEOB.financialBreakdown.nonCoveredCharges}</span>
                                          </div>
                                          <div className="flex justify-between font-semibold border-t pt-1">
                                            <span>Total:</span>
                                            <span>${selectedEOB.financialBreakdown.totalMemberResponsibility}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-2">Plan Responsibility</h4>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex justify-between">
                                            <span>Network discounts:</span>
                                            <span>-${selectedEOB.financialBreakdown.networkDiscounts}</span>
                                          </div>
                                          <div className="flex justify-between font-semibold border-t pt-1">
                                            <span>Total:</span>
                                            <span>${selectedEOB.financialBreakdown.totalInsurerResponsibility}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Appeal Rights */}
                                  {selectedEOB.appealRights.canAppeal && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                      <h3 className="font-semibold mb-2 flex items-center text-yellow-800">
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Appeal Rights
                                      </h3>
                                      <p className="text-sm text-yellow-700 mb-2">
                                        You have the right to appeal this decision.
                                      </p>
                                      <p className="text-sm text-yellow-600">
                                        <strong>Deadline:</strong> {selectedEOB.appealRights.appealDeadline}
                                      </p>
                                      <p className="text-sm text-yellow-600 mt-2">
                                        <strong>Instructions:</strong> {selectedEOB.appealRights.appealInstructions}
                                      </p>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => handleEmailEOB(selectedEOB)}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Email EOB
                                    </Button>
                                    <Button variant="outline" onClick={() => handleDownloadEOB(selectedEOB, 'pdf')}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </Button>
                                    <Button variant="outline" onClick={() => handleDownloadEOB(selectedEOB, 'html')}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Download HTML
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadEOB(eob, 'pdf')}>
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEmailEOB(eob)}>
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>All Claims</CardTitle>
              <CardDescription>View all your claims and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClaims.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No claims found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">#{claim.id}</TableCell>
                        <TableCell>{new Date(claim.serviceDate).toLocaleDateString()}</TableCell>
                        <TableCell>${claim.amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(claim.status)}</TableCell>
                        <TableCell>{new Date(claim.submissionDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {claim.processedDate ? new Date(claim.processedDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          {(claim.status === 'approved' || claim.status === 'partially_approved') && (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View EOB
                            </Button>
                          )}
                          {claim.status === 'pending' && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Processing
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
