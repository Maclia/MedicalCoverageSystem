import { apiRequest } from "@/lib/queryClient";

// Types
export interface TokenWallet {
  id: number;
  organizationId: number;
  currentBalance: string;
  totalPurchased: string;
  totalConsumed: string;
  pricePerToken: string;
  expirationEnabled: boolean;
  expirationDays: number | null;
  currency: string;
  isActive: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPackage {
  id: number;
  name: string;
  tokenQuantity: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPurchase {
  id: number;
  purchaseReferenceId: string;
  organizationId: number;
  purchasedBy: number;
  purchaseType: 'one_time' | 'subscription' | 'auto_topup';
  tokenQuantity: string;
  pricePerToken: string;
  totalAmount: string;
  currency: string;
  packageId: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethodId: number | null;
  gatewayProvider: string | null;
  gatewayTransactionId: string | null;
  invoiceId: number | null;
  subscriptionId: number | null;
  autoTopupPolicyId: number | null;
  tokenExpirationDate: string | null;
  paymentInitiatedAt: string | null;
  paymentCompletedAt: string | null;
  tokensAllocatedAt: string | null;
  failureReason: string | null;
  refundedAt: string | null;
  refundAmount: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenSubscription {
  id: number;
  organizationId: number;
  packageId: number;
  tokenQuantity: string;
  pricePerToken: string;
  totalAmount: string;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  status: 'active' | 'paused' | 'payment_failed' | 'cancelled' | 'expired';
  paymentMethodId: number;
  nextBillingDate: string;
  lastBillingDate: string | null;
  lastSuccessfulPayment: string | null;
  failedPaymentCount: number;
  gracePeriodEnds: string | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  cancellationReason: string | null;
  startedAt: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoTopupPolicy {
  id: number;
  organizationId: number;
  isEnabled: boolean;
  triggerType: 'threshold' | 'scheduled' | 'both';
  thresholdPercentage: string | null;
  scheduleFrequency: 'daily' | 'weekly' | 'monthly' | null;
  nextScheduledRun: string | null;
  topupPackageId: number | null;
  topupTokenQuantity: string | null;
  paymentMethodId: number;
  maxSpendingLimitPerMonth: string | null;
  currentMonthSpending: string;
  spendingResetDate: string | null;
  lastTriggeredAt: string | null;
  lastPurchaseId: number | null;
  failureCount: number;
  pausedAt: string | null;
  pauseReason: string | null;
  invoiceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceHistory {
  id: number;
  organizationId: number;
  changeAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  changeType: string;
  referenceType: string | null;
  referenceId: number | null;
  description: string | null;
  performedBy: number | null;
  timestamp: string;
  metadata: string | null;
}

export interface LowBalanceNotification {
  id: number;
  organizationId: number;
  thresholdType: 'percentage' | 'absolute';
  thresholdValue: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastNotifiedBalance: string | null;
  notificationsSentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsageForecast {
  averageDailyConsumption: number;
  projectedDaysRemaining: number | null;
  projectedDepletionDate: string | null;
  calculatedAt: Date;
}

export interface PricingResult {
  tokenQuantity: number;
  pricePerToken: number;
  totalAmount: number;
  currency: string;
}

export interface TokenRevenueReport {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  oneTimePurchaseRevenue: number;
  subscriptionRevenue: number;
  autoTopupRevenue: number;
  tokensSold: number;
  purchaseCount: number;
  activeSubscriptions: number;
  currency: string;
}

export interface MonthlyTokenRevenue {
  month: number;
  revenue: number;
  tokensSold: number;
}

export interface TopTokenPurchaser {
  organizationId: number;
  companyName: string;
  totalSpent: number;
  tokensPurchased: number;
}

class TokensAPI {
  private readonly BASE_URL = '/api/tokens';

  // ===== Wallet Operations =====

  /**
   * Get organization's token wallet
   */
  async getWallet(organizationId: number): Promise<{ wallet: TokenWallet }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/wallet/${organizationId}`);
    return response.json();
  }

  /**
   * Get current token balance
   */
  async getBalance(organizationId: number): Promise<{ balance: number; currency: string }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/wallet/${organizationId}/balance`);
    return response.json();
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(
    organizationId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      changeType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    history: BalanceHistory[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/wallet/${organizationId}/history${query ? `?${query}` : ''}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  /**
   * Get usage forecast
   */
  async getUsageForecast(organizationId: number): Promise<{ forecast: UsageForecast }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/wallet/${organizationId}/forecast`);
    return response.json();
  }

  // ===== Package Operations =====

  /**
   * Get all active token packages
   */
  async getPackages(): Promise<{ packages: TokenPackage[] }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/packages`);
    return response.json();
  }

  /**
   * Calculate price for a package
   */
  async calculatePackagePrice(
    packageId: number,
    organizationId: number
  ): Promise<PricingResult> {
    const response = await apiRequest(
      "GET",
      `${this.BASE_URL}/packages/${packageId}/price?organizationId=${organizationId}`
    );
    return response.json();
  }

  /**
   * Calculate price for custom token amount
   */
  async calculateCustomPrice(
    organizationId: number,
    tokenQuantity: number
  ): Promise<PricingResult> {
    const response = await apiRequest("POST", `${this.BASE_URL}/packages/calculate-custom`, {
      body: JSON.stringify({ organizationId, tokenQuantity }),
    });
    return response.json();
  }

  // ===== Purchase Operations =====

  /**
   * Initialize token purchase
   */
  async initializePurchase(data: {
    organizationId: number;
    purchaseType: 'one_time' | 'subscription' | 'auto_topup';
    packageId?: number;
    customTokenQuantity?: number;
    paymentMethodId: number;
  }): Promise<{ purchase: TokenPurchase }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/purchase`, {
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Execute purchase payment
   */
  async executePurchase(referenceId: string): Promise<{
    status: string;
    gatewayTransactionId: string | null;
    tokensAllocated: boolean;
    newBalance: number;
    invoiceId: number | null;
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/purchase/${referenceId}/execute`);
    return response.json();
  }

  /**
   * Get purchase details
   */
  async getPurchase(referenceId: string): Promise<{ purchase: TokenPurchase }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/purchase/${referenceId}`);
    return response.json();
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(
    organizationId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      purchaseType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    purchases: TokenPurchase[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams({ organizationId: organizationId.toString() });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    const endpoint = `${this.BASE_URL}/purchase?${query}`;

    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  // ===== Subscription Operations =====

  /**
   * Create token subscription
   */
  async createSubscription(data: {
    organizationId: number;
    packageId: number;
    frequency: 'monthly' | 'quarterly' | 'annual';
    paymentMethodId: number;
  }): Promise<{ subscription: TokenSubscription }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/subscription`, {
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Get active subscription
   */
  async getSubscription(organizationId: number): Promise<{ subscription: TokenSubscription }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/subscription/${organizationId}`);
    return response.json();
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(subscriptionId: number): Promise<{ subscription: TokenSubscription }> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/subscription/${subscriptionId}/pause`);
    return response.json();
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId: number): Promise<{ subscription: TokenSubscription }> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/subscription/${subscriptionId}/resume`);
    return response.json();
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: number,
    reason?: string
  ): Promise<{ subscription: TokenSubscription }> {
    const response = await apiRequest("DELETE", `${this.BASE_URL}/subscription/${subscriptionId}`, {
      body: JSON.stringify({ reason }),
    });
    return response.json();
  }

  // ===== Auto Top-Up Operations =====

  /**
   * Create auto top-up policy
   */
  async createAutoTopupPolicy(data: {
    organizationId: number;
    triggerType: 'threshold' | 'scheduled' | 'both';
    thresholdPercentage?: number;
    scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
    topupPackageId?: number;
    topupTokenQuantity?: number;
    paymentMethodId: number;
    maxSpendingLimitPerMonth?: number;
    invoiceEnabled?: boolean;
  }): Promise<{ policy: AutoTopupPolicy }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/auto-topup`, {
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Get auto top-up policy
   */
  async getAutoTopupPolicy(organizationId: number): Promise<{ policy: AutoTopupPolicy }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/auto-topup/${organizationId}`);
    return response.json();
  }

  /**
   * Update auto top-up policy
   */
  async updateAutoTopupPolicy(
    policyId: number,
    updates: Partial<AutoTopupPolicy>
  ): Promise<{ policy: AutoTopupPolicy }> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/auto-topup/${policyId}`, {
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  /**
   * Enable auto top-up
   */
  async enableAutoTopup(policyId: number): Promise<{ policy: AutoTopupPolicy }> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/auto-topup/${policyId}/enable`);
    return response.json();
  }

  /**
   * Disable auto top-up
   */
  async disableAutoTopup(policyId: number): Promise<{ policy: AutoTopupPolicy }> {
    const response = await apiRequest("PUT", `${this.BASE_URL}/auto-topup/${policyId}/disable`);
    return response.json();
  }

  // ===== Notification Threshold Operations =====

  /**
   * Add low balance notification threshold
   */
  async addNotificationThreshold(data: {
    organizationId: number;
    thresholdType: 'percentage' | 'absolute';
    thresholdValue: number;
  }): Promise<{ threshold: LowBalanceNotification }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/notifications/thresholds`, {
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Get all notification thresholds
   */
  async getNotificationThresholds(organizationId: number): Promise<{ thresholds: LowBalanceNotification[] }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/notifications/thresholds/${organizationId}`);
    return response.json();
  }

  /**
   * Remove notification threshold
   */
  async removeNotificationThreshold(thresholdId: number): Promise<void> {
    await apiRequest("DELETE", `${this.BASE_URL}/notifications/thresholds/${thresholdId}`);
  }

  // ===== Finance & Revenue Operations =====

  /**
   * Get token revenue for a date range
   */
  async getTokenRevenue(
    startDate: string,
    endDate: string,
    organizationId?: number
  ): Promise<{ revenue: TokenRevenueReport }> {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    if (organizationId) {
      queryParams.append('organizationId', organizationId.toString());
    }

    const response = await apiRequest("GET", `${this.BASE_URL}/revenue?${queryParams.toString()}`);
    return response.json();
  }

  /**
   * Get monthly token revenue for a year
   */
  async getMonthlyTokenRevenue(
    year: number,
    organizationId?: number
  ): Promise<{ monthlyRevenue: MonthlyTokenRevenue[]; year: number }> {
    const queryParams = organizationId
      ? `?organizationId=${organizationId}`
      : '';

    const response = await apiRequest("GET", `${this.BASE_URL}/revenue/monthly/${year}${queryParams}`);
    return response.json();
  }

  /**
   * Get top token purchasers for a date range
   */
  async getTopTokenPurchasers(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<{ topPurchasers: TopTokenPurchaser[] }> {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      limit: limit.toString(),
    });

    const response = await apiRequest("GET", `${this.BASE_URL}/revenue/top-purchasers?${queryParams.toString()}`);
    return response.json();
  }
}

export const tokensAPI = new TokensAPI();
export default tokensAPI;
