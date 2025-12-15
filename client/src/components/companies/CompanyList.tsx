import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import CompanyForm from "./CompanyForm";

export default function CompanyList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: companies, isLoading } = useQuery({
    queryKey: ['/api/companies'],
  });
  
  const filteredCompanies = companies?.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-6 py-4 border-b flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Companies</CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between mb-6">
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="px-6 py-4 border-b flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Companies</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <i className="material-icons mr-1">add</i> Add Company
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between mb-6">
            <div className="relative w-64">
              <i className="material-icons absolute left-3 top-2.5 text-gray-400">search</i>
              <Input
                className="pl-10"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <i className="material-icons text-gray-400 text-4xl mb-2">business</i>
              <p className="text-gray-500">No companies found</p>
              <Button 
                variant="link" 
                onClick={() => setIsDialogOpen(true)}
                className="mt-2"
              >
                Add your first company
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <Link key={company.id} href={`/companies/${company.id}`}>
                  <a className="block border border-gray-200 rounded-lg hover:shadow-md transition-shadow p-4">
                    <div className="flex items-center mb-3">
                      <AvatarWithInitials name={company.name} bgColor="bg-blue-600" />
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">
                          ID: {company.registrationNumber}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex">
                        <i className="material-icons text-gray-400 text-base mr-2">person</i>
                        <span className="text-gray-600">{company.contactPerson}</span>
                      </div>
                      <div className="flex">
                        <i className="material-icons text-gray-400 text-base mr-2">email</i>
                        <span className="text-gray-600">{company.contactEmail}</span>
                      </div>
                      <div className="flex">
                        <i className="material-icons text-gray-400 text-base mr-2">phone</i>
                        <span className="text-gray-600">{company.contactPhone}</span>
                      </div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
          </DialogHeader>
          <CompanyForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
