import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { Badge } from "@/features/ui/badge";
import { Skeleton } from "@/features/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/features/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/ui/select";
import { Input } from "@/features/ui/input";
import { Textarea } from "@/features/ui/textarea";
import { Label } from "@/features/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { hospitalApi } from "@/services/api/hospitalApi";
import {
  Building2,
  ShieldCheck,
  RefreshCw,
  Search,
  PlusCircle,
  AlertTriangle,
  MapPin
} from "lucide-react";

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
  personnelCount?: number;
  claimsProcessed?: number;
}

interface InstitutionStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export default function MedicalInstitutions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<MedicalInstitution | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [institutionStats, setInstitutionStats] = useState<InstitutionStats>({
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

  const REFRESH_INTERVAL = 120000; // 2 minutes

  // ✅ 100% LIVE BACKEND DATA - Persisted from Hospital Service
  const loadInstitutionData = useCallback(async () => {
    setLoading(true);
    try {
      const institutionsResult = await hospitalApi.getHospitals();

      // ✅ NO MOCK DATA - Calculate statistics from real backend data
      if (institutionsResult.data && Array.isArray(institutionsResult.data)) {
        const institutions = institutionsResult.data;
        setInstitutionStats({
          total: institutions.length,
          approved: institutions.filter((i: MedicalInstitution) => i.approvalStatus === 'approved').length,
          pending: institutions.filter((i: MedicalInstitution) => i.approvalStatus === 'pending').length,
          rejected: institutions.filter((i: MedicalInstitution) => i.approvalStatus === 'rejected').length
        });
      }

    } catch (error) {
      console.error('Error loading medical institutions data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutionData();
    
    const intervalId = setInterval(loadInstitutionData, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [loadInstitutionData]);

  // ✅ 100% LIVE BACKEND DATA - Persisted from Hospital Service
  const { data: institutions, isLoading: isLoadingInstitutions } = useQuery({
    queryKey: ['medical-institutions'],
    queryFn: async () => {
      const response = await hospitalApi.getHospitals();
      return response.data;
    },
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: regions, isLoading: isLoadingRegions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      // Use regions endpoint from API
      const response = await fetch('/api/regions');
      return response.json();
    },
    staleTime: 3600000
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // ✅ Use hospitalApi service for proper persistence
      await hospitalApi.createHospital(institutionForm);
      
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
      queryClient.invalidateQueries({ queryKey: ['medical-institutions'] });
      
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
      
      // ✅ Use hospitalApi service for proper persistence
      await hospitalApi.verifyHospital(selectedInstitution.id, {
        verifiedBy: 'system',
        verificationNotes: approvalForm.notes
      });
      
      // Reset form and close dialog
      setApprovalForm({
        status: "",
        validMonths: 12,
        notes: ""
      });
      setApprovalDialogOpen(false);
      setSelectedInstitution(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['medical-institutions'] });
      
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

  // Filter institutions based on search and filters
  const filteredInstitutions = Array.isArray(institutions) 
    ? institutions.filter((institution: MedicalInstitution) => {
        const matchesSearch = 
          institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          institution.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          institution.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          institution.address.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || institution.approvalStatus === statusFilter;
        const matchesType = typeFilter === "all" || institution.type === typeFilter;
        
        return matchesSearch && matchesStatus && matchesType;
      })
    : [];

  const getInstitutionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      hospital: "Hospital",
      clinic: "Clinic",
      laboratory: "Laboratory",
      imaging: "Imaging Center",
      pharmacy: "Pharmacy",
      specialist: "Specialist Center",
      general: "General Practice"
    };
    return typeMap[type] || type;
  };

  // Loading state
  if (isLoadingInstitutions || isLoadingRegions || loading) {
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
          <h1 className="text-3xl font-bold">Medical Institutions</h1>
          <p className="text-muted-foreground">
            Manage hospitals, clinics, laboratories and healthcare providers network
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadInstitutionData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
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
                        {Array.isArray(regions) && regions.map((region: Region) => (
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
      </div>

      {/* ✅ STATISTICS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Institutions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{institutionStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registered healthcare facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{institutionStats.approved}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{institutionStats.pending}</div>
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
            <div className="text-2xl font-bold text-red-600">{institutionStats.rejected}</div>
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
              placeholder="Search institutions by name, city, address or email..."
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
        <div className="w-full md:w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
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
      </div>

      {/* ✅ INSTITUTIONS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Institutions Directory</CardTitle>
          <CardDescription>
            All registered healthcare facilities in the provider network
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
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstitutions.map((institution: MedicalInstitution) => (
                  <TableRow key={institution.id}>
                    <TableCell className="font-medium">{institution.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{institution.name}</div>
                      {institution.specialties && (
                        <div className="text-sm text-muted-foreground">
                          {institution.specialties}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{getInstitutionTypeName(institution.type)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {institution.city}
                      </div>
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
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredInstitutions.length === 0 && (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No medical institutions found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding medical institutions to the network.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ APPROVAL DIALOG */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Medical Institution</DialogTitle>
            <DialogDescription>
              {selectedInstitution && (
                <>Update verification status for <strong>{selectedInstitution.name}</strong></>
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
            
            <div className="space-y-2">
              <Label htmlFor="notes">Verification Notes</Label>
              <Textarea 
                id="notes"
                name="notes"
                value={approvalForm.notes}
                onChange={(e) => setApprovalForm(prev => ({...prev, notes: e.target.value}))}
                placeholder="Optional verification notes"
                rows={3}
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