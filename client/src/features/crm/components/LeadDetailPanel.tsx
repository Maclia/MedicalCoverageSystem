import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  Building,
  Calendar,
  User,
  Clock,
  MessageSquare,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface LeadDetail {
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
}

interface Activity {
  id: string;
  activityType: string;
  subject: string;
  description?: string;
  outcome?: string;
  nextStep?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  agentName?: string;
}

interface Opportunity {
  id: string;
  opportunityName: string;
  stage: string;
  estimatedValue?: number;
  actualValue?: number;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  createdAt: string;
}

const activityTypeIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: User,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  note: FileText,
  task: CheckCircle,
  demo: TrendingUp,
  proposal: FileText
};

const stageColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800",
  qualified: "bg-blue-100 text-blue-800",
  quotation: "bg-yellow-100 text-yellow-800",
  underwriting: "bg-purple-100 text-purple-800",
  issuance: "bg-green-100 text-green-800",
  closed_won: "bg-emerald-100 text-emerald-800",
  closed_lost: "bg-red-100 text-red-800"
};

interface LeadDetailPanelProps {
  leadId: string;
  onClose?: () => void;
}

export default function LeadDetailPanel({ leadId, onClose }: LeadDetailPanelProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activityType: "note",
    subject: "",
    description: "",
    outcome: "",
    nextStep: "",
    nextFollowUpDate: ""
  });
  const [editedLead, setEditedLead] = useState<Partial<LeadDetail>>({});

  const queryClient = useQueryClient();

  // Fetch lead details
  const { data: leadData, isLoading, error } = useQuery({
    queryKey: ['/api/crm/leads', leadId],
    queryFn: async () => {
      const response = await fetch(`/api/crm/leads/${leadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead details');
      }
      return response.json();
    }
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async (leadData: Partial<LeadDetail>) => {
      const response = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (!response.ok) {
        throw new Error('Failed to update lead');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads', leadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsEditDialogOpen(false);
      setEditedLead({});
    }
  });

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityData,
          leadId,
          agentId: 1 // Would get from auth context
        })
      });
      if (!response.ok) {
        throw new Error('Failed to log activity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads', leadId] });
      setIsActivityDialogOpen(false);
      setNewActivity({
        activityType: "note",
        subject: "",
        description: "",
        outcome: "",
        nextStep: "",
        nextFollowUpDate: ""
      });
    }
  });

  // Convert lead mutation
  const convertLeadMutation = useMutation({
    mutationFn: async (memberData: any) => {
      const response = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberData })
      });
      if (!response.ok) {
        throw new Error('Failed to convert lead');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads', leadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
    }
  });

  const handleUpdateLead = () => {
    updateLeadMutation.mutate(editedLead);
  };

  const handleLogActivity = () => {
    logActivityMutation.mutate(newActivity);
  };

  const handleConvertLead = (memberData: any) => {
    convertLeadMutation.mutate(memberData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KES', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading lead details...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading lead details: {(error as Error).message}</div>;
  }

  const lead = leadData?.data;
  const activities = lead?.activities || [];
  const opportunities = lead?.opportunities || [];
  const convertedMember = lead?.convertedMember;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead?.firstName} {lead?.lastName}
          </h1>
          <div className="flex items-center space-x-2 mt-1">
            <Badge className={stageColors[lead?.leadStatus || '']}>
              {lead?.leadStatus?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {lead?.priority} priority
            </Badge>
            {lead?.leadScore && (
              <Badge variant="secondary">
                Score: {lead.leadScore}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setEditedLead(lead || {})}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editedLead.firstName}
                      onChange={(e) => setEditedLead({ ...editedLead, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editedLead.lastName}
                      onChange={(e) => setEditedLead({ ...editedLead, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedLead.email}
                    onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editedLead.phone}
                    onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={editedLead.companyName}
                    onChange={(e) => setEditedLead({ ...editedLead, companyName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editedLead.leadStatus} onValueChange={(value) => setEditedLead({ ...editedLead, leadStatus: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="nurturing">Nurturing</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={editedLead.priority} onValueChange={(value) => setEditedLead({ ...editedLead, priority: value })}>
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
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateLead} disabled={updateLeadMutation.isPending}>
                  {updateLeadMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Activity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="activityType">Activity Type</Label>
                  <Select value={newActivity.activityType} onValueChange={(value) => setNewActivity({ ...newActivity, activityType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={newActivity.subject}
                    onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                    placeholder="Activity subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Activity details..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Input
                    id="outcome"
                    value={newActivity.outcome}
                    onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                    placeholder="Activity outcome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextStep">Next Step</Label>
                  <Input
                    id="nextStep"
                    value={newActivity.nextStep}
                    onChange={(e) => setNewActivity({ ...newActivity, nextStep: e.target.value })}
                    placeholder="Next step"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
                  <Input
                    id="nextFollowUpDate"
                    type="datetime-local"
                    value={newActivity.nextFollowUpDate}
                    onChange={(e) => setNewActivity({ ...newActivity, nextFollowUpDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogActivity} disabled={logActivityMutation.isPending}>
                  {logActivityMutation.isPending ? 'Logging...' : 'Log Activity'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {lead?.leadStatus !== 'converted' && (
            <Button
              onClick={() => handleConvertLead({
                dateOfBirth: "",
                employeeId: "",
                companyId: 1
              })}
              disabled={convertLeadMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Convert to Member
            </Button>
          )}
        </div>
      </div>

      {/* Lead Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">{lead?.firstName} {lead?.lastName}</div>
                {lead?.memberType && (
                  <div className="text-sm text-gray-500">Member Type: {lead.memberType}</div>
                )}
              </div>
            </div>
            {lead?.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead?.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead?.companyName && (
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <span>{lead.companyName}</span>
              </div>
            )}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500 space-y-1">
                <div>Source: {lead?.leadSource?.replace('_', ' ')}</div>
                <div>Lead Score: {lead?.leadScore}</div>
                <div>Assigned: {lead?.agentName || 'Unassigned'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Estimated Coverage</span>
              <span className="font-medium">
                {lead?.estimatedCoverage ? formatCurrency(lead.estimatedCoverage) : 'Not specified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Estimated Premium</span>
              <span className="font-medium">
                {lead?.estimatedPremium ? formatCurrency(lead.estimatedPremium) : 'Not specified'}
              </span>
            </div>
            {lead?.schemeInterest && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Scheme Interest</span>
                <span className="font-medium">{lead.schemeInterest}</span>
              </div>
            )}
            {convertedMember && (
              <div className="pt-4 border-t">
                <div className="text-sm text-green-600 space-y-1">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Converted to Member
                  </div>
                  <div>Member ID: {convertedMember.id}</div>
                  <div>Status: {convertedMember.membershipStatus}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Information */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div>{lead?.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : ''}</div>
                </div>
              </div>
              {lead?.firstContactDate && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm text-gray-500">First Contact</div>
                    <div>{format(new Date(lead.firstContactDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
              )}
              {lead?.lastContactDate && (
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-sm text-gray-500">Last Contact</div>
                    <div>{format(new Date(lead.lastContactDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
              )}
              {lead?.nextFollowUpDate && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm text-gray-500">Next Follow-up</div>
                    <div>{format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
              )}
              {lead?.conversionDate && (
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-500">Conversion Date</div>
                    <div>{format(new Date(lead.conversionDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Opportunities and Activities */}
      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle>Sales Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No opportunities yet</div>
                  <div className="text-xs mt-1">Create an opportunity to track this lead through your sales pipeline</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opportunity: Opportunity) => (
                    <div key={opportunity.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{opportunity.opportunityName}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={stageColors[opportunity.stage]}>
                              {opportunity.stage.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">{opportunity.probability}% probability</Badge>
                          </div>
                          <div className="mt-2 space-y-1 text-sm">
                            {opportunity.estimatedValue && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-4 h-4 mr-1" />
                                Estimated: {formatCurrency(opportunity.estimatedValue)}
                              </div>
                            )}
                            {opportunity.expectedCloseDate && (
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-1" />
                                Expected Close: {format(new Date(opportunity.expectedCloseDate), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-xs text-gray-500">
                            Created {format(new Date(opportunity.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No activities yet</div>
                  <div className="text-xs mt-1">Log your first activity to start tracking interactions</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity: Activity, index: number) => {
                    const IconComponent = activityTypeIcons[activity.activityType] || FileText;
                    return (
                      <div key={activity.id} className="flex space-x-3">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                          </div>
                          {index < activities.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{activity.subject}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="capitalize">
                                    {activity.activityType.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    by {activity.agentName}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(activity.createdAt), 'MMM d, yyyy HH:mm')}
                                  </span>
                                </div>
                                {activity.description && (
                                  <p className="mt-2 text-sm text-gray-600">{activity.description}</p>
                                )}
                                {activity.outcome && (
                                  <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                                    <strong>Outcome:</strong> {activity.outcome}
                                  </div>
                                )}
                                {activity.nextStep && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                    <strong>Next Step:</strong> {activity.nextStep}
                                  </div>
                                )}
                                {activity.nextFollowUpDate && (
                                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Follow-up: {format(new Date(activity.nextFollowUpDate), 'MMM d, yyyy HH:mm')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}