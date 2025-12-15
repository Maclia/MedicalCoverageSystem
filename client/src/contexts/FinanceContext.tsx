import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeApi from '@/services/financeApi';
import type {
  Invoice,
  Payment,
  Commission,
  ClaimReserve,
  ClaimPayment,
  DashboardAnalytics,
  ModuleHealth
} from '@/types/finance';

// Finance State Interface
interface FinanceState {
  // Dashboard data
  dashboardAnalytics: DashboardAnalytics | null;
  moduleHealth: ModuleHealth | null;

  // Billing state
  invoices: Invoice[];
  billingFilters: any;

  // Payments state
  payments: Payment[];
  failedPayments: Payment[];
  paymentFilters: any;

  // Commissions state
  commissions: Commission[];
  paymentRuns: any[];
  leaderboard: any[];
  commissionFilters: any;

  // Claims Financial state
  claimReserves: ClaimReserve[];
  claimPayments: ClaimPayment[];
  claimAnalysis: any;

  // UI state
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Action Types
type FinanceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DASHBOARD_ANALYTICS'; payload: DashboardAnalytics }
  | { type: 'SET_MODULE_HEALTH'; payload: ModuleHealth }
  | { type: 'SET_INVOICES'; payload: Invoice[] }
  | { type: 'SET_BILLING_FILTERS'; payload: any }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'SET_FAILED_PAYMENTS'; payload: Payment[] }
  | { type: 'SET_PAYMENT_FILTERS'; payload: any }
  | { type: 'SET_COMMISSIONS'; payload: Commission[] }
  | { type: 'SET_PAYMENT_RUNS'; payload: any[] }
  | { type: 'SET_LEADERBOARD'; payload: any[] }
  | { type: 'SET_COMMISSION_FILTERS'; payload: any }
  | { type: 'SET_CLAIM_RESERVES'; payload: ClaimReserve[] }
  | { type: 'SET_CLAIM_PAYMENTS'; payload: ClaimPayment[] }
  | { type: 'SET_CLAIM_ANALYSIS'; payload: any }
  | { type: 'REFRESH_DATA' }
  | { type: 'CLEAR_ERROR' };

// Initial State
const initialState: FinanceState = {
  dashboardAnalytics: null,
  moduleHealth: null,
  invoices: [],
  billingFilters: {},
  payments: [],
  failedPayments: [],
  paymentFilters: {},
  commissions: [],
  paymentRuns: [],
  leaderboard: [],
  commissionFilters: {},
  claimReserves: [],
  claimPayments: [],
  claimAnalysis: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Reducer
function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_DASHBOARD_ANALYTICS':
      return {
        ...state,
        dashboardAnalytics: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_MODULE_HEALTH':
      return {
        ...state,
        moduleHealth: action.payload,
        loading: false,
        error: null
      };

    case 'SET_INVOICES':
      return {
        ...state,
        invoices: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_BILLING_FILTERS':
      return { ...state, billingFilters: action.payload };

    case 'SET_PAYMENTS':
      return {
        ...state,
        payments: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_FAILED_PAYMENTS':
      return {
        ...state,
        failedPayments: action.payload,
        loading: false,
        error: null
      };

    case 'SET_PAYMENT_FILTERS':
      return { ...state, paymentFilters: action.payload };

    case 'SET_COMMISSIONS':
      return {
        ...state,
        commissions: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_PAYMENT_RUNS':
      return {
        ...state,
        paymentRuns: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_LEADERBOARD':
      return {
        ...state,
        leaderboard: action.payload,
        loading: false,
        error: null
      };

    case 'SET_COMMISSION_FILTERS':
      return { ...state, commissionFilters: action.payload };

    case 'SET_CLAIM_RESERVES':
      return {
        ...state,
        claimReserves: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_CLAIM_PAYMENTS':
      return {
        ...state,
        claimPayments: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

    case 'SET_CLAIM_ANALYSIS':
      return {
        ...state,
        claimAnalysis: action.payload,
        loading: false,
        error: null
      };

    case 'REFRESH_DATA':
      return { ...state, lastUpdated: new Date() };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// Context Interface
interface FinanceContextType {
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;

  // Dashboard actions
  refreshDashboard: () => Promise<void>;
  refreshModuleHealth: () => Promise<void>;

  // Billing actions
  fetchInvoices: (filters?: any) => Promise<void>;
  updateBillingFilters: (filters: any) => void;
  generateInvoice: (data: any) => Promise<void>;
  updateInvoice: (id: number, data: any) => Promise<void>;

  // Payment actions
  fetchPayments: (filters?: any) => Promise<void>;
  fetchFailedPayments: () => Promise<void>;
  updatePaymentFilters: (filters: any) => void;
  processPayment: (data: any) => Promise<void>;
  retryPayment: (paymentId: string) => Promise<void>;

  // Commission actions
  fetchCommissions: (filters?: any) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  updateCommissionFilters: (filters: any) => void;
  calculateCommission: (data: any) => Promise<void>;
  createPaymentRun: (data: any) => Promise<void>;

  // Claims Financial actions
  fetchClaimReserves: (claimId: number) => Promise<void>;
  fetchClaimPayments: (claimId: number) => Promise<void>;
  fetchClaimAnalysis: (claimId: number) => Promise<void>;
  createReserve: (data: any) => Promise<void>;
  createClaimPayment: (data: any) => Promise<void>;
  approvePayment: (paymentId: number, approved: boolean, approverId: number, comments?: string) => Promise<void>;

  // Utility actions
  clearError: () => void;
  refreshAllData: () => Promise<void>;
}

// Create Context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Provider Component
interface FinanceProviderProps {
  children: ReactNode;
}

export function FinanceProvider({ children }: FinanceProviderProps) {
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const queryClient = useQueryClient();

  // Dashboard actions
  const refreshDashboard = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await financeApi.billing.getDashboardAnalytics();
      dispatch({ type: 'SET_DASHBOARD_ANALYTICS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch dashboard data' });
    }
  };

  const refreshModuleHealth = async () => {
    try {
      const response = await financeApi.module.getSystemHealth();
      dispatch({ type: 'SET_MODULE_HEALTH', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch module health' });
    }
  };

  // Billing actions
  const fetchInvoices = async (filters?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      if (filters) {
        dispatch({ type: 'SET_BILLING_FILTERS', payload: filters });
      }
      const response = await financeApi.billing.getInvoices(filters || state.billingFilters);
      dispatch({ type: 'SET_INVOICES', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch invoices' });
    }
  };

  const updateBillingFilters = (filters: any) => {
    dispatch({ type: 'SET_BILLING_FILTERS', payload: filters });
    fetchInvoices(filters);
  };

  const generateInvoice = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.billing.generateInvoice(data);
      await fetchInvoices(state.billingFilters);
      await refreshDashboard();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to generate invoice' });
    }
  };

  const updateInvoice = async (id: number, data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.billing.updateInvoice(id, data);
      await fetchInvoices(state.billingFilters);
      await refreshDashboard();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update invoice' });
    }
  };

  // Payment actions
  const fetchPayments = async (filters?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      if (filters) {
        dispatch({ type: 'SET_PAYMENT_FILTERS', payload: filters });
      }
      const response = await financeApi.payments.getPaymentHistory(filters || state.paymentFilters);
      dispatch({ type: 'SET_PAYMENTS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch payments' });
    }
  };

  const fetchFailedPayments = async () => {
    try {
      const response = await financeApi.payments.getFailedPayments();
      dispatch({ type: 'SET_FAILED_PAYMENTS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch failed payments' });
    }
  };

  const updatePaymentFilters = (filters: any) => {
    dispatch({ type: 'SET_PAYMENT_FILTERS', payload: filters });
    fetchPayments(filters);
  };

  const processPayment = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.payments.processPayment(data);
      await fetchPayments(state.paymentFilters);
      await refreshDashboard();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to process payment' });
    }
  };

  const retryPayment = async (paymentId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.payments.retryPayment(paymentId);
      await fetchPayments(state.paymentFilters);
      await fetchFailedPayments();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to retry payment' });
    }
  };

  // Commission actions
  const fetchCommissions = async (filters?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      if (filters) {
        dispatch({ type: 'SET_COMMISSION_FILTERS', payload: filters });
      }
      const response = await financeApi.commissions.getPaymentRuns(filters || state.commissionFilters);
      dispatch({ type: 'SET_PAYMENT_RUNS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch commissions' });
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await financeApi.commissions.getLeaderboard();
      dispatch({ type: 'SET_LEADERBOARD', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch leaderboard' });
    }
  };

  const updateCommissionFilters = (filters: any) => {
    dispatch({ type: 'SET_COMMISSION_FILTERS', payload: filters });
    fetchCommissions(filters);
  };

  const calculateCommission = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.commissions.calculateCommission(data);
      await fetchCommissions(state.commissionFilters);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to calculate commission' });
    }
  };

  const createPaymentRun = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.commissions.createPaymentRun(data);
      await fetchCommissions(state.commissionFilters);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create payment run' });
    }
  };

  // Claims Financial actions
  const fetchClaimReserves = async (claimId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await financeApi.claimsFinancial.getClaimReserves(claimId);
      dispatch({ type: 'SET_CLAIM_RESERVES', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch claim reserves' });
    }
  };

  const fetchClaimPayments = async (claimId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await financeApi.claimsFinancial.getClaimPayments(claimId);
      dispatch({ type: 'SET_CLAIM_PAYMENTS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch claim payments' });
    }
  };

  const fetchClaimAnalysis = async (claimId: number) => {
    try {
      const response = await financeApi.claimsFinancial.getClaimFinancialAnalysis(claimId);
      dispatch({ type: 'SET_CLAIM_ANALYSIS', payload: response.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch claim analysis' });
    }
  };

  const createReserve = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.claimsFinancial.createReserve(data);
      // Assuming claimId is in the data
      await fetchClaimReserves(data.claimId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create reserve' });
    }
  };

  const createClaimPayment = async (data: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.claimsFinancial.createClaimPayment(data);
      // Assuming claimId is in the data
      await fetchClaimPayments(data.claimId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create claim payment' });
    }
  };

  const approvePayment = async (paymentId: number, approved: boolean, approverId: number, comments?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await financeApi.claimsFinancial.processPaymentApproval(paymentId, {
        approved,
        approverId,
        comments,
      });
      // We'd need the claimId here - this is a limitation we'd address in a real implementation
      // await fetchClaimPayments(claimId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to approve payment' });
    }
  };

  // Utility actions
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshAllData = async () => {
    await Promise.all([
      refreshDashboard(),
      refreshModuleHealth(),
      fetchInvoices(state.billingFilters),
      fetchPayments(state.paymentFilters),
      fetchFailedPayments(),
      fetchCommissions(state.commissionFilters),
      fetchLeaderboard(),
    ]);
  };

  const value: FinanceContextType = {
    state,
    dispatch,
    refreshDashboard,
    refreshModuleHealth,
    fetchInvoices,
    updateBillingFilters,
    generateInvoice,
    updateInvoice,
    fetchPayments,
    fetchFailedPayments,
    updatePaymentFilters,
    processPayment,
    retryPayment,
    fetchCommissions,
    fetchLeaderboard,
    updateCommissionFilters,
    calculateCommission,
    createPaymentRun,
    fetchClaimReserves,
    fetchClaimPayments,
    fetchClaimAnalysis,
    createReserve,
    createClaimPayment,
    approvePayment,
    clearError,
    refreshAllData,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

// Hook to use the finance context
export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

export default FinanceContext;