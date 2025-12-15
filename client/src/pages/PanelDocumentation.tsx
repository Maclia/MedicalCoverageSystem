import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface MedicalInstitution {
  id: number;
  name: string;
  type: string;
  city: string;
}

interface MedicalPersonnel {
  id: number;
  firstName: string;
  lastName: string;
  type: string;
  institutionId: number;
}

interface PanelDocumentation {
  id: number;
  documentType: string;
  documentReference: string;
  issueDate: string;
  expiryDate: string | null;
  isVerified: boolean;
  verificationDate: string | null;
  verifiedBy: string | null;
  notes: string | null;
  institutionId: number | null;
  personnelId: number | null;
  createdAt: string;
}

export default function PanelDocumentation() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PanelDocumentation | null>(null);
  const [verifyForm, setVerifyForm] = useState({
    verifiedBy: "",
    notes: ""
  });
  
  const [docForm, setDocForm] = useState({
    documentType: "",
    documentReference: "",
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    notes: "",
    institutionId: null as number | null,
    personnelId: null as number | null,
  });
  
  const [entityType, setEntityType] = useState<"institution" | "personnel">("institution");

  const { data: docs, isLoading } = useQuery<PanelDocumentation[]>({
    queryKey: ['/api/panel-documentation'],
  });

  const { data: institutions } = useQuery<MedicalInstitution[]>({
    queryKey: ['/api/medical-institutions'],
  });

  const { data: personnel } = useQuery<MedicalPersonnel[]>({
    queryKey: ['/api/medical-personnel'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = {
        ...docForm,
        // Only include the relevant ID based on entity type
        institutionId: entityType === "institution" ? docForm.institutionId : null,
        personnelId: entityType === "personnel" ? docForm.personnelId : null
      };
      
      const response = await fetch('/api/panel-documentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create documentation');
      }
      
      // Clear form and close dialog
      setDocForm({
        documentType: "",
        documentReference: "",
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: "",
        notes: "",
        institutionId: null,
        personnelId: null,
      });
      setEntityType("institution");
      setOpen(false);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/panel-documentation'] });
      
      toast({
        title: "Success",
        description: "Documentation was created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create documentation",
        variant: "destructive",
      });
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoc) return;
    
    try {
      const response = await fetch(`/api/panel-documentation/${selectedDoc.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifiedBy: verifyForm.verifiedBy,
          notes: verifyForm.notes || undefined
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify documentation');
      }
      
      // Reset form and close dialog
      setVerifyForm({
        verifiedBy: "",
        notes: ""
      });
      setVerifyDialogOpen(false);
      setSelectedDoc(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/panel-documentation'] });
      
      toast({
        title: "Success",
        description: "Documentation verified successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify documentation",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDocForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEntityTypeChange = (value: "institution" | "personnel") => {
    setEntityType(value);
    // Reset the previously selected entity
    setDocForm(prev => ({
      ...prev,
      institutionId: null,
      personnelId: null
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setDocForm(prev => ({
      ...prev,
      [name]: name === "institutionId" || name === "personnelId" ? parseInt(value) || null : value
    }));
  };

  const openVerifyDialog = (doc: PanelDocumentation) => {
    setSelectedDoc(doc);
    setVerifyForm({
      verifiedBy: "",
      notes: doc.notes || ""
    });
    setVerifyDialogOpen(true);
  };

  const getInstitutionName = (id: number | null): string => {
    if (!id) return 'N/A';
    const institution = institutions?.find(i => i.id === id);
    return institution ? institution.name : 'Unknown Institution';
  };

  const getPersonnelName = (id: number | null): string => {
    if (!id) return 'N/A';
    const person = personnel?.find(p => p.id === id);
    return person ? `${person.firstName} ${person.lastName}` : 'Unknown Personnel';
  };

  const getDocumentTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      license: "License",
      certification: "Certification",
      accreditation: "Accreditation",
      registration: "Registration",
      permit: "Permit",
      insurance: "Insurance",
      malpractice: "Malpractice Insurance",
      education: "Educational Certificate",
      specialization: "Specialization Certificate",
      other: "Other Documentation"
    };
    return typeMap[type] || type;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel Documentation</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="material-icons mr-2">add</i>
              Add Documentation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Documentation</DialogTitle>
              <DialogDescription>
                Register important documentation for medical institutions or personnel.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Documentation For</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="institution" 
                      name="entityType" 
                      value="institution"
                      checked={entityType === "institution"}
                      onChange={() => handleEntityTypeChange("institution")}
                      className="mr-2"
                    />
                    <Label htmlFor="institution">Institution</Label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="personnel" 
                      name="entityType" 
                      value="personnel"
                      checked={entityType === "personnel"}
                      onChange={() => handleEntityTypeChange("personnel")}
                      className="mr-2"
                    />
                    <Label htmlFor="personnel">Personnel</Label>
                  </div>
                </div>
              </div>
              
              {entityType === "institution" ? (
                <div className="space-y-2">
                  <Label htmlFor="institutionId">Medical Institution</Label>
                  <Select 
                    name="institutionId" 
                    value={docForm.institutionId?.toString() || ""}
                    onValueChange={(value) => handleSelectChange("institutionId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions?.map(institution => (
                        <SelectItem key={institution.id} value={institution.id.toString()}>
                          {institution.name} ({institution.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="personnelId">Medical Personnel</Label>
                  <Select 
                    name="personnelId" 
                    value={docForm.personnelId?.toString() || ""}
                    onValueChange={(value) => handleSelectChange("personnelId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel?.map(person => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.firstName} {person.lastName} ({person.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select 
                    name="documentType" 
                    value={docForm.documentType}
                    onValueChange={(value) => handleSelectChange("documentType", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="license">License</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                      <SelectItem value="accreditation">Accreditation</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="permit">Permit</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="malpractice">Malpractice Insurance</SelectItem>
                      <SelectItem value="education">Educational Certificate</SelectItem>
                      <SelectItem value="specialization">Specialization Certificate</SelectItem>
                      <SelectItem value="other">Other Documentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentReference">Reference Number</Label>
                  <Input 
                    id="documentReference"
                    name="documentReference"
                    value={docForm.documentReference}
                    onChange={handleChange}
                    placeholder="Document reference/serial number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input 
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    value={docForm.issueDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input 
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={docForm.expiryDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes"
                  name="notes"
                  value={docForm.notes}
                  onChange={handleChange}
                  placeholder="Additional notes or details about the document"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">Save Documentation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panel Documentation</CardTitle>
          <CardDescription>
            Manage documentation for medical institutions and personnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : docs && docs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.id}</TableCell>
                      <TableCell>{getDocumentTypeName(doc.documentType)}</TableCell>
                      <TableCell>{doc.documentReference}</TableCell>
                      <TableCell>
                        {doc.institutionId ? (
                          <div>
                            <div className="font-medium">Institution:</div>
                            <div>{getInstitutionName(doc.institutionId)}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">Personnel:</div>
                            <div>{getPersonnelName(doc.personnelId)}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>Issued: {new Date(doc.issueDate).toLocaleDateString()}</div>
                        {doc.expiryDate && (
                          <div className="text-sm text-muted-foreground">
                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={doc.isVerified ? "bg-green-500" : "bg-yellow-500"}>
                          {doc.isVerified ? "VERIFIED" : "UNVERIFIED"}
                        </Badge>
                        {doc.isVerified && doc.verificationDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            By: {doc.verifiedBy} on {new Date(doc.verificationDate).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!doc.isVerified && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openVerifyDialog(doc)}
                          >
                            <i className="material-icons text-sm mr-1">check_circle</i>
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No documentation found</h3>
              <p className="text-muted-foreground">
                Get started by adding documentation for medical institutions or personnel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Documentation</DialogTitle>
            <DialogDescription>
              {selectedDoc && (
                <>Verify document <strong>{getDocumentTypeName(selectedDoc.documentType)}</strong> with reference <strong>{selectedDoc.documentReference}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifiedBy">Verified By</Label>
              <Input 
                id="verifiedBy"
                name="verifiedBy"
                value={verifyForm.verifiedBy}
                onChange={(e) => setVerifyForm(prev => ({...prev, verifiedBy: e.target.value}))}
                placeholder="Your name or employee ID"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Verification Notes</Label>
              <Textarea 
                id="notes"
                name="notes"
                value={verifyForm.notes}
                onChange={(e) => setVerifyForm(prev => ({...prev, notes: e.target.value}))}
                placeholder="Any notes or observations during verification"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Verify Document</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}