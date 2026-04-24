import { billingServiceClient } from '../clients/BillingServiceClient.js';
import { insuranceServiceClient } from '../clients/InsuranceServiceClient.js';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('ReportAggregatorService');

export interface ConsolidatedBillingReport {
  period: {
    startDate: string;
    endDate: string;
  };
  billing: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
    revenueByService: Array<{
      serviceType: string;
      totalAmount: number;
      percentage: number;
    }>;
  };
  premiums: {
    totalExpected: number;
    totalCollected: number;
    collectionRate: number;
    overdueAmount: number;
    activeSchemes: number;
  };
  summary: {
    totalRevenue: number;
    totalExpectedRevenue: number;
    overallCollectionRate: number;
    pendingAmount: number;
  };
}

export interface ServicePerformanceReport {
  services: Array<{
    serviceName: string;
    totalTransactions: number;
    totalAmount: number;
    averageTransaction: number;
    successRate: number;
  }>;
  generatedAt: string;
  period: string;
}

class ReportAggregatorService {
  async getConsolidatedBillingReport(dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ConsolidatedBillingReport> {
    logger.info('Generating consolidated billing report', { dateRange });

    try {
      // Fetch data from all services in parallel
      const [billingTotals, premiumStats] = await Promise.allSettled([
        billingServiceClient.getInvoiceTotals(dateRange),
        insuranceServiceClient.getPremiumStats(dateRange)
      ]);

      const billingData = billingTotals.status === 'fulfilled' ? billingTotals.value : {
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        invoiceCount: 0
      };

      const premiumData = premiumStats.status === 'fulfilled' ? {
        totalExpected: premiumStats.value.totalPremiumExpected,
        totalCollected: premiumStats.value.totalPremiumCollected,
        collectionRate: premiumStats.value.collectionRate,
        overdueAmount: premiumStats.value.overdueAmount,
        activeSchemes: premiumStats.value.activeSchemes
      } : {
        totalExpected: 0,
        totalCollected: 0,
        collectionRate: 0,
        overdueAmount: 0,
        activeSchemes: 0
      };

      // Fetch revenue breakdown
      let revenueByService: any[] = [];
      try {
        revenueByService = await billingServiceClient.getRevenueByService(dateRange);
      } catch (error) {
        logger.warn('Failed to fetch revenue by service', { error: (error as Error).message });
      }

      // Calculate percentages
      const totalRevenue = billingData.totalPaid + premiumData.totalCollected;
      const revenueByServiceWithPercentage = revenueByService.map(item => ({
        ...item,
        percentage: billingData.totalPaid > 0 ? (item.totalAmount / billingData.totalPaid) * 100 : 0
      }));

      const totalExpectedRevenue = billingData.totalInvoiced + premiumData.totalExpected;
      const pendingAmount = billingData.totalOutstanding + premiumData.overdueAmount;

      return {
        period: {
          startDate: dateRange?.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
          endDate: dateRange?.endDate || new Date().toISOString().split('T')[0]
        },
        billing: {
          ...billingData,
          revenueByService: revenueByServiceWithPercentage
        },
        premiums: premiumData,
        summary: {
          totalRevenue,
          totalExpectedRevenue,
          overallCollectionRate: totalExpectedRevenue > 0 ? (totalRevenue / totalExpectedRevenue) * 100 : 0,
          pendingAmount
        }
      };

    } catch (error) {
      logger.error('Failed to generate consolidated report', error as Error);
      throw error;
    }
  }

  async getServicePerformanceReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ServicePerformanceReport> {
    logger.info('Generating service performance report', { period });

    const services = [
      {
        serviceName: 'Billing Service',
        totalTransactions: 0,
        totalAmount: 0,
        averageTransaction: 0,
        successRate: 0
      },
      {
        serviceName: 'Insurance Premiums',
        totalTransactions: 0,
        totalAmount: 0,
        averageTransaction: 0,
        successRate: 0
      }
    ];

    return {
      services,
      generatedAt: new Date().toISOString(),
      period
    };
  }
}

export const reportAggregatorService = new ReportAggregatorService();
export default reportAggregatorService;