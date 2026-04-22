import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { tokensAPI } from "@/api/tokens";

interface TokenRevenueCardProps {
  organizationId?: number;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function TokenRevenueCard({ organizationId, dateRange }: TokenRevenueCardProps) {
  // Default to last 30 days if no date range provided
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const start = dateRange?.startDate || defaultStartDate;
  const end = dateRange?.endDate || defaultEndDate;

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['/api/tokens/revenue', start.toISOString(), end.toISOString(), organizationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/tokens/revenue?startDate=${start.toISOString()}&endDate=${end.toISOString()}${organizationId ? `&organizationId=${organizationId}` : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch token revenue');
      return response.json();
    },
  });

  const revenue = revenueData?.revenue;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!revenue) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            Token Revenue
          </CardTitle>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {revenue.purchaseCount} purchases
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Revenue */}
        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Token Revenue</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(revenue.totalRevenue, revenue.currency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatNumber(revenue.tokensSold)} tokens sold
            </p>
          </div>
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Coins className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Revenue Breakdown</p>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">One-Time Purchases</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(revenue.oneTimePurchaseRevenue, revenue.currency)}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Subscriptions</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(revenue.subscriptionRevenue, revenue.currency)}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Auto Top-Up</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(revenue.autoTopupRevenue, revenue.currency)}
            </span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Subscriptions</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">
                {revenue.activeSubscriptions}
              </Badge>
              {revenue.activeSubscriptions > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
