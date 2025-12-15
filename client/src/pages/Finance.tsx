import React from 'react';
import { FinanceProvider } from '@/contexts/FinanceContext';
import FinanceDashboard from '@/components/finance/FinanceDashboard';

export default function Finance() {
  return (
    <FinanceProvider>
      <div className="container mx-auto p-6">
        <FinanceDashboard />
      </div>
    </FinanceProvider>
  );
}