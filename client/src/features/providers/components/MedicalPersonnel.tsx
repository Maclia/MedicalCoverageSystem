import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/skeleton";
import { Alert, AlertDescription } from "@/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { hospitalApi } from "@api/hospitalApi";
import { baseClaimsApi } from "@api/claimsApi";
import { analyticsApi } from "@api/analyticsApi";
import { crmApi } from "@api/crmApi";
import {
  Users,
  ShieldCheck,
  RefreshCw,
  Search,
  UserPlus,
  AlertTriangle,
} from "lucide-react";

// Define interfaces for type safety
interface MedicalInstitution {
  id: number;
  name: string;
  type: string;
  city: string;
  approvalStatus: string;
}

interface MedicalPersonnel {
  id: number;
  firstName: string;
  secondName?: string;
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
  claimsHandled?: number;
}

interface PersonnelStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export default function MedicalPersonnelPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<MedicalPersonnel | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [personnelStats, setPersonnelStats] = useState<PersonnelStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  
  const [approvalForm, setApprovalForm] = useState({
    status: "",
    validMonths: 12,
    notes: ""
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

  const REFRESH_INTERVAL = 120000; // 2 minutes

  // ✅ LOAD ALL BACKEND SERVICES WITH EXISTING METHODS
  const loadPersonnelData = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ USE ONLY EXISTING API METHODS
      const [
        personnelResult,
        hospitalsResult,
        claimsResult,
        analyticsResult,
        crmResult
      ] = await Promise.all([
        hospitalApi.getMedicalPersonnel(),
        hospitalApi.getHospitals(),
        baseClaimsApi.getClaims(),
        analyticsApi.getDashboardData('provider'),
        crmApi.getLeads({})
      ]);

      // ✅ 100% LIVE BACKEND DATA - NO MOCK DATA
      if (personnelResult.data && Array.isArray(personnelResult.data)) {
        const personnel = personnelResult.data;
        setPersonnelStats({
          total: personnel.length,
          approved: personnel.filter((p: MedicalPersonnel) => p.approvalStatus === 'approved').length,
          pending: personnel.filter((p: MedicalPersonnel) => p.approvalStatus === 'pending').length,
          rejected: personnel.filter((p: MedicalPersonnel) => p.approvalStatus === 'rejected').length
        });
      }

    } catch (error) {
      console.error('Error loading medical personnel data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersonnelData();
    
    const intervalId = setInterval(loadPersonnelData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadPersonnelData]);

  // ✅ 100% LIVE BACKEND DATA - Persisted from Hospital Service
  const { data: personnel, isLoading: isLoadingPersonnel } = useQuery({
    queryKey: ['medical-personnel'],
    queryFn: async () => {
      const response = await hospitalApi.getMedicalPersonnel();
      return response.data;
    },
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // ✅ 100% LIVE BACKEND DATA - Persisted from Hospital Service
  const { data: institutions, isLoading: isLoadingInstitutions } = useQuery({
    queryKey: ['medical-institutions'],
    queryFn: async () => {
      const response = await hospitalApi.getHospitals();
      return response.data;
    },
    staleTime: 60000
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await hospitalApi.addMedicalPersonnel(personnelForm);
      
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
      await hospitalApi.verifyPersonnel(selectedPersonnel.id, {
        verifiedBy: 'system',
        licenseVerified: approvalForm.status === 'approved',
        verificationNotes: approvalForm.notes
      });
      
      // Reset form and close dialog
      setApprovalForm({
        status: "",
        validMonths: 12,
        notes: ""
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      validMonths: 12,
      notes: ""
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
    const institution = Array.isArray(institutions) ? institutions.find((i: MedicalInstitution) => i.id === institutionId) : null;
    return institution ? institution.name : 'Unknown Institution';
  };

  // Filter personnel based on search and filters
  const filteredPersonnel = Array.isArray(personnel) 
    ? personnel.filter((person: MedicalPersonnel) => {
        const matchesSearch = 
          person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (person.specialization && person.specialization.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === "all" || person.approvalStatus === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
    : [];

  // Loading state
  if (isLoadingPersonnel || isLoadingInstitutions || loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ✅ HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Medical Personnel</h1>
          <p className="text-muted-foreground">
            Manage medical professionals, verification status and network providers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPersonnelData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
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
                        {Array.isArray(institutions) && institutions.map((institution: MedicalInstitution) => (
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
      </div>

      {/* ✅ STATISTICS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personnelStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registered medical professionals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{personnelStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Verified active providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{personnelStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{personnelStats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Verification failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ SEARCH AND FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personnel by name, email or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ✅ PERSONNEL TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Personnel Directory</CardTitle>
          <CardDescription>
            All registered medical professionals in the healthcare network
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                {filteredPersonnel.map((person: MedicalPersonnel) => (
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
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPersonnel.length === 0 && (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No medical personnel found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding medical professionals to the network.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ APPROVAL DIALOG */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Medical Personnel</DialogTitle>
            <DialogDescription>
              {selectedPersonnel && (
                <>Update verification status for <strong>{selectedPersonnel.firstName} {selectedPersonnel.lastName}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleApprovalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Verification Status</Label>
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
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="suspended">Suspend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Verification Notes</Label>
              <Input 
                id="notes"
                name="notes"
                value={approvalForm.notes}
                onChange={(e) => setApprovalForm(prev => ({...prev, notes: e.target.value}))}
                placeholder="Optional verification notes"
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Update Status</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
