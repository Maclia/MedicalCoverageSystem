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
  Progress,
} from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  UserCheck,
  Star,
  TrendingUp,
  Award,
  Settings,
  ArrowUpDown,
  BarChart3,
  User,
  Building,
} from "lucide-react";

interface Company {
  id: number;
  name: string;
  gradeBasedBenefits: boolean;
  experienceRatingEnabled: boolean;
}

interface EmployeeGrade {
  id: number;
  companyId: number;
  gradeCode: string;
  gradeName: string;
  level: number;
  description?: string;
  createdAt: string;
}

interface GradeBenefit {
  gradeId: number;
  benefitName: string;
  coverageAmount?: number;
  coverageRate?: number;
  costSharing?: {
    employerContribution: number;
    employeeContribution: number;
  };
}

interface GradeAssignment {
  gradeId: number;
  employeeIds: number[];
  assignAll: boolean;
}

interface GradeStats {
  totalEmployees: number;
  gradeDistribution: Array<{
    gradeId: number;
    gradeName: string;
    employeeCount: number;
    percentage: number;
  }>;
  averagePremium: number;
}

interface EmployeeGradeManagerProps {
  company: Company;
  onUpdate?: () => void;
}

const gradeLevelConfig = {
  1: { label: 'Executive', icon: Star, color: 'default' as const },
  2: { label: 'Senior Management', icon: TrendingUp, color: 'secondary' as const },
  3: { label: 'Middle Management', icon: Award, color: 'outline' as const },
  4: { label: 'Supervisory', icon: UserCheck, color: 'default' as const },
  5: { label: 'Support Staff', icon: User, color: 'secondary' as const },
};

export default function EmployeeGradeManager({ company, onUpdate }: EmployeeGradeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<EmployeeGrade | null>(null);
  const [activeTab, setActiveTab] = useState("grades");
  const [formData, setFormData] = useState({
    gradeCode: '',
    gradeName: '',
    level: 1,
    description: '',
  });
  const [assignmentData, setAssignmentData] = useState<GradeAssignment>({
    gradeId: 0,
    employeeIds: [],
    assignAll: false,
  });
  const [benefitData, setBenefitData] = useState<GradeBenefit>({
    gradeId: 0,
    benefitName: '',
    coverageAmount: 0,
    coverageRate: 100,
    costSharing: {
      employerContribution: 100,
      employeeContribution: 0,
    },
  });

  // Fetch employee grades
  const { data: grades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['/api/companies', company.id, 'grades'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${company.id}/grades`);
      return response.json();
    },
  });

  // Fetch grade statistics
  const { data: gradeStats } = useQuery({
    queryKey: ['/api/companies', company.id, 'grade-stats'],
    queryFn: async () => {
      // This would be a new endpoint to get grade statistics
      const response = await apiRequest("GET", `/api/companies/${company.id}/grade-stats`);
      return response.json();
    },
  });

  // Add grade mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", `/api/companies/${company.id}/grades`, {
        companyId: company.id,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee grade created successfully",
      });
      setAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/companies', company.id, 'grades'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create employee grade",
        variant: "destructive",
      });
    },
  });

  // Update grade mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await apiRequest("PUT", `/api/companies/${company.id}/grades/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee grade updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedGrade(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/companies', company.id, 'grades'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update employee grade",
        variant: "destructive",
      });
    },
  });

  // Delete grade mutation
  const deleteMutation = useMutation({
    mutationFn: async (gradeId: number) => {
      const response = await apiRequest("DELETE", `/api/companies/${company.id}/grades/${gradeId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee grade deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', company.id, 'grades'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete employee grade",
        variant: "destructive",
      });
    },
  });

  // Bulk assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async (data: GradeAssignment) => {
      const response = await apiRequest("POST", `/api/companies/${company.id}/grades/bulk-assign`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employees assigned to grade successfully",
      });
      setAssignmentDialogOpen(false);
      setAssignmentData({ gradeId: 0, employeeIds: [], assignAll: false });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', company.id, 'grade-stats'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign employees to grade",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      gradeCode: '',
      gradeName: '',
      level: 1,
      description: '',
    });
  };

  const handleAdd = () => {
    if (!formData.gradeCode || !formData.gradeName) {
      toast({
        title: "Validation Failed",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedGrade || !formData.gradeCode || !formData.gradeName) {
      toast({
        title: "Validation Failed",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: selectedGrade.id,
      data: formData,
    });
  };

  const startEdit = (grade: EmployeeGrade) => {
    setSelectedGrade(grade);
    setFormData({
      gradeCode: grade.gradeCode,
      gradeName: grade.gradeName,
      level: grade.level,
      description: grade.description || '',
    });
    setEditDialogOpen(true);
  };

  const startAssignment = (grade: EmployeeGrade) => {
    setBenefitData({
      gradeId: grade.id,
      benefitName: '',
      coverageAmount: 0,
      coverageRate: 100,
      costSharing: {
        employerContribution: 100,
        employeeContribution: 0,
      },
    });
    setAssignmentData({
      gradeId: grade.id,
      employeeIds: [],
      assignAll: false,
    });
    setAssignmentDialogOpen(true);
  };

  const getGradeLevelIcon = (level: number) => {
    const config = gradeLevelConfig[level as keyof typeof gradeLevelConfig];
    return config?.icon || User;
  };

  const getGradeLevelLabel = (level: number) => {
    const config = gradeLevelConfig[level as keyof typeof gradeLevelConfig];
    return config?.label || `Level ${level}`;
  };

  const getGradeLevelColor = (level: number) => {
    const config = gradeLevelConfig[level as keyof typeof gradeLevelConfig];
    return config?.color || 'default';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Employee Grade Management
              </CardTitle>
              <CardDescription>
                Manage employee grades and benefit structures for {company.name}
              </CardDescription>
            </div>
            {company.gradeBasedBenefits ? (
              <Badge variant="default" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Grade-Based Benefits Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Standard Benefits
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="grades">Grade Structure</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="assignments">Bulk Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="mt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-muted-foreground">
                  Define employee grades with hierarchical levels and benefit packages
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Grade
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Employee Grade</DialogTitle>
                      <DialogDescription>
                        Define a new employee grade for {company.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="grade-code">Grade Code *</Label>
                          <Input
                            id="grade-code"
                            value={formData.gradeCode}
                            onChange={(e) => setFormData({ ...formData, gradeCode: e.target.value })}
                            placeholder="e.g., A1, B2, C1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="grade-name">Grade Name *</Label>
                          <Input
                            id="grade-name"
                            value={formData.gradeName}
                            onChange={(e) => setFormData({ ...formData, gradeName: e.target.value })}
                            placeholder="e.g., Executive Director, Senior Manager"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="grade-level">Grade Level *</Label>
                        <Select
                          value={formData.level.toString()}
                          onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(gradeLevelConfig).map(([level, config]) => (
                              <SelectItem key={level} value={level}>
                                <div className="flex items-center gap-2">
                                  <config.icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">Level {level}</div>
                                    <div className="text-xs text-muted-foreground">{config.label}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="grade-description">Description</Label>
                        <Textarea
                          id="grade-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe the responsibilities and typical roles for this grade"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAdd}
                        disabled={addMutation.isPending}
                      >
                        {addMutation.isPending ? "Creating..." : "Create Grade"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingGrades ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : grades?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.data.map((grade: EmployeeGrade) => {
                        const LevelIcon = getGradeLevelIcon(grade.level);
                        const levelConfig = gradeLevelConfig[grade.level as keyof typeof gradeLevelConfig];
                        const levelColor = getGradeLevelColor(grade.level);
                        const employeesCount = gradeStats?.data?.gradeDistribution?.find(
                          (stat: any) => stat.gradeId === grade.id
                        )?.employeeCount || 0;

                        return (
                          <TableRow key={grade.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <LevelIcon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{grade.gradeName}</div>
                                  <div className="text-sm text-muted-foreground">{grade.gradeCode}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={levelColor} className="flex items-center gap-1 w-fit">
                                <LevelIcon className="h-3 w-3" />
                                {getGradeLevelLabel(grade.level)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate text-sm">
                                {grade.description || 'No description provided'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{employeesCount}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {new Date(grade.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEdit(grade)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Grade
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => startAssignment(grade)}>
                                    <Users className="h-4 w-4 mr-2" />
                                    Assign Employees
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setBenefitData({ ...benefitData, gradeId: grade.id });
                                    setBenefitDialogOpen(true);
                                  }}>
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Configure Benefits
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Grade
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Grade</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{grade.gradeName}"?
                                          {employeesCount > 0 && (
                                            <span className="text-destructive font-medium">
                                              {" "}This will affect {employeesCount} employees.
                                            </span>
                                          )}
                                          {" "}This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(grade.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          disabled={employeesCount > 0}
                                        >
                                          {employeesCount > 0 ? "Cannot Delete (Has Employees)" : "Delete"}
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
                  <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No employee grades defined yet</p>
                  <p className="text-sm">Click "Add Grade" to create the first grade</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Grades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{grades?.data?.length || 0}</div>
                      <p className="text-sm text-muted-foreground">Defined grade levels</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Employees</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{gradeStats?.data?.totalEmployees || 0}</div>
                      <p className="text-sm text-muted-foreground">Assigned to grades</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Average Premium</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        ${gradeStats?.data?.averagePremium || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Per employee monthly</p>
                    </CardContent>
                  </Card>
                </div>

                {gradeStats?.data?.gradeDistribution && gradeStats.data.gradeDistribution.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Grade Distribution</CardTitle>
                      <CardDescription>
                        Number of employees per grade level
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {gradeStats.data.gradeDistribution
                          .sort((a: any, b: any) => b.employeeCount - a.employeeCount)
                          .map((stat: any) => {
                            const grade = grades?.data?.find((g: EmployeeGrade) => g.id === stat.gradeId);
                            const LevelIcon = grade ? getGradeLevelIcon(grade.level) : User;
                            const levelColor = grade ? getGradeLevelColor(grade.level) : 'default';

                            return (
                              <div key={stat.gradeId} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <LevelIcon className="h-4 w-4" />
                                    <span className="font-medium">{stat.gradeName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={levelColor}>{stat.employeeCount}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {stat.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                <Progress value={stat.percentage} className="h-2" />
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="assignments" className="mt-6">
              <div className="space-y-4">
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    Bulk assign employees to grades and configure benefit packages for each grade level.
                    Select a grade from the list below to manage assignments.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {grades?.data?.map((grade: EmployeeGrade) => {
                    const LevelIcon = getGradeLevelIcon(grade.level);
                    const employeesCount = gradeStats?.data?.gradeDistribution?.find(
                      (stat: any) => stat.gradeId === grade.id
                    )?.employeeCount || 0;

                    return (
                      <Card key={grade.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-muted`}>
                                <LevelIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{grade.gradeName}</h4>
                                <p className="text-sm text-muted-foreground">{grade.gradeCode}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-lg font-semibold">{employeesCount}</div>
                                <div className="text-xs text-muted-foreground">employees</div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startAssignment(grade)}
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setBenefitData({ ...benefitData, gradeId: grade.id });
                                    setBenefitDialogOpen(true);
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4 mr-1" />
                                  Benefits
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee Grade</DialogTitle>
            <DialogDescription>
              Update employee grade information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-grade-code">Grade Code</Label>
                <Input
                  id="edit-grade-code"
                  value={formData.gradeCode}
                  onChange={(e) => setFormData({ ...formData, gradeCode: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-grade-name">Grade Name</Label>
                <Input
                  id="edit-grade-name"
                  value={formData.gradeName}
                  onChange={(e) => setFormData({ ...formData, gradeName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-grade-level">Grade Level</Label>
              <Select
                value={formData.level.toString()}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(gradeLevelConfig).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Level {level}</div>
                          <div className="text-xs text-muted-foreground">{config.label}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-grade-description">Description</Label>
              <Textarea
                id="edit-grade-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit Configuration Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure Grade Benefits</DialogTitle>
            <DialogDescription>
              Set benefit packages and cost sharing for this grade level
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                Benefit configuration is a comprehensive feature that would integrate with the benefits management system.
                This is a placeholder for the full implementation.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Coming Soon</Label>
              <div className="text-sm text-muted-foreground mt-1">
                Full benefit configuration with cost sharing, coverage limits, and premium calculations will be available in a future update.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}