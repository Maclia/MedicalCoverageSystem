import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

export default function PremiumPeriodCard() {
  const { data: periodData, isLoading } = useQuery({
    queryKey: ['/api/periods/active'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Current Premium Period</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!periodData) {
    return (
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Current Premium Period</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="py-8 text-center">
            <p className="text-gray-500">No active period found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate period progress
  const startDate = new Date(periodData.startDate);
  const endDate = new Date(periodData.endDate);
  const today = new Date();
  
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  
  const progressPercentage = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-lg font-semibold">Current Premium Period</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">Period</span>
          <span className="text-sm font-medium text-gray-700">{periodData.name}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">Start Date</span>
          <span className="text-sm font-medium text-gray-700">{format(startDate, "MMM d, yyyy")}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">End Date</span>
          <span className="text-sm font-medium text-gray-700">{format(endDate, "MMM d, yyyy")}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">Status</span>
          <StatusBadge status={periodData.status as any} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">{Math.round(progressPercentage)}% complete</span>
            <span className="text-xs text-gray-500">{daysRemaining} days remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
