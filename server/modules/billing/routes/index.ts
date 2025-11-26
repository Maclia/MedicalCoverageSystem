/**
 * Billing Module Routes
 * All API routes for the billing module
 */

import type { Express, Request, Response } from 'express';
import { BillingService } from '../services/BillingService.js';
import { AccountsReceivableService } from '../services/AccountsReceivableService.js';
import { BillingNotificationService } from '../services/BillingNotificationService.js';

export interface BillingServices {
  billingService: BillingService;
  accountsReceivableService: AccountsReceivableService;
  notificationService: BillingNotificationService;
}

export function billingRoutes(app: Express, services: BillingServices): void {
  const { billingService, accountsReceivableService, notificationService } = services;

  // Invoice routes
  app.post('/billing/invoices', async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.generateInvoice(req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to generate invoice'
      });
    }
  });

  app.get('/billing/invoices/:id', async (req: Request, res: Response) => {
    try {
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

  app.put('/billing/invoices/:id', async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.updateInvoice(parseInt(req.params.id), req.body);
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update invoice'
      });
    }
  });

  app.get('/billing/invoices', async (req: Request, res: Response) => {
    try {
      const invoices = await billingService.getInvoices(req.query);
      res.json({ success: true, data: invoices });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get invoices'
      });
    }
  });

  // Billing cycle routes
  app.post('/billing/cycles/process', async (req: Request, res: Response) => {
    try {
      const cycleDate = new Date(req.body.cycleDate || Date.now());
      const result = await billingService.processBillingCycle(cycleDate);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process billing cycle'
      });
    }
  });

  // Accounts receivable routes
  app.get('/billing/accounts-receivable', async (req: Request, res: Response) => {
    try {
      const ar = await accountsReceivableService.getAccountsReceivableSummary();
      res.json({ success: true, data: ar });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get accounts receivable'
      });
    }
  });

  app.get('/billing/accounts-receivable/aging', async (req: Request, res: Response) => {
    try {
      const aging = await accountsReceivableService.getAgingReport();
      res.json({ success: true, data: aging });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get aging report'
      });
    }
  });

  app.post('/billing/accounts-receivable/update', async (req: Request, res: Response) => {
    try {
      const result = await accountsReceivableService.updateAccountsReceivable();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update accounts receivable'
      });
    }
  });

  // Notification routes
  app.post('/billing/notifications/send-reminders', async (req: Request, res: Response) => {
    try {
      const result = await notificationService.sendPaymentReminders();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to send reminders'
      });
    }
  });

  app.post('/billing/notifications/send-overdue', async (req: Request, res: Response) => {
    try {
      const result = await notificationService.sendOverdueNotices();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to send overdue notices'
      });
    }
  });

  // Analytics routes
  app.get('/billing/analytics/dashboard', async (req: Request, res: Response) => {
    try {
      const dashboard = await billingService.getDashboardAnalytics(req.query);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get dashboard analytics'
      });
    }
  });

  app.get('/billing/analytics/revenue', async (req: Request, res: Response) => {
    try {
      const revenue = await billingService.getRevenueAnalytics(req.query);
      res.json({ success: true, data: revenue });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get revenue analytics'
      });
    }
  });

  // Bulk operations
  app.post('/billing/bulk/generate', async (req: Request, res: Response) => {
    try {
      const result = await billingService.generateInvoicesBulk(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to generate bulk invoices'
      });
    }
  });

  app.post('/billing/bulk/send', async (req: Request, res: Response) => {
    try {
      const result = await notificationService.sendBulkNotifications(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send bulk notifications'
      });
    }
  });
}