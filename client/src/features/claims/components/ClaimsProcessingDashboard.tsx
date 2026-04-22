import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Settings,
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  Eye,
  Bell,
  Search,
  Filter
} from 'lucide-react';
import { claimsApi, workflowApi, batchApi, analyticsApi, baseClaimsApi } from '@/services/claimsApi';

interface Claim {
  id: number;
  memberId: number;
  memberName?: string;
  institutionId: number;
  institutionName?: string;
  benefitId: number;
  amount: number;
  status: string;
  submissionDate: string;
  serviceDate?: string;
  processedDate?: string;
  fraudRiskLevel?: string;
}

interface Workflow {
  workflowId: string;
  claimId: number;
  workflowType: string;
  status: string;
  priority: string;
  startTime: string;
  estimatedCompletionTime?: string;
  currentStep?: string;
  completedSteps: number;
  totalSteps: number;
}

interface BatchJob {
  batchId: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: {
    totalClaims: number;
    completedClaims: number;
    failedClaims: number;
    pendingClaims: number;
    progressPercentage: number;
  };
}

interface AnalyticsData {
  volume: {
    totalClaims: number;
    processedClaims: number;
    approvedClaims: number;
    deniedClaims: number;
    pendingClaims: number;
  };
  financial: {
    totalBilledAmount: number;
    totalApprovedAmount: number;
    averageClaimAmount: number;
    approvalRate: number;
  };
  processing: {
    averageProcessingTime: number;
    claimsProcessedPerDay: number;
    backlogCount: number;
    processingEfficiency: number;
  };
  quality: {
    averageQualityScore: number;
    fraudDetectionCount: number;
    auditRequiredCount: number;
  };
}

export const ClaimsProcessingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load claims data
      const claimsResponse = await baseClaimsApi.getClaims();
      if (claimsResponse.success) {
        setClaims(claimsResponse.data);
      }

      // Load active workflows
      const workflowsResponse = await workflowApi.getActiveWorkflows();
      if (workflowsResponse.success) {
        setWorkflows(workflowsResponse.data.activeWorkflows || []);
      }

      // Load batch jobs
      const batchResponse = await batchApi.getBatchJobs();
      if (batchResponse.success) {
        setBatchJobs(batchResponse.data.batchJobs || []);
      }

      // Load analytics
      const analyticsResponse = await analyticsApi.getPerformanceDashboard();
      if (analyticsResponse.success) {
        // Transform the data as needed
        setAnalytics(analyticsResponse.data.dashboard);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle claim processing
  const handleProcessClaim = async (claimId: number, workflowType: string = 'standard') => {
    try {
      await claimsApi.processClaimWorkflow(claimId, { workflowType });
      loadDashboardData(); // Refresh data
    } catch (err) {
      setError('Failed to process claim');
      console.error('Claim processing error:', err);
    }
  };

  // Handle batch job actions
  const handleBatchJobAction = async (batchId: string, action: 'start' | 'pause' | 'cancel') => {
    try {
      switch (action) {
        case 'start':
          await batchApi.startBatchJob(batchId);
          break;
        case 'pause':
          await batchApi.pauseBatchJob(batchId);
          break;
        case 'cancel':
          await batchApi.cancelBatchJob(batchId);
          break;
      }
      loadDashboardData();
    } catch (err) {
      setError(`Failed to ${action} batch job`);
      console.error(`Batch job ${action} error:`, err);
    }
  };

  // Filter claims
  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
      case 'denied':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
      case 'pending':
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
      case 'processing':
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims Processing</h1>
          <p className="text-gray-600">Manage and monitor claims processing workflows</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                New Batch Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Batch Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Batch job name" />
                <Input placeholder="Description" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Processing</SelectItem>
                    <SelectItem value="high_priority">High Priority Claims</SelectItem>
                    <SelectItem value="bulk">Bulk Processing</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full">Create Batch Job</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Claims</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.volume.totalClaims}</p>
                  <p className="text-sm text-gray-500">This period</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.financial.approvalRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Success rate</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Processing Time</p>
                  <p className="text-2xl font-bold text-gray-900">{(analytics.processing.averageProcessingTime / 60000).toFixed(1)}m</p>
                  <p className="text-sm text-gray-500">Minutes per claim</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Backlog</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.processing.backlogCount}</p>
                  <p className="text-sm text-gray-500">Pending claims</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="batch">Batch Jobs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Active Workflows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Active Workflows</span>
                </CardTitle>
                <CardDescription>Currently running claim processing workflows</CardDescription>
              </CardHeader>
              <CardContent>
                {workflows.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active workflows
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflows.map((workflow) => (
                      <div key={workflow.workflowId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">Claim #{workflow.claimId}</span>
                            {getPriorityBadge(workflow.priority)}
                            {getStatusBadge(workflow.status)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {workflow.currentStep} • {workflow.completedSteps}/{workflow.totalSteps} steps
                          </div>
                          <Progress
                            value={(workflow.completedSteps / workflow.totalSteps) * 100}
                            className="mt-2"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Started: {new Date(workflow.startTime).toLocaleTimeString()}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => workflowApi.cancelWorkflow(workflow.workflowId)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Batch Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Recent Batch Jobs</span>
                </CardTitle>
                <CardDescription>Latest batch processing operations</CardDescription>
              </CardHeader>
              <CardContent>
                {batchJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No batch jobs found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batchJobs.slice(0, 5).map((batch) => (
                      <div key={batch.batchId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{batch.name}</span>
                            {getPriorityBadge(batch.priority)}
                            {getStatusBadge(batch.status)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {batch.description}
                          </div>
                          <Progress value={batch.progress.progressPercentage} className="mt-2" />
                          <div className="text-xs text-gray-500 mt-1">
                            {batch.progress.completedClaims}/{batch.progress.totalClaims} claims processed
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {batch.progress.progressPercentage.toFixed(1)}% complete
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claims Management</CardTitle>
              <CardDescription>Process and manage individual claims</CardDescription>
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search claims..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">#{claim.id}</TableCell>
                      <TableCell>{claim.memberName || `Member ${claim.memberId}`}</TableCell>
                      <TableCell>${claim.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>{new Date(claim.submissionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {claim.fraudRiskLevel && getPriorityBadge(claim.fraudRiskLevel)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessClaim(claim.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Process
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedClaim(claim)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Claim Details - #{claim.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-gray-600">Member</p>
                                    <p className="font-medium">{claim.memberName || `Member ${claim.memberId}`}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Amount</p>
                                    <p className="font-medium">${claim.amount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <div>{getStatusBadge(claim.status)}</div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Risk Level</p>
                                    <div>{claim.fraudRiskLevel ? getPriorityBadge(claim.fraudRiskLevel) : 'N/A'}</div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button onClick={() => handleProcessClaim(claim.id, 'standard')}>
                                    Process Standard
                                  </Button>
                                  <Button onClick={() => handleProcessClaim(claim.id, 'expedited')} variant="outline">
                                    Process Expedited
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Management</CardTitle>
              <CardDescription>Monitor and manage claim processing workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow ID</TableHead>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow) => (
                    <TableRow key={workflow.workflowId}>
                      <TableCell className="font-medium">{workflow.workflowId}</TableCell>
                      <TableCell>#{workflow.claimId}</TableCell>
                      <TableCell>{workflow.workflowType}</TableCell>
                      <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                      <TableCell>{getPriorityBadge(workflow.priority)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress
                            value={(workflow.completedSteps / workflow.totalSteps) * 100}
                            className="w-20"
                          />
                          <div className="text-xs text-gray-500">
                            {workflow.completedSteps}/{workflow.totalSteps}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(workflow.startTime).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => workflowApi.cancelWorkflow(workflow.workflowId)}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing</CardTitle>
              <CardDescription>Manage batch claim processing jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchJobs.map((batch) => (
                    <TableRow key={batch.batchId}>
                      <TableCell className="font-medium">{batch.batchId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{batch.name}</div>
                          <div className="text-sm text-gray-500">{batch.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>{getPriorityBadge(batch.priority)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={batch.progress.progressPercentage} className="w-20" />
                          <div className="text-xs text-gray-500">
                            {batch.progress.completedClaims}/{batch.progress.totalClaims}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(batch.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {batch.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBatchJobAction(batch.batchId, 'start')}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {batch.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBatchJobAction(batch.batchId, 'pause')}
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBatchJobAction(batch.batchId, 'cancel')}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Cancel
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

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Processing Efficiency</span>
                        <span className="text-sm font-medium">{analytics.processing.processingEfficiency.toFixed(1)}%</span>
                      </div>
                      <Progress value={analytics.processing.processingEfficiency} />

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Quality Score</span>
                        <span className="text-sm font-medium">{analytics.quality.averageQualityScore.toFixed(1)}/100</span>
                      </div>
                      <Progress value={analytics.quality.averageQualityScore} />

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Claims Per Day</span>
                        <span className="text-sm font-medium">{analytics.processing.claimsProcessedPerDay}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Billed</span>
                        <span className="text-sm font-medium">${analytics.financial.totalBilledAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Approved</span>
                        <span className="text-sm font-medium text-green-600">${analytics.financial.totalApprovedAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Claim</span>
                        <span className="text-sm font-medium">${analytics.financial.averageClaimAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Fraud Detections</span>
                        <span className="text-sm font-medium text-red-600">{analytics.quality.fraudDetectionCount}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Reports</span>
                </CardTitle>
                <CardDescription>Generate and download detailed reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-6 w-6" />
                    <span>Claims Report</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <BarChart3 className="h-6 w-6" />
                    <span>Analytics</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <DollarSign className="h-6 w-6" />
                    <span>MLR Report</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <Activity className="h-6 w-6" />
                    <span>Performance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};