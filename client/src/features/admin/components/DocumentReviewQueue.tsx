import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/ui/table';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  FileCheck,
  FileX,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { AdminDocumentRecord, useAdminDocumentQueue, useReviewDocumentMutation } from '../../../services/api/adminApi';

interface DocumentReviewQueueProps {
  userRole?: string;
}

export const DocumentReviewQueue: React.FC<DocumentReviewQueueProps> = () => {
  const [selectedDocument, setSelectedDocument] = useState<AdminDocumentRecord | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_info'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  const { data, isLoading, refetch } = useAdminDocumentQueue({
    status: statusFilter,
    search: searchQuery,
    documentType: typeFilter,
    priority: priorityFilter,
  });
  const reviewMutation = useReviewDocumentMutation();

  const documents = data?.documents ?? [];
  const stats = data?.stats ?? {
    pending: 0,
    approved: 0,
    rejected: 0,
    needsMoreInfo: 0,
    avgReviewTime: 0,
    todayProcessed: 0,
  };

  const documentTypes = useMemo(
    () => Array.from(new Set(documents.map((document) => document.documentType))).sort(),
    [documents]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const power = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, power)).toFixed(2))} ${units[power]}`;
  };

  const getStatusBadge = (status: AdminDocumentRecord['reviewStatus']) => {
    const config = {
      pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
      needs_more_info: { label: 'Needs More Info', className: 'bg-blue-100 text-blue-800', icon: MessageSquare },
    }[status];

    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: AdminDocumentRecord['priority']) => {
    const config = {
      low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
    }[priority];

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleReview = async () => {
    if (!selectedDocument) return;

    await reviewMutation.mutateAsync({
      documentId: selectedDocument.id,
      action: reviewAction,
      notes: reviewNotes,
    });

    setShowReviewDialog(false);
    setReviewNotes('');
    setSelectedDocument(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Review Queue</h1>
          <p className="text-gray-600">Review and process member submitted documents</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {[
          { label: 'Pending', value: stats.pending, icon: Clock, tone: 'bg-yellow-100 text-yellow-600' },
          { label: 'Approved', value: stats.approved, icon: FileCheck, tone: 'bg-green-100 text-green-600' },
          { label: 'Rejected', value: stats.rejected, icon: FileX, tone: 'bg-red-100 text-red-600' },
          { label: 'Needs Info', value: stats.needsMoreInfo, icon: MessageSquare, tone: 'bg-blue-100 text-blue-600' },
          { label: 'Avg Review', value: `${stats.avgReviewTime.toFixed(1)}h`, icon: TrendingUp, tone: 'bg-purple-100 text-purple-600' },
          { label: 'Today', value: stats.todayProcessed, icon: Calendar, tone: 'bg-indigo-100 text-indigo-600' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
          <CardDescription>Review and process member submitted documents</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          ) : (
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
                  {documents.map((document) => (
                    <TableRow key={document.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{document.memberName}</div>
                          <div className="text-sm text-gray-500">ID: {document.memberId}</div>
                          <div className="text-xs text-gray-400">{document.companyName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{document.documentType}</div>
                          {document.isRequired && <Badge variant="outline" className="mt-1">Required</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">{document.fileName}</div>
                          <div className="text-sm text-gray-500">{formatFileSize(document.fileSize)}</div>
                          {document.confidenceScore && (
                            <div className="text-xs text-gray-400">OCR: {Math.round(document.confidenceScore * 100)}%</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{new Date(document.uploadDate).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500">{new Date(document.uploadDate).toLocaleTimeString()}</div>
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
                              setReviewAction(document.reviewStatus === 'rejected' ? 'reject' : 'approve');
                              setReviewNotes(document.reviewNotes || '');
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
                              if (document.downloadUrl) {
                                window.open(document.downloadUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            disabled={!document.downloadUrl}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                        No documents matched the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                    {new Date(selectedDocument.uploadDate).toLocaleDateString()} at {new Date(selectedDocument.uploadDate).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <div>{getPriorityBadge(selectedDocument.priority)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedDocument.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>

              {selectedDocument.extractedText && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Extracted Text (OCR)</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedDocument.extractedText}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">Document Preview</Label>
                <div className="mt-1 p-4 bg-gray-100 rounded-md flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Preview is served from the persisted document URL</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      disabled={!selectedDocument.downloadUrl}
                      onClick={() => {
                        if (selectedDocument.downloadUrl) {
                          window.open(selectedDocument.downloadUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Document
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Review Action</Label>
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <Button variant={reviewAction === 'approve' ? 'default' : 'outline'} onClick={() => setReviewAction('approve')} className="flex flex-col items-center space-y-2 h-16">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span>Approve</span>
                  </Button>
                  <Button variant={reviewAction === 'reject' ? 'default' : 'outline'} onClick={() => setReviewAction('reject')} className="flex flex-col items-center space-y-2 h-16">
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span>Reject</span>
                  </Button>
                  <Button variant={reviewAction === 'request_info' ? 'default' : 'outline'} onClick={() => setReviewAction('request_info')} className="flex flex-col items-center space-y-2 h-16">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    <span>Request Info</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add your review comments..."
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={reviewMutation.isPending || !selectedDocument}>
              {reviewMutation.isPending ? 'Processing...' : `Document ${reviewAction === 'approve' ? 'Approved' : reviewAction === 'reject' ? 'Rejected' : 'Updated'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
