import { Router } from 'express';
import { InvoicesController, invoicesValidationMiddleware } from '../api/invoicesController';
import { PaymentsController, paymentsValidationMiddleware } from '../api/paymentsController';
import { CommissionsController, commissionsValidationMiddleware } from '../api/commissionsController';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { responseStandardizationMiddleware } from '../middleware/responseStandardizationMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Apply response standardization and audit middleware to all routes
router.use(responseStandardizationMiddleware);
router.use(auditMiddleware);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public endpoints (no authentication required)
router.post('/payments/mpesa/callback', PaymentsController.mpesaCallback);

// Authentication middleware for protected routes
router.use(authMiddleware);

// Rate limiting for write operations
const writeRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const paymentRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 payment requests per windowMs
  message: 'Too many payment attempts, please try again later.'
});

const commissionRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 commission requests per hour
  message: 'Too many commission calculations, please try again later.'
});

// Invoice routes
router.get('/invoices', invoicesValidationMiddleware.validateQuery, InvoicesController.getInvoices);
router.get('/invoices/stats', InvoicesController.getInvoiceStats);
router.get('/invoices/:id', InvoicesController.getInvoice);
router.post('/invoices', writeRateLimit, invoicesValidationMiddleware.validateCreateInvoice, InvoicesController.createInvoice);
router.put('/invoices/:id', writeRateLimit, invoicesValidationMiddleware.validateUpdateInvoice, InvoicesController.updateInvoice);
router.post('/invoices/:id/send', writeRateLimit, InvoicesController.sendInvoice);
router.post('/invoices/:id/cancel', writeRateLimit, invoicesValidationMiddleware.validateCancelInvoice, InvoicesController.cancelInvoice);

// Payment routes
router.get('/payments', paymentsValidationMiddleware.validateQuery, PaymentsController.getPayments);
router.get('/payments/stats', PaymentsController.getPaymentStats);
router.get('/payments/:id', PaymentsController.getPayment);
router.post('/payments', paymentRateLimit, paymentsValidationMiddleware.validateCreatePayment, PaymentsController.processPayment);
router.post('/payments/:id/refund', writeRateLimit, paymentsValidationMiddleware.validateRefundPayment, PaymentsController.refundPayment);

// Commission routes
router.get('/commissions', commissionsValidationMiddleware.validateQuery, CommissionsController.getCommissions);
router.get('/commissions/stats', CommissionsController.getCommissionStats);
router.get('/commissions/:id', CommissionsController.getCommission);
router.post('/commissions', commissionRateLimit, commissionsValidationMiddleware.validateCreateCommission, CommissionsController.calculateCommission);
router.post('/commissions/:id/approve', writeRateLimit, CommissionsController.approveCommission);
router.post('/commissions/:id/pay', writeRateLimit, CommissionsController.payCommission);
router.post('/commissions/:id/reject', writeRateLimit, commissionsValidationMiddleware.validateApproveReject, CommissionsController.rejectCommission);

export default router;