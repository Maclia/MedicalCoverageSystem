import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Upload,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  Building,
  Shield,
  Award,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  MessageSquare,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

interface VerificationApplication {
  id: number;
  applicationNumber: string;
  institutionName: string;
  institutionType: string;
  applicationType: string;
  status: 'registered' | 'document_pending' | 'verification_in_progress' | 'approved' | 'rejected' | 'suspended';
  submissionDate: string;
  completionDate?: string;
  reviewerId?: number;
  assignedCaseWorker?: number;
  priorityLevel: number;
  estimatedCompletionDate?: string;
  applicationNotes?: string;
  rejectionReason?: string;
  nextFollowUpDate?: string;
  automatedChecksCompleted: boolean;
  manualVerificationRequired: boolean;
}

interface ChecklistItem {
  id: number;
  verificationCategory: string;
  checklistItem: string;
  isRequired: boolean;
  isCompleted: boolean;
  completionDate?: string;
  completedBy?: number;
  supportingDocuments?: string[];
  verificationNotes?: string;
  automaticVerification: boolean;
  externalVerificationRequired: boolean;
  verificationMethod: string;
  expiryDate?: string;
}

interface VerificationDocument {
  id: number;
  applicationId: number;
  documentType: string;
  documentName: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: string;
  verifiedBy?: number;
  notes?: string;
}

interface AccreditationRecord {
  id: number;
  institutionId: number;
  accreditationBody: string;
  accreditationType: string;
  accreditationNumber: string;
  accreditationStatus: 'accredited' | 'provisional' | 'not_accredited' | 'expired';
  issueDate?: string;
  expiryDate?: string;
  lastAuditDate?: string;
  nextAuditDate?: string;
  auditScore?: number;
  auditReportPath?: string;
  verificationStatus: string;
  verifiedBy?: number;
  verificationDate?: string;
}

const ProviderVerification: React.FC = () => {
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [accreditations, setAccreditations] = useState<AccreditationRecord[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<VerificationApplication | null>(null);
  const [activeTab, setActiveTab] = useState('applications');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchAccreditations();
  }, []);

  const fetchApplications = async () => {
    try {
      // Mock API call - replace with actual API call
      const mockApplications: VerificationApplication[] = [
        {
          id: 1,
          applicationNumber: 'PROV-2024-0001',
          institutionName: 'City General Hospital',
          institutionType: 'Hospital',
          applicationType: 'new',
          status: 'verification_in_progress',
          submissionDate: '2024-01-15T10:00:00Z',
          reviewerId: 1,
          assignedCaseWorker: 2,
          priorityLevel: 2,
          estimatedCompletionDate: '2024-02-15T00:00:00Z',
          automatedChecksCompleted: true,
          manualVerificationRequired: false
        },
        {
          id: 2,
          applicationNumber: 'PROV-2024-0002',
          institutionName: 'MediCare Clinic',
          institutionType: 'Clinic',
          applicationType: 'renewal',
          status: 'document_pending',
          submissionDate: '2024-01-20T09:00:00Z',
          assignedCaseWorker: 1,
          priorityLevel: 3,
          automatedChecksCompleted: false,
          manualVerificationRequired: true
        },
        {
          id: 3,
          applicationNumber: 'PROV-2024-0003',
          institutionName: 'Kenya Pharmacy Ltd',
          institutionType: 'Pharmacy',
          applicationType: 'new',
          status: 'approved',
          submissionDate: '2024-01-10T11:00:00Z',
          completionDate: '2024-02-01T14:00:00Z',
          reviewerId: 3,
          approvedBy: 3,
          priorityLevel: 1,
          nextFollowUpDate: '2024-02-15T00:00:00Z'
        }
      ];
      setApplications(mockApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccreditations = async () => {
    try {
      // Mock API call - replace with actual API call
      const mockAccreditations: AccreditationRecord[] = [
        {
          id: 1,
          institutionId: 1,
          accreditationBody: 'JCI',
          accreditationType: 'Hospital',
          accreditationNumber: 'JCI-2024-0001',
          accreditationStatus: 'accredited',
          issueDate: '2023-01-15',
          expiryDate: '2026-01-14',
          lastAuditDate: '2024-01-10',
          nextAuditDate: '2026-01-10',
          auditScore: 92,
          verificationStatus: 'verified',
          verifiedBy: 1,
          verificationDate: '2024-01-15'
        },
        {
          id: 2,
          institutionId: 2,
          accreditationBody: 'COHSASA',
          accreditationType: 'Clinic',
          accreditationNumber: 'COHSASA-2024-0002',
          accreditationStatus: 'provisional',
          issueDate: '2024-01-20',
          expiryDate: '2025-01-19',
          verificationStatus: 'pending'
        }
      ];
      setAccreditations(mockAccreditations);
    } catch (error) {
      console.error('Error fetching accreditations:', error);
    }
  };

  const fetchChecklistItems = async (applicationId: number) => {
    try {
      // Mock API call - replace with actual API call
      const mockChecklistItems: ChecklistItem[] = [
        {
          id: 1,
          applicationId,
          verificationCategory: 'licensing',
          checklistItem: 'Medical Institution License Verification',
          isRequired: true,
          isCompleted: true,
          completionDate: '2024-01-18T10:00:00Z',
          completedBy: 1,
          automaticVerification: true,
          externalVerificationRequired: false,
          verificationMethod: 'api_call'
        },
        {
          id: 2,
          applicationId,
          verificationCategory: 'compliance',
          checklistItem: 'Healthcare Compliance Certificate',
          isRequired: true,
          isCompleted: true,
          completionDate: '2024-01-19T14:00:00Z',
          completedBy: 1,
          automaticVerification: false,
          externalVerificationRequired: false,
          verificationMethod: 'document'
        },
        {
          id: 3,
          applicationId,
          verificationCategory: 'quality',
          checklistItem: 'Quality Management System',
          isRequired: true,
          isCompleted: false,
          automaticVerification: false,
          externalVerificationRequired: true,
          verificationMethod: 'site_visit'
        }
      ];
      setChecklistItems(mockChecklistItems);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    }
  };

  const handleViewChecklist = (application: VerificationApplication) => {
    setSelectedApplication(application);
    fetchChecklistItems(application.id);
    setShowChecklistDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'verification_in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'document_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (level: number) => {
    if (level <= 2) return 'bg-red-100 text-red-800';
    if (level === 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getPriorityLabel = (level: number) => {
    if (level <= 2) return 'High';
    if (level === 3) return 'Medium';
    return 'Low';
  };

  const getAccreditationStatusColor = (status: string) => {
    switch (status) {
      case 'accredited':
        return 'bg-green-100 text-green-800';
      case 'provisional':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationProgress = (items: ChecklistItem[]) => {
    if (items.length === 0) return 0;
    const completedItems = items.filter(item => item.isCompleted).length;
    return (completedItems / items.length) * 100;
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      app.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getVerificationStats = () => {
    const total = applications.length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const inProgress = applications.filter(app => app.status === 'verification_in_progress').length;
    const pending = applications.filter(app => app.status === 'document_pending').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    return { total, approved, inProgress, pending, rejected };
  };

  const verificationStats = getVerificationStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification data...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Provider Verification</h1>
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent focus:outline-none"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="document_pending">Document Pending</SelectItem>
                <SelectItem value="verification_in_progress">Verification In Progress</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{verificationStats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{verificationStats.approved}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{verificationStats.inProgress}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{verificationStats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{verificationStats.rejected}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="accreditations">Accreditations</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Monitoring</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Verification Applications</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application Number</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono">{application.applicationNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{application.institutionName}</div>
                            <div className="text-sm text-gray-500">{application.institutionType}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{application.applicationType.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.replace('_', ' ').charAt(0).toUpperCase() + application.status.replace('_', ' ').slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(application.priorityLevel)}>
                            {getPriorityLabel(application.priorityLevel)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(application.submissionDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={70} className="w-16" />
                            <span className="text-sm text-gray-600">70%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewChecklist(application)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accreditations Tab */}
          <TabsContent value="accreditations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Provider Accreditations</CardTitle>
                  <Button>
                    <Award className="h-4 w-4 mr-2" />
                    Add Accreditation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accreditations.map((accreditation) => (
                    <div key={accreditation.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-lg font-semibold">{accreditation.accreditationBody}</h3>
                            <p className="text-sm text-gray-600">{accreditation.accreditationType}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">#{accreditation.accreditationNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={getAccreditationStatusColor(accreditation.accreditationStatus)}>
                            {accreditation.accreditationStatus.replace('_', ' ').charAt(0).toUpperCase() + accreditation.accreditationStatus.replace('_', ' ').slice(1)}
                          </Badge>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Issue: {accreditation.issueDate ? new Date(accreditation.issueDate).toLocaleDateString() : 'N/A'}</span>
                            <span>Expires: {accreditation.expiryDate ? new Date(accreditation.expiryDate).toLocaleDateString() : 'N/A'}</span>
                            {accreditation.auditScore && (
                              <span className="flex items-center">
                                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                                {accreditation.auditScore}/100
                              </span>
                            )}
                          </div>
                        </div>
                        {accreditation.nextAuditDate && (
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-gray-600">Next Audit:</span>
                            <span className="font-medium">{new Date(accreditation.nextAuditDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Monitoring Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-8 w-8 text-green-600" />
                        <div>
                          <h3 className="font-semibold">Overall Compliance</h3>
                          <p className="text-sm text-gray-600">All critical areas monitored</p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">92%</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Clinical Compliance</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">95%</span>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Administrative</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">88%</span>
                          <TrendingDown className="h-4 w-4 text-yellow-600" />
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Financial</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">93%</span>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Safety & Privacy</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">91%</span>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <strong>High Risk:</strong> License expiry notice for City General Hospital - expires in 30 days
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <strong>Medium Risk:</strong> Quality management system update required for MediCare Clinic
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <strong>Information:</strong> Annual compliance audit scheduled for Kenya Pharmacy Ltd
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Checklist Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Verification Checklist - {selectedApplication?.institutionName}
            </DialogTitle>
            <DialogDescription>
              Application #{selectedApplication?.applicationNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Completion Progress</h3>
              <span className="text-lg font-bold">
                {Math.round(getVerificationProgress(checklistItems))}%
              </span>
            </div>
            <Progress value={getVerificationProgress(checklistItems)} className="mb-6" />

            <div className="space-y-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {item.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.checklistItem}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">{item.verificationCategory}</span>
                          <span>{item.verificationMethod}</span>
                          {item.isRequired && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                          )}
                          {item.automaticVerification && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Automatic</span>
                          )}
                        </div>
                        {item.completionDate && (
                          <p className="text-sm text-green-600 mt-2">
                            Completed on {new Date(item.completionDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.isCompleted ? (
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      ) : (
                        <Button size="sm" variant="outline">
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderVerification;