import { Router, Request, Response } from 'express';
import { reportAggregatorService } from '../services/ReportAggregatorService.js';
import { billingServiceClient } from '../clients/BillingServiceClient.js';
import { insuranceServiceClient } from '../clients/InsuranceServiceClient.js';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('reportsController');
const router = Router();

/**
 * GET /api/finance/reports/consolidated
 * Get consolidated billing and premium report across all services
 */
router.get('/consolidated', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    logger.info('Request for consolidated report', { startDate, endDate });

    const report = await reportAggregatorService.getConsolidatedBillingReport({
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: report,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate consolidated report', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate consolidated report',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/finance/reports/performance
 * Get service performance metrics
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const report = await reportAggregatorService.getServicePerformanceReport(
      period as 'daily' | 'weekly' | 'monthly' || 'daily'
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Failed to generate performance report', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/finance/reports/billing
 * Get billing specific report
 */
router.get('/billing', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const [totals, transactions, revenueByService] = await Promise.all([
      billingServiceClient.getInvoiceTotals({
        startDate: startDate as string,
        endDate: endDate as string
      }),
      billingServiceClient.getTransactions({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string
      }),
      billingServiceClient.getRevenueByService({
        startDate: startDate as string,
        endDate: endDate as string
      })
    ]);

    res.json({
      success: true,
      data: {
        totals,
        transactions,
        revenueByService
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate billing report', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate billing report',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/finance/reports/premiums
 * Get premium billing specific report
 */
router.get('/premiums', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, schemeId } = req.query;
    
    const [stats, collections, schemeStats] = await Promise.all([
      insuranceServiceClient.getPremiumStats({
        startDate: startDate as string,
        endDate: endDate as string
      }),
      insuranceServiceClient.getPremiumCollections({
        startDate: startDate as string,
        endDate: endDate as string
      }),
      insuranceServiceClient.getSchemePremiumStats(schemeId as string)
    ]);

    res.json({
      success: true,
      data: {
        stats,
        collections,
        schemeStats
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate premium report', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate premium report',
      message: (error as Error).message
    });
  }
});

export const reportsController = router;
export default reportsController;