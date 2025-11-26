/**
 * Accounts Receivable Types
 */

export interface AccountsReceivable {
  id: number;
  memberId?: number;
  companyId?: number;
  currentBalance: number;
  aging30Days: number;
  aging60Days: number;
  aging90Days: number;
  aging90PlusDays: number;
  creditLimit: number;
  accountStatus: 'active' | 'suspended' | 'terminated';
  lastPaymentDate?: Date;
  suspensionDate?: Date;
  collectionStatus: 'current' | 'overdue' | 'collections' | 'legal' | 'written_off';
  createdAt: Date;
  updatedAt: Date;
}

export interface AgingReport {
  summary: {
    total: number;
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyPlus: number;
  };
  details: Array<{
    accountId: number;
    accountName: string;
    totalBalance: number;
    aging: {
      current: number;
      thirtyDays: number;
      sixtyDays: number;
      ninetyPlus: number;
    };
  }>;
}

export interface AccountStatement {
  accountId: number;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    date: Date;
    description: string;
    amount: number;
    type: 'payment' | 'charge' | 'adjustment' | 'credit';
    balance: number;
  }>;
  generatedAt: Date;
}