/**
 * Payment Gateway Service
 * Multi-payment method support: Bank transfers, M-Pesa, Credit/Debit cards
 * Real-time payment status updates and webhooks handling
 * PCI compliance and secure payment data handling
 */

import { storage } from '../storage';
import * as schema from '../../shared/schema.js';

export interface PaymentGatewayProvider {
  id: number;
  name: string;
  type: 'stripe' | 'paypal' | 'mpesa' | 'bank_transfer' | 'square' | 'adyen';
  isActive: boolean;
  configuration: PaymentGatewayConfig;
  supportedMethods: PaymentMethodType[];
  supportedCurrencies: string[];
  feeStructure: PaymentFeeStructure;
  rateLimits: RateLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentGatewayConfig {
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
  endpointUrl?: string;
  callbacks: {
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
    webhookUrl: string;
  };
  customSettings: Record<string, any>;
}

export interface PaymentFeeStructure {
  fixedFee: number;
  percentageFee: number;
  internationalFee?: number;
  currencyConversionFee?: number;
  refundFee?: number;
  chargebackFee?: number;
  minimumFee?: number;
  maximumFee?: number;
}

export interface RateLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export type PaymentMethodType = 'card' | 'bank' | 'mobile_money' | 'digital_wallet' | 'ach' | 'wire';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  memberId?: number;
  companyId?: number;
  invoiceIds?: number[];
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
  statementDescriptor?: string;
  receiptEmail?: string;
  customerId?: string;
}

export interface PaymentMethod {
  id?: number;
  type: PaymentMethodType;
  gatewayProvider: string;
  tokenizedData?: string; // Tokenized payment method details
  cardDetails?: CardDetails;
  bankDetails?: BankDetails;
  mobileMoneyDetails?: MobileMoneyDetails;
  digitalWalletDetails?: DigitalWalletDetails;
  isDefault: boolean;
  isActive: boolean;
  expiryDate?: Date;
  metadata?: Record<string, any>;
  memberId?: number;
  companyId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDetails {
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'unionpay';
  expMonth: number;
  expYear: number;
  fingerprint?: string;
  country?: string;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
}

export interface BankDetails {
  bankName: string;
  bankCode: string;
  accountNumberLast4: string;
  accountType: 'checking' | 'savings';
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  country: string;
}

export interface MobileMoneyDetails {
  provider: 'mpesa' | 'airtel_money' | 'tigo_pesa' | 'orange_money' | 'other';
  phoneNumber: string;
  country: string;
  countryCode: string;
}

export interface DigitalWalletDetails {
  provider: 'paypal' | 'apple_pay' | 'google_pay' | 'samsung_pay' | 'other';
  walletId: string;
  email?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  gatewayResponse: any;
  failureReason?: string;
  nextAction?: PaymentNextAction;
  createdAt: Date;
}

export interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'refunded' | 'partially_refunded';
  gatewayStatus?: string;
  processorResponse?: string;
  processorCode?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  threeDSecure?: ThreeDSecureStatus;
}

export interface ThreeDSecureStatus {
  required: boolean;
  authenticated: boolean;
  version?: string;
  result?: string;
  liabilityShift?: boolean;
}

export interface PaymentNextAction {
  type: 'redirect_to_url' | 'verify_card' | 'use_stripe_sdk' | 'verify_with_mobile_money';
  url?: string;
  data?: Record<string, any>;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // Full refund if not specified
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  gatewayResponse: any;
  failureReason?: string;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  gateway: string;
  type: string;
  data: any;
  signature?: string;
  timestamp: number;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface PaymentAnalytics {
  period: DateRange;
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
  averageTransactionValue: number;
  paymentMethodBreakdown: Record<PaymentMethodType, PaymentMethodAnalytics>;
  gatewayBreakdown: Record<string, GatewayAnalytics>;
  failureReasons: Record<string, number>;
  currencyBreakdown: Record<string, CurrencyAnalytics>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaymentMethodAnalytics {
  count: number;
  amount: number;
  successRate: number;
  averageValue: number;
}

export interface GatewayAnalytics {
  count: number;
  amount: number;
  successRate: number;
  averageProcessingTime: number;
  fees: number;
}

export interface CurrencyAnalytics {
  count: number;
  amount: number;
  successRate: number;
}

export class PaymentGatewayService {
  private providers: Map<string, PaymentGatewayProvider> = new Map();
  private rateLimitTrackers: Map<string, number[]> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize payment gateway providers
   */
  private async initializeProviders(): Promise<void> {
    // Initialize Stripe
    await this.addProvider({
      id: 1,
      name: 'Stripe',
      type: 'stripe',
      isActive: true,
      configuration: {
        apiKey: process.env.STRIPE_API_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        callbacks: {
          successUrl: process.env.PAYMENT_SUCCESS_URL || '/payment/success',
          failureUrl: process.env.PAYMENT_FAILURE_URL || '/payment/failure',
          cancelUrl: process.env.PAYMENT_CANCEL_URL || '/payment/cancel',
          webhookUrl: process.env.WEBHOOK_URL || '/webhooks/payment'
        },
        customSettings: {}
      },
      supportedMethods: ['card', 'bank', 'digital_wallet'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'ZAR'],
      feeStructure: {
        fixedFee: 0.30,
        percentageFee: 2.9,
        internationalFee: 1.0,
        refundFee: 0
      },
      rateLimits: {
        requestsPerSecond: 25,
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 1000000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize M-Pesa
    await this.addProvider({
      id: 2,
      name: 'M-Pesa',
      type: 'mpesa',
      isActive: true,
      configuration: {
        apiKey: process.env.MPESA_API_KEY || '',
        secretKey: process.env.MPESA_SECRET_KEY || '',
        environment: 'sandbox', // M-Pesa sandbox
        callbacks: {
          successUrl: process.env.PAYMENT_SUCCESS_URL || '/payment/success',
          failureUrl: process.env.PAYMENT_FAILURE_URL || '/payment/failure',
          cancelUrl: process.env.PAYMENT_CANCEL_URL || '/payment/cancel',
          webhookUrl: process.env.WEBHOOK_URL || '/webhooks/mpesa'
        },
        customSettings: {
          shortcode: process.env.MPESA_SHORTCODE || '',
          passkey: process.env.MPESA_PASSKEY || ''
        }
      },
      supportedMethods: ['mobile_money'],
      supportedCurrencies: ['KES', 'TZS', 'UGX', 'RWF'],
      feeStructure: {
        fixedFee: 0,
        percentageFee: 0,
        refundFee: 0
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 500,
        requestsPerHour: 20000,
        requestsPerDay: 400000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Process payment request
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Select appropriate gateway provider
      const provider = await this.selectProvider(request.paymentMethod, request.currency);
      if (!provider) {
        throw new Error('No suitable payment gateway provider found');
      }

      // Check rate limits
      await this.checkRateLimit(provider.name);

      // Validate payment request
      await this.validatePaymentRequest(request);

      // Process payment through gateway
      const response = await this.processThroughGateway(provider, request);

      // Save payment record
      if (response.success) {
        await this.savePaymentRecord(request, response);
      }

      return response;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        status: { status: 'failed' },
        amount: request.amount,
        currency: request.currency,
        gatewayResponse: {},
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Get original payment
      const originalPayment = await this.getPaymentByGatewayId(request.paymentId);
      if (!originalPayment) {
        throw new Error('Original payment not found');
      }

      // Get provider
      const provider = this.getProvider(originalPayment.gatewayProvider);
      if (!provider) {
        throw new Error('Payment gateway provider not found');
      }

      // Process refund through gateway
      const response = await this.processRefundThroughGateway(provider, request);

      // Save refund record
      if (response.success) {
        await this.saveRefundRecord(originalPayment.id, request, response);
      }

      return response;
    } catch (error) {
      console.error('Refund processing failed:', error);
      return {
        success: false,
        status: 'failed',
        amount: request.amount || 0,
        currency: 'USD',
        gatewayResponse: {},
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      };
    }
  }

  /**
   * Save payment method for future use
   */
  async savePaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    try {
      // Tokenize payment method if needed
      if (!paymentMethod.tokenizedData) {
        paymentMethod.tokenizedData = await this.tokenizePaymentMethod(paymentMethod);
      }

      // Save to database
      const savedPaymentMethod = await this.savePaymentMethodToDatabase(paymentMethod);

      return savedPaymentMethod;
    } catch (error) {
      console.error('Failed to save payment method:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for customer
   */
  async getPaymentMethods(customerId: string, customerType: 'member' | 'company'): Promise<PaymentMethod[]> {
    try {
      if (customerType === 'member') {
        const memberId = parseInt(customerId);
        return await this.getMemberPaymentMethods(memberId);
      } else {
        const companyId = parseInt(customerId);
        return await this.getCompanyPaymentMethods(companyId);
      }
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return [];
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: number, userId: number): Promise<boolean> {
    try {
      // Verify ownership
      const paymentMethod = await this.getPaymentMethodById(paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Check if payment method is in use
      const isInUse = await this.isPaymentMethodInUse(paymentMethodId);
      if (isInUse) {
        throw new Error('Payment method is currently in use and cannot be deleted');
      }

      // Delete from gateway
      const provider = this.getProvider(paymentMethod.gatewayProvider);
      if (provider && paymentMethod.tokenizedData) {
        await this.deletePaymentMethodFromGateway(provider, paymentMethod.tokenizedData);
      }

      // Delete from database
      await this.deletePaymentMethodFromDatabase(paymentMethodId);

      return true;
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      return false;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(gatewayName: string, event: any, signature?: string): Promise<void> {
    try {
      const provider = this.getProvider(gatewayName);
      if (!provider) {
        throw new Error(`Unknown gateway: ${gatewayName}`);
      }

      // Verify webhook signature
      if (signature && provider.configuration.webhookSecret) {
        const isValid = await this.verifyWebhookSignature(event, signature, provider.configuration.webhookSecret);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process webhook event
      await this.processWebhookEvent(provider, event);

      // Save webhook event for audit
      await this.saveWebhookEvent({
        id: this.generateWebhookId(),
        gateway: gatewayName,
        type: event.type || 'unknown',
        data: event,
        signature,
        timestamp: Date.now(),
        processed: true,
        processedAt: new Date(),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Webhook processing failed:', error);

      // Save failed webhook event
      await this.saveWebhookEvent({
        id: this.generateWebhookId(),
        gateway: gatewayName,
        type: event.type || 'unknown',
        data: event,
        signature,
        timestamp: Date.now(),
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      });

      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(period: DateRange): Promise<PaymentAnalytics> {
    try {
      const payments = await this.getPaymentsInPeriod(period);

      const analytics: PaymentAnalytics = {
        period,
        totalTransactions: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        successRate: 0,
        averageTransactionValue: 0,
        paymentMethodBreakdown: {},
        gatewayBreakdown: {},
        failureReasons: {},
        currencyBreakdown: {}
      };

      if (payments.length > 0) {
        const successfulPayments = payments.filter(p => p.status === 'completed');
        analytics.successRate = (successfulPayments.length / payments.length) * 100;
        analytics.averageTransactionValue = analytics.totalAmount / payments.length;

        // Calculate breakdowns
        this.calculatePaymentMethodBreakdown(payments, analytics);
        this.calculateGatewayBreakdown(payments, analytics);
        this.calculateFailureReasons(payments, analytics);
        this.calculateCurrencyBreakdown(payments, analytics);
      }

      return analytics;
    } catch (error) {
      console.error('Failed to generate payment analytics:', error);
      throw error;
    }
  }

  /**
   * Select appropriate gateway provider
   */
  private async selectProvider(paymentMethod: PaymentMethod, currency: string): Promise<PaymentGatewayProvider | null> {
    for (const provider of this.providers.values()) {
      if (!provider.isActive) continue;
      if (!provider.supportedMethods.includes(paymentMethod.type)) continue;
      if (!provider.supportedCurrencies.includes(currency)) continue;

      return provider;
    }
    return null;
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(gatewayName: string): Promise<void> {
    const provider = this.getProvider(gatewayName);
    if (!provider) throw new Error('Provider not found');

    const now = Date.now();
    const tracker = this.rateLimitTrackers.get(gatewayName) || [];

    // Remove old entries (older than 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentRequests = tracker.filter(timestamp => timestamp > oneHourAgo);

    // Check hourly limit
    if (recentRequests.length >= provider.rateLimits.requestsPerHour) {
      throw new Error('Rate limit exceeded: Too many requests per hour');
    }

    // Check minute limit
    const oneMinuteAgo = now - 60 * 1000;
    const minuteRequests = recentRequests.filter(timestamp => timestamp > oneMinuteAgo);
    if (minuteRequests.length >= provider.rateLimits.requestsPerMinute) {
      throw new Error('Rate limit exceeded: Too many requests per minute');
    }

    // Check second limit
    const oneSecondAgo = now - 1000;
    const secondRequests = recentRequests.filter(timestamp => timestamp > oneSecondAgo);
    if (secondRequests.length >= provider.rateLimits.requestsPerSecond) {
      throw new Error('Rate limit exceeded: Too many requests per second');
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitTrackers.set(gatewayName, recentRequests);
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(request: PaymentRequest): Promise<void> {
    if (request.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (request.amount > 999999999) {
      throw new Error('Payment amount exceeds maximum limit');
    }

    if (!request.paymentMethod.type) {
      throw new Error('Payment method type is required');
    }

    // Additional validation based on payment method type
    switch (request.paymentMethod.type) {
      case 'card':
        if (!request.paymentMethod.cardDetails) {
          throw new Error('Card details are required for card payments');
        }
        break;
      case 'mobile_money':
        if (!request.paymentMethod.mobileMoneyDetails) {
          throw new Error('Mobile money details are required for mobile money payments');
        }
        break;
    }
  }

  /**
   * Process payment through gateway
   */
  private async processThroughGateway(provider: PaymentGatewayProvider, request: PaymentRequest): Promise<PaymentResponse> {
    switch (provider.type) {
      case 'stripe':
        return await this.processStripePayment(provider, request);
      case 'mpesa':
        return await this.processMpesaPayment(provider, request);
      default:
        throw new Error(`Unsupported gateway type: ${provider.type}`);
    }
  }

  /**
   * Process payment through Stripe
   */
  private async processStripePayment(provider: PaymentGatewayProvider, request: PaymentRequest): Promise<PaymentResponse> {
    // This would integrate with actual Stripe API
    console.log(`Processing ${request.amount} ${request.currency} payment through Stripe`);

    // Simulate payment processing
    const isSuccess = Math.random() > 0.1; // 90% success rate

    return {
      success: isSuccess,
      paymentId: `pi_stripe_${Date.now()}`,
      transactionId: `txn_stripe_${Date.now()}`,
      status: {
        status: isSuccess ? 'completed' : 'failed',
        gatewayStatus: isSuccess ? 'succeeded' : 'failed',
        processorResponse: isSuccess ? 'Approved' : 'Declined'
      },
      amount: request.amount,
      currency: request.currency,
      gatewayResponse: {
        id: `ch_stripe_${Date.now()}`,
        object: 'charge',
        amount: request.amount * 100, // Stripe uses cents
        currency: request.currency.toLowerCase(),
        status: isSuccess ? 'succeeded' : 'failed'
      },
      failureReason: isSuccess ? undefined : 'Card declined',
      createdAt: new Date()
    };
  }

  /**
   * Process payment through M-Pesa
   */
  private async processMpesaPayment(provider: PaymentGatewayProvider, request: PaymentRequest): Promise<PaymentResponse> {
    // This would integrate with actual M-Pesa API
    console.log(`Processing ${request.amount} KES payment through M-Pesa`);

    // Simulate payment processing
    const isSuccess = Math.random() > 0.15; // 85% success rate

    return {
      success: isSuccess,
      paymentId: `mpesa_${Date.now()}`,
      transactionId: `txn_mpesa_${Date.now()}`,
      status: {
        status: isSuccess ? 'completed' : 'failed',
        gatewayStatus: isSuccess ? 'Success' : 'Failed'
      },
      amount: request.amount,
      currency: request.currency,
      gatewayResponse: {
        MerchantRequestID: `mrq_${Date.now()}`,
        CheckoutRequestID: `crq_${Date.now()}`,
        ResponseCode: isSuccess ? '0' : '1',
        ResponseDescription: isSuccess ? 'Success' : 'Failed'
      },
      failureReason: isSuccess ? undefined : 'Insufficient funds',
      createdAt: new Date()
    };
  }

  /**
   * Helper methods (would connect to actual database)
   */
  private async savePaymentRecord(request: PaymentRequest, response: PaymentResponse): Promise<void> {
    console.log('Saving payment record to database');
  }

  private async getPaymentByGatewayId(paymentId: string): Promise<any> {
    console.log(`Getting payment by gateway ID: ${paymentId}`);
    return null;
  }

  private getProvider(gatewayName: string): PaymentGatewayProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.name.toLowerCase() === gatewayName.toLowerCase()) {
        return provider;
      }
    }
    return null;
  }

  private async processRefundThroughGateway(provider: PaymentGatewayProvider, request: RefundRequest): Promise<RefundResponse> {
    // This would integrate with actual gateway refund API
    const isSuccess = Math.random() > 0.1; // 90% success rate

    return {
      success: isSuccess,
      refundId: `refund_${Date.now()}`,
      status: isSuccess ? 'completed' : 'failed',
      amount: request.amount || 0,
      currency: 'USD',
      gatewayResponse: {
        id: `refund_${Date.now()}`,
        object: 'refund',
        amount: (request.amount || 0) * 100,
        status: isSuccess ? 'succeeded' : 'failed'
      },
      failureReason: isSuccess ? undefined : 'Refund failed',
      createdAt: new Date()
    };
  }

  private async saveRefundRecord(paymentId: number, request: RefundRequest, response: RefundResponse): Promise<void> {
    console.log('Saving refund record to database');
  }

  private async tokenizePaymentMethod(paymentMethod: PaymentMethod): Promise<string> {
    // This would integrate with gateway tokenization
    return `token_${Date.now()}`;
  }

  private async savePaymentMethodToDatabase(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    return { ...paymentMethod, id: Math.floor(Math.random() * 10000) };
  }

  private async getMemberPaymentMethods(memberId: number): Promise<PaymentMethod[]> {
    return [];
  }

  private async getCompanyPaymentMethods(companyId: number): Promise<PaymentMethod[]> {
    return [];
  }

  private async getPaymentMethodById(paymentMethodId: number): Promise<PaymentMethod | null> {
    return null;
  }

  private async isPaymentMethodInUse(paymentMethodId: number): Promise<boolean> {
    return false;
  }

  private async deletePaymentMethodFromGateway(provider: PaymentGatewayProvider, token: string): Promise<void> {
    console.log(`Deleting payment method ${token} from ${provider.name}`);
  }

  private async deletePaymentMethodFromDatabase(paymentMethodId: number): Promise<void> {
    console.log(`Deleting payment method ${paymentMethodId} from database`);
  }

  private async verifyWebhookSignature(event: any, signature: string, secret: string): Promise<boolean> {
    // This would implement actual signature verification
    return true;
  }

  private async processWebhookEvent(provider: PaymentGatewayProvider, event: any): Promise<void> {
    console.log(`Processing webhook event for ${provider.name}:`, event.type);
  }

  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    console.log('Saving webhook event to database');
  }

  private async getPaymentsInPeriod(period: DateRange): Promise<any[]> {
    console.log(`Getting payments in period ${period.start.toISOString()} to ${period.end.toISOString()}`);
    return [];
  }

  private calculatePaymentMethodBreakdown(payments: any[], analytics: PaymentAnalytics): void {
    // Calculate payment method breakdown
  }

  private calculateGatewayBreakdown(payments: any[], analytics: PaymentAnalytics): void {
    // Calculate gateway breakdown
  }

  private calculateFailureReasons(payments: any[], analytics: PaymentAnalytics): void {
    // Calculate failure reasons
  }

  private calculateCurrencyBreakdown(payments: any[], analytics: PaymentAnalytics): void {
    // Calculate currency breakdown
  }

  private async addProvider(provider: PaymentGatewayProvider): Promise<void> {
    this.providers.set(provider.name, provider);
  }
}

export const paymentGatewayService = new PaymentGatewayService();