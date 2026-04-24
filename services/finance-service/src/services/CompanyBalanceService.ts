import { WinstonLogger } from '../utils/WinstonLogger.js';
import { billingServiceClient } from '../clients/BillingServiceClient.js';
import { insuranceServiceClient } from '../clients/InsuranceServiceClient.js';
import { coreServiceClient } from '../clients/CoreServiceClient.js';
import { CompanyBalance, CompanyPremiumUtilization, CompanyTransaction, CompanyReportFilters } from '../types/index.js';

const logger = new WinstonLogger('CompanyBalanceService');

class CompanyBalanceService {
  async getCompanyBalance(companyId: string): Promise<CompanyBalance> {
    logger.info('Fetching company balance', { companyId });

    try {
      // Fetch data in parallel from all relevant services
      const [billingStats, premiumStats, cardStats] = await Promise.allSettled([
        billingServiceClient.getCompanyBillingStats(companyId),
        insuranceServiceClient.getCompanyPremiumStats(companyId),
        coreServiceClient.getCompanyCardStats(companyId)
      ]);

      const billingData = billingStats.status === 'fulfilled' ? billingStats.value : {
        companyName: 'Unknown Company',
        currentBalance: 0,
        availableCredit: 0,
        pendingCharges: 0,
        lastPaymentDate: '',
        nextBillingDate: '',
        status: 'active' as 'active' | 'suspended' | 'delinquent'
      };

      const premiumData = premiumStats.status === 'fulfilled' ? premiumStats.value : {
        totalPremiumAllocated: 0,
        totalPremiumUtilized: 0,
        allocatedPremium: 0,
        utilizedPremium: 0,
        membersEnrolled: 0
      };

      const utilizationRate = premiumData.totalPremiumAllocated > 0
        ? (premiumData.totalPremiumUtilized / premiumData.totalPremiumAllocated) * 100
        : 0;

      return {
        companyId,
        companyName: billingData.companyName || 'Unknown Company',
        currentBalance: billingData.currentBalance,
        availableCredit: billingData.availableCredit,
        totalPremiumAllocated: premiumData.totalPremiumAllocated,
        totalPremiumUtilized: premiumData.totalPremiumUtilized,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        pendingCharges: billingData.pendingCharges,
        lastPaymentDate: billingData.lastPaymentDate ?? '',
        nextBillingDate: billingData.nextBillingDate ?? '',
        status: billingData.status as 'active' | 'suspended' | 'delinquent'
      };

    } catch (error) {
      logger.error('Failed to fetch company balance', { error: error as Error, companyId });
      throw error;
    }
  }

  async getPremiumUtilization(filters: CompanyReportFilters): Promise<CompanyPremiumUtilization> {
    logger.info('Fetching premium utilization', { filters });

    try {
      const [premiumStats, schemeBreakdown, cardStats, claimsStats] = await Promise.allSettled([
        insuranceServiceClient.getCompanyPremiumStats(filters.companyId, filters),
        insuranceServiceClient.getCompanySchemeBreakdown(filters.companyId, filters),
        coreServiceClient.getCompanyCardStats(filters.companyId),
        // TODO: Add claims service client integration
        Promise.resolve({ claimsProcessed: 0, totalClaimsValue: 0 })
      ]);

      const premiumData = premiumStats.status === 'fulfilled' ? premiumStats.value : {
        totalPremiumAllocated: 0,
        totalPremiumUtilized: 0,
        allocatedPremium: 0,
        utilizedPremium: 0,
        membersEnrolled: 0
      };

      const schemeData = schemeBreakdown.status === 'fulfilled' ? schemeBreakdown.value : [];
      const cardData = cardStats.status === 'fulfilled' ? cardStats.value : { activeCards: 0 };
      const claimsData = claimsStats.status === 'fulfilled' ? claimsStats.value : { claimsProcessed: 0, totalClaimsValue: 0 };

      const remainingPremium = premiumData.allocatedPremium - premiumData.utilizedPremium;
      const utilizationPercentage = premiumData.allocatedPremium > 0
        ? (premiumData.utilizedPremium / premiumData.allocatedPremium) * 100
        : 0;

      return {
        companyId: filters.companyId,
        period: {
          startDate: filters.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
          endDate: filters.endDate || new Date().toISOString().split('T')[0]
        },
        allocatedPremium: premiumData.allocatedPremium,
        utilizedPremium: premiumData.utilizedPremium,
        remainingPremium,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        breakdownByScheme: schemeData,
        membersEnrolled: premiumData.membersEnrolled || 0,
        activeCards: cardData.activeCards || 0,
        claimsProcessed: claimsData.claimsProcessed,
        totalClaimsValue: claimsData.totalClaimsValue
      };

    } catch (error) {
      logger.error('Failed to fetch premium utilization', { error: error as Error, filters });
      throw error;
    }
  }

  async getCompanyTransactions(filters: CompanyReportFilters): Promise<CompanyTransaction[]> {
    logger.info('Fetching company transactions', { filters });

    try {
      // TODO: Implement transaction aggregation across services
      return [];
    } catch (error) {
      logger.error('Failed to fetch company transactions', { error: error as Error, filters });
      throw error;
    }
  }
}

export const companyBalanceService = new CompanyBalanceService();
export default companyBalanceService;