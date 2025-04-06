import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";

// Define interfaces for type safety
interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  memberType: string;
  principalId?: number;
  dependentType?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
  createdAt: string;
  companyId: number;
  company?: {
    id: number;
    name: string;
  };
}

interface Benefit {
  id: number;
  name: string;
  description: string;
  category: string;
  coverageDetails: string;
  limitAmount: number;
  hasWaitingPeriod: boolean;
  waitingPeriodDays: number;
  isStandard: boolean;
}

interface CompanyBenefit {
  id: number;
  companyId: number;
  companyName?: string;
  benefitId: number;
  benefitName?: string;
  benefitCategory?: string;
  premiumId: number;
  premiumPeriodId?: number;
  isActive: boolean;
  additionalCoverage: boolean;
  additionalCoverageDetails?: string;
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
  diagnosis: string;
  status: string;
  reviewDate?: string;
  reviewerNotes?: string;
  paymentDate?: string;
  paymentReference?: string;
  createdAt: string;
}

// Combined type to display benefit with usage
interface BenefitWithUsage {
  benefitId: number;
  name: string;
  category: string;
  description: string;
  limitAmount: number | null;
  hasLimit: boolean;
  companyBenefitId: number;
  usedAmount: number;
  remainingAmount: number | null;
  usagePercentage: number;
  additionalCoverage: boolean;
  additionalCoverageDetails?: string;
  claims: Claim[];
  rejectedClaims: Claim[];
}

export default function MemberDashboard() {
  const params = useParams();
  const memberId = params.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("benefits");

  // Fetch member details
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: [`/api/members/${memberId}`],
    enabled: !!memberId,
  });

  // Fetch company benefits for the member's company
  const { data: companyBenefits, isLoading: isLoadingCompanyBenefits } = useQuery({
    queryKey: ['/api/company-benefits'],
    queryFn: async () => {
      if (!member?.companyId) return [];
      const response = await fetch(`/api/company-benefits?companyId=${member.companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company benefits');
      return response.json();
    },
    enabled: !!member?.companyId,
  });

  // Fetch all benefits to get details
  const { data: allBenefits, isLoading: isLoadingBenefits } = useQuery({
    queryKey: ['/api/benefits'],
  });

  // Fetch claims for the member
  const { data: memberClaims, isLoading: isLoadingClaims } = useQuery({
    queryKey: [`/api/claims`],
    queryFn: async () => {
      const response = await fetch(`/api/claims?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to fetch member claims');
      return response.json();
    },
    enabled: !!memberId,
  });

  // Calculate benefits usage and limits
  const benefitsWithUsage: BenefitWithUsage[] = !isLoadingCompanyBenefits && !isLoadingBenefits && !isLoadingClaims
    ? (companyBenefits || [])
      .filter((cb: CompanyBenefit) => cb.isActive)
      .map((companyBenefit: CompanyBenefit) => {
        const benefit = allBenefits?.find((b: Benefit) => b.id === companyBenefit.benefitId);
        if (!benefit) return null;

        // Filter claims for this benefit
        const benefitClaims = (memberClaims || [])
          .filter((claim: Claim) => claim.benefitId === benefit.id);

        // Separate approved/paid claims from rejected claims
        const approvedClaims = benefitClaims.filter(
          (claim: Claim) => claim.status === 'approved' || claim.status === 'paid'
        );
        const rejectedClaims = benefitClaims.filter(
          (claim: Claim) => claim.status === 'rejected'
        );

        // Calculate used amount from approved and paid claims
        const usedAmount = approvedClaims.reduce(
          (sum: number, claim: Claim) => sum + claim.amount, 0
        );

        // Calculate remaining amount if there's a limit
        const hasLimit = benefit.limitAmount !== null && benefit.limitAmount > 0;
        const remainingAmount = hasLimit 
          ? Math.max(0, benefit.limitAmount - usedAmount)
          : null;

        // Calculate usage percentage
        const usagePercentage = hasLimit && benefit.limitAmount > 0
          ? Math.min(100, (usedAmount / benefit.limitAmount) * 100)
          : 0;

        return {
          benefitId: benefit.id,
          name: benefit.name,
          category: benefit.category,
          description: benefit.description,
          limitAmount: benefit.limitAmount,
          hasLimit: hasLimit,
          companyBenefitId: companyBenefit.id,
          usedAmount,
          remainingAmount,
          usagePercentage,
          additionalCoverage: companyBenefit.additionalCoverage,
          additionalCoverageDetails: companyBenefit.additionalCoverageDetails,
          claims: approvedClaims,
          rejectedClaims,
        };
      })
      .filter(Boolean)
    : [];

  // Format category for display
  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get status badge color
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

  // Loading state
  if (isLoadingMember || isLoadingCompanyBenefits || isLoadingBenefits || isLoadingClaims) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Member not found
  if (!member) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Not Found</CardTitle>
          <CardDescription>
            The requested member could not be found or you don't have permission to view this information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/members">Back to Members</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Info Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <AvatarWithInitials name={`${member.firstName} ${member.lastName}`} className="h-16 w-16 mr-4" />
              <div>
                <CardTitle className="text-2xl">{member.firstName} {member.lastName}</CardTitle>
                <CardDescription className="text-base">
                  {member.memberType === 'principal' ? 'Principal Member' : `Dependent (${member.dependentType})`}
                  {member.hasDisability && " • Special Needs"}
                </CardDescription>
                <div className="text-sm text-gray-500 mt-1">
                  ID: {member.employeeId} • Member since {format(new Date(member.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <div><strong>Company:</strong> {member.company?.name}</div>
              <div><strong>Email:</strong> {member.email}</div>
              <div><strong>Phone:</strong> {member.phone}</div>
              <div><strong>Date of Birth:</strong> {format(new Date(member.dateOfBirth), "MMM d, yyyy")}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Benefits and Claims */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs defaultValue="benefits" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="benefits">Benefits & Balance</TabsTrigger>
              <TabsTrigger value="claims">Claims History</TabsTrigger>
              <TabsTrigger value="rejected">Rejected Claims</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Benefits Tab */}
          <TabsContent value="benefits" className="mt-0">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Available Benefits & Usage</h3>
              
              {benefitsWithUsage.length === 0 ? (
                <div className="p-4 text-center border rounded-md bg-muted/50">
                  <p>No benefits are currently assigned to this member.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {benefitsWithUsage.map(benefit => (
                    <Card key={benefit.benefitId} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{benefit.name}</CardTitle>
                            <Badge className="mt-1 bg-blue-600">{formatCategory(benefit.category)}</Badge>
                          </div>
                          {benefit.additionalCoverage && (
                            <Badge className="bg-green-600">Additional Coverage</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-2">{benefit.description}</CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              Used: {formatCurrency(benefit.usedAmount)}
                              {benefit.hasLimit && ` of ${formatCurrency(benefit.limitAmount)}`}
                            </span>
                            {benefit.hasLimit && (
                              <span className="text-sm font-medium">
                                {benefit.usagePercentage.toFixed(0)}% Used
                              </span>
                            )}
                          </div>
                          
                          {benefit.hasLimit ? (
                            <>
                              <Progress value={benefit.usagePercentage} className="h-2" />
                              <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-600">
                                  Remaining: {formatCurrency(benefit.remainingAmount)}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {benefit.claims.length} Approved Claims
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-sm">
                              <span className="text-gray-600">No limit set for this benefit</span>
                              <div className="text-xs mt-1">
                                {benefit.claims.length} Approved Claims
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Show rejected claims count if any */}
                        {benefit.rejectedClaims.length > 0 && (
                          <div className="text-sm mt-2 p-2 bg-red-50 border border-red-100 rounded">
                            <span className="text-red-700 font-medium">
                              {benefit.rejectedClaims.length} rejected {benefit.rejectedClaims.length === 1 ? 'claim' : 'claims'}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Claims History Tab */}
          <TabsContent value="claims" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Claims History</h3>
              
              {(!memberClaims || memberClaims.length === 0) ? (
                <div className="p-4 text-center border rounded-md bg-muted/50">
                  <p>No claims have been submitted for this member.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benefit</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberClaims.map((claim: Claim) => {
                      const benefit = allBenefits?.find((b: Benefit) => b.id === claim.benefitId);
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{benefit?.name || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(claim.serviceDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{formatCurrency(claim.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(claim.status)}>
                              {claim.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {claim.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          
          {/* Rejected Claims Tab */}
          <TabsContent value="rejected" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rejected Claims</h3>
              
              {
                (!memberClaims || memberClaims.filter((claim: Claim) => claim.status === 'rejected').length === 0) ? (
                <div className="p-4 text-center border rounded-md bg-muted/50">
                  <p>No rejected claims for this member.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benefit</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Review Date</TableHead>
                      <TableHead>Reviewer Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberClaims
                      .filter((claim: Claim) => claim.status === 'rejected')
                      .map((claim: Claim) => {
                        const benefit = allBenefits?.find((b: Benefit) => b.id === claim.benefitId);
                        return (
                          <TableRow key={claim.id}>
                            <TableCell className="font-medium">{benefit?.name || 'Unknown'}</TableCell>
                            <TableCell>{format(new Date(claim.serviceDate), "MMM d, yyyy")}</TableCell>
                            <TableCell>{formatCurrency(claim.amount)}</TableCell>
                            <TableCell>
                              {claim.reviewDate ? format(new Date(claim.reviewDate), "MMM d, yyyy") : 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {claim.reviewerNotes || 'No notes provided'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
}