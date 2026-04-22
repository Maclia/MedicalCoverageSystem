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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import {
  MessageSquare,
  Send,
  Mail,
  Phone,
  Smartphone,
  Users,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Calendar,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipStatus: 'active' | 'suspended' | 'pending' | 'terminated' | 'expired';
}

interface Company {
  id: number;
  name: string;
}

interface CommunicationLog {
  id: number;
  memberId?: number;
  companyId?: number;
  communicationType: 'enrollment_confirmation' | 'renewal_notification' | 'card_generation' | 'pre_auth_update' | 'limit_reminder' | 'payment_due' | 'suspension_notice' | 'termination_notice';
  channel: 'sms' | 'email' | 'mobile_app' | 'postal' | 'provider_notification';
  recipient: string;
  subject?: string;
  content: string;
  sentAt: string;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  errorMessage?: string;
}

interface NotificationTemplate {
  id: number;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
}

interface ComposeNotification {
  recipientType: 'member' | 'company' | 'bulk';
  recipientIds: number[];
  companyId?: number;
  communicationType: string;
  channel: 'email' | 'sms' | 'mobile_app' | 'all';
  subject?: string;
  content: string;
  scheduledDate?: string;
  saveAsTemplate: boolean;
  templateName?: string;
}

interface CommunicationsCenterProps {
  memberId?: number;
  companyId?: number;
}

const communicationTypeConfig = {
  enrollment_confirmation: {
    label: 'Enrollment Confirmation',
    icon: CheckCircle,
    color: 'default' as const,
    description: 'New member enrollment confirmation',
  },
  renewal_notification: {
    label: 'Renewal Notification',
    icon: Calendar,
    color: 'secondary' as const,
    description: 'Membership renewal reminder',
  },
  card_generation: {
    label: 'Card Generation',
    icon: CreditCard,
    color: 'default' as const,
    description: 'Insurance card generated',
  },
  pre_auth_update: {
    label: 'Pre-auth Update',
    icon: FileText,
    color: 'outline' as const,
    description: 'Pre-authorization status update',
  },
  limit_reminder: {
    label: 'Limit Reminder',
    icon: AlertTriangle,
    color: 'secondary' as const,
    description: 'Benefits limit usage reminder',
  },
  payment_due: {
    label: 'Payment Due',
    icon: Bell,
    color: 'destructive' as const,
    description: 'Premium payment reminder',
  },
  suspension_notice: {
    label: 'Suspension Notice',
    icon: XCircle,
    color: 'destructive' as const,
    description: 'Membership suspension notice',
  },
  termination_notice: {
    label: 'Termination Notice',
    icon: XCircle,
    color: 'destructive' as const,
    description: 'Membership termination notice',
  },
};

const channelConfig = {
  email: {
    label: 'Email',
    icon: Mail,
    color: 'default' as const,
  },
  sms: {
    label: 'SMS',
    icon: Phone,
    color: 'secondary' as const,
  },
  mobile_app: {
    label: 'Mobile App',
    icon: Smartphone,
    color: 'outline' as const,
  },
  postal: {
    label: 'Postal Mail',
    icon: FileText,
    color: 'secondary' as const,
  },
  provider_notification: {
    label: 'Provider Notification',
    icon: Bell,
    color: 'outline' as const,
  },
};

const deliveryStatusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'outline' as const,
  },
  sent: {
    label: 'Sent',
    icon: Send,
    color: 'default' as const,
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    color: 'default' as const,
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'destructive' as const,
  },
  bounced: {
    label: 'Bounced',
    icon: AlertTriangle,
    color: 'destructive' as const,
  },
};

export default function CommunicationsCenter({ memberId, companyId }: CommunicationsCenterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("history");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationLog | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [composeData, setComposeData] = useState<ComposeNotification>({
    recipientType: memberId ? 'member' : companyId ? 'company' : 'bulk',
    recipientIds: memberId ? [memberId] : companyId ? [] : [],
    companyId: companyId,
    communicationType: '',
    channel: 'email',
    subject: '',
    content: '',
    scheduledDate: '',
    saveAsTemplate: false,
    templateName: '',
  });

  // Fetch communication logs
  const { data: communications, isLoading: isLoadingCommunications } = useQuery({
    queryKey: [
      '/api/communications',
      {
        memberId,
        companyId,
        search: searchQuery,
        status: statusFilter,
        channel: channelFilter,
        type: typeFilter,
      }
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId.toString());
      if (companyId) params.append('companyId', companyId.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (channelFilter !== 'all') params.append('channel', channelFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await apiRequest("GET", `/api/communications?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch members for company (if applicable)
  const { data: members } = useQuery({
    queryKey: ['/api/companies', companyId, 'members'],
    enabled: !!companyId && !memberId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${companyId}/members`);
      return response.json();
    },
  });

  // Send notification mutation
  const sendMutation = useMutation({
    mutationFn: async (data: ComposeNotification) => {
      const endpoint = memberId
        ? `/api/members/${memberId}/notify`
        : companyId
        ? `/api/companies/${companyId}/broadcast`
        : '/api/communications/send';

      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
      setComposeDialogOpen(false);
      resetComposeForm();
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  // Retry failed notification mutation
  const retryMutation = useMutation({
    mutationFn: async (communicationId: number) => {
      const response = await apiRequest("POST", `/api/communications/${communicationId}/retry`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification retry initiated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry notification",
        variant: "destructive",
      });
    },
  });

  const resetComposeForm = () => {
    setComposeData({
      recipientType: memberId ? 'member' : companyId ? 'company' : 'bulk',
      recipientIds: memberId ? [memberId] : companyId ? [] : [],
      companyId: companyId,
      communicationType: '',
      channel: 'email',
      subject: '',
      content: '',
      scheduledDate: '',
      saveAsTemplate: false,
      templateName: '',
    });
  };

  const handleSend = () => {
    if (!composeData.content) {
      toast({
        title: "Validation Failed",
        description: "Message content is required",
        variant: "destructive",
      });
      return;
    }

    if (composeData.channel === 'email' && !composeData.subject) {
      toast({
        title: "Validation Failed",
        description: "Subject is required for email communications",
        variant: "destructive",
      });
      return;
    }

    if (composeData.recipientType === 'bulk' && composeData.recipientIds.length === 0 && !composeData.companyId) {
      toast({
        title: "Validation Failed",
        description: "Please select recipients",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate(composeData);
  };

  const handleRetry = (communicationId: number) => {
    retryMutation.mutate(communicationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE at HH:mm');
    } else {
      return format(date, 'MMM dd, yyyy HH:mm');
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return format(date, 'MMM dd');
  };

  const filteredCommunications = communications?.data?.filter((comm: CommunicationLog) => {
    if (searchQuery && !comm.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !comm.recipient.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && comm.deliveryStatus !== statusFilter) return false;
    if (channelFilter !== 'all' && comm.channel !== channelFilter) return false;
    if (typeFilter !== 'all' && comm.communicationType !== typeFilter) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communications Center
              </CardTitle>
              <CardDescription>
                {memberId ? 'View and manage communications for this member' :
                 companyId ? 'Manage communications for this company' :
                 'Central communications management system'}
              </CardDescription>
            </div>
            <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Compose Notification</DialogTitle>
                  <DialogDescription>
                    Send a new notification to members or company
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!memberId && !companyId && (
                    <div>
                      <Label>Recipient Type</Label>
                      <Select
                        value={composeData.recipientType}
                        onValueChange={(value: any) => setComposeData({ ...composeData, recipientType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Individual Member</SelectItem>
                          <SelectItem value="company">All Company Members</SelectItem>
                          <SelectItem value="bulk">Custom Selection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="communication-type">Communication Type</Label>
                    <Select
                      value={composeData.communicationType}
                      onValueChange={(value: any) => setComposeData({ ...composeData, communicationType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select communication type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(communicationTypeConfig).map(([key, config]) => (
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
                    <Label htmlFor="channel">Channel</Label>
                    <Select
                      value={composeData.channel}
                      onValueChange={(value: any) => setComposeData({ ...composeData, channel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(channelConfig).map(([key, config]) => (
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

                  {composeData.channel === 'email' && (
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={composeData.subject}
                        onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                        placeholder="Enter email subject"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="content">Message *</Label>
                    <Textarea
                      id="content"
                      value={composeData.content}
                      onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                      placeholder="Enter message content..."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="scheduled-date">Schedule (Optional)</Label>
                    <Input
                      id="scheduled-date"
                      type="datetime-local"
                      value={composeData.scheduledDate}
                      onChange={(e) => setComposeData({ ...composeData, scheduledDate: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-template"
                      checked={composeData.saveAsTemplate}
                      onCheckedChange={(checked) => setComposeData({ ...composeData, saveAsTemplate: checked })}
                    />
                    <Label htmlFor="save-template" className="text-sm">
                      Save as template for future use
                    </Label>
                  </div>

                  {composeData.saveAsTemplate && (
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={composeData.templateName}
                        onChange={(e) => setComposeData({ ...composeData, templateName: e.target.value })}
                        placeholder="Enter template name"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? "Sending..." : "Send Notification"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Communication History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search communications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(deliveryStatusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={channelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {Object.entries(channelConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(communicationTypeConfig).map(([key, config]) => (
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
              </div>

              {/* Communications Table */}
              {isLoadingCommunications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredCommunications.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommunications.map((communication: CommunicationLog) => {
                        const typeConfig = communicationTypeConfig[communication.communicationType as keyof typeof communicationTypeConfig];
                        const channelConfig = channelConfig[communication.channel as keyof typeof channelConfig];
                        const statusConfig = deliveryStatusConfig[communication.deliveryStatus as keyof typeof deliveryStatusConfig];
                        const TypeIcon = typeConfig?.icon || MessageSquare;
                        const ChannelIcon = channelConfig?.icon || Mail;
                        const StatusIcon = statusConfig?.icon || Clock;

                        return (
                          <TableRow key={communication.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{communication.recipient}</div>
                                <div className="text-sm text-muted-foreground">
                                  {getRelativeTime(communication.sentAt)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <TypeIcon className="h-3 w-3" />
                                {typeConfig?.label || communication.communicationType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{channelConfig?.label || communication.channel}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">
                                {communication.subject || 'No subject'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatDate(communication.sentAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig?.color} className="flex items-center gap-1 w-fit">
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig?.label || communication.deliveryStatus}
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
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedCommunication(communication);
                                    setPreviewDialogOpen(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  {communication.deliveryStatus === 'failed' && (
                                    <DropdownMenuItem onClick={() => handleRetry(communication.id)}>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Retry
                                    </DropdownMenuItem>
                                  )}
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
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No communications found</p>
                  <p className="text-sm">Send your first notification to see it here</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Sent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{filteredCommunications.length}</div>
                    <p className="text-sm text-muted-foreground">All communications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Delivered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {filteredCommunications.filter(c => c.deliveryStatus === 'delivered').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Successfully delivered</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {filteredCommunications.filter(c => c.deliveryStatus === 'failed').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Delivery failed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      {filteredCommunications.filter(c => c.deliveryStatus === 'pending').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Awaiting delivery</p>
                  </CardContent>
                </Card>
              </div>

              {/* Channel Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Channel Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of communications by channel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      filteredCommunications.reduce((acc, comm) => {
                        acc[comm.channel] = (acc[comm.channel] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([channel, count]) => {
                      const channelConf = channelConfig[channel as keyof typeof channelConfig];
                      const percentage = (count / filteredCommunications.length) * 100;
                      const ChannelIcon = channelConf?.icon || Mail;

                      return (
                        <div key={channel} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChannelIcon className="h-4 w-4" />
                              <span className="font-medium">{channelConf?.label || channel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{count}</span>
                              <span className="text-sm text-muted-foreground">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Communication Preview</DialogTitle>
            <DialogDescription>
              Full message content and delivery details
            </DialogDescription>
          </DialogHeader>
          {selectedCommunication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Recipient:</span>
                  <div className="text-muted-foreground">{selectedCommunication.recipient}</div>
                </div>
                <div>
                  <span className="font-medium">Channel:</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const conf = channelConfig[selectedCommunication.channel as keyof typeof channelConfig];
                      const Icon = conf?.icon || Mail;
                      return <><Icon className="h-3 w-3" /> {conf?.label || selectedCommunication.channel}</>;
                    })()}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const conf = communicationTypeConfig[selectedCommunication.communicationType as keyof typeof communicationTypeConfig];
                      const Icon = conf?.icon || MessageSquare;
                      return <><Icon className="h-3 w-3" /> {conf?.label || selectedCommunication.communicationType}</>;
                    })()}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const conf = deliveryStatusConfig[selectedCommunication.deliveryStatus as keyof typeof deliveryStatusConfig];
                      const Icon = conf?.icon || Clock;
                      return <><Icon className="h-3 w-3" /> {conf?.label || selectedCommunication.deliveryStatus}</>;
                    })()}
                  </div>
                </div>
              </div>

              {selectedCommunication.subject && (
                <div>
                  <span className="font-medium">Subject:</span>
                  <div className="text-muted-foreground mt-1">{selectedCommunication.subject}</div>
                </div>
              )}

              <div>
                <span className="font-medium">Message:</span>
                <div className="text-muted-foreground mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedCommunication.content}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <div>Sent: {format(new Date(selectedCommunication.sentAt), 'PPpp - MMM dd, yyyy')}</div>
              </div>

              {selectedCommunication.errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Delivery Error:</div>
                    <div>{selectedCommunication.errorMessage}</div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}