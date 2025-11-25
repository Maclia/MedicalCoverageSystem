import { useState } from "react";
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
  Textarea,
} from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Info,
  Baby,
  Heart,
  UserPlus,
} from "lucide-react";
import { format, differenceInYears, addYears } from "date-fns";

interface PrincipalMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  companyId: number;
}

interface Dependent {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  memberType: 'dependent';
  dependentType: 'spouse' | 'child' | 'parent';
  principalId: number;
  gender?: 'male' | 'female' | 'other';
  nationalId?: string;
  relationship?: string;
  membershipStatus: 'active' | 'suspended' | 'pending' | 'terminated' | 'expired';
  enrollmentDate: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
}

interface DependentRule {
  id: number;
  companyId: number;
  dependentType: 'spouse' | 'child' | 'parent';
  maxAge?: number;
  maxCount?: number;
  documentationRequired?: string[];
  isActive: boolean;
  createdAt: string;
}

interface DependentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requirements: string[];
  age: number;
  ageLimit?: number;
  documentationNeeded: string[];
}

interface DependentFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  dependentType: 'spouse' | 'child' | 'parent';
  gender?: 'male' | 'female' | 'other';
  nationalId?: string;
  relationship?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
}

interface DependentsManagerProps {
  principalMember: PrincipalMember;
  onUpdate?: () => void;
}

const dependentTypeConfig = {
  spouse: {
    icon: Heart,
    label: 'Spouse',
    description: 'Legal spouse or partner',
    color: 'default' as const,
    maxAge: null,
    requiredDocs: ['marriage_certificate'],
  },
  child: {
    icon: Baby,
    label: 'Child',
    description: 'Biological, adopted, or step-child',
    color: 'secondary' as const,
    maxAge: 25, // Extended for students
    requiredDocs: ['birth_certificate'],
  },
  parent: {
    icon: UserPlus,
    label: 'Parent',
    description: 'Parent or legal guardian',
    color: 'outline' as const,
    maxAge: null,
    requiredDocs: ['proof_of_dependency'],
  },
};

export default function DependentsManager({ principalMember, onUpdate }: DependentsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [activeTab, setActiveTab] = useState("dependents");
  const [validation, setValidation] = useState<DependentValidation | null>(null);
  const [formData, setFormData] = useState<DependentFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    dependentType: 'child',
    gender: undefined,
    nationalId: '',
    relationship: '',
    hasDisability: false,
    disabilityDetails: '',
  });

  // Fetch dependents for principal member
  const { data: dependents, isLoading: isLoadingDependents } = useQuery({
    queryKey: ['/api/members', principalMember.id, 'dependents'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/members/${principalMember.id}/dependents`);
      return response.json();
    },
  });

  // Fetch dependent rules for company
  const { data: dependentRules } = useQuery({
    queryKey: ['/api/companies', principalMember.companyId, 'dependent-rules'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${principalMember.companyId}/dependent-rules`);
      return response.json();
    },
  });

  // Add dependent mutation
  const addMutation = useMutation({
    mutationFn: async (data: DependentFormData) => {
      const response = await apiRequest("POST", "/api/members/dependent", {
        ...data,
        principalId: principalMember.id,
        companyId: principalMember.companyId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependent added successfully",
      });
      setAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/members', principalMember.id, 'dependents'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add dependent",
        variant: "destructive",
      });
    },
  });

  // Update dependent mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DependentFormData }) => {
      const response = await apiRequest("PUT", `/api/members/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependent updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedDependent(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/members', principalMember.id, 'dependents'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update dependent",
        variant: "destructive",
      });
    },
  });

  // Delete dependent mutation
  const deleteMutation = useMutation({
    mutationFn: async (dependentId: number) => {
      const response = await apiRequest("DELETE", `/api/members/${dependentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependent removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members', principalMember.id, 'dependents'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove dependent",
        variant: "destructive",
      });
    },
  });

  const validateDependent = (data: DependentFormData): DependentValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements: string[] = [];

    // Calculate age
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    const age = differenceInYears(today, birthDate);

    // Get dependent type config
    const typeConfig = dependentTypeConfig[data.dependentType];
    const rules = dependentRules?.data?.find((rule: DependentRule) =>
      rule.dependentType === data.dependentType && rule.isActive
    );

    // Age validation
    if (data.dependentType === 'child' && age < 0) {
      errors.push("Invalid date of birth for child dependent");
    }

    if (rules?.maxAge && age > rules.maxAge) {
      errors.push(`Age ${age} exceeds maximum limit of ${rules.maxAge} years for ${data.dependentType}`);
      warnings.push("Consider transitioning to individual coverage or other dependent types");
    }

    // Check for existing dependents of same type
    const currentDependents = dependents?.data?.filter((d: Dependent) =>
      d.dependentType === data.dependentType
    ) || [];

    if (rules?.maxCount && currentDependents.length >= rules.maxCount) {
      errors.push(`Maximum ${rules.maxCount} ${data.dependentType} dependents allowed`);
    }

    // Document requirements
    const requiredDocs = rules?.documentationRequired || typeConfig.requiredDocs;
    requirements.push(`Required documents: ${requiredDocs.join(', ')}`);

    // Additional validations
    if (data.dependentType === 'spouse' && age < 18) {
      warnings.push("Spouse appears to be under 18 years old");
    }

    if (data.dependentType === 'parent' && age < 35) {
      warnings.push("Parent appears to be quite young - please verify relationship");
    }

    if (data.dependentType === 'child' && age >= 18) {
      warnings.push("Child is 18 years or older - may require student verification for continued coverage");
      requirements.push("Student letter may be required for dependents 18-25 years old");
    }

    if (data.hasDisability && !data.disabilityDetails) {
      errors.push("Disability details are required when disability is indicated");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements,
      age,
      ageLimit: rules?.maxAge,
      documentationNeeded: requiredDocs,
    };
  };

  const handleFormChange = (field: keyof DependentFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Validate if we have essential fields
    if (newFormData.dateOfBirth && newFormData.dependentType) {
      const validation = validateDependent(newFormData);
      setValidation(validation);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      dependentType: 'child',
      gender: undefined,
      nationalId: '',
      relationship: '',
      hasDisability: false,
      disabilityDetails: '',
    });
    setValidation(null);
  };

  const handleAdd = () => {
    if (!validation?.isValid) {
      toast({
        title: "Validation Failed",
        description: "Please fix all validation errors before submitting",
        variant: "destructive",
      });
      return;
    }

    addMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!validation?.isValid || !selectedDependent) {
      toast({
        title: "Validation Failed",
        description: "Please fix all validation errors before submitting",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: selectedDependent.id,
      data: formData,
    });
  };

  const startEdit = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setFormData({
      firstName: dependent.firstName,
      lastName: dependent.lastName,
      email: dependent.email || '',
      phone: dependent.phone || '',
      dateOfBirth: dependent.dateOfBirth,
      dependentType: dependent.dependentType,
      gender: dependent.gender,
      nationalId: dependent.nationalId || '',
      relationship: dependent.relationship || '',
      hasDisability: dependent.hasDisability || false,
      disabilityDetails: dependent.disabilityDetails || '',
    });
    setEditDialogOpen(true);
  };

  const getAge = (dateOfBirth: string) => {
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  const getDependentStatus = (dependent: Dependent) => {
    const age = getAge(dependent.dateOfBirth);
    const rules = dependentRules?.data?.find((rule: DependentRule) =>
      rule.dependentType === dependent.dependentType && rule.isActive
    );

    if (dependent.membershipStatus !== 'active') {
      return { color: 'secondary' as const, label: dependent.membershipStatus, icon: Clock };
    }

    if (rules?.maxAge && age > rules.maxAge) {
      return { color: 'destructive' as const, label: 'Age Limit Exceeded', icon: AlertTriangle };
    }

    if (dependent.dependentType === 'child' && age >= 18 && age <= 25) {
      return { color: 'outline' as const, label: 'Student Verification Needed', icon: FileText };
    }

    return { color: 'default' as const, label: 'Active', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dependents Management
              </CardTitle>
              <CardDescription>
                Manage dependents for {principalMember.firstName} {principalMember.lastName}
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Dependent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Dependent</DialogTitle>
                  <DialogDescription>
                    Add a new dependent to {principalMember.firstName}'s coverage
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Tabs value="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="personal">Personal Info</TabsTrigger>
                      <TabsTrigger value="additional">Additional Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4 mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dependent-type">Dependent Type *</Label>
                          <Select
                            value={formData.dependentType}
                            onValueChange={(value: any) => handleFormChange('dependentType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(dependentTypeConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <config.icon className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">{config.label}</div>
                                      <div className="text-xs text-muted-foreground">{config.description}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={formData.gender}
                            onValueChange={(value: any) => handleFormChange('gender', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first-name">First Name *</Label>
                          <Input
                            id="first-name"
                            value={formData.firstName}
                            onChange={(e) => handleFormChange('firstName', e.target.value)}
                            placeholder="Enter first name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="last-name">Last Name *</Label>
                          <Input
                            id="last-name"
                            value={formData.lastName}
                            onChange={(e) => handleFormChange('lastName', e.target.value)}
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="date-of-birth">Date of Birth *</Label>
                        <Input
                          id="date-of-birth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleFormChange('dateOfBirth', e.target.value)}
                        />
                        {validation && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Age: {validation.age} years
                            {validation.ageLimit && ` (Max: ${validation.ageLimit})`}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange('email', e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleFormChange('phone', e.target.value)}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="additional" className="space-y-4 mt-6">
                      <div>
                        <Label htmlFor="national-id">National ID</Label>
                        <Input
                          id="national-id"
                          value={formData.nationalId}
                          onChange={(e) => handleFormChange('nationalId', e.target.value)}
                          placeholder="Enter national ID"
                        />
                      </div>

                      <div>
                        <Label htmlFor="relationship">Relationship Details</Label>
                        <Input
                          id="relationship"
                          value={formData.relationship}
                          onChange={(e) => handleFormChange('relationship', e.target.value)}
                          placeholder="e.g., Biological mother, Adopted child"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Disability Status</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="has-disability"
                            checked={formData.hasDisability}
                            onChange={(e) => handleFormChange('hasDisability', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="has-disability" className="text-sm">
                            Dependent has disability
                          </Label>
                        </div>
                        {formData.hasDisability && (
                          <Textarea
                            placeholder="Please describe the disability and any special requirements"
                            value={formData.disabilityDetails}
                            onChange={(e) => handleFormChange('disabilityDetails', e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Validation Results */}
                  {validation && (
                    <div className="space-y-3">
                      {validation.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium">Please fix these errors:</div>
                            <ul className="list-disc list-inside mt-1 text-sm">
                              {validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {validation.warnings.length > 0 && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium">Warnings:</div>
                            <ul className="list-disc list-inside mt-1 text-sm">
                              {validation.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">Document Requirements:</div>
                          <div className="text-sm mt-1">{validation.requirements.join(', ')}</div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={addMutation.isPending || !validation?.isValid}
                  >
                    {addMutation.isPending ? "Adding..." : "Add Dependent"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dependents">Dependents List</TabsTrigger>
              <TabsTrigger value="rules">Rules & Policies</TabsTrigger>
            </TabsList>

            <TabsContent value="dependents" className="mt-6">
              {isLoadingDependents ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : dependents?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dependent</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dependents.data.map((dependent: Dependent) => {
                        const age = getAge(dependent.dateOfBirth);
                        const status = getDependentStatus(dependent);
                        const StatusIcon = status.icon;
                        const typeConfig = dependentTypeConfig[dependent.dependentType];
                        const TypeIcon = typeConfig.icon;

                        return (
                          <TableRow key={dependent.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {dependent.firstName} {dependent.lastName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {dependent.relationship || typeConfig.label}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={typeConfig.color} className="flex items-center gap-1 w-fit">
                                <TypeIcon className="h-3 w-3" />
                                {typeConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {age} years
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {dependent.email && <div>{dependent.email}</div>}
                                {dependent.phone && <div>{dependent.phone}</div>}
                                {!dependent.email && !dependent.phone && (
                                  <span className="text-muted-foreground">No contact info</span>
                                )}
                              </div>
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
                                  <DropdownMenuItem onClick={() => startEdit(dependent)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove Dependent</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove {dependent.firstName} {dependent.lastName} as a dependent? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(dependent.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Remove
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
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No dependents added yet</p>
                  <p className="text-sm">Click "Add Dependent" to add the first dependent</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rules" className="mt-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Dependent coverage rules and policies for this company
                </div>

                {dependentRules?.data?.length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(dependentTypeConfig).map(([type, config]) => {
                      const rule = dependentRules.data.find((r: DependentRule) => r.dependentType === type && r.isActive);
                      const Icon = config.icon;

                      return (
                        <Card key={type}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5" />
                              <div>
                                <CardTitle className="text-base">{config.label}</CardTitle>
                                <CardDescription className="text-sm">
                                  {config.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="font-medium">Age Limit</div>
                                <div className="text-muted-foreground">
                                  {rule?.maxAge || config.maxAge || 'No limit'} years
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Maximum Allowed</div>
                                <div className="text-muted-foreground">
                                  {rule?.maxCount || 'No limit'}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Required Documents</div>
                                <div className="text-muted-foreground">
                                  {rule?.documentationRequired?.join(', ') || config.requiredDocs.join(', ')}
                                </div>
                              </div>
                            </div>
                            {rule && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle className="h-3 w-3" />
                                  Custom company rules applied
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No custom dependent rules configured for this company</p>
                    <p className="text-sm">Default rules will apply</p>
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Important Notes:</div>
                    <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                      <li>Children over 18 may require student verification for continued coverage</li>
                      <li>Age limits are automatically enforced and dependents will be flagged when limits are exceeded</li>
                      <li>All required documents must be uploaded before dependent coverage becomes active</li>
                      <li>Dependent coverage terminates when principal member coverage ends</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Dependent</DialogTitle>
            <DialogDescription>
              Update dependent information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Reuse the same form fields as in Add dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-dependent-type">Dependent Type</Label>
                <Select
                  value={formData.dependentType}
                  onValueChange={(value: any) => handleFormChange('dependentType', value)}
                  disabled // Don't allow changing dependent type
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dependentTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: any) => handleFormChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add other form fields similar to Add dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={formData.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={formData.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Add remaining fields as needed */}

            {/* Validation results */}
            {validation && !validation.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Please fix these errors:</div>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !validation?.isValid}
            >
              {updateMutation.isPending ? "Updating..." : "Update Dependent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}