import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Bell, Settings, Trash2, Plus } from "lucide-react";
import { tokensAPI } from "@/api/tokens";

export default function TokenSettingsPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const queryClient = useQueryClient();
  const organizationId = parseInt(searchParams.get("organizationId") || "1");

  // Auto Top-Up State
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false);
  const [triggerType, setTriggerType] = useState<"threshold" | "scheduled" | "both">("threshold");
  const [thresholdPercentage, setThresholdPercentage] = useState("20");
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [topupPackageId, setTopupPackageId] = useState<number | null>(null);
  const [maxSpendingLimit, setMaxSpendingLimit] = useState("");

  // Notification State
  const [notificationThresholds, setNotificationThresholds] = useState<any[]>([]);
  const [newThresholdType, setNewThresholdType] = useState<"percentage" | "absolute">("percentage");
  const [newThresholdValue, setNewThresholdValue] = useState("");

  // Fetch auto top-up policy
  const { data: policyData } = useQuery({
    queryKey: ['/api/tokens/auto-topup', organizationId],
    queryFn: () => tokensAPI.getAutoTopupPolicy(organizationId),
  });

  // Fetch packages
  const { data: packagesData } = useQuery({
    queryKey: ['/api/tokens/packages'],
    queryFn: () => tokensAPI.getPackages(),
  });

  // Fetch notification thresholds
  const { data: thresholdsData } = useQuery({
    queryKey: ['/api/tokens/notifications/thresholds', organizationId],
    queryFn: () => tokensAPI.getNotificationThresholds(organizationId),
  });

  // Create/Update auto top-up policy
  const saveAutoTopupMutation = useMutation({
    mutationFn: async () => {
      const policy = policyData?.policy;

      if (policy) {
        return await tokensAPI.updateAutoTopupPolicy(policy.id, {
          triggerType,
          thresholdPercentage: triggerType !== "scheduled" ? parseFloat(thresholdPercentage) : undefined,
          scheduleFrequency: triggerType !== "threshold" ? scheduleFrequency : undefined,
          topupPackageId,
          maxSpendingLimitPerMonth: maxSpendingLimit ? parseFloat(maxSpendingLimit) : undefined,
        } as any);
      } else {
        return await tokensAPI.createAutoTopupPolicy({
          organizationId,
          triggerType,
          thresholdPercentage: triggerType !== "scheduled" ? parseFloat(thresholdPercentage) : undefined,
          scheduleFrequency: triggerType !== "threshold" ? scheduleFrequency : undefined,
          topupPackageId: topupPackageId!,
          paymentMethodId: 1,
          maxSpendingLimitPerMonth: maxSpendingLimit ? parseFloat(maxSpendingLimit) : undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/auto-topup', organizationId] });
    },
  });

  // Enable/Disable auto top-up
  const toggleAutoTopupMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const policy = policyData?.policy;
      if (!policy) return;

      if (enabled) {
        return await tokensAPI.enableAutoTopup(policy.id);
      } else {
        return await tokensAPI.disableAutoTopup(policy.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/auto-topup', organizationId] });
    },
  });

  // Add notification threshold
  const addThresholdMutation = useMutation({
    mutationFn: () =>
      tokensAPI.addNotificationThreshold({
        organizationId,
        thresholdType: newThresholdType,
        thresholdValue: parseFloat(newThresholdValue),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/notifications/thresholds', organizationId] });
      setNewThresholdValue("");
    },
  });

  // Remove notification threshold
  const removeThresholdMutation = useMutation({
    mutationFn: (thresholdId: number) => tokensAPI.removeNotificationThreshold(thresholdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/notifications/thresholds', organizationId] });
    },
  });

  const packages = packagesData?.packages || [];
  const policy = policyData?.policy;
  const thresholds = thresholdsData?.thresholds || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Token Settings</h1>
        <p className="text-gray-600 mt-1">Configure auto top-up and notifications</p>
      </div>

      <Tabs defaultValue="autotopup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="autotopup">
            <Zap className="h-4 w-4 mr-2" />
            Auto Top-Up
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Auto Top-Up Tab */}
        <TabsContent value="autotopup" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Auto Top-Up Configuration</CardTitle>
                  <CardDescription>Automatically purchase tokens when balance is low</CardDescription>
                </div>
                {policy && (
                  <div className="flex items-center gap-2">
                    <Label>Enabled</Label>
                    <Switch
                      checked={policy.isEnabled}
                      onCheckedChange={(checked) => {
                        toggleAutoTopupMutation.mutate(checked);
                      }}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={(value: any) => setTriggerType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threshold">Balance Threshold</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="both">Both Threshold & Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(triggerType === "threshold" || triggerType === "both") && (
                <div className="space-y-2">
                  <Label>Threshold Percentage</Label>
                  <Input
                    type="number"
                    value={thresholdPercentage}
                    onChange={(e) => setThresholdPercentage(e.target.value)}
                    placeholder="20"
                    min="1"
                    max="100"
                  />
                  <p className="text-sm text-gray-500">
                    Auto top-up when balance falls below this percentage
                  </p>
                </div>
              )}

              {(triggerType === "scheduled" || triggerType === "both") && (
                <div className="space-y-2">
                  <Label>Schedule Frequency</Label>
                  <Select
                    value={scheduleFrequency}
                    onValueChange={(value: any) => setScheduleFrequency(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Top-Up Package</Label>
                <Select
                  value={topupPackageId?.toString()}
                  onValueChange={(value) => setTopupPackageId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id.toString()}>
                        {pkg.name} - {pkg.tokenQuantity} tokens
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monthly Spending Limit (Optional)</Label>
                <Input
                  type="number"
                  value={maxSpendingLimit}
                  onChange={(e) => setMaxSpendingLimit(e.target.value)}
                  placeholder="1000"
                />
                <p className="text-sm text-gray-500">
                  Maximum amount to spend on auto top-ups per month
                </p>
              </div>

              {policy && policy.pausedAt && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Auto top-up is paused: {policy.pauseReason}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => saveAutoTopupMutation.mutate()}
                disabled={saveAutoTopupMutation.isLoading || !topupPackageId}
              >
                {policy ? "Update Configuration" : "Create Auto Top-Up"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Low Balance Notifications</CardTitle>
              <CardDescription>Get notified when your token balance is low</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {thresholds.map((threshold: any) => (
                  <div key={threshold.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">
                        {threshold.thresholdType === "percentage"
                          ? `${threshold.thresholdValue}% of total purchased`
                          : `${threshold.thresholdValue} tokens`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {threshold.notificationsSentCount} notifications sent
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeThresholdMutation.mutate(threshold.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {thresholds.length === 0 && (
                  <p className="text-center text-gray-500 py-6">No notification thresholds configured</p>
                )}
              </div>

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-semibold">Add New Threshold</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newThresholdType}
                      onValueChange={(value: any) => setNewThresholdType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="absolute">Absolute Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      value={newThresholdValue}
                      onChange={(e) => setNewThresholdValue(e.target.value)}
                      placeholder={newThresholdType === "percentage" ? "20" : "100"}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => addThresholdMutation.mutate()}
                  disabled={!newThresholdValue || addThresholdMutation.isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Threshold
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
