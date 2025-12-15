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
  email: string;
  phone: string;
  type: string;
  specialization: string | null;
  licenseNumber: string;
  institutionId: number;
  yearsOfExperience: number;
  approvalStatus: string;
  approvalDate: string | null;
  validUntil: string | null;
  createdAt: string;
}

export default function MedicalPersonnel() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<MedicalPersonnel | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    status: "",
    validMonths: 12
  });
  
  const [personnelForm, setPersonnelForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    type: "",
    specialization: "",
    licenseNumber: "",
    institutionId: 0,
    yearsOfExperience: 0
  });

  const { data: personnel, isLoading } = useQuery<MedicalPersonnel[]>({
    queryKey: ['/api/medical-personnel'],
  });

  const { data: institutions } = useQuery<MedicalInstitution[]>({
    queryKey: ['/api/medical-institutions'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/medical-personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personnelForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create medical personnel');
      }
      
      // Clear form and close dialog
      setPersonnelForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        type: "",
        specialization: "",
        licenseNumber: "",
        institutionId: 0,
        yearsOfExperience: 0
      });
      setOpen(false);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/medical-personnel'] });
      
      toast({
        title: "Success",
        description: "Medical personnel was created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create medical personnel",
        variant: "destructive",
      });
    }
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPersonnel) return;
    
    try {
      const validUntil = approvalForm.status === 'approved' 
        ? new Date(Date.now() + (approvalForm.validMonths * 30 * 24 * 60 * 60 * 1000)).toISOString()
        : null;
      
      const response = await fetch(`/api/medical-personnel/${selectedPersonnel.id}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: approvalForm.status,
          validUntil
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update approval status');
      }
      
      // Reset form and close dialog
      setApprovalForm({
        status: "",
        validMonths: 12
      });
      setApprovalDialogOpen(false);
      setSelectedPersonnel(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/medical-personnel'] });
      
      toast({
        title: "Success",
        description: "Approval status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update approval status",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPersonnelForm(prev => ({
      ...prev,
      [name]: name === "institutionId" || name === "yearsOfExperience" 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setPersonnelForm(prev => ({
      ...prev,
      [name]: name === "institutionId" ? parseInt(value) || 0 : value
    }));
  };

  const openApprovalDialog = (person: MedicalPersonnel) => {
    setSelectedPersonnel(person);
    setApprovalForm({
      status: "",
      validMonths: 12
    });
    setApprovalDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return "bg-green-500";
      case 'pending':
        return "bg-yellow-500";
      case 'rejected':
        return "bg-red-500";
      case 'suspended':
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  const getPersonnelTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      doctor: "Doctor",
      nurse: "Nurse",
      specialist: "Specialist",
      technician: "Technician",
      pharmacist: "Pharmacist",
      therapist: "Therapist",
      other: "Other"
    };
    return typeMap[type] || type;
  };

  const getInstitutionName = (institutionId: number): string => {
    const institution = institutions?.find(i => i.id === institutionId);
    return institution ? institution.name : 'Unknown Institution';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Medical Personnel</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="material-icons mr-2">add</i>
              Add Personnel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Medical Personnel</DialogTitle>
              <DialogDescription>
                Register a new medical professional to the network.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    name="firstName"
                    value={personnelForm.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    name="lastName"
                    value={personnelForm.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    value={personnelForm.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone"
                    name="phone"
                    value={personnelForm.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Personnel Type</Label>
                  <Select 
                    name="type" 
                    value={personnelForm.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institutionId">Medical Institution</Label>
                  <Select 
                    name="institutionId" 
                    value={personnelForm.institutionId.toString()}
                    onValueChange={(value) => handleSelectChange("institutionId", value)}
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
                
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input 
                    id="licenseNumber"
                    name="licenseNumber"
                    value={personnelForm.licenseNumber}
                    onChange={handleChange}
                    placeholder="Professional license number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input 
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    min={0}
                    max={70}
                    value={personnelForm.yearsOfExperience}
                    onChange={handleChange}
                    placeholder="Years of professional experience"
                    required
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specialization">Specialization (Optional)</Label>
                  <Input 
                    id="specialization"
                    name="specialization"
                    value={personnelForm.specialization}
                    onChange={handleChange}
                    placeholder="Areas of specialization or expertise"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">Save Personnel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Personnel</CardTitle>
          <CardDescription>
            Manage medical professionals in the network and their approval status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : personnel && personnel.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{person.firstName} {person.lastName}</div>
                        {person.specialization && (
                          <div className="text-sm text-muted-foreground">
                            {person.specialization}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{getPersonnelTypeName(person.type)}</div>
                        <div className="text-sm text-muted-foreground">
                          {person.yearsOfExperience} years exp.
                        </div>
                      </TableCell>
                      <TableCell>
                        {getInstitutionName(person.institutionId)}
                      </TableCell>
                      <TableCell>
                        <div>{person.phone}</div>
                        <div className="text-sm text-muted-foreground">{person.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(person.approvalStatus)}>
                          {person.approvalStatus.toUpperCase()}
                        </Badge>
                        {person.approvalDate && person.validUntil && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Valid until: {new Date(person.validUntil).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openApprovalDialog(person)}
                        >
                          <i className="material-icons text-sm mr-1">verified</i>
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No medical personnel found</h3>
              <p className="text-muted-foreground">
                Get started by adding medical professionals to the network.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Approval Status</DialogTitle>
            <DialogDescription>
              {selectedPersonnel && (
                <>Update approval status for <strong>{selectedPersonnel.firstName} {selectedPersonnel.lastName}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleApprovalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Approval Status</Label>
              <Select 
                name="status" 
                value={approvalForm.status}
                onValueChange={(value) => setApprovalForm(prev => ({...prev, status: value}))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {approvalForm.status === 'approved' && (
              <div className="space-y-2">
                <Label htmlFor="validMonths">Valid For (Months)</Label>
                <Input 
                  id="validMonths"
                  name="validMonths"
                  type="number"
                  min={1}
                  max={60}
                  value={approvalForm.validMonths}
                  onChange={(e) => setApprovalForm(prev => ({
                    ...prev, 
                    validMonths: parseInt(e.target.value) || 12
                  }))}
                  required
                />
              </div>
            )}
            
            <div className="flex justify-end">
              <Button type="submit">Update Status</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}