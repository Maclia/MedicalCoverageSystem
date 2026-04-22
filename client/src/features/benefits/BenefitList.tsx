import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/ui/table";
import {
  Card,
  CardContent,
} from "@/features/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/ui/select";
import { Badge } from "@/features/ui/badge";
import { Label } from "@/features/ui/label";
import { formatCurrency } from "@/utils/format";
import { useBenefits } from "../../services/api/benefitsApi";

export default function BenefitList() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: benefits = [], isLoading } = useBenefits(categoryFilter);

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  // Get unique categories for filter
  const categories = benefits
    ? [...new Set(benefits.map(b => b.category))]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="category-filter">Filter by Category:</Label>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category-filter" className="w-[180px]">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {benefits ? `Showing ${benefits.length} persisted benefits` : "Loading benefits..."}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading benefits...</p>
          </div>
        </div>
      ) : benefits && benefits.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Coverage Details</TableHead>
              <TableHead>Limit</TableHead>
              <TableHead>Waiting Period</TableHead>
              <TableHead>Standard</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {benefits.map((benefit) => (
              <TableRow key={benefit.id}>
                <TableCell className="font-medium">{benefit.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {benefit.category}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={benefit.coverageDetails}>
                  {benefit.coverageDetails}
                </TableCell>
                <TableCell>
                  {benefit.limitAmount > 0
                    ? formatCurrency(benefit.limitAmount)
                    : "No Limit"}
                </TableCell>
                <TableCell>
                  {benefit.hasWaitingPeriod
                    ? `${benefit.waitingPeriodDays ?? 0} days`
                    : "None"}
                </TableCell>
                <TableCell>
                  {benefit.isStandard ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Standard
                    </Badge>
                  ) : (
                    <Badge variant="outline">Custom</Badge>
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
              <p className="text-muted-foreground">No benefits found</p>
              {categoryFilter !== "all" && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try changing the category filter
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
