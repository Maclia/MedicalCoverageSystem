import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Define interfaces
interface MedicalInstitution {
  id: number;
  name: string;
  type: string;
  city: string;
}

interface MedicalPersonnel {
  id: number;
  firstName: string;
  lastName: string;
  type: string;
  institutionId: number;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  memberType: string;
  companyId: number;
}

interface Benefit {
  id: number;
  name: string;
  category: string;
  description: string;
}

interface Claim {
  id: number;
  memberId: number;
  institutionId: number;
  personnelId: number;
  benefitId: number;
  claimDate: string;
  serviceDate: string;
  amount: number;
  description: string;
  status: string;
  reviewDate: string | null;
  reviewerNotes: string | null;
  paymentDate: string | null;
  paymentReference: string | null;
  createdAt: string;
}

export default function Claims() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  // Form states
  const [claimForm, setClaimForm] = useState({
    memberId: 0,
    institutionId: 0,
    personnelId: 0,
    benefitId: 0,
    serviceDate: new Date().toISOString().split('T')[0],
    amount: "",
    description: ""
  });
  
  const [reviewForm, setReviewForm] = useState({
    status: "",
    reviewerNotes: ""
  });
  
  const [paymentForm, setPaymentForm] = useState({
    paymentReference: ""
  });

  // Queries
  const { data: claims, isLoading } = useQuery<Claim[]>({
    queryKey: ['/api/claims'],
  });

  const { data: institutions } = useQuery<MedicalInstitution[]>({
    queryKey: ['/api/medical-institutions'],
  });

  const { data: personnel } = useQuery<MedicalPersonnel[]>({
    queryKey: ['/api/medical-personnel'],
  });
  
  const { data: members } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });
  
  const { data: benefits } = useQuery<Benefit[]>({
    queryKey: ['/api/benefits'],
  });

  // Form handlers
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Function to check member benefits eligibility
  const checkMemberEligibility = async (memberId: number, benefitId: number): Promise<boolean> => {
    try {
      // This is a simplified check - in a real implementation we would call an API endpoint
      // that checks eligibility against the current period and premium
      const { data: member } = await queryClient.fetchQuery({
        queryKey: [`/api/members/${memberId}`],
        queryFn: (): Promise<Member> => 
          fetch(`/api/members/${memberId}`).then(res => {
            if (!res.ok) throw new Error('Member not found');
            return res.json();
          })
      });
      
      // Find active premium for the member's company
      const { data: activePeriod } = await queryClient.fetchQuery({
        queryKey: ['/api/periods/active'],
        queryFn: () => 
          fetch('/api/periods/active').then(res => {
            if (!res.ok) throw new Error('No active period found');
            return res.json();
          })
      });
      
      // Get company premiums
      const { data: premiums } = await queryClient.fetchQuery({
        queryKey: [`/api/premiums?companyId=${member.companyId}`],
        queryFn: (): Promise<Premium[]> => 
          fetch(`/api/premiums?companyId=${member.companyId}`).then(res => {
            if (!res.ok) throw new Error('No premiums found for company');
            return res.json();
          })
      });
      
      // Find active premium
      const activePremium = premiums.find(p => p.periodId === activePeriod.id);
      if (!activePremium) {
        setClaimError("Member's company does not have an active premium for the current period");
        return false;
      }
      
      // Get company benefits
      const { data: companyBenefits } = await queryClient.fetchQuery({
        queryKey: [`/api/company-benefits?premiumId=${activePremium.id}`],
        queryFn: () => 
          fetch(`/api/company-benefits?premiumId=${activePremium.id}`).then(res => {
            if (!res.ok) throw new Error('No benefits found for this premium');
            return res.json();
          })
      });
      
      // Check if benefit is included in company package
      const hasBenefit = companyBenefits.some((cb: any) => cb.benefitId === benefitId);
      
      if (!hasBenefit) {
        setClaimError("The selected benefit is not included in the member's insurance package");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking eligibility:", error);
      setClaimError(error instanceof Error ? error.message : "Failed to verify member eligibility");
      return false;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError(null);
    setIsSubmitting(true);
    
    try {
      // Pre-validate to ensure the medical personnel belongs to the institution
      if (claimForm.personnelId && claimForm.institutionId) {
        const matchingPersonnel = personnel?.find(p => 
          p.id === claimForm.personnelId && p.institutionId === claimForm.institutionId
        );
        
        if (!matchingPersonnel) {
          setClaimError("Selected medical personnel does not belong to the selected institution");
          setIsSubmitting(false);
          return;
        }
      }
      
      // Validate that the institution is approved
      const institution = institutions?.find(i => i.id === claimForm.institutionId);
      if (institution && institution.approvalStatus !== 'approved') {
        setClaimError(`This medical institution is not approved to submit claims (Status: ${institution.approvalStatus})`);
        setIsSubmitting(false);
        return;
      }
      
      // Validate that the personnel is approved
      const person = personnel?.find(p => p.id === claimForm.personnelId);
      if (person && person.approvalStatus !== 'approved') {
        setClaimError(`This medical personnel is not approved to submit claims (Status: ${person.approvalStatus})`);
        setIsSubmitting(false);
        return;
      }
      
      // Check member benefit eligibility
      if (claimForm.memberId && claimForm.benefitId) {
        const isEligible = await checkMemberEligibility(claimForm.memberId, claimForm.benefitId);
        if (!isEligible) {
          setIsSubmitting(false);
          return;
        }
      }
      
      const formData = {
        ...claimForm,
        amount: parseFloat(claimForm.amount)
      };
      
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create claim');
      }
      
      // Clear form and close dialog
      setClaimForm({
        memberId: 0,
        institutionId: 0,
        personnelId: 0,
        benefitId: 0,
        serviceDate: new Date().toISOString().split('T')[0],
        amount: "",
        description: ""
      });
      setOpen(false);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Success",
        description: "Claim was created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create claim",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClaim) return;
    
    try {
      const response = await fetch(`/api/claims/${selectedClaim.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reviewForm.status,
          reviewerNotes: reviewForm.reviewerNotes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update claim status');
      }
      
      // Reset form and close dialog
      setReviewForm({
        status: "",
        reviewerNotes: ""
      });
      setReviewDialogOpen(false);
      setSelectedClaim(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Success",
        description: "Claim status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update claim status",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClaim) return;
    
    try {
      const response = await fetch(`/api/claims/${selectedClaim.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentReference: paymentForm.paymentReference
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }
      
      // Reset form and close dialog
      setPaymentForm({
        paymentReference: ""
      });
      setPaymentDialogOpen(false);
      setSelectedClaim(null);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Success",
        description: "Payment processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClaimForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setClaimForm(prev => ({
      ...prev,
      [name]: ["memberId", "institutionId", "personnelId", "benefitId"].includes(name)
        ? parseInt(value) || 0
        : value
    }));
  };

  // Dialog openers
  const openReviewDialog = (claim: Claim) => {
    setSelectedClaim(claim);
    setReviewForm({
      status: "",
      reviewerNotes: claim.reviewerNotes || ""
    });
    setReviewDialogOpen(true);
  };

  const openPaymentDialog = (claim: Claim) => {
    setSelectedClaim(claim);
    setPaymentForm({
      paymentReference: ""
    });
    setPaymentDialogOpen(true);
  };

  // Helper functions
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return "bg-blue-500";
      case 'under_review':
        return "bg-yellow-500";
      case 'approved':
        return "bg-green-500";
      case 'rejected':
        return "bg-red-500";
      case 'paid':
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusName = (status: string): string => {
    const statusMap: Record<string, string> = {
      submitted: "Submitted",
      under_review: "Under Review",
      approved: "Approved",
      rejected: "Rejected",
      paid: "Paid"
    };
    return statusMap[status] || status;
  };

  const getMemberName = (id: number): string => {
    const member = members?.find(m => m.id === id);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown Member';
  };

  const getInstitutionName = (id: number): string => {
    const institution = institutions?.find(i => i.id === id);
    return institution ? institution.name : 'Unknown Institution';
  };

  const getPersonnelName = (id: number): string => {
    const person = personnel?.find(p => p.id === id);
    return person ? `${person.firstName} ${person.lastName}` : 'Unknown Personnel';
  };

  const getBenefitName = (id: number): string => {
    const benefit = benefits?.find(b => b.id === id);
    return benefit ? benefit.name : 'Unknown Benefit';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filter personnel by institution
  const filteredPersonnel = personnel?.filter(
    p => p.institutionId === claimForm.institutionId
  ) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Claims Management</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="material-icons mr-2">add</i>
              Submit Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Claim</DialogTitle>
              <DialogDescription>
                Submit a new insurance claim for a member.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {claimError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="material-icons text-red-500">error</i>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Claim Validation Error</h3>
                      <p className="text-sm mt-1">{claimError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberId">Member</Label>
                  <Select 
                    name="memberId" 
                    value={claimForm.memberId.toString() || ""}
                    onValueChange={(value) => handleSelectChange("memberId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map(member => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="benefitId">Benefit</Label>
                  <Select 
                    name="benefitId" 
                    value={claimForm.benefitId.toString() || ""}
                    onValueChange={(value) => handleSelectChange("benefitId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select benefit" />
                    </SelectTrigger>
                    <SelectContent>
                      {benefits?.map(benefit => (
                        <SelectItem key={benefit.id} value={benefit.id.toString()}>
                          {benefit.name} ({benefit.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institutionId">Medical Institution</Label>
                  <Select 
                    name="institutionId" 
                    value={claimForm.institutionId.toString() || ""}
                    onValueChange={(value) => handleSelectChange("institutionId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions?.map(institution => (
                        <SelectItem key={institution.id} value={institution.id.toString()}>
                          {institution.name} ({institution.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="personnelId">Medical Personnel</Label>
                  <Select 
                    name="personnelId" 
                    value={claimForm.personnelId.toString() || ""}
                    onValueChange={(value) => handleSelectChange("personnelId", value)}
                    required
                    disabled={!claimForm.institutionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={claimForm.institutionId ? "Select personnel" : "Select institution first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPersonnel.map(person => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.firstName} {person.lastName} ({person.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="serviceDate">Service Date</Label>
                  <Input 
                    id="serviceDate"
                    name="serviceDate"
                    type="date"
                    value={claimForm.serviceDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={claimForm.amount}
                    onChange={handleChange}
                    placeholder="Claim amount"
                    required
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    name="description"
                    value={claimForm.description}
                    onChange={handleChange}
                    placeholder="Describe the service provided and reason for claim"
                    rows={3}
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 animate-spin">⟳</span>
                      Validating...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
          <CardDescription>
            Review and manage insurance claims from medical institutions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : claims && claims.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{getMemberName(claim.memberId)}</div>
                        <div className="text-sm text-muted-foreground">
                          Claim Date: {new Date(claim.claimDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{getInstitutionName(claim.institutionId)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getPersonnelName(claim.personnelId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{getBenefitName(claim.benefitId)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(claim.serviceDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(claim.amount)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(claim.status)}>
                          {getStatusName(claim.status)}
                        </Badge>
                        {claim.reviewDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Reviewed: {new Date(claim.reviewDate).toLocaleDateString()}
                          </div>
                        )}
                        {claim.paymentDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Paid: {new Date(claim.paymentDate).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(claim.status === 'submitted' || claim.status === 'under_review') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mb-1"
                            onClick={() => openReviewDialog(claim)}
                          >
                            <i className="material-icons text-sm mr-1">rate_review</i>
                            Review
                          </Button>
                        )}
                        {claim.status === 'approved' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openPaymentDialog(claim)}
                          >
                            <i className="material-icons text-sm mr-1">payments</i>
                            Process Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No claims found</h3>
              <p className="text-muted-foreground">
                There are no claims in the system yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Claim</DialogTitle>
            <DialogDescription>
              {selectedClaim && (
                <>
                  Review claim #{selectedClaim.id} for {getMemberName(selectedClaim.memberId)}
                  <div className="mt-2">
                    <span className="font-medium">Amount:</span> {formatCurrency(selectedClaim.amount)}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Description:</span> {selectedClaim.description}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Decision</Label>
              <Select 
                name="status" 
                value={reviewForm.status}
                onValueChange={(value) => setReviewForm(prev => ({...prev, status: value}))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reviewerNotes">Notes</Label>
              <Textarea 
                id="reviewerNotes"
                name="reviewerNotes"
                value={reviewForm.reviewerNotes}
                onChange={(e) => setReviewForm(prev => ({...prev, reviewerNotes: e.target.value}))}
                placeholder="Add any notes about this review decision"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Submit Review</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {selectedClaim && (
                <>
                  Process payment for claim #{selectedClaim.id}
                  <div className="mt-2">
                    <span className="font-medium">Provider:</span> {getInstitutionName(selectedClaim.institutionId)}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Amount:</span> {formatCurrency(selectedClaim.amount)}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Payment Reference</Label>
              <Input 
                id="paymentReference"
                name="paymentReference"
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm({paymentReference: e.target.value})}
                placeholder="Transaction or reference ID"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Process Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}