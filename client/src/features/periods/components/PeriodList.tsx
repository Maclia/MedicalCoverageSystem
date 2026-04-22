import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import PeriodForm from "./PeriodForm";

export default function PeriodList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: periods, isLoading } = useQuery({
    queryKey: ['/api/periods'],
  });

  const { data: rates, isLoading: isLoadingRates } = useQuery({
    queryKey: ['/api/premium-rates'],
  });
  
  const getRateForPeriod = (periodId: number) => {
    return rates?.find(rate => rate.periodId === periodId);
  };

  if (isLoading || isLoadingRates) {
    return (
      <Card>
        <CardHeader className="px-6 py-4 border-b flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Premium Periods</CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
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
          <CardTitle className="text-lg font-semibold">Premium Periods</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <i className="material-icons mr-1">add</i> Add Period
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {!periods || periods.length === 0 ? (
            <div className="text-center py-12">
              <i className="material-icons text-gray-400 text-4xl mb-2">history</i>
              <p className="text-gray-500">No periods found</p>
              <Button 
                variant="link" 
                onClick={() => setIsDialogOpen(true)}
                className="mt-2"
              >
                Create your first premium period
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {periods.map((period) => {
                const rate = getRateForPeriod(period.id);
                
                return (
                  <div 
                    key={period.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{period.name}</h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(period.startDate), "MMM d, yyyy")} - {format(new Date(period.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <StatusBadge status={period.status as any} />
                    </div>
                    
                    {rate && (
                      <div className="mt-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Principal Rate:</span>
                          <span className="font-medium">${rate.principalRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Spouse Rate:</span>
                          <span className="font-medium">${rate.spouseRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Child Rate:</span>
                          <span className="font-medium">${rate.childRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Special Needs Rate:</span>
                          <span className="font-medium">${rate.specialNeedsRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                          <span className="text-gray-700 font-medium">Tax Rate:</span>
                          <span className="font-medium">{(rate.taxRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Premium Period</DialogTitle>
          </DialogHeader>
          <PeriodForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
