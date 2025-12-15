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

interface Region {
  id: number;
  name: string;
  country: string;
}

interface MedicalInstitution {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string | null;
  regionId: number;
  specialties: string | null;
  approvalStatus: string;
  approvalDate: string | null;
  validUntil: string | null;
  createdAt: string;
}

export default function MedicalInstitutions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<MedicalInstitution | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    status: "",
    validMonths: 12
  });
  
  const [institutionForm, setInstitutionForm] = useState({
    name: "",
    type: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    regionId: 0,
    specialties: "",
  });

  const { data: institutions, isLoading } = useQuery<MedicalInstitution[]>({
    queryKey: ['/api/medical-institutions'],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/medical-institutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(institutionForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create medical institution');
      }
      
      // Clear form and close dialog
      setInstitutionForm({
        name: "",
        type: "",
        address: "",
        city: "",
        zipCode: "",
        phone: "",
        email: "",
        website: "",
        regionId: 0,
        specialties: "",
      });
      setOpen(false);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/medical-institutions'] });
      
      toast({
        title: "Success",
        description: "Medical institution was created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create medical institution",
        variant: "destructive",
      });
    }
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInstitution) return;
    
    try {
      const validUntil = approvalForm.status === 'approved' 
        ? new Date(Date.now() + (approvalForm.validMonths * 30 * 24 * 60 * 60 * 1000)).toISOString()
        : null;
      
      const response = await fetch(`/api/medical-institutions/${selectedInstitution.id}/approval`, {
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
      setSelectedInstitution(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/medical-institutions'] });
      
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
    setInstitutionForm(prev => ({
      ...prev,
      [name]: name === "regionId" ? parseInt(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setInstitutionForm(prev => ({
      ...prev,
      [name]: name === "regionId" ? parseInt(value) || 0 : value
    }));
  };

  const openApprovalDialog = (institution: MedicalInstitution) => {
    setSelectedInstitution(institution);
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Medical Institutions</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="material-icons mr-2">add</i>
              Add Institution
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Medical Institution</DialogTitle>
              <DialogDescription>
                Register a new medical institution to the network.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Institution Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    value={institutionForm.name}
                    onChange={handleChange}
                    placeholder="Enter institution name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Institution Type</Label>
                  <Select 
                    name="type" 
                    value={institutionForm.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="imaging">Imaging Center</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="specialist">Specialist Center</SelectItem>
                      <SelectItem value="general">General Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    name="address"
                    value={institutionForm.address}
                    onChange={handleChange}
                    placeholder="Street address"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city"
                    name="city"
                    value={institutionForm.city}
                    onChange={handleChange}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip/Postal Code</Label>
                  <Input 
                    id="zipCode"
                    name="zipCode"
                    value={institutionForm.zipCode}
                    onChange={handleChange}
                    placeholder="Zip/Postal code"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regionId">Region</Label>
                  <Select 
                    name="regionId" 
                    value={institutionForm.regionId.toString()}
                    onValueChange={(value) => handleSelectChange("regionId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map(region => (
                        <SelectItem key={region.id} value={region.id.toString()}>
                          {region.name}, {region.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone"
                    name="phone"
                    value={institutionForm.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    value={institutionForm.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input 
                    id="website"
                    name="website"
                    value={institutionForm.website}
                    onChange={handleChange}
                    placeholder="Website URL"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specialties">Specialties (Optional)</Label>
                  <Textarea 
                    id="specialties"
                    name="specialties"
                    value={institutionForm.specialties}
                    onChange={handleChange}
                    placeholder="List specialties or special services offered"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">Save Institution</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Institutions</CardTitle>
          <CardDescription>
            Manage medical institutions in the network and their approval status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : institutions && institutions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((institution) => (
                    <TableRow key={institution.id}>
                      <TableCell className="font-medium">{institution.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{institution.name}</div>
                        {institution.specialties && (
                          <div className="text-sm text-muted-foreground">
                            Specialties: {institution.specialties}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {institution.type.charAt(0).toUpperCase() + institution.type.slice(1)}
                      </TableCell>
                      <TableCell>
                        <div>{institution.city}</div>
                        <div className="text-sm text-muted-foreground">{institution.address}</div>
                      </TableCell>
                      <TableCell>
                        <div>{institution.phone}</div>
                        <div className="text-sm text-muted-foreground">{institution.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(institution.approvalStatus)}>
                          {institution.approvalStatus.toUpperCase()}
                        </Badge>
                        {institution.approvalDate && institution.validUntil && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Valid until: {new Date(institution.validUntil).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openApprovalDialog(institution)}
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
              <h3 className="text-lg font-medium">No medical institutions found</h3>
              <p className="text-muted-foreground">
                Get started by adding medical institutions to the network.
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
              {selectedInstitution && (
                <>Update approval status for <strong>{selectedInstitution.name}</strong></>
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