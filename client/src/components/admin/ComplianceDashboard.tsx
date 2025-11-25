import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Search,
  Download,
  Eye,
  Settings,
  Lock,
  Database,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for demonstration (in real app, this would come from API)
const complianceMetrics = {
  dataPrivacy: {
    score: 94,
    trends: [
      { month: 'Jan', score: 88 },
      { month: 'Feb', score: 91 },
      { month: 'Mar', score: 89 },
      { month: 'Apr', score: 93 },
      { month: 'May', score: 94 },
      { month: 'Jun', score: 94 }
    ],
    issues: [
      { type: 'expired-consent', count: 12, severity: 'medium' },
      { type: 'missing-consent', count: 3, severity: 'high' },
      { type: 'data-retention', count: 5, severity: 'low' }
    ]
  },
  audit: {
    totalLogs: 125634,
    suspiciousActivity: 23,
    failedLogins: 145,
    dataAccess: 8923
  },
  consentManagement: {
    totalConsents: 4567,
    activeConsents: 4234,
    expiredConsents: 145,
    pendingRenewal: 188,
    consentTypes: [
      { name: 'Data Processing', granted: 4234, denied: 45 },
      { name: 'Marketing Communications', granted: 2345, denied: 456 },
      { name: 'Data Sharing (Providers)', granted: 3890, denied: 234 },
      { name: 'Data Sharing (Partners)', granted: 1234, denied: 890 },
      { name: 'Wellness Programs', granted: 3456, denied: 567 }
    ]
  }
};

const recentAuditLogs = [
  {
    id: 1,
    timestamp: '2024-06-15T14:23:45Z',
    user: 'john.doe@company.com',
    action: 'VIEW_MEMBER',
    entity: 'Member',
    entityId: 12345,
    details: 'Viewed member profile and coverage details',
    ipAddress: '192.168.1.100',
    riskLevel: 'low'
  },
  {
    id: 2,
    timestamp: '2024-06-15T13:45:12Z',
    user: 'admin@system.com',
    action: 'DELETE_DOCUMENT',
    entity: 'Document',
    entityId: 67890,
    details: 'Deleted expired member document',
    ipAddress: '10.0.0.1',
    riskLevel: 'medium'
  },
  {
    id: 3,
    timestamp: '2024-06-15T12:30:00Z',
    user: 'suspicious@unknown.com',
    action: 'LOGIN_FAILED',
    entity: 'User',
    entityId: 999,
    details: 'Multiple failed login attempts',
    ipAddress: '185.220.101.182',
    riskLevel: 'high'
  }
];

const securityAlerts = [
  {
    id: 1,
    type: 'suspicious_access',
    title: 'Unusual Data Access Pattern Detected',
    description: 'User accessed 50 member records within 2 minutes',
    severity: 'high',
    timestamp: '2024-06-15T14:23:00Z',
    status: 'investigating'
  },
  {
    id: 2,
    type: 'consent_expiry',
    title: 'Bulk Consent Expiring Soon',
    description: '188 member consents will expire in the next 30 days',
    severity: 'medium',
    timestamp: '2024-06-15T13:45:00Z',
    status: 'pending'
  },
  {
    id: 3,
    type: 'data_retention',
    title: 'Data Retention Policy Violation',
    description: '245 documents exceed retention period',
    severity: 'low',
    timestamp: '2024-06-15T12:30:00Z',
    status: 'resolved'
  }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ComplianceDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("all");

  // Mock API queries (in real app, these would fetch actual data)
  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['/api/audit-logs'],
    enabled: false // Disabled for demo
  });

  const { data: complianceScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['/api/compliance/score'],
    enabled: false // Disabled for demo
  });

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor regulatory compliance and data security</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceMetrics.dataPrivacy.score}%</div>
            <p className="text-xs text-green-600">
              +3% from last month
            </p>
            <Progress value={complianceMetrics.dataPrivacy.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceMetrics.audit.suspiciousActivity}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceMetrics.consentManagement.activeConsents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {complianceMetrics.consentManagement.expiredConsents} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Access Events</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceMetrics.audit.dataAccess.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Security Alerts
          </CardTitle>
          <CardDescription>
            Active security incidents and compliance issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityAlerts.map((alert) => (
              <Alert key={alert.id} className="border-l-4 border-l-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.title}</span>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <p>{alert.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        {alert.status === 'resolved' ? 'Reopened' : 'Resolve'}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="consents">Consent Management</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Score Trend</CardTitle>
                <CardDescription>
                  Monthly compliance performance over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={complianceMetrics.dataPrivacy.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Consent Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Consent Distribution</CardTitle>
                <CardDescription>
                  Breakdown of consent types and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={complianceMetrics.consentManagement.consentTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, granted }) => `${name}: ${granted}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="granted"
                    >
                      {complianceMetrics.consentManagement.consentTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Data Privacy Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Data Privacy Issues</CardTitle>
                <CardDescription>
                  Outstanding compliance issues requiring resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceMetrics.dataPrivacy.issues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">
                          {issue.type.replace('-', ' ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {issue.count} items affected
                        </p>
                      </div>
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Compliance Activity</CardTitle>
                <CardDescription>
                  Latest compliance-related events and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">GDPR audit completed successfully</p>
                      <p className="text-xs text-gray-600">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Data encryption updated across systems</p>
                      <p className="text-xs text-gray-600">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New compliance policy published</p>
                      <p className="text-xs text-gray-600">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail Logs</CardTitle>
              <CardDescription>
                Complete audit trail of all system activities and data access
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search audit logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="90d">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAuditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell>{log.entity} #{log.entityId}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details}
                      </TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        <Badge className={getRiskLevelColor(log.riskLevel)}>
                          {log.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent Management Tab */}
        <TabsContent value="consents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Consent Status Overview</CardTitle>
                <CardDescription>
                  Summary of all member consents across different types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceMetrics.consentManagement.consentTypes.map((consent, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{consent.name}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">{consent.granted} granted</span>
                          <span className="text-red-600">{consent.denied} denied</span>
                        </div>
                      </div>
                      <Progress
                        value={(consent.granted / (consent.granted + consent.denied)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expiring Consents</CardTitle>
                <CardDescription>
                  Consents that require renewal in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Marketing Communications</p>
                        <p className="text-sm text-gray-600">145 consents expiring</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Send Renewals
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Data Sharing (Partners)</p>
                        <p className="text-sm text-gray-600">43 consents expiring</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Send Renewals
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GDPR Compliance Report
                </CardTitle>
                <CardDescription>
                  Comprehensive GDPR compliance assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Last generated:</span>
                    <span>2 days ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Data Access Report
                </CardTitle>
                <CardDescription>
                  Log of all data access activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Last generated:</span>
                    <span>1 day ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Records:</span>
                    <span>8,923 entries</span>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Audit Report
                </CardTitle>
                <CardDescription>
                  Security incident and vulnerability assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Last generated:</span>
                    <span>3 days ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Findings:</span>
                    <span>3 low priority</span>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}