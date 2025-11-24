import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  FileCheck,
  FileX,
  MessageSquare,
  Shield,
  Activity,
  TrendingUp
} from 'lucide-react';

interface Document {
  id: string;
  memberId: string;
  memberName: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
  reviewedBy?: string;
  reviewedDate?: Date;
  reviewNotes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  extractedText?: string;
  confidenceScore?: number;
  expirationDate?: Date;
  isRequired: boolean;
}

interface DocumentStats {
  pending: number;
  approved: number;
  rejected: number;
  needsMoreInfo: number;
  avgReviewTime: number;
  todayProcessed: number;
}

interface DocumentReviewQueueProps {
  userRole: string;
}

export const DocumentReviewQueue: React.FC<DocumentReviewQueueProps> = ({ userRole }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_info'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [stats, setStats] = useState<DocumentStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    needsMoreInfo: 0,
    avgReviewTime: 0,
    todayProcessed: 0
  });
  const [loading, setLoading] = useState(false);

  // Mock data - in a real app, this would come from APIs
  useEffect(() => {
    const mockDocuments: Document[] = [
      {
        id: '1',
        memberId: '1',
        memberName: 'John Smith',
        documentType: 'Insurance Card',
        fileName: 'insurance_card_front.jpg',
        fileSize: 2457600,
        mimeType: 'image/jpeg',
        uploadDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        reviewStatus: 'pending',
        priority: 'high',
        tags: ['insurance', 'primary', 'front'],
        extractedText: 'BlueCross BlueShield\nMember ID: 123456789\nGroup: ABC123',
        confidenceScore: 0.95,
        isRequired: true
      },
      {
        id: '2',
        memberId: '1',
        memberName: 'John Smith',
        documentType: 'ID Card',
        fileName: 'driver_license.pdf',
        fileSize: 1254400,
        mimeType: 'application/pdf',
        uploadDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
        reviewStatus: 'pending',
        priority: 'high',
        tags: ['identification', 'government'],
        extractedText: 'California Driver License\nLicense: D1234567\nExpires: 12/31/2025',
        confidenceScore: 0.98,
        isRequired: true
      },
      {
        id: '3',
        memberId: '2',
        memberName: 'Sarah Johnson',
        documentType: 'Medical History',
        fileName: 'medical_history_form.pdf',
        fileSize: 3788800,
        mimeType: 'application/pdf',
        uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reviewStatus: 'needs_more_info',
        reviewedBy: 'Admin User',
        reviewedDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        reviewNotes: 'Please provide more detailed information about pre-existing conditions.',
        priority: 'medium',
        tags: ['medical', 'history', 'form'],
        isRequired: false
      },
      {
        id: '4',
        memberId: '3',
        memberName: 'Mike Davis',
        documentType: 'Proof of Income',
        fileName: 'pay_stub_november.pdf',
        fileSize: 563200,
        mimeType: 'application/pdf',
        uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reviewStatus: 'approved',
        reviewedBy: 'Admin User',
        reviewedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewNotes: 'Document verified and approved.',
        priority: 'low',
        tags: ['income', 'verification', 'payroll'],
        isRequired: false
      },
      {
        id: '5',
        memberId: '4',
        memberName: 'Emily Wilson',
        documentType: 'Vaccination Record',
        fileName: 'covid_vaccine_card.jpg',
        fileSize: 1894400,
        mimeType: 'image/jpeg',
        uploadDate: new Date(),
        reviewStatus: 'pending',
        priority: 'urgent',
        tags: ['vaccination', 'covid', 'medical'],
        extractedText: 'COVID-19 Vaccination Record\nPfizer-BioNTech\nDose 1: 01/15/2024\nDose 2: 02/05/2024',
        confidenceScore: 0.92,
        isRequired: true
      }
    ];

    setDocuments(mockDocuments);
    setFilteredDocuments(mockDocuments);
    calculateStats(mockDocuments);
  }, []);

  // Calculate statistics
  const calculateStats = (docs: Document[]) => {
    const pending = docs.filter(d => d.reviewStatus === 'pending').length;
    const approved = docs.filter(d => d.reviewStatus === 'approved').length;
    const rejected = docs.filter(d => d.reviewStatus === 'rejected').length;
    const needsMoreInfo = docs.filter(d => d.reviewStatus === 'needs_more_info').length;

    // Calculate average review time (in hours)
    const reviewedDocs = docs.filter(d => d.reviewedDate);
    const avgReviewTime = reviewedDocs.length > 0
      ? reviewedDocs.reduce((acc, doc) => {
          const reviewTime = (doc.reviewedDate!.getTime() - doc.uploadDate.getTime()) / (1000 * 60 * 60);
          return acc + reviewTime;
        }, 0) / reviewedDocs.length
      : 0;

    // Documents processed today
    const todayProcessed = docs.filter(d =>
      d.reviewedDate &&
      d.reviewedDate.toDateString() === new Date().toDateString()
    ).length;

    setStats({
      pending,
      approved,
      rejected,
      needsMoreInfo,
      avgReviewTime,
      todayProcessed
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = documents;

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.reviewStatus === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === typeFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(doc => doc.priority === priorityFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, statusFilter, typeFilter, priorityFilter]);

  // Get document types for filter
  const documentTypes = Array.from(new Set(documents.map(doc => doc.documentType)));

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
      needs_more_info: { label: 'Needs More Info', className: 'bg-blue-100 text-blue-800', icon: MessageSquare }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Handle document review
  const handleReview = async () => {
    if (!selectedDocument) return;

    setLoading(true);
    try {
      // In a real app, this would call an API
      const updatedDocuments = documents.map(doc =>
        doc.id === selectedDocument.id
          ? {
              ...doc,
              reviewStatus: reviewAction === 'approve' ? 'approved' :
                           reviewAction === 'reject' ? 'rejected' : 'needs_more_info',
              reviewedBy: 'Current User',
              reviewedDate: new Date(),
              reviewNotes: reviewNotes
            }
          : doc
      );

      setDocuments(updatedDocuments);
      setFilteredDocuments(updatedDocuments);
      calculateStats(updatedDocuments);
      setShowReviewDialog(false);
      setReviewNotes('');
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error reviewing document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Review Queue</h1>
          <p className="text-gray-600">Review and process member submitted documents</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileX className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Needs Info</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.needsMoreInfo}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Review</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgReviewTime.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayProcessed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_more_info">Needs More Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Document Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
          <CardDescription>Review and process member submitted documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{document.memberName}</div>
                        <div className="text-sm text-gray-500">ID: {document.memberId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{document.documentType}</div>
                        {document.isRequired && (
                          <Badge variant="outline" className="mt-1">Required</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">{document.fileName}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(document.fileSize)}</div>
                        {document.confidenceScore && (
                          <div className="text-xs text-gray-400">
                            OCR: {Math.round(document.confidenceScore * 100)}%
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {document.uploadDate.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {document.uploadDate.toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(document.reviewStatus)}</TableCell>
                    <TableCell>{getPriorityBadge(document.priority)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowReviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // In a real app, this would download the file
                            console.log('Download:', document.fileName);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Review and take action on {selectedDocument?.fileName}
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Member</Label>
                  <p className="text-sm text-gray-900">{selectedDocument.memberName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Document Type</Label>
                  <p className="text-sm text-gray-900">{selectedDocument.documentType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">File Name</Label>
                  <p className="text-sm text-gray-900">{selectedDocument.fileName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">File Size</Label>
                  <p className="text-sm text-gray-900">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Upload Date</Label>
                  <p className="text-sm text-gray-900">
                    {selectedDocument.uploadDate.toLocaleDateString()} at {selectedDocument.uploadDate.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <div>{getPriorityBadge(selectedDocument.priority)}</div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedDocument.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Extracted Text */}
              {selectedDocument.extractedText && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Extracted Text (OCR)</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedDocument.extractedText}
                  </div>
                </div>
              )}

              {/* Document Preview */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Document Preview</Label>
                <div className="mt-1 p-4 bg-gray-100 rounded-md flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Preview not available</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Document
                    </Button>
                  </div>
                </div>
              </div>

              {/* Review Action */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Review Action</Label>
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <Button
                    variant={reviewAction === 'approve' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('approve')}
                    className="flex flex-col items-center space-y-2 h-16"
                  >
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span>Approve</span>
                  </Button>
                  <Button
                    variant={reviewAction === 'reject' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('reject')}
                    className="flex flex-col items-center space-y-2 h-16"
                  >
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant={reviewAction === 'request_info' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('request_info')}
                    className="flex flex-col items-center space-y-2 h-16"
                  >
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    <span>Request Info</span>
                  </Button>
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add your review comments..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={loading || !selectedDocument}
            >
              {loading ? 'Processing...' : `Document ${reviewAction === 'approve' ? 'Approved' : reviewAction === 'reject' ? 'Rejected' : 'Info Requested'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};