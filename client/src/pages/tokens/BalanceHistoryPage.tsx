import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { tokensAPI } from "@/api/tokens";
import type { BalanceHistory } from "@/api/tokens";

export default function BalanceHistoryPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const organizationId = parseInt(searchParams.get("organizationId") || "1");

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['/api/tokens/wallet/history', organizationId, currentPage],
    queryFn: () =>
      tokensAPI.getBalanceHistory(organizationId, {
        limit: pageSize,
        offset: currentPage * pageSize,
      }),
  });

  const formatNumber = (num: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parseFloat(num));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeLabel = (changeType: string) => {
    const labels: Record<string, string> = {
      purchase: "Purchase",
      consumption: "Consumption",
      expiration: "Expiration",
      refund: "Refund",
      adjustment: "Adjustment",
    };
    return labels[changeType] || changeType;
  };

  const history = data?.history || [];
  const totalRecords = data?.total || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Balance History</h1>
          <p className="text-gray-600 mt-1">Track all changes to your token balance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Balance Changes</CardTitle>
          <CardDescription>{totalRecords} total transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No balance history found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Balance Before</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry: BalanceHistory) => {
                    const changeAmount = parseFloat(entry.changeAmount);
                    const isPositive = changeAmount > 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{formatDate(entry.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getChangeTypeLabel(entry.changeType)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {entry.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {isPositive ? "+" : ""}{formatNumber(entry.changeAmount)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(entry.balanceBefore)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(entry.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Showing {currentPage * pageSize + 1} to{" "}
                    {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
