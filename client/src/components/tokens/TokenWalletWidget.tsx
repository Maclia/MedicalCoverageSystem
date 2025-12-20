import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, TrendingDown, Clock, AlertTriangle } from "lucide-react";
import { tokensAPI } from "@/api/tokens";
import { Link } from "wouter";

interface TokenWalletWidgetProps {
  organizationId: number;
  showPurchaseButton?: boolean;
  compact?: boolean;
}

export function TokenWalletWidget({
  organizationId,
  showPurchaseButton = true,
  compact = false,
}: TokenWalletWidgetProps) {
  // Fetch wallet data
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['/api/tokens/wallet', organizationId],
    queryFn: () => tokensAPI.getWallet(organizationId),
  });

  // Fetch usage forecast
  const { data: forecastData } = useQuery({
    queryKey: ['/api/tokens/wallet/forecast', organizationId],
    queryFn: () => tokensAPI.getUsageForecast(organizationId),
    enabled: !compact, // Only fetch forecast in full view
  });

  if (walletLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wallet = walletData?.wallet;
  if (!wallet) return null;

  const currentBalance = parseFloat(wallet.currentBalance);
  const totalPurchased = parseFloat(wallet.totalPurchased);
  const totalConsumed = parseFloat(wallet.totalConsumed);
  const percentageRemaining = totalPurchased > 0 ? (currentBalance / totalPurchased) * 100 : 0;

  const forecast = forecastData?.forecast;
  const isLowBalance = percentageRemaining < 20;
  const isCriticalBalance = percentageRemaining < 10;

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet.currency,
    }).format(amount);
  };

  if (compact) {
    return (
      <Card className={isCriticalBalance ? "border-red-500 border-2" : isLowBalance ? "border-yellow-500 border-2" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Token Balance</p>
              <p className="text-2xl font-bold">{formatNumber(currentBalance)}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(currentBalance * parseFloat(wallet.pricePerToken))}
              </p>
            </div>
            {showPurchaseButton && (
              <Link to={`/tokens/purchase?organizationId=${organizationId}`}>
                <Button size="sm">
                  <Coins className="h-4 w-4 mr-2" />
                  Purchase
                </Button>
              </Link>
            )}
          </div>
          {(isLowBalance || isCriticalBalance) && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${isCriticalBalance ? "text-red-600" : "text-yellow-600"}`}>
              <AlertTriangle className="h-4 w-4" />
              <span>{isCriticalBalance ? "Critical" : "Low"} balance - consider purchasing more tokens</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isCriticalBalance ? "border-red-500 border-2" : isLowBalance ? "border-yellow-500 border-2" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Token Wallet
            </CardTitle>
            <CardDescription>
              {wallet.isActive ? (
                "Your token balance and usage"
              ) : (
                <span className="text-red-600">Wallet suspended - {wallet.suspensionReason}</span>
              )}
            </CardDescription>
          </div>
          {wallet.isActive && (
            <Badge variant={isCriticalBalance ? "destructive" : isLowBalance ? "secondary" : "default"}>
              {isCriticalBalance ? "Critical" : isLowBalance ? "Low Balance" : "Active"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Current Balance</p>
            <p className="text-3xl font-bold">{formatNumber(currentBalance)}</p>
          </div>
          <p className="text-sm text-gray-500">
            Value: {formatCurrency(currentBalance * parseFloat(wallet.pricePerToken))}
          </p>
          <Progress value={percentageRemaining} className="mt-2" />
          <p className="text-xs text-gray-500 mt-1">
            {percentageRemaining.toFixed(1)}% of total purchased
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-600">Total Purchased</p>
            <p className="text-lg font-semibold">{formatNumber(totalPurchased)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">Total Consumed</p>
            <p className="text-lg font-semibold">{formatNumber(totalConsumed)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">Price per Token</p>
            <p className="text-lg font-semibold">{formatCurrency(parseFloat(wallet.pricePerToken))}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">Currency</p>
            <p className="text-lg font-semibold">{wallet.currency}</p>
          </div>
        </div>

        {/* Usage Forecast */}
        {forecast && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Usage Forecast</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600">Daily Consumption</p>
                  <p className="text-sm font-semibold">
                    {formatNumber(forecast.averageDailyConsumption)} tokens/day
                  </p>
                </div>
              </div>
              {forecast.projectedDaysRemaining !== null && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Days Remaining</p>
                    <p className="text-sm font-semibold">
                      ~{forecast.projectedDaysRemaining} days
                    </p>
                  </div>
                </div>
              )}
            </div>
            {forecast.projectedDepletionDate && (
              <p className="text-xs text-gray-500">
                Estimated depletion: {new Date(forecast.projectedDepletionDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Low Balance Warning */}
        {(isLowBalance || isCriticalBalance) && wallet.isActive && (
          <div className={`p-3 rounded-md flex items-start gap-2 ${isCriticalBalance ? "bg-red-50 text-red-800" : "bg-yellow-50 text-yellow-800"}`}>
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isCriticalBalance ? "Critical Balance Alert" : "Low Balance Warning"}
              </p>
              <p className="text-xs mt-1">
                {isCriticalBalance
                  ? "Your token balance is critically low. Purchase tokens immediately to avoid service interruption."
                  : "Your token balance is running low. Consider purchasing more tokens soon."}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {wallet.isActive && (
          <div className="flex gap-2">
            {showPurchaseButton && (
              <Link to={`/tokens/purchase?organizationId=${organizationId}`} className="flex-1">
                <Button className="w-full">
                  <Coins className="h-4 w-4 mr-2" />
                  Purchase Tokens
                </Button>
              </Link>
            )}
            <Link to={`/tokens/history?organizationId=${organizationId}`}>
              <Button variant="outline">View History</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TokenWalletWidget;
