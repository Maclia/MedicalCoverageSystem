import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Eye, Settings, Users, Shield, TrendingUp, Layers, Gavel } from "lucide-react";

interface Scheme {
  id: number;
  name: string;
  schemeCode: string;
  schemeType: string;
  description: string;
  targetMarket: string;
  pricingModel: string;
  isActive: boolean;
  launchDate?: string;
  sunsetDate?: string;
  minAge: number;
  maxAge?: number;
  planTierCount: number;
  memberCount: number;
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

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setSchemes([
        {
          id: 1,
          name: "Individual Medical Cover",
          schemeCode: "IMC-2024",
          schemeType: "individual_medical",
          description: "Comprehensive health insurance for individuals and families",
          targetMarket: "individuals",
          pricingModel: "community_rated",
          isActive: true,
          launchDate: "2024-01-01",
          minAge: 18,
          maxAge: 65,
          planTierCount: 4,
          memberCount: 15420
        },
        {
          id: 2,
          name: "Corporate Medical Scheme",
          schemeCode: "CMS-2024",
          schemeType: "corporate_medical",
          description: "Tailored health insurance solutions for corporate clients",
          targetMarket: "large_corporates",
          pricingModel: "experience_rated",
          isActive: true,
          launchDate: "2024-01-01",
          minAge: 0,
          maxAge: 70,
          planTierCount: 5,
          memberCount: 48750
        },
        {
          id: 3,
          name: "NHIF Top-Up Scheme",
          schemeCode: "NHIF-2024",
          schemeType: "nhif_top_up",
          description: "Enhanced coverage supplementing NHIF benefits",
          targetMarket: "individuals",
          pricingModel: "age_rated",
          isActive: true,
          launchDate: "2024-02-01",
          minAge: 18,
          maxAge: 80,
          planTierCount: 3,
          memberCount: 12350
        }
      ]);

      setPlanTiers([
        {
          id: 1,
          tierLevel: "bronze",
          tierName: "Bronze Plan",
          tierDescription: "Essential coverage for basic healthcare needs",
          overallAnnualLimit: 500000,
          networkAccessLevel: "tier_1_only",
          roomTypeCoverage: "general_ward",
          dentalCoverage: false,
          opticalCoverage: false,
          maternityCoverage: false,
          chronicCoverage: true,
          evacuationCoverage: false,
          internationalCoverage: false,
          wellnessBenefits: false,
          premiumMultiplier: 1.0,
          isActive: true
        },
        {
          id: 2,
          tierLevel: "silver",
          tierName: "Silver Plan",
          tierDescription: "Comprehensive coverage with additional benefits",
          overallAnnualLimit: 1000000,
          networkAccessLevel: "full_network",
          roomTypeCoverage: "semi_private",
          dentalCoverage: true,
          opticalCoverage: false,
          maternityCoverage: false,
          chronicCoverage: true,
          evacuationCoverage: true,
          internationalCoverage: false,
          wellnessBenefits: true,
          premiumMultiplier: 1.5,
          isActive: true
        },
        {
          id: 3,
          tierLevel: "gold",
          tierName: "Gold Plan",
          tierDescription: "Premium coverage with enhanced benefits",
          overallAnnualLimit: 2000000,
          networkAccessLevel: "full_network",
          roomTypeCoverage: "private",
          dentalCoverage: true,
          opticalCoverage: true,
          maternityCoverage: true,
          chronicCoverage: true,
          evacuationCoverage: true,
          internationalCoverage: false,
          wellnessBenefits: true,
          premiumMultiplier: 2.0,
          isActive: true
        },
        {
          id: 4,
          tierLevel: "platinum",
          tierName: "Platinum Plan",
          tierDescription: "Elite coverage with all-inclusive benefits",
          overallAnnualLimit: 5000000,
          networkAccessLevel: "premium_network",
          roomTypeCoverage: "deluxe",
          dentalCoverage: true,
          opticalCoverage: true,
          maternityCoverage: true,
          chronicCoverage: true,
          evacuationCoverage: true,
          internationalCoverage: true,
          wellnessBenefits: true,
          premiumMultiplier: 3.0,
          isActive: true
        }
      ]);

      setBenefitRules([
        {
          id: 1,
          ruleName: "Waiting Period Validation",
          ruleCategory: "eligibility",
          ruleType: "validation",
          rulePriority: 100,
          isActive: true,
          version: "1.2"
        },
        {
          id: 2,
          ruleName: "Annual Limit Check",
          ruleCategory: "limit_check",
          ruleType: "condition",
          rulePriority: 90,
          isActive: true,
          version: "1.1"
        },
        {
          id: 3,
          ruleName: "Network Provider Validation",
          ruleCategory: "benefit_application",
          ruleType: "validation",
          rulePriority: 80,
          isActive: true,
          version: "1.0"
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scheme.schemeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterSchemeType || scheme.schemeType === filterSchemeType;
    const matchesMarket = !filterTargetMarket || scheme.targetMarket === filterTargetMarket;
    const matchesStatus = !filterStatus ||
                         (filterStatus === "active" && scheme.isActive) ||
                         (filterStatus === "inactive" && !scheme.isActive);

    return matchesSearch && matchesType && matchesMarket && matchesStatus;
  });

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
        <Dialog>
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
              <Button variant="outline">Cancel</Button>
              <Button>Create Scheme</Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Corporate Customization</CardTitle>
              <CardDescription>
                Set up employee grade benefits and dependent coverage rules for corporate clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Corporate Configuration</h3>
                <p>Create custom benefit structures for corporate clients with employee grade differentiation</p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Configure Corporate Scheme
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}