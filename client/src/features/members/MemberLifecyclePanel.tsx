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
  buttonVariants,
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
  Textarea,
} from "@/components/ui/textarea";
import {
  Input,
} from "@/components/ui/input";
import {
  Label,
} from "@/components/ui/label";
import { CalendarIcon, User, Clock, AlertCircle, CheckCircle, XCircle, PauseCircle, PlayCircle, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipStatus: 'active' | 'suspended' | 'pending' | 'terminated' | 'expired';
  enrollmentDate: string;
  terminationDate?: string;
  renewalDate?: string;
  lastSuspensionDate?: string;
  suspensionReason?: string;
  companyId: number;
}

interface LifecycleEvent {
  id: number;
  memberId: number;
  eventType: 'enrollment' | 'activation' | 'suspension' | 'upgrade' | 'downgrade' | 'renewal' | 'transfer' | 'termination' | 'reinstatement' | 'death';
  eventDate: string;
  previousStatus?: string;
  newStatus?: string;
  reason: string;
  notes?: string;
  processedBy?: number;
  createdAt: string;
}

interface MemberLifecyclePanelProps {
  member: Member;
  onUpdate?: () => void;
}

const statusConfig = {
  active: {
    color: 'default' as const,
    icon: CheckCircle,
    label: 'Active',
    description: 'Member is active and eligible for benefits',
  },
  suspended: {
    color: 'secondary' as const,
    icon: PauseCircle,
    label: 'Suspended',
    description: 'Member benefits are temporarily suspended',
  },
  pending: {
    color: 'outline' as const,
    icon: Clock,
    label: 'Pending',
    description: 'Member enrollment is pending activation',
  },
  terminated: {
    color: 'destructive' as const,
    icon: XCircle,
    label: 'Terminated',
    description: 'Member coverage has been terminated',
  },
  expired: {
    color: 'secondary' as const,
    icon: AlertCircle,
    label: 'Expired',
    description: 'Member coverage has expired',
  },
};

const eventTypeConfig = {
  enrollment: { color: 'default' as const, label: 'Enrollment' },
  activation: { color: 'default' as const, label: 'Activation' },
  suspension: { color: 'destructive' as const, label: 'Suspension' },
  upgrade: { color: 'default' as const, label: 'Upgrade' },
  downgrade: { color: 'secondary' as const, label: 'Downgrade' },
  renewal: { color: 'default' as const, label: 'Renewal' },
  transfer: { color: 'default' as const, label: 'Transfer' },
  termination: { color: 'destructive' as const, label: 'Termination' },
  reinstatement: { color: 'default' as const, label: 'Reinstatement' },
  death: { color: 'destructive' as const, label: 'Death' },
};

export default function MemberLifecyclePanel({ member, onUpdate }: MemberLifecyclePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [terminationDialogOpen, setTerminationDialogOpen] = useState(false);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [terminationReason, setTerminationReason] = useState("");

  // Fetch member lifecycle events
  const { data: lifecycleEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['/api/members', member.id, 'lifecycle'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/members/${member.id}/lifecycle`);
      return response.json();
    },
  });

  // Member status mutations
  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/members/${member.id}/activate`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member has been activated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members', member.id, 'lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate member",
        variant: "destructive",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (data: { reason: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/members/${member.id}/suspend`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member has been suspended",
      });
      setSuspensionDialogOpen(false);
      setSuspensionReason("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/members', member.id, 'lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Suspension Failed",
        description: error.message || "Failed to suspend member",
        variant: "destructive",
      });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: async (data: { notes?: string }) => {
      const response = await apiRequest("PUT", `/api/members/${member.id}/reinstate`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member has been reinstated successfully",
      });
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/members', member.id, 'lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Reinstatement Failed",
        description: error.message || "Failed to reinstate member",
        variant: "destructive",
      });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async (data: { reason: string; terminationDate?: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/members/${member.id}/terminate`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member has been terminated",
      });
      setTerminationDialogOpen(false);
      setTerminationReason("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/members', member.id, 'lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Termination Failed",
        description: error.message || "Failed to terminate member",
        variant: "destructive",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (data: { renewalDate: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/members/${member.id}/renew`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member has been renewed successfully",
      });
      setRenewalDialogOpen(false);
      setRenewalDate("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/members', member.id, 'lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Renewal Failed",
        description: error.message || "Failed to renew member",
        variant: "destructive",
      });
    },
  });

  const currentStatus = statusConfig[member.membershipStatus];
  const StatusIcon = currentStatus.icon;

  const handleSuspend = () => {
    if (suspensionReason.trim()) {
      suspendMutation.mutate({
        reason: suspensionReason,
        notes: notes.trim() || undefined,
      });
    }
  };

  const handleTerminate = () => {
    if (terminationReason.trim()) {
      terminateMutation.mutate({
        reason: terminationReason,
        notes: notes.trim() || undefined,
      });
    }
  };

  const handleRenew = () => {
    if (renewalDate) {
      renewMutation.mutate({
        renewalDate,
        notes: notes.trim() || undefined,
      });
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    switch (member.membershipStatus) {
      case 'pending':
        buttons.push(
          <Button
            key="activate"
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Activate Member
          </Button>
        );
        break;

      case 'active':
        buttons.push(
          <Dialog key="suspend" open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <PauseCircle className="h-4 w-4" />
                Suspend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suspend Member</DialogTitle>
                <DialogDescription>
                  Suspend {member.firstName} {member.lastName}'s membership benefits
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="suspension-reason">Suspension Reason *</Label>
                  <Textarea
                    id="suspension-reason"
                    placeholder="Enter reason for suspension..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="suspension-notes">Additional Notes</Label>
                  <Textarea
                    id="suspension-notes"
                    placeholder="Additional notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuspensionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSuspend}
                  disabled={suspendMutation.isPending || !suspensionReason.trim()}
                >
                  {suspendMutation.isPending ? "Suspending..." : "Suspend Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>,
          <Dialog key="renew" open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Renew
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renew Member</DialogTitle>
                <DialogDescription>
                  Set renewal date for {member.firstName} {member.lastName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renewal-date">Renewal Date *</Label>
                  <Input
                    id="renewal-date"
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="renewal-notes">Notes</Label>
                  <Textarea
                    id="renewal-notes"
                    placeholder="Renewal notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenewalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRenew}
                  disabled={renewMutation.isPending || !renewalDate}
                >
                  {renewMutation.isPending ? "Renewing..." : "Renew Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>,
          <AlertDialog key="terminate">
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Terminate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Terminate Member</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently terminate {member.firstName} {member.lastName}'s membership. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="termination-reason">Termination Reason *</Label>
                  <Textarea
                    id="termination-reason"
                    placeholder="Enter reason for termination..."
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="termination-notes">Additional Notes</Label>
                  <Textarea
                    id="termination-notes"
                    placeholder="Additional notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTerminate}
                  disabled={terminateMutation.isPending || !terminationReason.trim()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {terminateMutation.isPending ? "Terminating..." : "Terminate Member"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
        break;

      case 'suspended':
        buttons.push(
          <Dialog key="reinstate" open={!!notes} onOpenChange={(open) => {
            if (!open) setNotes("");
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Reinstate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reinstate Member</DialogTitle>
                <DialogDescription>
                  Reinstate {member.firstName} {member.lastName}'s membership
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reinstatement-notes">Reinstatement Notes</Label>
                  <Textarea
                    id="reinstatement-notes"
                    placeholder="Enter notes for reinstatement..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNotes("")}>
                  Cancel
                </Button>
                <Button
                  onClick={() => reinstateMutation.mutate({ notes: notes.trim() || undefined })}
                  disabled={reinstateMutation.isPending}
                >
                  {reinstateMutation.isPending ? "Reinstating..." : "Reinstate Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
        break;
    }

    return buttons;
  };

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Current Membership Status
          </CardTitle>
          <CardDescription>{currentStatus.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant={currentStatus.color} className="text-sm px-3 py-1">
                {currentStatus.label}
              </Badge>
              <div className="text-sm text-muted-foreground">
                <div>Member: {member.firstName} {member.lastName}</div>
                <div>Email: {member.email}</div>
                {member.enrollmentDate && (
                  <div>Enrolled: {format(new Date(member.enrollmentDate), 'MMM dd, yyyy')}</div>
                )}
                {member.renewalDate && (
                  <div>Renewal: {format(new Date(member.renewalDate), 'MMM dd, yyyy')}</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getActionButtons()}
            </div>
          </div>

          {member.membershipStatus === 'suspended' && member.suspensionReason && (
            <div className="mt-4 p-3 bg-secondary/20 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Suspension Reason:</span>
                <span className="text-muted-foreground">{member.suspensionReason}</span>
              </div>
              {member.lastSuspensionDate && (
                <div className="text-xs text-muted-foreground mt-1 ml-6">
                  Suspended on: {format(new Date(member.lastSuspensionDate), 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          )}

          {member.membershipStatus === 'terminated' && member.terminationDate && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="font-medium">Termination Date:</span>
                <span className="text-destructive">
                  {format(new Date(member.terminationDate), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lifecycle History
          </CardTitle>
          <CardDescription>
            Complete history of all membership changes and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : lifecycleEvents?.data?.lifeEvents?.length > 0 ? (
            <div className="space-y-4">
              {lifecycleEvents.data.lifeEvents.map((event: LifecycleEvent, index: number) => {
                const eventType = eventTypeConfig[event.eventType as keyof typeof eventTypeConfig];
                const isLast = index === lifecycleEvents.data.lifeEvents.length - 1;

                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 bg-background ${
                          event.eventType === 'termination' || event.eventType === 'suspension'
                            ? 'border-destructive'
                            : 'border-primary'
                        }`}
                      />
                      {!isLast && <div className="w-0.5 h-16 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={eventType.color} className="text-xs">
                              {eventType.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(event.eventDate), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Reason:</span> {event.reason}
                          </div>
                          {event.notes && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Notes:</span> {event.notes}
                            </div>
                          )}
                          {(event.previousStatus || event.newStatus) && (
                            <div className="text-xs text-muted-foreground">
                              Status change: {event.previousStatus || 'None'} → {event.newStatus || 'None'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Processed by system
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No lifecycle events found for this member</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common member management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open(`/members/${member.id}/documents`, '_blank')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open(`/members/${member.id}/eligibility`, '_blank')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Eligibility
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open(`/members/${member.id}/communications`, '_blank')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.open(`/members/${member.id}`, '_blank')}
            >
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}