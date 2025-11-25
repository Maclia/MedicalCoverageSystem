import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter, MoreHorizontal, User, Mail, Phone, Building, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  leadSource: string;
  leadStatus: string;
  priority: string;
  leadScore: number;
  memberType?: string;
  schemeInterest?: string;
  estimatedCoverage?: number;
  estimatedPremium?: number;
  assignedAgentId?: number;
  firstContactDate?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  conversionDate?: string;
  createdAt: string;
  updatedAt: string;
  agentName?: string;
  opportunitiesCount: number;
  activitiesCount: number;
}

interface NewLead {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  leadSource: string;
  priority: string;
  memberType?: string;
  schemeInterest?: string;
  estimatedCoverage?: number;
  estimatedPremium?: number;
  assignedAgentId?: number;
  notes?: string;
}

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  nurturing: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
  duplicate: "bg-gray-100 text-gray-800"
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function LeadManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState<NewLead>({
    firstName: "",
    lastName: "",
    email: "",
    leadSource: "website",
    priority: "medium"
  });

  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ['/api/crm/leads', currentPage, statusFilter, priorityFilter, sourceFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(priorityFilter !== "all" && { priority: priorityFilter }),
        ...(sourceFilter !== "all" && { source: sourceFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/crm/leads?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    }
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: NewLead) => {
      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (!response.ok) {
        throw new Error('Failed to create lead');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsCreateDialogOpen(false);
      setNewLead({ firstName: "", lastName: "", email: "", leadSource: "website", priority: "medium" });
    }
  });

  const filteredLeads = useMemo(() => {
    return leadsData?.data || [];
  }, [leadsData]);

  const handleCreateLead = () => {
    createLeadMutation.mutate(newLead);
  };

  const handleAssignLead = async (leadId: string, agentId: number) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      }
    } catch (error) {
      console.error('Failed to assign lead:', error);
    }
  };

  const handleConvertLead = async (leadId: string, memberData: any) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberData })
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      }
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading leads...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading leads: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600">Manage and track your sales leads</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newLead.firstName}
                  onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newLead.lastName}
                  onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+254 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newLead.companyName}
                  onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Select value={newLead.leadSource} onValueChange={(value) => setNewLead({ ...newLead, leadSource: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="email_marketing">Email Marketing</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newLead.priority} onValueChange={(value) => setNewLead({ ...newLead, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberType">Member Type</Label>
                <Select value={newLead.memberType} onValueChange={(value) => setNewLead({ ...newLead, memberType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="dependent">Dependent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCoverage">Estimated Coverage</Label>
                <Input
                  id="estimatedCoverage"
                  type="number"
                  value={newLead.estimatedCoverage}
                  onChange={(e) => setNewLead({ ...newLead, estimatedCoverage: parseInt(e.target.value) })}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedPremium">Estimated Premium</Label>
                <Input
                  id="estimatedPremium"
                  type="number"
                  value={newLead.estimatedPremium}
                  onChange={(e) => setNewLead({ ...newLead, estimatedPremium: parseInt(e.target.value) })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Additional notes about this lead..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLead} disabled={createLeadMutation.isPending}>
                {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="nurturing">Nurturing</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="cold_call">Cold Call</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead: Lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </div>
                        {lead.companyName && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Building className="w-3 h-3 mr-1" />
                            {lead.companyName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="text-sm flex items-center text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="text-sm flex items-center text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 capitalize">
                        {lead.leadSource.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={leadStatusColors[lead.leadStatus]}>
                        {lead.leadStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[lead.priority]}>
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {lead.leadScore}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.agentName ? (
                        <div className="text-sm text-gray-600 flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {lead.agentName}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="text-gray-600">
                          {lead.activitiesCount} activities
                        </div>
                        {lead.opportunitiesCount > 0 && (
                          <div className="text-blue-600">
                            {lead.opportunitiesCount} opportunities
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                          <DropdownMenuItem>Log Activity</DropdownMenuItem>
                          <DropdownMenuItem>Assign Agent</DropdownMenuItem>
                          {lead.leadStatus !== 'converted' && (
                            <DropdownMenuItem>Convert to Member</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {leadsData?.pagination && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, filteredLeads.length)} of {filteredLeads.length} leads
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {leadsData.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= leadsData.pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}