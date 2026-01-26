import { Router } from 'express';
import { commissionCalculationService } from '../services/commissionCalculationService';
import { commissionPaymentService } from '../services/commissionPaymentService';
import { commissionService } from '../services/commissionService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// COMMISSION CALCULATION ENDPOINTS
// ============================================================================

/**
 * Calculate commission for agent/period
 * POST /api/commissions/calculate
 */
router.post('/api/commissions/calculate', async (req, res) => {
  try {
    const {
      agentId,
      memberId,
      policyId,
      premiumAmount,
      policyType = 'individual',
      isNewBusiness = true,
      transactionDate = new Date(),
      transactionType = 'new_business'
    } = req.body;

    if (!agentId || !memberId || !premiumAmount) {
      return res.status(400).json({
        error: "agentId, memberId, and premiumAmount are required"
      });
    }

    const result = await commissionService.calculateCommission({
      agentId,
      memberId: Number(memberId),
      policyId: policyId ? Number(policyId) : undefined,
      premiumAmount: Number(premiumAmount),
      policyType,
      isNewBusiness,
      transactionDate: new Date(transactionDate),
      transactionType
    });

    res.json({
      success: true,
      calculation: result
    });

  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({ error: "Failed to calculate commission" });
  }
});

/**
 * Get calculation details
 * GET /api/commissions/calculation/:calculationId
 */
router.get('/api/commissions/calculation/:calculationId', async (req, res) => {
  try {
    const { calculationId } = req.params;

    const calculation = await commissionCalculationService.getCalculation(Number(calculationId));

    if (!calculation) {
      return res.status(404).json({ error: "Commission calculation not found" });
    }

    res.json({
      success: true,
      calculation
    });

  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(500).json({ error: "Failed to fetch calculation" });
  }
});

/**
 * Batch calculate commissions
 * POST /api/commissions/calculate/batch
 */
router.post('/api/commissions/calculate/batch', async (req, res) => {
  try {
    const { calculations } = req.body;

    if (!calculations || !Array.isArray(calculations) || calculations.length === 0) {
      return res.status(400).json({ error: "Calculations array is required" });
    }

    const results = await Promise.all(
      calculations.map(calc =>
        commissionService.calculateCommission(calc)
      )
    );

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in batch calculation:', error);
    res.status(500).json({ error: "Failed to calculate batch commissions" });
  }
});

/**
 * Get all commissions for agent
 * GET /api/commissions/agent/:agentId
 */
router.get('/api/commissions/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      startDate,
      endDate,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const commissions = await commissionService.getCommissionPaymentSchedule(
      agentId,
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      commissions,
      count: commissions.length
    });

  } catch (error) {
    console.error('Error fetching agent commissions:', error);
    res.status(500).json({ error: "Failed to fetch agent commissions" });
  }
});

/**
 * Get all commissions for period
 * GET /api/commissions/period/:periodId
 */
router.get('/api/commissions/period/:periodId', async (req, res) => {
  try {
    const { periodId } = req.params;
    const { status } = req.query;

    const commissions = await commissionService.getCommissionPaymentSchedule(
      undefined,
      periodId,
      undefined
    );

    const filtered = status ?
      commissions.filter(c => c.paymentStatus === status) :
      commissions;

    res.json({
      success: true,
      commissions: filtered,
      count: filtered.length
    });

  } catch (error) {
    console.error('Error fetching period commissions:', error);
    res.status(500).json({ error: "Failed to fetch period commissions" });
  }
});

// ============================================================================
// COMMISSION PAYMENT ENDPOINTS
// ============================================================================

/**
 * Process commission payment
 * POST /api/commissions/payments/process
 */
router.post('/api/commissions/payments/process', async (req, res) => {
  try {
    const {
      agentId,
      memberId,
      policyId,
      premiumAmount,
      policyType = 'individual',
      isNewBusiness = true,
      transactionType = 'new_business'
    } = req.body;

    if (!agentId || !memberId || !premiumAmount) {
      return res.status(400).json({
        error: "agentId, memberId, and premiumAmount are required"
      });
    }

    const transactionId = await commissionService.processCommission({
      agentId,
      memberId: Number(memberId),
      policyId: policyId ? Number(policyId) : undefined,
      premiumAmount: Number(premiumAmount),
      policyType,
      isNewBusiness,
      transactionDate: new Date(),
      transactionType
    });

    res.status(201).json({
      success: true,
      transactionId,
      message: "Commission processed successfully"
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: "Failed to process commission payment" });
  }
});

/**
 * Get payment details
 * GET /api/commissions/payments/:paymentId
 */
router.get('/api/commissions/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await commissionPaymentService.getPayment(Number(paymentId));

    if (!payment) {
      return res.status(404).json({ error: "Commission payment not found" });
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
 * Get payment history
 * GET /api/commissions/payments/agent/:agentId
 */
router.get('/api/commissions/payments/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      startDate,
      endDate,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const payments = await commissionPaymentService.getAgentPayments(
      agentId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      ...payments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

/**
 * Void payment
 * POST /api/commissions/payments/:paymentId/void
 */
router.post('/api/commissions/payments/:paymentId/void', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason, voidedBy } = req.body;

    const result = await commissionPaymentService.voidPayment(
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
 * Get pending payments
 * GET /api/commissions/payments/pending
 */
router.get('/api/commissions/payments/pending', async (req, res) => {
  try {
    const { agentId, period } = req.query;

    const pendingPayments = await commissionPaymentService.getPendingPayments({
      agentId: agentId as string,
      period: period as string
    });

    res.json({
      success: true,
      payments: pendingPayments,
      count: pendingPayments.length,
      totalAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0)
    });

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

// ============================================================================
// COMMISSION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get commission rules
 * GET /api/commissions/rules
 */
router.get('/api/commissions/rules', async (req, res) => {
  try {
    const { tierId, isActive } = req.query;

    const rules = await commissionCalculationService.getCommissionRules({
      tierId: tierId ? Number(tierId) : undefined,
      isActive: isActive === 'true' ? true : undefined
    });

    res.json({
      success: true,
      rules,
      count: rules.length
    });

  } catch (error) {
    console.error('Error fetching commission rules:', error);
    res.status(500).json({ error: "Failed to fetch commission rules" });
  }
});

/**
 * Create commission rule
 * POST /api/commissions/rules
 */
router.post('/api/commissions/rules', async (req, res) => {
  try {
    const {
      name,
      description,
      tierId,
      baseRate,
      individualRate,
      corporateRate,
      familyRate,
      bonusThreshold,
      bonusRate,
      isActive = true
    } = req.body;

    if (!name || !baseRate) {
      return res.status(400).json({
        error: "name and baseRate are required"
      });
    }

    const rule = await commissionCalculationService.createCommissionRule({
      name,
      description,
      tierId: tierId ? Number(tierId) : undefined,
      baseRate: Number(baseRate),
      individualRate: individualRate ? Number(individualRate) : undefined,
      corporateRate: corporateRate ? Number(corporateRate) : undefined,
      familyRate: familyRate ? Number(familyRate) : undefined,
      bonusThreshold: bonusThreshold ? Number(bonusThreshold) : undefined,
      bonusRate: bonusRate ? Number(bonusRate) : undefined,
      isActive
    });

    res.status(201).json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating commission rule:', error);
    res.status(500).json({ error: "Failed to create commission rule" });
  }
});

/**
 * Update commission rule
 * PUT /api/commissions/rules/:ruleId
 */
router.put('/api/commissions/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await commissionCalculationService.updateCommissionRule(
      Number(ruleId),
      updates
    );

    res.json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error updating commission rule:', error);
    res.status(500).json({ error: "Failed to update commission rule" });
  }
});

/**
 * Delete commission rule
 * DELETE /api/commissions/rules/:ruleId
 */
router.delete('/api/commissions/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    await commissionCalculationService.deleteCommissionRule(Number(ruleId));

    res.json({
      success: true,
      message: "Commission rule deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting commission rule:', error);
    res.status(500).json({ error: "Failed to delete commission rule" });
  }
});

/**
 * Get commission summary
 * GET /api/commissions/summary
 */
router.get('/api/commissions/summary', async (req, res) => {
  try {
    const {
      agentId,
      teamId,
      period,
      startDate,
      endDate
    } = req.query;

    const summary = await commissionService.getAgentPerformance(
      agentId as string,
      period as string
    );

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ error: "Failed to fetch commission summary" });
  }
});

export default router;
