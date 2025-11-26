/**
 * Account Statement Types
 */

export interface AccountStatement {
  id: number;
  memberId?: number;
  companyId?: number;
  periodStart: Date;
  periodEnd: Date;
  statementNumber: string;
  openingBalance: number;
  closingBalance: number;
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  currency: string;
  status: 'draft' | 'generated' | 'sent' | 'delivered' | 'viewed';
  generatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  viewedAt?: Date;
  transactions: StatementTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StatementTransaction {
  id: number;
  statementId: number;
  date: Date;
  type: 'payment' | 'charge' | 'adjustment' | 'credit' | 'fee';
  description: string;
  reference?: string;
  amount: number;
  balance: number;
  invoiceId?: number;
  paymentId?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface StatementSettings {
  frequency: 'monthly' | 'quarterly' | 'annual' | 'on_demand';
  deliveryMethod: 'email' | 'postal' | 'both';
  autoGenerate: boolean;
  includeZeroBalance: boolean;
  customTemplate?: string;
  recipients: string[];
}