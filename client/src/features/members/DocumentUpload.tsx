import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Button,
} from "@/components/ui/button";
import {
  Badge,
  badgeVariants,
} from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Input,
} from "@/components/ui/input";
import {
  Label,
} from "@/components/ui/label";
import {
  Progress,
} from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  File,
  Image,
  FileArchive,
} from "lucide-react";
import { format } from "date-fns";

interface MemberDocument {
  id: number;
  memberId: number;
  documentType: 'national_id' | 'passport' | 'birth_certificate' | 'marriage_certificate' | 'employment_letter' | 'medical_report' | 'student_letter' | 'other';
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  expiresAt?: string;
  isActive: boolean;
  uploadedBy?: number;
}

interface DocumentUploadProps {
  memberId: number;
  memberName: string;
}

const documentTypeConfig = {
  national_id: {
    label: 'National ID',
    icon: FileText,
    description: 'National identification document',
    required: true,
  },
  passport: {
    label: 'Passport',
    icon: FileText,
    description: 'Passport for non-citizens',
    required: false,
  },
  birth_certificate: {
    label: 'Birth Certificate',
    icon: FileText,
    description: 'Official birth certificate',
    required: false,
  },
  marriage_certificate: {
    label: 'Marriage Certificate',
    icon: FileText,
    description: 'Marriage certificate for spouse benefits',
    required: false,
  },
  employment_letter: {
    label: 'Employment Letter',
    icon: FileText,
    description: 'Proof of employment',
    required: true,
  },
  medical_report: {
    label: 'Medical Report',
    icon: FileText,
    description: 'Medical assessment report',
    required: false,
  },
  student_letter: {
    label: 'Student Letter',
    icon: FileText,
    description: 'Proof of student status',
    required: false,
  },
  other: {
    label: 'Other Document',
    icon: File,
    description: 'Other supporting documents',
    required: false,
  },
};

const allowedFileTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocumentUpload({ memberId, memberName }: DocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch member documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/members', memberId, 'documents'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/members/${memberId}/documents`);
      return response.json();
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", `/api/members/${memberId}/documents`, data, false);
      return response.json();
    },
    onMutate: () => {
      setUploadProgress(0);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentName('');
      setExpiresAt('');
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['/api/members', memberId, 'documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("DELETE", `/api/members/${memberId}/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members', memberId, 'documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (!allowedFileTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF, image, or document file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxFileSize) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    if (!documentName) {
      setDocumentName(file.name.split('.')[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and document type",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('documentType', documentType);
    formData.append('documentName', documentName);
    if (expiresAt) {
      formData.append('expiresAt', expiresAt);
    }

    try {
      uploadMutation.mutate(formData);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDownload = async (document: MemberDocument) => {
    try {
      const response = await apiRequest("GET", `/api/members/${memberId}/documents/${document.id}/download`);

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (document: MemberDocument) => {
    try {
      const response = await apiRequest("GET", `/api/members/${memberId}/documents/${document.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Failed to preview document",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatus = (document: MemberDocument) => {
    if (!document.isActive) {
      return { color: 'secondary' as const, label: 'Inactive', icon: Clock };
    }

    if (document.expiresAt) {
      const expiryDate = new Date(document.expiresAt);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        return { color: 'destructive' as const, label: 'Expired', icon: AlertCircle };
      } else if (daysUntilExpiry <= 30) {
        return { color: 'outline' as const, label: 'Expiring Soon', icon: Clock };
      }
    }

    return { color: 'default' as const, label: 'Active', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Management
          </CardTitle>
          <CardDescription>
            Upload and manage KYC documents for {memberName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Required Documents Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Required documents: National ID, Employment Letter. Additional documents may be required based on member type and age.
              </AlertDescription>
            </Alert>

            {/* Upload Button */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Upload a KYC or supporting document for {memberName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* File Drop Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={allowedFileTypes.join(',')}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <p>Drag and drop a file here, or click to select</p>
                      <p className="text-xs mt-1">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                      {getFileIcon(selectedFile.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Document Type Selection */}
                  <div>
                    <Label htmlFor="document-type">Document Type *</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(documentTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{config.label}</div>
                                <div className="text-xs text-muted-foreground">{config.description}</div>
                              </div>
                              {config.required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Document Name */}
                  <div>
                    <Label htmlFor="document-name">Document Name *</Label>
                    <Input
                      id="document-name"
                      placeholder="Enter document name"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <Label htmlFor="expires-at">Expiry Date (Optional)</Label>
                    <Input
                      id="expires-at"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>

                  {/* Upload Progress */}
                  {uploadMutation.isPending && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !documentType || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Documents Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{documents?.data?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documents?.data?.filter((d: MemberDocument) => d.isActive).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {documents?.data?.filter((d: MemberDocument) => {
                    if (!d.expiresAt) return 0;
                    const expiryDate = new Date(d.expiresAt);
                    const today = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
                  }).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Expiring Soon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {documents?.data?.filter((d: MemberDocument) => {
                    if (!d.expiresAt) return 0;
                    return new Date(d.expiresAt) < new Date();
                  }).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            View, download, and manage member documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : documents?.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.data.map((document: MemberDocument) => {
                    const status = getDocumentStatus(document);
                    const StatusIcon = status.icon;
                    const DocIcon = getFileIcon(document.mimeType);
                    const docTypeConfig = documentTypeConfig[document.documentType as keyof typeof documentTypeConfig];

                    return (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <DocIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{document.documentName}</div>
                              <div className="text-xs text-muted-foreground">{document.fileName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <docTypeConfig.icon className="h-3 w-3" />
                            {docTypeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {document.expiresAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(document.expiresAt), 'MMM dd, yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePreview(document)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(document)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{document.documentName}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(document.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Click "Upload Document" to add the first document</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}