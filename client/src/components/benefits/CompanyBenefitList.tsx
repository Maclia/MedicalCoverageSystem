import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/utils/format";
import { CompanyBenefit, Company } from "@shared/schema";

type EnhancedCompanyBenefit = CompanyBenefit & {
  benefitName?: string;
  benefitCategory?: string;
  companyName?: string;
  premiumPeriodId?: number;
};

export default function CompanyBenefitList() {
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Get company benefits
  const { data: companyBenefits, isLoading } = useQuery({
    queryKey: companyFilter === "all" 
      ? ["/api/company-benefits"] 
      : ["/api/company-benefits", { companyId: companyFilter }],
  });

  // Get companies for filter
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
  });

  const handleCompanyChange = (value: string) => {
    setCompanyFilter(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="company-filter">Filter by Company:</Label>
          <Select value={companyFilter} onValueChange={handleCompanyChange}>
            <SelectTrigger id="company-filter" className="w-[200px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies?.map((company: Company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {companyBenefits ? `Showing ${companyBenefits.length} company benefits` : "Loading benefits..."}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading company benefits...</p>
          </div>
        </div>
      ) : companyBenefits && companyBenefits.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Benefit</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Added Date</TableHead>
              <TableHead>Additional Coverage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companyBenefits.map((benefit: EnhancedCompanyBenefit) => (
              <TableRow key={benefit.id}>
                <TableCell className="font-medium">
                  {benefit.companyName}
                </TableCell>
                <TableCell>{benefit.benefitName}</TableCell>
                <TableCell>
                  {benefit.benefitCategory && (
                    <Badge variant="outline" className="capitalize">
                      {benefit.benefitCategory}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatDate(benefit.createdAt)}</TableCell>
                <TableCell>
                  {benefit.additionalCoverage ? (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline">Standard</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-muted-foreground">No company benefits found</p>
              {companyFilter !== "all" && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try changing the company filter or add a new company benefit
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}