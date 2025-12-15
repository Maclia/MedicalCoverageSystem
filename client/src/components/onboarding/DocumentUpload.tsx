import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Image,
  Shield,
  Eye,
  Download,
  Trash2,
  Camera,
  FolderOpen
} from 'lucide-react';

interface DocumentUploadProps {
  memberId: number;
  onUploadComplete?: (document: MemberDocument) => void;
  requiredDocuments?: string[];
}

interface MemberDocument {
  id: number;
  documentType: 'government_id' | 'proof_of_address' | 'insurance_card' | 'dependent_document';
  originalFileName: string;
  uploadDate: string;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  fileSize?: number;
  mimeType?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const documentTypes = [
  { value: 'government_id', label: 'Government ID', icon: <FileText className="h-4 w-4" /> },
  { value: 'proof_of_address', label: 'Proof of Address', icon: <File className="h-4 w-4" /> },
  { value: 'insurance_card', label: 'Insurance Card', icon: <Shield className="h-4 w-4" /> },
  { value: 'dependent_document', label: 'Dependent Document', icon: <File className="h-4 w-4" /> }
];

const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxFileSize = 10 * 1024 * 1024; // 10MB

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  memberId,
  onUploadComplete,
  requiredDocuments = []
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<MemberDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState<{ url: string; name: string } | null>(null);

  React.useEffect(() => {
    fetchExistingDocuments();
  }, [memberId]);

  const fetchExistingDocuments = async () => {
    try {
      const response = await fetch(`/api/onboarding/${memberId}/documents`);
      if (response.ok) {
        const documents = await response.json();
        setExistingDocuments(documents);
      }
    } catch (err) {
      console.error('Failed to fetch existing documents:', err);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, and PDF files are allowed';
    }

    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(''); // No preview for PDFs
      }
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !selectedType) {
      setError('Please select a document type first');
      return;
    }

    setError(null);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);

      if (validationError) {
        newFiles.push({
          file,
          uploadProgress: 0,
          status: 'error',
          error: validationError
        });
        continue;
      }

      const preview = await createFilePreview(file);
      newFiles.push({
        file,
        preview,
        uploadProgress: 0,
        status: 'pending'
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.file === uploadedFile.file
            ? { ...f, status: 'uploading', uploadProgress: 0 }
            : f
        )
      );

      const reader = new FileReader();
      reader.readAsDataURL(uploadedFile.file);

      reader.onload = async () => {
        const base64Data = reader.result as string;

        const response = await fetch(`/api/onboarding/${memberId}/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentType: selectedType,
            fileName: uploadedFile.file.name,
            fileData: base64Data,
            mimeType: uploadedFile.file.type
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();

        setUploadedFiles(prev =>
          prev.map(f =>
            f.file === uploadedFile.file
              ? { ...f, status: 'completed', uploadProgress: 100 }
              : f
          )
        );

        // Update existing documents
        fetchExistingDocuments();

        if (onUploadComplete) {
          onUploadComplete(result.document);
        }

        // Remove completed file after a delay
        setTimeout(() => {
          setUploadedFiles(prev => prev.filter(f => f.file !== uploadedFile.file));
        }, 3000);

      };

    } catch (err) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.file === uploadedFile.file
            ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
            : f
        )
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (uploadedFile: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== uploadedFile.file));
  };

  const retryUpload = (uploadedFile: UploadedFile) => {
    uploadFile(uploadedFile);
  };

  const deleteDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/onboarding/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setExistingDocuments(prev => prev.filter(doc => doc.id !== documentId));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Document Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Document Type</CardTitle>
          <CardDescription>
            Choose the type of document you want to upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    {type.icon}
                    <span>{type.label}</span>
                    {requiredDocuments.includes(type.value) && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Required
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Drag and drop your files here or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />

              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="h-12 w-12 text-gray-400" />
                </div>

                <div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mb-2"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <p className="text-sm text-gray-600">
                    or drag and drop files here
                  </p>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Supported formats: JPG, PNG, PDF</p>
                  <p>Maximum file size: 10MB</p>
                </div>
              </div>
            </div>

            {/* File Upload Queue */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="font-medium text-gray-900">Upload Queue</h3>
                {uploadedFiles.map((uploadedFile, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {uploadedFile.file.type.startsWith('image/') ? (
                            <Image className="h-5 w-5 text-blue-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{uploadedFile.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(uploadedFile.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {uploadedFile.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => uploadFile(uploadedFile)}
                            disabled={isLoading}
                          >
                            Upload
                          </Button>
                        )}
                        {uploadedFile.status === 'error' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryUpload(uploadedFile)}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFile(uploadedFile)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {uploadedFile.status === 'uploading' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadedFile.uploadProgress}%</span>
                        </div>
                        <Progress value={uploadedFile.uploadProgress} className="h-2" />
                      </div>
                    )}

                    {uploadedFile.status === 'completed' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Upload completed!</span>
                      </div>
                    )}

                    {uploadedFile.status === 'error' && (
                      <div className="text-red-600 text-sm">
                        {uploadedFile.error}
                      </div>
                    )}

                    {uploadedFile.preview && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowPreview({
                            url: uploadedFile.preview!,
                            name: uploadedFile.file.name
                          })}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Documents */}
      {existingDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              View and manage your uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {document.mimeType?.startsWith('image/') ? (
                          <Image className="h-5 w-5 text-blue-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{document.originalFileName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">
                            Uploaded {new Date(document.uploadDate).toLocaleDateString()}
                          </span>
                          {document.fileSize && (
                            <span className="text-sm text-gray-500">
                              • {formatFileSize(document.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusBadge(document.verificationStatus)}
                      <div className="flex items-center space-x-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                        {document.verificationStatus === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteDocument(document.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {document.verificationStatus === 'rejected' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      This document was rejected. Please upload a new version.
                    </div>
                  )}

                  {document.verificationStatus === 'approved' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      Document verified and approved.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPreview(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-screen overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium text-gray-900">{showPreview.name}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={showPreview.url}
                alt={showPreview.name}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tips Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Upload Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ensure all text is clearly readable and not blurry</li>
                <li>• Include all four corners of the document</li>
                <li>• Make sure the document is well-lit and not shadowed</li>
                <li>• For IDs, cover any sensitive information you don't want to share</li>
                <li>• Documents are encrypted and stored securely</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};