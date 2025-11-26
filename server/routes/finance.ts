/**
 * Finance Management API Routes
 * RESTful endpoints for all finance management modules
 */

import { Request, Response, Router } from 'express';
import { FinanceServicesManager } from '../services/financeServices.js';

const router = Router();

/**
 * Health check endpoint for finance services
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await FinanceServicesManager.healthCheck();
    res.status(healthCheck.status === 'healthy' ? 200 :
               healthCheck.status === 'degraded' ? 206 : 503).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      services: {},
      errors: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
});

/**
 * Get finance services statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = FinanceServicesManager.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get statistics'
    });
  }
});

// ===== Module 1: Billing & Invoicing Routes =====

/**
 * Generate invoices
 */
router.post('/billing/invoices', async (req: Request, res: Response) => {
  try {
    const { billingService } = FinanceServicesManager.billing;
    const invoices = await billingService.generateInvoices(req.body);
    res.status(201).json({ success: true, data: invoices });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to generate invoices'
    });
  }
});

/**
 * Process billing cycle for all companies
 */
router.post('/billing/process-cycle', async (req: Request, res: Response) => {
  try {
    const { billingService } = FinanceServicesManager.billing;
    const cycleDate = new Date(req.body.cycleDate || Date.now());
    const result = await billingService.processBillingCycle(cycleDate);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process billing cycle'
    });
  }
});

/**
 * Get invoice by ID
 */
router.get('/billing/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { billingService } = FinanceServicesManager.billing;
    const invoice = await billingService.getInvoice(parseInt(req.params.id));

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get invoice'
    });
  }
});

/**
 * Get accounts receivable summary
 */
router.get('/billing/accounts-receivable', async (req: Request, res: Response) => {
  try {
    const { accountsReceivable } = FinanceServicesManager.billing;
    const ar = await accountsReceivable.getAccountsReceivableSummary();
    res.json({ success: true, data: ar });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get accounts receivable'
    });
  }
});

// ===== Module 2: Payment Management Routes =====

/**
 * Process payment
 */
router.post('/payments/process', async (req: Request, res: Response) => {
  try {
    const { gateway } = FinanceServicesManager.payments;
    const result = await gateway.processPayment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to process payment'
    });
  }
});

/**
 * Reconcile payments
 */
router.post('/payments/reconcile', async (req: Request, res: Response) => {
  try {
    const { reconciliation } = FinanceServicesManager.payments;
    const result = await reconciliation.reconcilePayments(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to reconcile payments'
    });
  }
});

/**
 * Get payment status
 */
router.get('/payments/:id/status', async (req: Request, res: Response) => {
  try {
    const { gateway } = FinanceServicesManager.payments;
    const status = await gateway.getPaymentStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get payment status'
    });
  }
});

// ===== Module 3: Commission Management Routes =====

/**
 * Calculate commissions
 */
router.post('/commissions/calculate', async (req: Request, res: Response) => {
  try {
    const { calculation } = FinanceServicesManager.commissions;
    const result = await calculation.calculateCommission(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate commissions'
    });
  }
});

/**
 * Process commission payment run
 */
router.post('/commissions/payment-runs', async (req: Request, res: Response) => {
  try {
    const { payment } = FinanceServicesManager.commissions;
    const result = await payment.createPaymentRun(
      new Date(req.body.periodStart),
      new Date(req.body.periodEnd)
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create payment run'
    });
  }
});

/**
 * Get agent performance metrics
 */
router.get('/commissions/agents/:id/performance', async (req: Request, res: Response) => {
  try {
    const { performance } = FinanceServicesManager.commissions;
    const metrics = await performance.getAgentPerformance(
      parseInt(req.params.id),
      req.query.period as string
    );
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get agent performance'
    });
  }
});

/**
 * Get agent leaderboard
 */
router.get('/commissions/leaderboard', async (req: Request, res: Response) => {
  try {
    const { performance } = FinanceServicesManager.commissions;
    const leaderboard = await performance.getLeaderboard({
      period: req.query.period as string,
      limit: parseInt(req.query.limit as string) || 10,
      metric: req.query.metric as string || 'commission'
    });
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get leaderboard'
    });
  }
});

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Finance API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;