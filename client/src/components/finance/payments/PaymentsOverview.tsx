import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/services/financeApi';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Payment, PaymentFormData, PaymentFilters } from '@/types/finance';

export default function PaymentsOverview() {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amount: 0,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    paymentReference: '',
  });
  const queryClient = useQueryClient();

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'history', filters],
    queryFn: () => paymentsApi.getPaymentHistory(filters).then(res => res.data),
  });

  // Fetch failed payments
  const { data: failedPaymentsData, isLoading: failedLoading } = useQuery({
    queryKey: ['payments', 'failed'],
    queryFn: () => paymentsApi.getFailedPayments().then(res => res.data),
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => paymentsApi.processPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowPaymentForm(false);
      setPaymentForm({
        amount: 0,
        currency: 'USD',
        paymentMethod: 'bank_transfer',
        paymentReference: '',
      });
    },
  });

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.retryPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    processPaymentMutation.mutate(paymentForm);
  };

  const handleRetryPayment = (paymentId: string) => {
    retryPaymentMutation.mutate(paymentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'REFUNDED': return 'bg-purple-100 text-purple-800';
      case 'ESCALATED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'credit_card': return 'bg-blue-100 text-blue-800';
      case 'debit_card': return 'bg-green-100 text-green-800';
      case 'bank_transfer': return 'bg-purple-100 text-purple-800';
      case 'mobile_money': return 'bg-orange-100 text-orange-800';
      case 'cheque': return 'bg-gray-100 text-gray-800';
      case 'cash': return 'bg-yellow-100 text-yellow-800';
      case 'direct_debit': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Management</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
              >
                {showPaymentForm ? 'Cancel' : 'Process Payment'}
              </Button>
              <Button onClick={() => paymentsApi.reconcilePayments({})}>
                Reconcile Payments
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Process Payment Form */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>Process New Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceId">Invoice ID (Optional)</Label>
                  <Input
                    id="invoiceId"
                    type="number"
                    value={paymentForm.invoiceId || ''}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      invoiceId: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="Link to invoice"
                  />
                </div>
                <div>
                  <Label htmlFor="memberId">Member ID (Optional)</Label>
                  <Input
                    id="memberId"
                    type="number"
                    value={paymentForm.memberId || ''}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      memberId: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="Member ID"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      amount: Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={paymentForm.currency}
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) => setPaymentForm(prev => ({
                      ...prev,
                      paymentMethod: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="direct_debit">Direct Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentReference">Payment Reference *</Label>
                  <Input
                    id="paymentReference"
                    required
                    value={paymentForm.paymentReference}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      paymentReference: e.target.value
                    }))}
                    placeholder="Transaction reference"
                  />
                </div>
              </div>

              {/* Card Details (if credit/debit card) */}
              {(paymentForm.paymentMethod === 'credit_card' || paymentForm.paymentMethod === 'debit_card') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        cardNumber: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardExpiry">Expiry Date</Label>
                    <Input
                      id="cardExpiry"
                      placeholder="MM/YY"
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        cardExpiry: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardCvv">CVV</Label>
                    <Input
                      id="cardCvv"
                      placeholder="123"
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        cardCvv: e.target.value
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Bank Account Details (if bank transfer) */}
              {paymentForm.paymentMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      placeholder="Bank name"
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        bankAccount: {
                          ...prev.bankAccount,
                          bankName: e.target.value,
                          accountNumber: prev.bankAccount?.accountNumber || '',
                          routingNumber: prev.bankAccount?.routingNumber,
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Account number"
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        bankAccount: {
                          ...prev.bankAccount,
                          bankName: prev.bankAccount?.bankName || '',
                          accountNumber: e.target.value,
                          routingNumber: prev.bankAccount?.routingNumber,
                        }
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Mobile Money (if mobile money) */}
              {paymentForm.paymentMethod === 'mobile_money' && (
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <Input
                    id="mobileNumber"
                    placeholder="+2547xxxxxxxx"
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      mobileNumber: e.target.value
                    }))}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Payment description"
                  value={paymentForm.description || ''}
                  onChange={(e) => setPaymentForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows={2}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={processPaymentMutation.isPending}
                >
                  {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Failed Payments Alert */}
      {failedPaymentsData?.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {failedPaymentsData.length} failed payment{failedPaymentsData.length > 1 ? 's' : ''} need attention
              </span>
              <Button size="sm" variant="outline" className="ml-4">
                Review Failed Payments
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="methodFilter">Method</Label>
              <Select
                value={filters.method || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, method: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="direct_debit">Direct Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateFrom: e.target.value || undefined
                }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateTo: e.target.value || undefined
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : paymentsData?.length ? (
            <div className="space-y-4">
              {paymentsData.map((payment: Payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">#{payment.id}</span>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        <Badge className={getMethodColor(payment.paymentMethod)}>
                          {payment.paymentMethod.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(payment.amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reference:</span>
                          <span className="ml-2">{payment.paymentReference}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2">{formatDate(payment.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Currency:</span>
                          <span className="ml-2">{payment.currency}</span>
                        </div>
                      </div>
                      {payment.failureReason && (
                        <p className="text-sm text-red-600 mt-2">
                          Error: {payment.failureReason}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {payment.status === 'FAILED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryPayment(payment.id.toString())}
                          disabled={retryPaymentMutation.isPending}
                        >
                          {retryPaymentMutation.isPending ? 'Retrying...' : 'Retry'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => paymentsApi.getPaymentStatus(payment.id.toString())}
                      >
                        View Status
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}