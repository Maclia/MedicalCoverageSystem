import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInYears } from "date-fns";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import DependentForm from "./DependentForm";

export default function DependentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [principalFilter, setPrincipalFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/members'],
  });

  const { data: principals, isLoading: isLoadingPrincipals } = useQuery({
    queryKey: ['/api/members/principal'],
  });
  
  const dependents = members?.filter(m => m.memberType === 'dependent') || [];
  const filteredDependents = dependents.filter(dependent => {
    const principal = principals?.find(p => p.id === dependent.principalId);
    const fullName = `${dependent.firstName} ${dependent.lastName}`;
    
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrincipal = principalFilter === "all" || !principalFilter || dependent.principalId.toString() === principalFilter;
    const matchesType = typeFilter === "all" || !typeFilter || dependent.dependentType === typeFilter;
    
    return matchesSearch && matchesPrincipal && matchesType;
  });

  if (isLoadingMembers || isLoadingPrincipals) {
    return (
      <Card>
        <CardHeader className="px-6 py-4 border-b flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Dependents</CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between mb-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Special Needs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="ml-3">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-8 w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="px-6 py-4 border-b flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Dependents</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <i className="material-icons mr-1">group_add</i> Add Dependent
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-64">
                <i className="material-icons absolute left-3 top-2.5 text-gray-400">search</i>
                <Input
                  className="pl-10"
                  placeholder="Search dependents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={principalFilter} onValueChange={setPrincipalFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Principals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Principals</SelectItem>
                  {principals?.map((principal) => (
                    <SelectItem key={principal.id} value={principal.id.toString()}>
                      {principal.firstName} {principal.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredDependents.length === 0 ? (
            <div className="text-center py-12">
              <i className="material-icons text-gray-400 text-4xl mb-2">family_restroom</i>
              <p className="text-gray-500">No dependents found</p>
              <Button 
                variant="link" 
                onClick={() => setIsDialogOpen(true)}
                className="mt-2"
              >
                Add your first dependent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Special Needs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDependents.map((dependent) => {
                    const principal = principals?.find(p => p.id === dependent.principalId);
                    const birthDate = new Date(dependent.dateOfBirth);
                    const age = differenceInYears(new Date(), birthDate);
                    
                    return (
                      <tr key={dependent.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AvatarWithInitials name={`${dependent.firstName} ${dependent.lastName}`} />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {dependent.firstName} {dependent.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{dependent.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {principal ? `${principal.firstName} ${principal.lastName}` : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={dependent.dependentType as any} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{age} years</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {dependent.hasDisability ? 'Yes' : 'No'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status="active" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="outline" size="sm" asChild className="mr-2">
                            <Link href={`/member-dashboard/${dependent.id}`}>
                              <i className="material-icons mr-1 text-xs">dashboard</i>
                              View Dashboard
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Dependent</DialogTitle>
          </DialogHeader>
          <DependentForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
