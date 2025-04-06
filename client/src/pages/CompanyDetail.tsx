import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Building,
  Stethoscope
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CompanyDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['/api/companies', id],
    enabled: !!id,
  });

  // Fetch company periods
  const { data: companyPeriods, isLoading: periodsLoading } = useQuery({
    queryKey: ['/api/company-periods/company', id],
    enabled: !!id,
  });

  // Fetch company benefits
  const { data: companyBenefits, isLoading: benefitsLoading } = useQuery({
    queryKey: ['/api/company-benefits/company', id],
    enabled: !!id,
  });

  // Fetch company premiums
  const { data: premiums, isLoading: premiumsLoading } = useQuery({
    queryKey: ['/api/premiums/company', id],
    enabled: !!id,
  });

  // Fetch company members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['/api/members/company', id],
    enabled: !!id,
  });

  // Fetch active period
  const { data: activePeriod } = useQuery({
    queryKey: ['/api/periods/active'],
  });

  const isLoading = companyLoading || periodsLoading || benefitsLoading || premiumsLoading || membersLoading;

  // Find current premium (in active period)
  const currentPremium = premiums?.find(
    premium => premium.periodId === activePeriod?.id && premium.companyId === parseInt(id || "0")
  );

  // Calculate total members (principal + dependents)
  const principalMembers = members?.filter(member => member.memberType === 'principal') || [];
  const dependentMembers = members?.filter(member => member.memberType === 'dependent') || [];
  
  // Calculate financial statistics
  const calculateFinancialStats = () => {
    if (!currentPremium || !members) return { 
      totalPremium: 0, 
      totalPaid: 0, 
      balance: 0,
      memberCount: 0,
      premiumPerMember: 0
    };

    const totalPremium = currentPremium.totalAmount || 0;
    const totalPaid = currentPremium.amountPaid || 0;
    const balance = totalPremium - totalPaid;
    const memberCount = principalMembers.length;
    const premiumPerMember = memberCount > 0 ? totalPremium / memberCount : 0;

    return {
      totalPremium,
      totalPaid,
      balance,
      memberCount,
      premiumPerMember
    };
  };

  const financialStats = calculateFinancialStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  const activeCompanyPeriod = companyPeriods?.find(
    companyPeriod => companyPeriod.periodId === activePeriod?.id
  );

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <AvatarWithInitials
                name={company.name}
                bgColor="bg-primary"
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <p className="text-muted-foreground">
                  Registration: {company.registrationNumber}
                </p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-3">
              <Button variant="outline">Edit Company</Button>
              <Button>Add Premium</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-950 dark:to-background border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Premium Information</CardTitle>
            <CardDescription>
              {activePeriod ? activePeriod.name : "No active period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Premium</p>
                <p className="text-2xl font-bold">${financialStats.totalPremium.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-2xl font-bold text-destructive">${financialStats.balance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={financialStats.balance > 0 ? "destructive" : "success"}>
                  {financialStats.balance > 0 ? "OUTSTANDING" : "PAID"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coverage Start</p>
                <p className="font-medium">
                  {activeCompanyPeriod?.startDate ? 
                    format(new Date(activeCompanyPeriod.startDate), 'MMM d, yyyy') : 
                    "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background border-blue-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Member Statistics</CardTitle>
            <CardDescription>
              Current enrollment information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Principal Members</p>
                <p className="text-2xl font-bold">{principalMembers.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dependents</p>
                <p className="text-2xl font-bold">{dependentMembers.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Coverage</p>
                <p className="text-2xl font-bold">{principalMembers.length + dependentMembers.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Premium per Member</p>
                <p className="font-medium">${financialStats.premiumPerMember.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background border-green-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Benefits Summary</CardTitle>
            <CardDescription>
              Current policy benefits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Benefits</p>
                <p className="text-2xl font-bold">{companyBenefits?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Benefit Categories</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {companyBenefits && Array.from(new Set(companyBenefits.map(cb => cb.benefitCategory))).map(category => (
                    <Badge key={category} variant="outline" className="capitalize">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="medical-panels">Medical Panels</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Company Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{company.industry || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Established</p>
                      <p className="font-medium">
                        {company.establishedDate ? 
                          format(new Date(company.establishedDate), 'MMMM d, yyyy') : 
                          "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{company.address || "Not specified"}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{company.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{company.contactEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{company.contactPhone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="benefits" className="pt-4">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Current Benefits</h3>
                  <Button variant="outline" size="sm">Add Benefit</Button>
                </div>
                
                {companyBenefits && companyBenefits.length > 0 ? (
                  <div className="space-y-3">
                    {companyBenefits.map(benefit => (
                      <Card key={benefit.id} className="overflow-hidden">
                        <div className="flex items-center p-4 border-l-4 border-primary">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{benefit.benefitName}</h4>
                              <Badge className="capitalize">{benefit.benefitCategory}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {benefit.coverageDetails}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Coverage Limit</p>
                            <p className="font-medium">
                              {benefit.limitAmount ? `$${benefit.limitAmount.toFixed(2)}` : "Unlimited"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No benefits have been added</p>
                    <Button variant="link" className="mt-2">Add your first benefit</Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="members" className="pt-4">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Enrolled Members</h3>
                  <Button variant="outline" size="sm">Add Member</Button>
                </div>
                
                {members && members.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {principalMembers.map(member => (
                        <Card key={member.id} className="overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <AvatarWithInitials 
                                name={`${member.firstName} ${member.lastName}`} 
                                bgColor="bg-blue-600"
                              />
                              <div>
                                <h4 className="font-medium">{member.firstName} {member.lastName}</h4>
                                <p className="text-sm text-muted-foreground">{member.employeeId}</p>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Member Type</p>
                                <p className="capitalize font-medium">Principal</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Dependents</p>
                                <p className="font-medium">
                                  {dependentMembers.filter(d => d.principalId === member.id).length}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No members have been enrolled</p>
                    <Button variant="link" className="mt-2">Add your first member</Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="payments" className="pt-4">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Payment History</h3>
                  <Button variant="outline" size="sm">Record Payment</Button>
                </div>
                
                {premiums && premiums.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Period</th>
                          <th className="text-left py-3 px-4 font-medium">Total Amount</th>
                          <th className="text-left py-3 px-4 font-medium">Amount Paid</th>
                          <th className="text-left py-3 px-4 font-medium">Balance</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {premiums.map(premium => {
                          const period = companyPeriods?.find(p => p.periodId === premium.periodId);
                          const balance = (premium.totalAmount || 0) - (premium.amountPaid || 0);
                          
                          return (
                            <tr key={premium.id} className="border-b">
                              <td className="py-3 px-4">{period?.periodName || "Unknown"}</td>
                              <td className="py-3 px-4">${premium.totalAmount?.toFixed(2) || "0.00"}</td>
                              <td className="py-3 px-4">${premium.amountPaid?.toFixed(2) || "0.00"}</td>
                              <td className="py-3 px-4">${balance.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <Badge variant={balance > 0 ? "destructive" : "success"}>
                                  {balance > 0 ? "OUTSTANDING" : "PAID"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {balance > 0 && (
                                  <Button variant="outline" size="sm">
                                    Pay Now
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No premium payments recorded</p>
                    <Button variant="link" className="mt-2">Record your first payment</Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="medical-panels" className="pt-4">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Approved Medical Panels</h3>
                  <Button variant="outline" size="sm">View All Providers</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Approved Hospitals</CardTitle>
                      <CardDescription>Hospital facilities covered by your insurance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Demo data - replace with actual data */}
                        {Array.from({length: 3}).map((_, i) => (
                          <div key={`hospital-${i}`} className="flex items-start space-x-3 p-3 border rounded-md">
                            <div className="bg-blue-100 p-2 rounded-md">
                              <Building className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {["General Hospital", "Central Medical Center", "Metropolitan Hospital"][i]}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {["General Care", "Specialized Care", "Emergency Services"][i]}
                              </p>
                              <Badge className="mt-1" variant="outline">Approved</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Approved Clinics</CardTitle>
                      <CardDescription>Clinics and medical centers in your network</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Demo data - replace with actual data */}
                        {Array.from({length: 3}).map((_, i) => (
                          <div key={`clinic-${i}`} className="flex items-start space-x-3 p-3 border rounded-md">
                            <div className="bg-green-100 p-2 rounded-md">
                              <Stethoscope className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {["City Health Clinic", "Family Care Center", "Wellness Medical Group"][i]}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {["Primary Care", "Family Medicine", "Preventive Care"][i]}
                              </p>
                              <Badge className="mt-1" variant="outline">Approved</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Approved Medical Personnel</CardTitle>
                    <CardDescription>Doctors and specialists in your network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Demo data - replace with actual data */}
                      {Array.from({length: 6}).map((_, i) => (
                        <div key={`doctor-${i}`} className="flex items-start space-x-3 p-3 border rounded-md">
                          <AvatarWithInitials 
                            name={[
                              "Dr. Sarah Johnson",
                              "Dr. Michael Lee",
                              "Dr. Emily Chen",
                              "Dr. James Wilson",
                              "Dr. Maria Rodriguez",
                              "Dr. David Kim"
                            ][i]} 
                            size="md"
                          />
                          <div>
                            <h4 className="font-medium text-sm">
                              {[
                                "Dr. Sarah Johnson",
                                "Dr. Michael Lee",
                                "Dr. Emily Chen",
                                "Dr. James Wilson",
                                "Dr. Maria Rodriguez",
                                "Dr. David Kim"
                              ][i]}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {[
                                "Cardiology",
                                "Pediatrics",
                                "Dermatology",
                                "Orthopedics",
                                "Gastroenterology",
                                "Neurology"
                              ][i]}
                            </p>
                            <Badge className="mt-1" variant="outline">Approved</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}