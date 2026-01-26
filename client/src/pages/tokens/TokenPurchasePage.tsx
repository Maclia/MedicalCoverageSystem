import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coins, CreditCard, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { tokensAPI } from "@/api/tokens";
import type { TokenPackage } from "@/api/tokens";

export default function TokenPurchasePage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const queryClient = useQueryClient();

  const organizationId = parseInt(searchParams.get("organizationId") || "1");

  const [purchaseType, setPurchaseType] = useState<"package" | "custom">("package");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState<number>(1);
  const [step, setStep] = useState<"select" | "confirm" | "processing" | "complete">("select");
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  // Fetch packages
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['/api/tokens/packages'],
    queryFn: () => tokensAPI.getPackages(),
  });

  // Fetch wallet
  const { data: walletData } = useQuery({
    queryKey: ['/api/tokens/wallet', organizationId],
    queryFn: () => tokensAPI.getWallet(organizationId),
  });

  // Calculate price mutation
  const calculatePriceMutation = useMutation({
    mutationFn: async () => {
      if (purchaseType === "package" && selectedPackageId) {
        return await tokensAPI.calculatePackagePrice(selectedPackageId, organizationId);
      } else if (purchaseType === "custom" && customAmount) {
        return await tokensAPI.calculateCustomPrice(organizationId, parseFloat(customAmount));
      }
      throw new Error("Invalid purchase configuration");
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const purchase = await tokensAPI.initializePurchase({
        organizationId,
        purchaseType: "one_time",
        packageId: purchaseType === "package" ? selectedPackageId! : undefined,
        customTokenQuantity: purchaseType === "custom" ? parseFloat(customAmount) : undefined,
        paymentMethodId,
      });

      // Execute purchase
      const result = await tokensAPI.executePurchase(purchase.purchase.purchaseReferenceId);
      return result;
    },
    onSuccess: (data) => {
      setPurchaseResult(data);
      setStep("complete");
      // Invalidate wallet query to refresh balance
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/wallet', organizationId] });
    },
  });

  const handleContinue = async () => {
    if (step === "select") {
      await calculatePriceMutation.mutateAsync();
      setStep("confirm");
    } else if (step === "confirm") {
      setStep("processing");
      await purchaseMutation.mutateAsync();
    }
  };

  const isSelectionValid = () => {
    if (purchaseType === "package") {
      return selectedPackageId !== null;
    }
    return customAmount && parseFloat(customAmount) > 0;
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (packagesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Purchase Tokens</h1>
        </div>
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

  const packages = packagesData?.packages || [];
  const wallet = walletData?.wallet;
  const pricing = calculatePriceMutation.data;

  // Step 1: Selection
  if (step === "select") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Purchase Tokens</h1>
            <p className="text-gray-600 mt-1">Select a package or enter a custom amount</p>
          </div>
          {wallet && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold">{formatNumber(parseFloat(wallet.currentBalance))}</p>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Purchase Method</CardTitle>
            <CardDescription>Choose a predefined package or enter a custom token amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={purchaseType} onValueChange={(value: any) => setPurchaseType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="package" id="package" />
                <Label htmlFor="package">Predefined Package</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Amount</Label>
              </div>
            </RadioGroup>

            {purchaseType === "package" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg: TokenPackage) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all ${
                      selectedPackageId === pkg.id
                        ? "border-blue-500 border-2 shadow-md"
                        : "hover:border-gray-400"
                    }`}
                    onClick={() => setSelectedPackageId(pkg.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {pkg.name}
                        {selectedPackageId === pkg.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-3xl font-bold">{formatNumber(parseFloat(pkg.tokenQuantity))}</p>
                        <p className="text-sm text-gray-600">tokens</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {purchaseType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customAmount">Token Amount</Label>
                <Input
                  id="customAmount"
                  type="number"
                  placeholder="Enter number of tokens"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                />
                <p className="text-sm text-gray-500">Minimum: 1 token | Maximum: 1,000,000 tokens</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!isSelectionValid()}
              >
                Continue to Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Confirmation
  if (step === "confirm") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Confirm Purchase</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Summary</CardTitle>
            <CardDescription>Review your purchase details before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {calculatePriceMutation.isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-600 mt-2">Calculating price...</p>
              </div>
            ) : pricing ? (
              <>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Token Quantity</span>
                    <span className="text-xl font-semibold">{formatNumber(pricing.tokenQuantity)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price per Token</span>
                    <span className="text-xl font-semibold">{formatCurrency(pricing.pricePerToken, pricing.currency)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(pricing.totalAmount, pricing.currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">Default Payment Method</span>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    After confirming, tokens will be added to your wallet immediately upon successful payment.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep("select")}>
                    Back
                  </Button>
                  <Button onClick={handleContinue}>
                    Confirm & Pay
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Processing
  if (step === "processing") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Processing Purchase</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-blue-500" />
              <p className="text-xl font-semibold mt-4">Processing your payment...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we complete your purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Complete
  if (step === "complete") {
    const isSuccess = purchaseResult?.status === "completed";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Purchase Complete</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              {isSuccess ? (
                <>
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                  <p className="text-2xl font-semibold mt-4 text-green-700">Purchase Successful!</p>
                  <p className="text-gray-600 mt-2">Your tokens have been added to your wallet</p>

                  <div className="bg-green-50 rounded-lg p-6 mt-6 max-w-md mx-auto">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tokens Purchased</span>
                        <span className="font-semibold">{formatNumber(pricing?.tokenQuantity || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New Balance</span>
                        <span className="font-semibold">{formatNumber(purchaseResult?.newBalance || 0)}</span>
                      </div>
                      {purchaseResult?.gatewayTransactionId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transaction ID</span>
                          <span className="font-mono text-xs">{purchaseResult.gatewayTransactionId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-2 mt-6">
                    <Button onClick={() => window.location.href = `/tokens/history?organizationId=${organizationId}`}>
                      View History
                    </Button>
                    <Button variant="outline" onClick={() => window.history.back()}>
                      Back to Dashboard
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 mx-auto text-red-500" />
                  <p className="text-2xl font-semibold mt-4 text-red-700">Purchase Failed</p>
                  <p className="text-gray-600 mt-2">There was an error processing your payment</p>

                  <div className="flex justify-center gap-2 mt-6">
                    <Button onClick={() => setStep("select")}>
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => window.history.back()}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
