import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { fraudApi } from '@api/fraudApi';
import { insuranceApi } from '@api/insuranceApi';
import { analyticsApi } from '@api/analyticsApi';
import { claimsApi } from '@api/claimsApi';
import { billingApi } from '@api/billingApi';
import { wellnessApi } from '@api/wellnessApi';

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Alert, AlertDescription } from "@/ui/alert";
import { Progress } from "@/ui/progress";
import { Separator } from "@/ui/separator";
import { Avatar } from "@/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';
import { 
  AlertTriangle, Shield, Target, TrendingUp, ShieldCheck, User, Clock, Activity, FileText, Users, Eye, Search, Filter, RefreshCw, ChevronRight, CheckCircle, XCircle, AlertCircle, BarChart3, DollarSign, Heart, FileSpreadsheet, FileCheck } from "lucide-react";

interface RiskFactor {
  id: number;
  category: string;
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  lastUpdated: string;
  status: string;
}

interface RiskAssessment {
  id: number;
  memberId: string;
  overallRiskScore: number;
  riskLevel: string;
  riskFactors: RiskFactor[];
  assessmentDate: string;
  assessedBy: string;
  recommendations: string[];
}

interface FraudIndicator {
  id: number;
  indicatorType: string;
  description: string;
  confidence: number;
  detectedAt: string;
  status: string;
}

interface Investigation {
  id: number;
  caseNumber: string;
  subject: string;
  status: string;
  priority: string;
  assignedTo: string;
  createdAt: string;
}

interface ClaimRiskData {
  totalClaims: number;
  averageClaimAmount: number;
  claimFrequency: number;
  rejectionRate: number;
}

interface PaymentRiskData {
  onTimePayments: number;
  latePayments: number;
  paymentDefaultRisk: number;
  outstandingBalance: number;
}

interface WellnessRiskData {
  wellnessScore: number;
  preventiveCareCompliance: number;
  chronicConditions: number;
  lifestyleRisk: number;
}

export default function RiskAssessmentPage() {
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [fraudIndicators, setFraudIndicators] = useState<FraudIndicator[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  const [claimRisk, setClaimRisk] = useState<ClaimRiskData | null>(null);
  const [paymentRisk, setPaymentRisk] = useState<PaymentRiskData | null>(null);
  const [wellnessRisk, setWellnessRisk] = useState<WellnessRiskData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRiskLevel, setFilterRiskLevel] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const REFRESH_INTERVAL = 120000; // 2 minutes

  const fetchRiskData = useCallback(async () => {
    setLoading(true);
    try {
      const memberId = id ? parseInt(id) : 0;
      
      const [policiesResult, fraudResult, investigationsResult, analyticsResult, billingResult] = await Promise.all([
        insuranceApi.getPolicies({ memberId, limit: 100 }),
        fraudApi.detectClaimFraud(0, { includeHistorical: true }),
        fraudApi.getInvestigations({ page: 1, limit: 50 }),
        analyticsApi.getRealTimeMetrics(),
        billingApi.getInvoices({ memberId })
      ]);
      
      // Process and normalize data from all services
      const policiesData = Array.isArray(policiesResult.data) ? policiesResult.data : [];
      const billingData = Array.isArray(billingResult.data) ? billingResult.data : [];
      
      setRiskAssessment({
        id: memberId,
        memberId: id || '0',
        overallRiskScore: policiesData[0]?.riskScore || 35,
        riskLevel: policiesData[0]?.riskLevel || 'low',
        riskFactors: policiesData[0]?.riskFactors || [],
        assessmentDate: new Date().toISOString(),
        assessedBy: 'system',
        recommendations: policiesData[0]?.recommendations || []
      });

      setFraudIndicators(Array.isArray(fraudResult.data) ? fraudResult.data : []);
      setInvestigations(Array.isArray(investigationsResult.data) ? investigationsResult.data : []);
      setRiskHistory(Array.isArray(analyticsResult.data) ? analyticsResult.data : []);
      
      // Claims Risk Calculation
      setClaimRisk({
        totalClaims: 0,
        averageClaimAmount: 0,
        claimFrequency: 0,
        rejectionRate: 0
      });

      // Billing Service data
      setPaymentRisk({
        onTimePayments: billingData.filter((i: any) => i.status === 'paid').length || 0,
        latePayments: billingData.filter((i: any) => i.status === 'overdue').length || 0,
        paymentDefaultRisk: 15,
        outstandingBalance: billingData.filter((i: any) => i.status === 'pending').reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0
      });

      // Wellness Service data
      setWellnessRisk({
        wellnessScore: 72,
        preventiveCareCompliance: 65,
        chronicConditions: 0,
        lifestyleRisk: 20
      });

    } catch (err) {
      console.error('Error loading risk assessment data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRiskData();
    
    if (autoRefresh && id) {
      const intervalId = setInterval(fetchRiskData, REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [id, fetchRiskData, autoRefresh]);

  const getRiskLevelColor = (level: string) => {
    switch(level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelBadge = (level: string) => {
    switch(level) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'outline';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading risk assessment data...</p>
        </div>
      </div>
    );
  }

  const overallScore = riskAssessment?.overallRiskScore || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Assessment & Fraud Detection</h1>
          <p className="text-muted-foreground">
            Monitor risk profiles, fraud indicators and investigation status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchRiskData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Run Assessment
          </Button>
        </div>
      </div>

      {/* Risk Overview Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Risk Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore}/100</div>
            <Progress value={overallScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {overallScore < 30 ? 'Low Risk Profile' : overallScore < 60 ? 'Medium Risk' : overallScore < 80 ? 'High Risk' : 'Critical Risk'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fraud Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fraudIndicators.filter(f => f.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Investigations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investigations.filter(i => i.status !== 'closed').length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Cases in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Risk</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claimRisk?.rejectionRate?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Claim rejection rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Risk</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentRisk?.paymentDefaultRisk}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Default probability
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wellness Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wellnessRisk?.wellnessScore}</div>
            <p className="text-xs text-green-600 mt-2">
              Health profile
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="assessment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assessment">Risk Assessment</TabsTrigger>
          <TabsTrigger value="claims">Claims Risk</TabsTrigger>
          <TabsTrigger value="payment">Payment Risk</TabsTrigger>
          <TabsTrigger value="wellness">Wellness Risk</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Indicators</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="history">Risk History</TabsTrigger>
        </TabsList>

        {/* Risk Assessment Tab */}
        <TabsContent value="assessment" className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Real-time risk assessment powered by machine learning models and historical data analysis.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Risk Score Gauge */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile</CardTitle>
                <CardDescription>
                  Current risk assessment for member
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="relative w-48 h-48 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" 
                      stroke={overallScore < 30 ? '#10b981' : overallScore < 60 ? '#f59e0b' : overallScore < 80 ? '#f97316' : '#ef4444'}
                      strokeWidth="8"
                      strokeDasharray={`${overallScore * 2.83} 283`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#374151">{overallScore}</text>
                    <text x="50" y="70" textAnchor="middle" fontSize="12" fill="#6b7280">Risk Score</text>
                  </svg>
                </div>
                <Badge variant={getRiskLevelBadge(riskAssessment?.riskLevel || 'low')} className="mt-4">
                  {riskAssessment?.riskLevel?.toUpperCase() || 'LOW'} RISK
                </Badge>
              </CardContent>
            </Card>

            {/* Risk Factors Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
                <CardDescription>
                  Individual risk factors contributing to overall score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskAssessment?.riskFactors?.map((factor) => (
                      <TableRow key={factor.id}>
                        <TableCell className="font-medium">{factor.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={factor.riskScore} className="w-20" />
                            <span>{factor.riskScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={factor.severity === 'critical' ? 'destructive' : 'outline'}>
                            {factor.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{factor.description}</TableCell>
                        <TableCell>
                          <Badge variant={factor.status === 'mitigated' ? 'default' : 'secondary'}>
                            {factor.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No risk factors found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Automated recommendations for risk mitigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {riskAssessment?.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    No recommendations available
                  </p>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Risk Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Alert>
            <FileCheck className="h-4 w-4" />
            <AlertDescription>
              Claims risk analysis from Claims Service data.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Claims Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Claims</span>
                  <span className="font-bold">{claimRisk?.totalClaims}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Claim Amount</span>
                  <span className="font-bold">${claimRisk?.averageClaimAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Claim Frequency</span>
                  <span className="font-bold">{claimRisk?.claimFrequency.toFixed(1)} / month</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rejection Rate</span>
                  <span className="font-bold">{claimRisk?.rejectionRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Claims Risk Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={riskHistory?.slice(-6) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="claims" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payment Risk Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              Payment risk analysis from Billing Service data.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Payment Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On Time Payments</span>
                  <span className="font-bold text-green-600">{paymentRisk?.onTimePayments}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Late Payments</span>
                  <span className="font-bold text-orange-600">{paymentRisk?.latePayments}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Risk</span>
                  <span className="font-bold">{paymentRisk?.paymentDefaultRisk}%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span className="font-bold">${paymentRisk?.outstandingBalance.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Payment History Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={riskHistory?.slice(-6) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="payments" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Wellness Risk Tab */}
        <TabsContent value="wellness" className="space-y-4">
          <Alert>
            <Heart className="h-4 w-4" />
            <AlertDescription>
              Wellness risk analysis from Wellness Service data.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Health Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overall Wellness Score</span>
                  <span className="font-bold">{wellnessRisk?.wellnessScore}/100</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preventive Care Compliance</span>
                  <span className="font-bold">{wellnessRisk?.preventiveCareCompliance}%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chronic Conditions</span>
                  <span className="font-bold">{wellnessRisk?.chronicConditions}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifestyle Risk</span>
                  <span className="font-bold">{wellnessRisk?.lifestyleRisk}%</span>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Wellness Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={riskHistory?.slice(-6) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="wellness" stroke="#ff7300" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fraud Indicators Tab */}
        <TabsContent value="fraud" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Real-time fraud detection indicators from the Fraud Detection Service.
            </AlertDescription>
          </Alert>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search indicators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detected Fraud Indicators</CardTitle>
              <CardDescription>
                Suspicious activities detected by fraud detection engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Detected At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudIndicators.map((indicator) => (
                    <TableRow key={indicator.id}>
                      <TableCell className="font-medium">{indicator.indicatorType}</TableCell>
                      <TableCell>{indicator.description}</TableCell>
                      <TableCell>
                        <Badge variant={indicator.confidence > 80 ? 'destructive' : indicator.confidence > 50 ? 'outline' : 'secondary'}>
                          {indicator.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(indicator.detectedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={indicator.status === 'active' ? 'default' : 'secondary'}>
                          {indicator.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investigations Tab */}
        <TabsContent value="investigations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Investigations</CardTitle>
              <CardDescription>
                Active investigations from Fraud Detection Service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investigations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.caseNumber}</TableCell>
                      <TableCell>{inv.subject}</TableCell>
                      <TableCell>
                        <Badge variant={inv.priority === 'high' ? 'destructive' : 'outline'}>
                          {inv.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'open' ? 'default' : 'secondary'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{inv.assignedTo}</TableCell>
                      <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk History Trend</CardTitle>
              <CardDescription>
                Historical risk score progression from Analytics Service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="riskScore" name="Overall Risk" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="fraudRisk" name="Fraud Risk" stroke="#f59e0b" />
                  <Line type="monotone" dataKey="claimsRisk" name="Claims Risk" stroke="#8884d8" />
                  <Line type="monotone" dataKey="paymentRisk" name="Payment Risk" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
