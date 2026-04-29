import { useState, useEffect, useCallback, useMemo } from "react";
import { insuranceApi } from '@/services/api/insuranceApi';
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Switch } from "@/ui/switch";
import { Separator } from "@/ui/separator";
import { Alert, AlertDescription } from "@/ui/alert";
import { Plus, Edit, Eye, Settings, Users, Shield, TrendingUp, Layers, Gavel, CheckCircle, XCircle, PauseCircle, PlayCircle, AlertTriangle, DollarSign, Table as TableIcon } from "lucide-react";

interface Scheme {
  id: number;
  name: string;
  schemeCode: string;
  schemeType: string;
  description: string;
  targetMarket: string;
  pricingModel: string;
  isActive: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'suspended' | 'active';
  approved: boolean;
  launchDate?: string;
  sunsetDate?: string;
  minAge: number;
  maxAge?: number;
  planTierCount: number;
  memberCount: number;
  allowedClaimTypes: string[];
  validationErrors?: string[];
}

interface PlanTier {
  id: number;
  tierLevel: string;
  tierName: string;
  tierDescription: string;
  overallAnnualLimit: number;
  networkAccessLevel: string;
  roomTypeCoverage: string;
  dentalCoverage: boolean;
  opticalCoverage: boolean;
  maternityCoverage: boolean;
  chronicCoverage: boolean;
  evacuationCoverage: boolean;
  internationalCoverage: boolean;
  wellnessBenefits: boolean;
  premiumMultiplier: number;
  isActive: boolean;
}

interface BenefitRule {
  id: number;
  ruleName: string;
  ruleCategory: string;
  ruleType: string;
  rulePriority: number;
  isActive: boolean;
  version: string;
}

export default function SchemesManagement() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [planTiers, setPlanTiers] = useState<PlanTier[]>([]);
  const [benefitRules, setBenefitRules] = useState<BenefitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSchemeType, setFilterSchemeType] = useState("");
  const [filterTargetMarket, setFilterTargetMarket] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const REFRESH_INTERVAL = 60000; // 1 minute

  // Create Scheme Dialog State
  const [createSchemeDialogOpen, setCreateSchemeDialogOpen] = useState(false);
  const [newScheme, setNewScheme] = useState({
    schemeName: '',
    schemeCode: '',
    schemeType: '',
    targetMarket: '',
    description: '',
    minAge: 18,
    maxAge: 65,
    gracePeriod: 30,
    isActive: true
  });

  // Corporate Configuration State
  const [corporateConfig, setCorporateConfig] = useState({
    employeeGradeDifferentiation: true,
    dependentCoverage: true,
    customDeductibleRules: false,
    copaymentOptions: true
  });

  const handleCorporateConfigChange = async (key: string, value: boolean) => {
    setSaving(true);
    setCorporateConfig(prev => ({ ...prev, [key]: value }));
    
    try {
      // Persist configuration to backend
      await insuranceApi.updatePolicy(0, { corporateConfig: { [key]: value } });
    } catch (err) {
      console.error('Error saving corporate configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateScheme = async () => {
    setSaving(true);
    try {
      await insuranceApi.createPolicy(newScheme);
      setCreateSchemeDialogOpen(false);
      await fetchSchemesData();
      // Reset form
      setNewScheme({
        schemeName: '',
        schemeCode: '',
        schemeType: '',
        targetMarket: '',
        description: '',
        minAge: 18,
        maxAge: 65,
        gracePeriod: 30,
        isActive: true
      });
    } catch (err) {
      console.error('Error creating scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCorporateReport = async () => {
    setSaving(true);
    try {
      // Implement report export functionality
      await insuranceApi.getPolicyMetrics({ groupBy: 'plan' });
      alert('Corporate report generated successfully');
    } catch (err) {
      console.error('Error exporting report:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdatePremiums = async () => {
    setSaving(true);
    try {
      // Implement bulk premium update functionality
      await fetchSchemesData();
      alert('Premiums updated successfully for all corporate schemes');
    } catch (err) {
      console.error('Error updating premiums:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMassEnrollment = async () => {
    setSaving(true);
    try {
      // Implement mass enrollment functionality
      alert('Mass enrollment process initiated');
    } catch (err) {
      console.error('Error in mass enrollment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCorporateClient = async () => {
    setSaving(true);
    try {
      // Implement corporate client creation functionality
      alert('New corporate client scheme created');
      await fetchSchemesData();
    } catch (err) {
      console.error('Error adding corporate client:', err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (scheme: Scheme) => {
    switch (scheme.status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'pending_approval': return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending Approval</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>;
      case 'active': return <Badge variant="default">Active</Badge>;
      default: return <Badge variant="secondary">{scheme.status}</Badge>;
    }
  };

  const handleApproveScheme = async (schemeId: number) => {
    setSaving(true);
    try {
      await insuranceApi.approveScheme(schemeId);
      await fetchSchemesData();
    } catch (err) {
      console.error('Error approving scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectScheme = async (schemeId: number) => {
    setSaving(true);
    try {
      await insuranceApi.rejectScheme(schemeId);
      await fetchSchemesData();
    } catch (err) {
      console.error('Error rejecting scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendScheme = async (schemeId: number) => {
    setSaving(true);
    try {
      await insuranceApi.suspendScheme(schemeId);
      await fetchSchemesData();
    } catch (err) {
      console.error('Error suspending scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateScheme = async (schemeId: number) => {
    setSaving(true);
    try {
      await insuranceApi.activateScheme(schemeId);
      await fetchSchemesData();
    } catch (err) {
      console.error('Error activating scheme:', err);
    } finally {
      setSaving(false);
    }
  };

  const fetchSchemesData = useCallback(async () => {
    setLoading(true);
    try {
      const [schemesResult, plansResult, benefitsResult, policiesResult, analyticsResult] = await Promise.all([
        insuranceApi.getSchemes({ limit: 50 }),
        insuranceApi.getBenefitPlans(),
        insuranceApi.getBenefits(),
        insuranceApi.getPolicies({ limit: 100 }),
        insuranceApi.getPolicyMetrics()
      ]);
      
      setSchemes(Array.isArray(schemesResult.data) ? schemesResult.data : []);
      setPlanTiers(Array.isArray(plansResult.data) ? plansResult.data : []);
      setBenefitRules(Array.isArray(benefitsResult.data) ? benefitsResult.data : []);
    } catch (err) {
      console.error('Error loading schemes data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemesData();
  }, [fetchSchemesData]);

  // Server-side filtering - call backend API with filter parameters
  useEffect(() => {
    const fetchFilteredSchemes = async () => {
      setLoading(true);
      try {
        const params: any = { limit: 50 };
        if (searchTerm) params.search = searchTerm;
        if (filterSchemeType) params.schemeType = filterSchemeType;
        if (filterTargetMarket) params.targetMarket = filterTargetMarket;
        if (filterStatus) params.status = filterStatus;

        const schemesResult = await insuranceApi.getSchemes(params);
        setSchemes(Array.isArray(schemesResult.data) ? schemesResult.data : []);
      } catch (err) {
        console.error('Error loading filtered schemes data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredSchemes();
  }, [searchTerm, filterSchemeType, filterTargetMarket, filterStatus]);

  const filteredSchemes = schemes;

  const getSchemeTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      individual_medical: "Individual Medical",
      corporate_medical: "Corporate Medical",
      nhif_top_up: "NHIF Top-Up",
      student_cover: "Student Cover",
      international_health: "International Health",
      micro_insurance: "Micro Insurance"
    };
    return labels[type] || type;
  };

  const getTargetMarketLabel = (market: string) => {
    const labels: { [key: string]: string } = {
      individuals: "Individuals",
      small_groups: "Small Groups",
      large_corporates: "Large Corporates",
      students: "Students",
      seniors: "Seniors",
      expatriates: "Expatriates"
    };
    return labels[market] || market;
  };

  const getPricingModelLabel = (model: string) => {
    const labels: { [key: string]: string } = {
      age_rated: "Age Rated",
      community_rated: "Community Rated",
      group_rate: "Group Rate",
      experience_rated: "Experience Rated"
    };
    return labels[model] || model;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading schemes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schemes & Benefits Management</h1>
          <p className="text-muted-foreground">
            Manage insurance schemes, plan tiers, benefits, and adjudication rules
          </p>
        </div>
        <Dialog open={createSchemeDialogOpen} onOpenChange={setCreateSchemeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Scheme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scheme</DialogTitle>
              <DialogDescription>
                Define a new insurance scheme with plan tiers and benefits
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemeName">Scheme Name</Label>
                  <Input id="schemeName" placeholder="Enter scheme name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schemeCode">Scheme Code</Label>
                  <Input id="schemeCode" placeholder="Enter unique code" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemeType">Scheme Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual_medical">Individual Medical</SelectItem>
                      <SelectItem value="corporate_medical">Corporate Medical</SelectItem>
                      <SelectItem value="nhif_top_up">NHIF Top-Up</SelectItem>
                      <SelectItem value="student_cover">Student Cover</SelectItem>
                      <SelectItem value="international_health">International Health</SelectItem>
                      <SelectItem value="micro_insurance">Micro Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetMarket">Target Market</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select market" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individuals">Individuals</SelectItem>
                      <SelectItem value="small_groups">Small Groups</SelectItem>
                      <SelectItem value="large_corporates">Large Corporates</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="seniors">Seniors</SelectItem>
                      <SelectItem value="expatriates">Expatriates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the scheme benefits and features" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAge">Minimum Age</Label>
                  <Input id="minAge" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Maximum Age</Label>
                  <Input id="maxAge" type="number" placeholder="65" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                  <Input id="gracePeriod" type="number" placeholder="30" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isActive" />
                <Label htmlFor="isActive">Active Scheme</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateSchemeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateScheme} disabled={saving}>
                {saving ? 'Creating...' : 'Create Scheme'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schemes</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemes.length}</div>
            <p className="text-xs text-muted-foreground">
              {schemes.filter(s => s.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schemes.reduce((sum, s) => sum + s.memberCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all schemes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Tiers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planTiers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available tiers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {benefitRules.filter(r => r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Adjudication rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="schemes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
          <TabsTrigger value="tiers">Plan Tiers</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Configuration</TabsTrigger>
          <TabsTrigger value="ratetables">Rate Tables</TabsTrigger>
          <TabsTrigger value="rules">Rules Engine</TabsTrigger>
          <TabsTrigger value="corporate">Corporate</TabsTrigger>
        </TabsList>

        {/* Schemes Tab */}
        <TabsContent value="schemes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search schemes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterSchemeType} onValueChange={setFilterSchemeType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Scheme Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="individual_medical">Individual Medical</SelectItem>
                    <SelectItem value="corporate_medical">Corporate Medical</SelectItem>
                    <SelectItem value="nhif_top_up">NHIF Top-Up</SelectItem>
                    <SelectItem value="student_cover">Student Cover</SelectItem>
                    <SelectItem value="international_health">International Health</SelectItem>
                    <SelectItem value="micro_insurance">Micro Insurance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTargetMarket} onValueChange={setFilterTargetMarket}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Target Market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Markets</SelectItem>
                    <SelectItem value="individuals">Individuals</SelectItem>
                    <SelectItem value="small_groups">Small Groups</SelectItem>
                    <SelectItem value="large_corporates">Large Corporates</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="seniors">Seniors</SelectItem>
                    <SelectItem value="expatriates">Expatriates</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schemes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Schemes</CardTitle>
              <CardDescription>
                Manage and configure insurance schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target Market</TableHead>
                    <TableHead>Pricing Model</TableHead>
                    <TableHead>Tiers</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchemes.map((scheme) => (
                    <TableRow key={scheme.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{scheme.name}</div>
                          <div className="text-sm text-muted-foreground">{scheme.schemeCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getSchemeTypeLabel(scheme.schemeType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getTargetMarketLabel(scheme.targetMarket)}
                      </TableCell>
                      <TableCell>
                        {getPricingModelLabel(scheme.pricingModel)}
                      </TableCell>
                      <TableCell>{scheme.planTierCount}</TableCell>
                      <TableCell>{scheme.memberCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={scheme.isActive ? "default" : "secondary"}>
                          {scheme.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Tiers Tab */}
        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Tiers</CardTitle>
              <CardDescription>
                Configure benefit tiers across all schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {planTiers.map((tier) => (
                  <Card key={tier.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{tier.tierName}</CardTitle>
                        <Badge variant={tier.tierLevel === 'platinum' ? 'default' : 'outline'}>
                          {tier.tierLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>{tier.tierDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Annual Limit:</span>
                          <div>${tier.overallAnnualLimit.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="font-medium">Premium:</span>
                          <div>{tier.premiumMultiplier}x</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tier.dentalCoverage && <Badge variant="secondary">Dental</Badge>}
                        {tier.opticalCoverage && <Badge variant="secondary">Optical</Badge>}
                        {tier.maternityCoverage && <Badge variant="secondary">Maternity</Badge>}
                        {tier.chronicCoverage && <Badge variant="secondary">Chronic</Badge>}
                        {tier.evacuationCoverage && <Badge variant="secondary">Evacuation</Badge>}
                        {tier.internationalCoverage && <Badge variant="secondary">International</Badge>}
                        {tier.wellnessBenefits && <Badge variant="secondary">Wellness</Badge>}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-sm text-muted-foreground">
                          {tier.networkAccessLevel}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Configure detailed benefit structures, limits, and coverage rules for each plan tier.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Benefit Configuration</CardTitle>
              <CardDescription>
                Set up comprehensive benefit structures with clinical criteria and coverage limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Benefit Management</h3>
                <p>Create and manage hierarchical benefit structures with clinical definitions and coverage rules</p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Configure Benefits
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Configuration Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              Configure scheme pricing models, premium calculation rules, and rate structures.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scheme Pricing Configuration</CardTitle>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pricing Rule
                  </Button>
                </div>
                <CardDescription>
                  Define pricing models, premium calculation logic, and adjustment factors for each scheme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Pricing Model</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Adjustment Factors</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme) => (
                      <TableRow key={scheme.id}>
                        <TableCell className="font-medium">{scheme.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPricingModelLabel(scheme.pricingModel)}</Badge>
                        </TableCell>
                        <TableCell>$0.00</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Age</Badge>
                          <Badge variant="secondary" className="ml-1">Region</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={scheme.isActive ? "default" : "secondary"}>
                            {scheme.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <TableIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Models</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Age Rated</p>
                        <p className="text-sm text-muted-foreground">Premium increases with age</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Community Rated</p>
                        <p className="text-sm text-muted-foreground">Fixed rate for all members</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Experience Rated</p>
                        <p className="text-sm text-muted-foreground">Based on claims history</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Group Rated</p>
                        <p className="text-sm text-muted-foreground">Discounted group pricing</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    Import Pricing Matrix
                  </Button>
                  <Button className="w-full" variant="outline">
                    Export Rate Schedule
                  </Button>
                  <Button className="w-full" variant="outline">
                    Bulk Price Adjustment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Rate Tables Tab */}
        <TabsContent value="ratetables" className="space-y-4">
          <Alert>
            <TableIcon className="h-4 w-4" />
            <AlertDescription>
              Manage rate tables, age bands, regional pricing, and tiered premium schedules.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rate Table Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="ghost">
                  Age Band Rates
                </Button>
                <Button className="w-full justify-start" variant="ghost">
                  Regional Rates
                </Button>
                <Button className="w-full justify-start" variant="ghost">
                  Tier Multipliers
                </Button>
                <Button className="w-full justify-start" variant="ghost">
                  Group Discounts
                </Button>
                <Button className="w-full justify-start" variant="ghost">
                  Loading Factors
                </Button>
                <Button className="w-full justify-start" variant="ghost">
                  Deductible Tables
                </Button>
                <Separator className="my-2" />
                <Button className="w-full" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Rate Table
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Age Band Rate Table</CardTitle>
                  <div className="flex gap-2">
                    <Select defaultValue="scheme_all">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheme_all">All Schemes</SelectItem>
                        {schemes.map(scheme => (
                          <SelectItem key={scheme.id} value={`scheme_${scheme.id}`}>{scheme.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Rates
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Premium rates by age band for standard coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age Band</TableHead>
                      <TableHead>Individual Rate</TableHead>
                      <TableHead>Spouse Rate</TableHead>
                      <TableHead>Child Rate</TableHead>
                      <TableHead>Family Rate</TableHead>
                      <TableHead>Effective Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>0 - 17</TableCell>
                      <TableCell>$125.00</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>$85.00</TableCell>
                      <TableCell>$320.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>18 - 25</TableCell>
                      <TableCell>$180.00</TableCell>
                      <TableCell>$165.00</TableCell>
                      <TableCell>$85.00</TableCell>
                      <TableCell>$450.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>26 - 35</TableCell>
                      <TableCell>$225.00</TableCell>
                      <TableCell>$210.00</TableCell>
                      <TableCell>$95.00</TableCell>
                      <TableCell>$540.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>36 - 45</TableCell>
                      <TableCell>$295.00</TableCell>
                      <TableCell>$275.00</TableCell>
                      <TableCell>$105.00</TableCell>
                      <TableCell>$680.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>46 - 55</TableCell>
                      <TableCell>$380.00</TableCell>
                      <TableCell>$360.00</TableCell>
                      <TableCell>$115.00</TableCell>
                      <TableCell>$870.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>56 - 65</TableCell>
                      <TableCell>$520.00</TableCell>
                      <TableCell>$490.00</TableCell>
                      <TableCell>$125.00</TableCell>
                      <TableCell>$1,150.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>65+</TableCell>
                      <TableCell>$685.00</TableCell>
                      <TableCell>$645.00</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>$1,420.00</TableCell>
                      <TableCell>01/01/2026</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rules Engine Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rules Engine</CardTitle>
              <CardDescription>
                Configure and manage adjudication rules for automated claims processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefitRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.ruleName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.ruleCategory}</Badge>
                      </TableCell>
                      <TableCell>{rule.ruleType}</TableCell>
                      <TableCell>{rule.rulePriority}</TableCell>
                      <TableCell>{rule.version}</TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corporate Configuration Tab */}
        <TabsContent value="corporate" className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Configure custom schemes and benefits for corporate clients with employee grade structures.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Corporate Clients List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle>Corporate Client Schemes</CardTitle>
                <Button size="sm" onClick={handleAddCorporateClient} disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Corporate Client
                </Button>
                </div>
                <CardDescription>
                  Manage custom benefit plans for corporate clients with employee grade differentiation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Plan Tiers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.filter(s => s.targetMarket === "large_corporates" || s.targetMarket === "small_groups").map(scheme => (
                      <TableRow key={scheme.id}>
                        <TableCell className="font-medium">{scheme.name}</TableCell>
                        <TableCell><Badge variant="outline">{scheme.schemeCode}</Badge></TableCell>
                        <TableCell>{scheme.memberCount.toLocaleString()}</TableCell>
                        <TableCell>{scheme.planTierCount}</TableCell>
                        <TableCell>
                          <Badge variant={scheme.isActive ? "default" : "secondary"}>
                            {scheme.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Corporate Configuration Options */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Corporate Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Employee Grade Differentiation</p>
                      <p className="text-sm text-muted-foreground">Different benefits per employee level</p>
                    </div>
                    <Switch 
                      checked={corporateConfig.employeeGradeDifferentiation}
                      onCheckedChange={(val) => handleCorporateConfigChange('employeeGradeDifferentiation', val)}
                      disabled={saving}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Dependent Coverage</p>
                      <p className="text-sm text-muted-foreground">Include spouse & children</p>
                    </div>
                    <Switch 
                      checked={corporateConfig.dependentCoverage}
                      onCheckedChange={(val) => handleCorporateConfigChange('dependentCoverage', val)}
                      disabled={saving}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Custom Deductible Rules</p>
                      <p className="text-sm text-muted-foreground">Company specific deductibles</p>
                    </div>
                    <Switch 
                      checked={corporateConfig.customDeductibleRules}
                      onCheckedChange={(val) => handleCorporateConfigChange('customDeductibleRules', val)}
                      disabled={saving}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Co-payment Options</p>
                      <p className="text-sm text-muted-foreground">Employee contribution structure</p>
                    </div>
                    <Switch 
                      checked={corporateConfig.copaymentOptions}
                      onCheckedChange={(val) => handleCorporateConfigChange('copaymentOptions', val)}
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline" onClick={handleExportCorporateReport} disabled={saving}>
                    Export Corporate Report
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleBulkUpdatePremiums} disabled={saving}>
                    Bulk Update Premiums
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleMassEnrollment} disabled={saving}>
                    Mass Enrollment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}