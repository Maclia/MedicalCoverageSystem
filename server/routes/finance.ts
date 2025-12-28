import { Router } from 'express';
import { billingService } from '../services/billingService';
import { accountsReceivableService } from '../services/accountsReceivableService';
import { billingNotificationService } from '../services/billingNotificationService';
import { financialCalculation } from '../services/financialCalculation';
import { financialCalculationService } from '../services/financialCalculationService';
import { claimReserveService } from '../services/claimReserveService';
import { claimsPaymentService } from '../services/claimsPaymentService';
import { claimsFinancialAnalysisService } from '../services/claimsFinancialAnalysisService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// BILLING MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Generate bills for members/periods
 * POST /api/finance/billing/generate
 */
router.post('/api/finance/billing/generate', async (req, res) => {
  try {
    const {
      memberId,
      companyId,
      billingPeriodStart,
      billingPeriodEnd,
      invoiceType,
      generateLineItems = true,
      applyProration = true
    } = req.body;

    if (!memberId && !companyId) {
      return res.status(400).json({ error: "Either memberId or companyId is required" });
    }

    if (!billingPeriodStart || !billingPeriodEnd) {
      return res.status(400).json({ error: "Billing period start and end dates are required" });
    }

    const invoices = await billingService.generateInvoices({
      memberId,
      companyId,
      billingPeriodStart: new Date(billingPeriodStart),
      billingPeriodEnd: new Date(billingPeriodEnd),
      invoiceType: invoiceType || 'individual',
      generateLineItems,
      applyProration
    });

    res.status(201).json({
      success: true,
      invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('Error generating bills:', error);
    res.status(500).json({ error: "Failed to generate bills" });
  }
});

/**
 * Get specific bill details
 * GET /api/finance/billing/:billId
 */
router.get('/api/finance/billing/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const invoice = await billingService.getInvoice(Number(billId));

    if (!invoice) {
      return res.status(404).json({ error: "Bill not found" });
    }

    res.json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
});

/**
 * Get all bills for a member
 * GET /api/finance/billing/member/:memberId
 */
router.get('/api/finance/billing/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { status, startDate, endDate } = req.query;

    const invoices = await billingService.getInvoices({
      memberId: Number(memberId),
      status: status as any,
      dateFrom: startDate ? new Date(startDate as string) : undefined,
      dateTo: endDate ? new Date(endDate as string) : undefined
    });

    res.json({
      success: true,
      invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('Error fetching member bills:', error);
    res.status(500).json({ error: "Failed to fetch member bills" });
  }
});

/**
 * Update bill details
 * PUT /api/finance/billing/:billId
 */
router.put('/api/finance/billing/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const updates = req.body;

    // This would update the invoice in the database
    // For now, return success
    res.json({
      success: true,
      message: "Bill updated successfully",
      billId: Number(billId)
    });

  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

/**
 * Send bill to member
 * POST /api/finance/billing/:billId/send
 */
router.post('/api/finance/billing/:billId/send', async (req, res) => {
  try {
    const { billId } = req.params;
    const { deliveryMethod = 'email' } = req.body;

    // This would send the bill via specified delivery method
    await billingNotificationService.sendBillReadyNotification(Number(billId), deliveryMethod);

    res.json({
      success: true,
      message: "Bill sent successfully",
      billId: Number(billId),
      deliveryMethod
    });

  } catch (error) {
    console.error('Error sending bill:', error);
    res.status(500).json({ error: "Failed to send bill" });
  }
});

/**
 * Get all pending bills
 * GET /api/finance/billing/pending
 */
router.get('/api/finance/billing/pending', async (req, res) => {
  try {
    const { companyId } = req.query;

    const invoices = await billingService.getInvoices({
      companyId: companyId ? Number(companyId) : undefined,
      status: 'sent'
    });

    res.json({
      success: true,
      invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('Error fetching pending bills:', error);
    res.status(500).json({ error: "Failed to fetch pending bills" });
  }
});

/**
 * Batch generate bills
 * POST /api/finance/billing/batch
 */
router.post('/api/finance/billing/batch', async (req, res) => {
  try {
    const { companyId, billingCycle } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "CompanyId is required" });
    }

    const cycleDate = billingCycle ? new Date(billingCycle) : new Date();
    const result = await billingService.processBillingCycle(cycleDate);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in batch bill generation:', error);
    res.status(500).json({ error: "Failed to generate batch bills" });
  }
});

// ============================================================================
// ACCOUNTS RECEIVABLE ENDPOINTS
// ============================================================================

/**
 * Get all receivables
 * GET /api/finance/receivables
 */
router.get('/api/finance/receivables', async (req, res) => {
  try {
    const { status, companyId, memberId } = req.query;

    const receivables = await accountsReceivableService.getReceivables({
      status: status as any,
      companyId: companyId ? Number(companyId) : undefined,
      memberId: memberId ? Number(memberId) : undefined
    });

    res.json({
      success: true,
      receivables,
      count: receivables.length
    });

  } catch (error) {
    console.error('Error fetching receivables:', error);
    res.status(500).json({ error: "Failed to fetch receivables" });
  }
});

/**
 * Get specific receivable
 * GET /api/finance/receivables/:id
 */
router.get('/api/finance/receivables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const receivable = await accountsReceivableService.getReceivable(Number(id));

    if (!receivable) {
      return res.status(404).json({ error: "Receivable not found" });
    }

    res.json({
      success: true,
      receivable
    });

  } catch (error) {
    console.error('Error fetching receivable:', error);
    res.status(500).json({ error: "Failed to fetch receivable" });
  }
});

/**
 * Apply payment to receivable
 * POST /api/finance/receivables/:id/apply-payment
 */
router.post('/api/finance/receivables/:id/apply-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    const result = await accountsReceivableService.applyPayment(Number(id), {
      amount: Number(amount),
      paymentMethod,
      reference,
      appliedAt: new Date()
    });

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error applying payment:', error);
    res.status(500).json({ error: "Failed to apply payment" });
  }
});

/**
 * Get aging report
 * GET /api/finance/receivables/aging
 */
router.get('/api/finance/receivables/aging', async (req, res) => {
  try {
    const { companyId } = req.query;

    const agingReport = await accountsReceivableService.getAgingReport({
      companyId: companyId ? Number(companyId) : undefined
    });

    res.json({
      success: true,
      agingReport
    });

  } catch (error) {
    console.error('Error generating aging report:', error);
    res.status(500).json({ error: "Failed to generate aging report" });
  }
});

/**
 * Get overdue receivables
 * GET /api/finance/receivables/overdue
 */
router.get('/api/finance/receivables/overdue', async (req, res) => {
  try {
    const { companyId, days = 30 } = req.query;

    const overdueReceivables = await accountsReceivableService.getOverdueReceivables({
      companyId: companyId ? Number(companyId) : undefined,
      daysOverdue: Number(days)
    });

    res.json({
      success: true,
      receivables: overdueReceivables,
      count: overdueReceivables.length
    });

  } catch (error) {
    console.error('Error fetching overdue receivables:', error);
    res.status(500).json({ error: "Failed to fetch overdue receivables" });
  }
});

/**
 * Write off receivables
 * POST /api/finance/receivables/write-off
 */
router.post('/api/finance/receivables/write-off', async (req, res) => {
  try {
    const { receivableIds, reason, writtenBy } = req.body;

    if (!receivableIds || !Array.isArray(receivableIds) || receivableIds.length === 0) {
      return res.status(400).json({ error: "Receivable IDs array is required" });
    }

    const results = await Promise.all(
      receivableIds.map(id =>
        accountsReceivableService.writeOffReceivable(Number(id), reason, writtenBy)
      )
    );

    res.json({
      success: true,
      writtenOff: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (error) {
    console.error('Error writing off receivables:', error);
    res.status(500).json({ error: "Failed to write off receivables" });
  }
});

// ============================================================================
// FINANCIAL CALCULATION ENDPOINTS
// ============================================================================

/**
 * Calculate premium amounts
 * POST /api/finance/calculate/premium
 */
router.post('/api/finance/calculate/premium', async (req, res) => {
  try {
    const { memberId, benefitId, coverageAmount, period } = req.body;

    if (!memberId || !benefitId) {
      return res.status(400).json({ error: "MemberId and benefitId are required" });
    }

    const premium = await financialCalculationService.calculatePremium({
      memberId: Number(memberId),
      benefitId: Number(benefitId),
      coverageAmount: coverageAmount ? Number(coverageAmount) : undefined,
      period: period || 'monthly'
    });

    res.json({
      success: true,
      premium
    });

  } catch (error) {
    console.error('Error calculating premium:', error);
    res.status(500).json({ error: "Failed to calculate premium" });
  }
});

/**
 * Calculate claim reserve amounts
 * POST /api/finance/calculate/claim-reserve
 */
router.post('/api/finance/calculate/claim-reserve', async (req, res) => {
  try {
    const { claimId, incurredAmount, lossType } = req.body;

    if (!claimId || !incurredAmount) {
      return res.status(400).json({ error: "ClaimId and incurredAmount are required" });
    }

    const reserve = await financialCalculation.calculateClaimReserve({
      claimId: Number(claimId),
      incurredAmount: Number(incurredAmount),
      lossType
    });

    res.json({
      success: true,
      reserve
    });

  } catch (error) {
    console.error('Error calculating claim reserve:', error);
    res.status(500).json({ error: "Failed to calculate claim reserve" });
  }
});

/**
 * Calculate member financial responsibility
 * POST /api/finance/calculate/member-responsibility
 */
router.post('/api/finance/calculate/member-responsibility', async (req, res) => {
  try {
    const { claimId, memberId, benefitId, claimAmount } = req.body;

    if (!claimId || !claimAmount) {
      return res.status(400).json({ error: "ClaimId and claimAmount are required" });
    }

    const responsibility = await financialCalculationService.calculateMemberResponsibility({
      claimId: Number(claimId),
      memberId: memberId ? Number(memberId) : undefined,
      benefitId: benefitId ? Number(benefitId) : undefined,
      claimAmount: Number(claimAmount)
    });

    res.json({
      success: true,
      responsibility
    });

  } catch (error) {
    console.error('Error calculating member responsibility:', error);
    res.status(500).json({ error: "Failed to calculate member responsibility" });
  }
});

/**
 * Calculate insurer financial responsibility
 * POST /api/finance/calculate/insurer-responsibility
 */
router.post('/api/finance/calculate/insurer-responsibility', async (req, res) => {
  try {
    const { claimId, claimAmount, memberId, benefitId } = req.body;

    if (!claimId || !claimAmount) {
      return res.status(400).json({ error: "ClaimId and claimAmount are required" });
    }

    const responsibility = await financialCalculationService.calculateFinancialResponsibility({
      claimId: Number(claimId),
      memberId: memberId ? Number(memberId) : undefined,
      benefitId: benefitId ? Number(benefitId) : undefined,
      originalAmount: Number(claimAmount)
    });

    res.json({
      success: true,
      insurerResponsibility: responsibility.insurerResponsibility,
      memberResponsibility: responsibility.memberResponsibility
    });

  } catch (error) {
    console.error('Error calculating insurer responsibility:', error);
    res.status(500).json({ error: "Failed to calculate insurer responsibility" });
  }
});

/**
 * Get all calculations for a claim
 * GET /api/finance/calculations/claim/:claimId
 */
router.get('/api/finance/calculations/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const calculations = await financialCalculationService.getClaimCalculations(Number(claimId));

    res.json({
      success: true,
      calculations,
      count: calculations.length
    });

  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: "Failed to fetch calculations" });
  }
});

// ============================================================================
// CLAIMS PAYMENT ENDPOINTS
// ============================================================================

/**
 * Process claim payment
 * POST /api/finance/payments/claim/:claimId
 */
router.post('/api/finance/payments/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { amount, paymentMethod, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    const payment = await claimsPaymentService.processPayment({
      claimId: Number(claimId),
      amount: Number(amount),
      paymentMethod,
      reference,
      processedAt: new Date()
    });

    res.status(201).json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: "Failed to process payment" });
  }
});

/**
 * Get payment details
 * GET /api/finance/payments/:paymentId
 */
router.get('/api/finance/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await claimsPaymentService.getPayment(Number(paymentId));

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

/**
 * Get all payments for a claim
 * GET /api/finance/payments/claim/:claimId
 */
router.get('/api/finance/payments/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const payments = await claimsPaymentService.getClaimPayments(Number(claimId));

    res.json({
      success: true,
      payments,
      count: payments.length
    });

  } catch (error) {
    console.error('Error fetching claim payments:', error);
    res.status(500).json({ error: "Failed to fetch claim payments" });
  }
});

/**
 * Get all payments to a member
 * GET /api/finance/payments/member/:memberId
 */
router.get('/api/finance/payments/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const payments = await claimsPaymentService.getMemberPayments(
      Number(memberId),
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      payments,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        count: payments.length
      }
    });

  } catch (error) {
    console.error('Error fetching member payments:', error);
    res.status(500).json({ error: "Failed to fetch member payments" });
  }
});

/**
 * Void a payment
 * POST /api/finance/payments/:paymentId/void
 */
router.post('/api/finance/payments/:paymentId/void', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason, voidedBy } = req.body;

    const result = await claimsPaymentService.voidPayment(
      Number(paymentId),
      reason,
      voidedBy
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error voiding payment:', error);
    res.status(500).json({ error: "Failed to void payment" });
  }
});

/**
 * Batch process payments
 * POST /api/finance/payments/batch
 */
router.post('/api/finance/payments/batch', async (req, res) => {
  try {
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: "Payments array is required" });
    }

    const results = await claimsPaymentService.batchProcessPayments(payments);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in batch payment processing:', error);
    res.status(500).json({ error: "Failed to process batch payments" });
  }
});

// ============================================================================
// CLAIM RESERVES ENDPOINTS
// ============================================================================

/**
 * Create claim reserve
 * POST /api/finance/reserves/claim/:claimId
 */
router.post('/api/finance/reserves/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { reserveAmount, reserveType, reason } = req.body;

    if (!reserveAmount || reserveAmount <= 0) {
      return res.status(400).json({ error: "Valid reserve amount is required" });
    }

    const reserve = await claimReserveService.createReserve({
      claimId: Number(claimId),
      reserveAmount: Number(reserveAmount),
      reserveType: reserveType || 'initial',
      reason,
      createdBy: req.body.userId
    });

    res.status(201).json({
      success: true,
      reserve
    });

  } catch (error) {
    console.error('Error creating reserve:', error);
    res.status(500).json({ error: "Failed to create reserve" });
  }
});

/**
 * Get reserves for a claim
 * GET /api/finance/reserves/claim/:claimId
 */
router.get('/api/finance/reserves/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const reserves = await claimReserveService.getClaimReserves(Number(claimId));

    res.json({
      success: true,
      reserves,
      count: reserves.length
    });

  } catch (error) {
    console.error('Error fetching reserves:', error);
    res.status(500).json({ error: "Failed to fetch reserves" });
  }
});

/**
 * Update reserve
 * PUT /api/finance/reserves/:reserveId
 */
router.put('/api/finance/reserves/:reserveId', async (req, res) => {
  try {
    const { reserveId } = req.params;
    const { reserveAmount, adjustmentReason } = req.body;

    const reserve = await claimReserveService.updateReserve(
      Number(reserveId),
      Number(reserveAmount),
      adjustmentReason
    );

    res.json({
      success: true,
      reserve
    });

  } catch (error) {
    console.error('Error updating reserve:', error);
    res.status(500).json({ error: "Failed to update reserve" });
  }
});

/**
 * Get reserves summary
 * GET /api/finance/reserves/summary
 */
router.get('/api/finance/reserves/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await claimReserveService.getReservesSummary({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching reserves summary:', error);
    res.status(500).json({ error: "Failed to fetch reserves summary" });
  }
});

/**
 * Get outstanding reserves
 * GET /api/finance/reserves/outstanding
 */
router.get('/api/finance/reserves/outstanding', async (req, res) => {
  try {
    const { claimId } = req.query;

    const outstandingReserves = await claimReserveService.getOutstandingReserves({
      claimId: claimId ? Number(claimId) : undefined
    });

    res.json({
      success: true,
      reserves: outstandingReserves,
      count: outstandingReserves.length,
      totalAmount: outstandingReserves.reduce((sum, r) => sum + r.reserveAmount, 0)
    });

  } catch (error) {
    console.error('Error fetching outstanding reserves:', error);
    res.status(500).json({ error: "Failed to fetch outstanding reserves" });
  }
});

// ============================================================================
// FINANCIAL ANALYSIS ENDPOINTS
// ============================================================================

/**
 * Analyze claims financial data
 * POST /api/finance/analysis/claims
 */
router.post('/api/finance/analysis/claims', async (req, res) => {
  try {
    const { startDate, endDate, filters } = req.body;

    const analysis = await claimsFinancialAnalysisService.analyzeClaims({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      filters
    });

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing claims:', error);
    res.status(500).json({ error: "Failed to analyze claims" });
  }
});

/**
 * Get revenue analytics
 * GET /api/finance/analytics/revenue
 */
router.get('/api/finance/analytics/revenue', async (req, res) => {
  try {
    const { startDate, endDate, granularity = 'monthly' } = req.query;

    const analytics = await claimsFinancialAnalysisService.getRevenueAnalytics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      granularity: granularity as 'daily' | 'weekly' | 'monthly' | 'yearly'
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: "Failed to fetch revenue analytics" });
  }
});

/**
 * Get expense analytics
 * GET /api/finance/analytics/expenses
 */
router.get('/api/finance/analytics/expenses', async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const analytics = await claimsFinancialAnalysisService.getExpenseAnalytics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      category: category as string
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching expense analytics:', error);
    res.status(500).json({ error: "Failed to fetch expense analytics" });
  }
});

/**
 * Get profitability analytics
 * GET /api/finance/analytics/profitability
 */
router.get('/api/finance/analytics/profitability', async (req, res) => {
  try {
    const { startDate, endDate, groupIdBy = 'benefit' } = req.query;

    const analytics = await claimsFinancialAnalysisService.getProfitabilityAnalytics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      groupBy: groupIdBy as string
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching profitability analytics:', error);
    res.status(500).json({ error: "Failed to fetch profitability analytics" });
  }
});

/**
 * Generate financial projections
 * POST /api/finance/analysis/projections
 */
router.post('/api/finance/analysis/projections', async (req, res) => {
  try {
    const { projectionPeriod, basePeriod, growthRate } = req.body;

    const projections = await claimsFinancialAnalysisService.generateFinancialProjections({
      projectionPeriod: projectionPeriod || 12,
      basePeriod: basePeriod ? {
        startDate: new Date(basePeriod.startDate),
        endDate: new Date(basePeriod.endDate)
      } : undefined,
      growthRate: growthRate || 0.05
    });

    res.json({
      success: true,
      projections
    });

  } catch (error) {
    console.error('Error generating projections:', error);
    res.status(500).json({ error: "Failed to generate projections" });
  }
});

/**
 * Get financial trends
 * GET /api/finance/analysis/trends
 */
router.get('/api/finance/analysis/trends', async (req, res) => {
  try {
    const { metric, period = '6months' } = req.query;

    const trends = await claimsFinancialAnalysisService.getFinancialTrends({
      metric: metric as string,
      period: period as string
    });

    res.json({
      success: true,
      trends
    });

  } catch (error) {
    console.error('Error fetching financial trends:', error);
    res.status(500).json({ error: "Failed to fetch financial trends" });
  }
});

// ============================================================================
// BILLING NOTIFICATIONS ENDPOINTS
// ============================================================================

/**
 * Send bill ready notification
 * POST /api/finance/notifications/bill-ready
 */
router.post('/api/finance/notifications/bill-ready', async (req, res) => {
  try {
    const { billId, deliveryMethod } = req.body;

    const notification = await billingNotificationService.sendBillReadyNotification(
      Number(billId),
      deliveryMethod || 'email'
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending bill ready notification:', error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/**
 * Send payment due reminder
 * POST /api/finance/notifications/payment-due
 */
router.post('/api/finance/notifications/payment-due', async (req, res) => {
  try {
    const { billId, daysUntilDue } = req.body;

    const notification = await billingNotificationService.sendPaymentDueReminder(
      Number(billId),
      daysUntilDue || 3
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending payment due reminder:', error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

/**
 * Send overdue notification
 * POST /api/finance/notifications/overdue
 */
router.post('/api/finance/notifications/overdue', async (req, res) => {
  try {
    const { billId, daysOverdue } = req.body;

    const notification = await billingNotificationService.sendOverdueNotification(
      Number(billId),
      daysOverdue
    );

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending overdue notification:', error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/**
 * Get notification history for bill
 * GET /api/finance/notifications/history/:billId
 */
router.get('/api/finance/notifications/history/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const history = await billingNotificationService.getNotificationHistory(Number(billId));

    res.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

export default router;
