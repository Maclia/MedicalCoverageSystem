import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  Eye,
  Database,
  Activity,
  FileText,
} from "lucide-react";
import { useAdminDashboardSummary, useAdminDocumentQueue, useAdminServicesHealth } from "./adminApi";

export default function ComplianceDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: summary, isLoading: isLoadingSummary } = useAdminDashboardSummary();
  const { data: servicesHealth, isLoading: isLoadingServices } = useAdminServicesHealth();
  const { data: documentQueue, isLoading: isLoadingDocuments } = useAdminDocumentQueue({
    status: selectedStatus,
    search: searchTerm,
    documentType: "all",
    priority: "all",
  });

  const healthyServices = servicesHealth?.filter((service) => service.healthy && !service.circuitBreakerOpen) ?? [];
  const serviceComplianceScore = servicesHealth?.length ? (healthyServices.length / servicesHealth.length) * 100 : 0;
  const documentComplianceScore = summary
    ? Math.max(0, 100 - (summary.quickStats.pendingDocuments * 5 + summary.documentSummary.needsMoreInfo * 3))
    : 0;
  const overallScore = Math.round((serviceComplianceScore + documentComplianceScore) / 2);

  const alerts = useMemo(() => {
    const items = [];

    if ((summary?.quickStats.pendingDocuments ?? 0) > 0) {
      items.push({
        id: "pending-documents",
        severity: "medium",
        title: "Pending document reviews",
        description: `${summary?.quickStats.pendingDocuments ?? 0} documents still need admin action.`,
      });
    }

    if ((summary?.documentSummary.needsMoreInfo ?? 0) > 0) {
      items.push({
        id: "needs-info",
        severity: "high",
        title: "Members waiting on document clarification",
        description: `${summary?.documentSummary.needsMoreInfo ?? 0} submissions need additional information from members.`,
      });
    }

    if ((servicesHealth?.length ?? 0) > healthyServices.length) {
      items.push({
        id: "service-health",
        severity: "high",
        title: "One or more services need attention",
        description: `${(servicesHealth?.length ?? 0) - healthyServices.length} service checks are degraded or circuit-broken.`,
      });
    }

    return items;
  }, [healthyServices.length, servicesHealth, summary]);

  const activityRows = summary?.recentActivity ?? [];
  const documents = documentQueue?.documents ?? [];

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor persisted admin activity, review queues, and service health</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Snapshot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore}%</div>
            <p className="text-xs text-muted-foreground">Derived from service health and review backlog</p>
            <Progress value={overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.quickStats.pendingDocuments ?? 0}</div>
            <p className="text-xs text-muted-foreground">Persisted membership documents awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Services</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyServices.length}</div>
            <p className="text-xs text-muted-foreground">of {servicesHealth?.length ?? 0} monitored services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Documents</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.documentSummary.processed ?? 0}</div>
            <p className="text-xs text-muted-foreground">Approved or rejected in persisted storage</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Active Alerts
          </CardTitle>
          <CardDescription>Issues derived from persisted backlog and live service health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Alert key={alert.id} className="border-l-4 border-l-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.title}</span>
                  <Badge className={severityBadge(alert.severity)}>{alert.severity}</Badge>
                </AlertTitle>
                <AlertDescription className="mt-2">{alert.description}</AlertDescription>
              </Alert>
            ))}
            {!isLoadingSummary && alerts.length === 0 && (
              <p className="text-sm text-gray-500">No compliance alerts are currently derived from the live admin data.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit-trail">Activity</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Activity Coverage</CardTitle>
                <CardDescription>Recent persisted events surfaced for compliance review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityRows.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Queue Health</CardTitle>
                <CardDescription>Current admin remediation posture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Review</span>
                    <span className="text-sm font-medium">{documentQueue?.stats.pending ?? 0}</span>
                  </div>
                  <Progress value={Math.min((documentQueue?.stats.pending ?? 0) * 10, 100)} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Needs More Info</span>
                    <span className="text-sm font-medium">{documentQueue?.stats.needsMoreInfo ?? 0}</span>
                  </div>
                  <Progress value={Math.min((documentQueue?.stats.needsMoreInfo ?? 0) * 10, 100)} />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Review Time</span>
                    <span className="text-sm font-medium">{documentQueue?.stats.avgReviewTime ?? 0}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persisted Admin Activity</CardTitle>
              <CardDescription>Recent member, document, and communication events from backend data</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.type}</code>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Compliance Queue</CardTitle>
              <CardDescription>Persisted review queue filtered directly from membership documents</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="needs_more_info">Needs More Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="h-40 animate-pulse rounded bg-gray-100" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>{document.memberName}</TableCell>
                        <TableCell>{document.documentType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{document.reviewStatus.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>{document.priority}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>Live status from the API gateway service registry</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <div className="h-40 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className="space-y-3">
                  {(servicesHealth ?? []).map((service) => (
                    <div key={service.name} className="flex justify-between items-center border rounded-lg p-3">
                      <div>
                        <p className="font-medium capitalize">{service.name}</p>
                        <p className="text-sm text-gray-500">{service.responseTime}ms response time</p>
                      </div>
                      <Badge className={service.healthy && !service.circuitBreakerOpen ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {service.healthy && !service.circuitBreakerOpen ? "Healthy" : "Attention"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Document review status is now persisted through membership-service admin routes instead of local-only mock state.</p>
                <p>Dashboard activity and risk cues come from backend member, document, and communication records plus gateway service health.</p>
                <p>Further compliance depth can be added by introducing dedicated audit-log and consent analytics endpoints behind the same admin API layer.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
