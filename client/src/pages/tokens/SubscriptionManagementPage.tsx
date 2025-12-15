import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Pause, Play, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { tokensAPI } from "@/api/tokens";

export default function SubscriptionManagementPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const organizationId = parseInt(searchParams.get("organizationId") || "1");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<"monthly" | "quarterly" | "annual">("monthly");

  // Fetch subscription
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/tokens/subscription', organizationId],
    queryFn: () => tokensAPI.getSubscription(organizationId),
  });

  // Fetch packages
  const { data: packagesData } = useQuery({
    queryKey: ['/api/tokens/packages'],
    queryFn: () => tokensAPI.getPackages(),
  });

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: () =>
      tokensAPI.createSubscription({
        organizationId,
        packageId: selectedPackageId!,
        frequency: selectedFrequency,
        paymentMethodId: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/subscription', organizationId] });
      setShowCreateForm(false);
    },
  });

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: (subscriptionId: number) => tokensAPI.pauseSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/subscription', organizationId] });
    },
  });

  // Resume subscription mutation
  const resumeMutation = useMutation({
    mutationFn: (subscriptionId: number) => tokensAPI.resumeSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/subscription', organizationId] });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: number) =>
      tokensAPI.cancelSubscription(subscriptionId, "User requested cancellation"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/subscription', organizationId] });
    },
  });

  const subscription = subscriptionData?.subscription;
  const packages = packagesData?.packages || [];

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(parseFloat(amount));
  };

  const formatNumber = (num: string) => {
    return new Intl.NumberFormat('en-US').format(parseFloat(num));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any }> = {
      active: { variant: "default", icon: CheckCircle },
      paused: { variant: "secondary", icon: Pause },
      payment_failed: { variant: "destructive", icon: AlertTriangle },
      cancelled: { variant: "destructive", icon: XCircle },
      expired: { variant: "secondary", icon: XCircle },
    };

    const config = variants[status] || { variant: "secondary" as const, icon: CheckCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage your recurring token subscription</p>
        </div>
        {!subscription && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>Create Subscription</Button>
        )}
      </div>

      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Subscription</CardTitle>
                <CardDescription>Recurring token delivery</CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Token Quantity</p>
                <p className="text-2xl font-bold">{formatNumber(subscription.tokenQuantity)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(subscription.totalAmount, subscription.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Frequency</p>
                <p className="text-2xl font-bold capitalize">{subscription.frequency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Billing</p>
                <p className="text-lg font-semibold">
                  {new Date(subscription.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {subscription.status === "payment_failed" && subscription.gracePeriodEnds && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Payment failed. Grace period ends on{" "}
                  {new Date(subscription.gracePeriodEnds).toLocaleDateString()}. Please update your
                  payment method.
                </AlertDescription>
              </Alert>
            )}

            {subscription.lastBillingDate && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">Last Billing</p>
                <p className="text-sm font-medium">
                  {new Date(subscription.lastBillingDate).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {subscription.status === "active" && (
                <Button
                  variant="outline"
                  onClick={() => pauseMutation.mutate(subscription.id)}
                  disabled={pauseMutation.isLoading}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Subscription
                </Button>
              )}

              {subscription.status === "paused" && (
                <Button
                  onClick={() => resumeMutation.mutate(subscription.id)}
                  disabled={resumeMutation.isLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Subscription
                </Button>
              )}

              {(subscription.status === "active" || subscription.status === "paused") && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel your subscription?")) {
                      cancelMutation.mutate(subscription.id);
                    }
                  }}
                  disabled={cancelMutation.isLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Subscription</CardTitle>
            <CardDescription>Set up recurring token delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Package</Label>
              <Select
                value={selectedPackageId?.toString()}
                onValueChange={(value) => setSelectedPackageId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a token package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg: any) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name} - {formatNumber(pkg.tokenQuantity)} tokens
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing Frequency</Label>
              <Select
                value={selectedFrequency}
                onValueChange={(value: any) => setSelectedFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (Every 3 months)</SelectItem>
                  <SelectItem value="annual">Annual (Once per year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Your first payment will be processed immediately, and subsequent payments will be
                charged on the {selectedFrequency} billing cycle.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!selectedPackageId || createMutation.isLoading}
              >
                {createMutation.isLoading ? "Creating..." : "Create Subscription"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-gray-600 mt-4">No active subscription</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a subscription for automatic recurring token delivery
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
