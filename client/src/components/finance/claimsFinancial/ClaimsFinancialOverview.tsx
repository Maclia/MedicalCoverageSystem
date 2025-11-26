import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { claimsFinancialApi } from '@/services/financeApi';
import { formatCurrency, formatDate } from '@/utils/format';
import type {
  ClaimReserve,
  ClaimPayment,
  ReserveFormData,
  ClaimPaymentFormData,
  ClaimFinancialAnalysis,
  ClaimReserveTransaction
} from '@/types/finance';

export default function ClaimsFinancialOverview() {
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [reserveForm, setReserveForm] = useState<ReserveFormData>({
    claimId: 0,
    reserveType: 'INCURRED_LOSS',
    amount: 0,
    currency: 'USD',
  });
  const [paymentForm, setPaymentForm] = useState<ClaimPaymentFormData>({
    claimId: 0,
    paymentType: 'INDEMNITY',
    amount: 0,
    currency: 'USD',
    description: '',
    payeeName: '',
    payeeType: 'MEMBER',
    dueDate: '',
    requestedBy: 0,
  });
  const queryClient = useQueryClient();

  // Fetch claim reserves (mock claim ID for now)
  const claimId = 1; // This would come from the URL or context
  const { data: reservesData, isLoading: reservesLoading } = useQuery({
    queryKey: ['claims-financial', 'reserves', claimId],
    queryFn: () => claimsFinancialApi.getClaimReserves(claimId).then(res => res.data),
    enabled: !!claimId,
  });

  // Fetch claim payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['claims-financial', 'payments', claimId],
    queryFn: () => claimsFinancialApi.getClaimPayments(claimId).then(res => res.data),
    enabled: !!claimId,
  });

  // Fetch financial analysis
  const { data: analysisData, isLoading: analysisLoading } = useQuery({
    queryKey: ['claims-financial', 'analysis', claimId],
    queryFn: () => claimsFinancialApi.getClaimFinancialAnalysis(claimId).then(res => res.data),
    enabled: !!claimId,
  });

  // Create reserve mutation
  const createReserveMutation = useMutation({
    mutationFn: (data: ReserveFormData) => claimsFinancialApi.createReserve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims-financial'] });
      setShowReserveForm(false);
      setReserveForm({
        claimId: 0,
        reserveType: 'INCURRED_LOSS',
        amount: 0,
        currency: 'USD',
      });
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: ClaimPaymentFormData) => claimsFinancialApi.createClaimPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims-financial'] });
      setShowPaymentForm(false);
      setPaymentForm({
        claimId: 0,
        paymentType: 'INDEMNITY',
        amount: 0,
        currency: 'USD',
        description: '',
        payeeName: '',
        payeeType: 'MEMBER',
        dueDate: '',
        requestedBy: 0,
      });
    },
  });

  // Process payment approval mutation
  const approvePaymentMutation = useMutation({
    mutationFn: ({ paymentId, approved, approverId, comments }: {
      paymentId: number;
      approved: boolean;
      approverId: number;
      comments?: string;
    }) => claimsFinancialApi.processPaymentApproval(paymentId, {
      approved,
      approverId,
      comments,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims-financial'] });
    },
  });

  const handleCreateReserve = (e: React.FormEvent) => {
    e.preventDefault();
    createReserveMutation.mutate({
      ...reserveForm,
      claimId: claimId,
    });
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    createPaymentMutation.mutate({
      ...paymentForm,
      claimId: claimId,
    });
  };

  const handleApprovePayment = (paymentId: number, approved: boolean) => {
    approvePaymentMutation.mutate({
      paymentId,
      approved,
      approverId: 1, // This would come from user context
    });
  };

  const getReserveStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      case 'EXHAUSTED': return 'bg-red-100 text-red-800';
      case 'SUPERSEDED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReserveTypeColor = (type: string) => {
    switch (type) {
      case 'INCURRED_LOSS': return 'bg-blue-100 text-blue-800';
      case 'EXPENSE': return 'bg-purple-100 text-purple-800';
      case 'SALVAGE_RECOVERY': return 'bg-green-100 text-green-800';
      case 'LEGAL_EXPENSES': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PROCESSING': return 'bg-purple-100 text-purple-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'ESCALATED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'INDEMNITY': return 'bg-blue-100 text-blue-800';
      case 'EXPENSE': return 'bg-purple-100 text-purple-800';
      case 'LEGAL': return 'bg-red-100 text-red-800';
      case 'MEDICAL': return 'bg-green-100 text-green-800';
      case 'REHABILITATION': return 'bg-orange-100 text-orange-800';
      case 'LOSS_OF_EARNINGS': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate total reserves and payments
  const totalReserves = reservesData?.reduce((sum: number, reserve: ClaimReserve) =>
    reserve.status === 'ACTIVE' ? sum + reserve.amount : sum, 0) || 0;
  const totalPayments = paymentsData?.reduce((sum: number, payment: ClaimPayment) =>
    payment.status === 'COMPLETED' ? sum + payment.amount : sum, 0) || 0;
  const reserveUtilization = totalReserves > 0 ? (totalPayments / totalReserves) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Claims Financial Management</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowReserveForm(!showReserveForm)}
              >
                {showReserveForm ? 'Cancel' : 'Create Reserve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
              >
                {showPaymentForm ? 'Cancel' : 'Request Payment'}
              </Button>
              <Button onClick={() => claimsFinancialApi.generateReserveAdequacyReport()}>
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Reserves</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalReserves)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reservesData?.filter((r: ClaimReserve) => r.status === 'ACTIVE').length || 0} active reserves
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPayments)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentsData?.filter((p: ClaimPayment) => p.status === 'COMPLETED').length || 0} completed payments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Reserve Utilization</p>
              <p className="text-2xl font-bold text-purple-600">
                {reserveUtilization.toFixed(1)}%
              </p>
              <Progress value={reserveUtilization} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Reserve Form */}
      {showReserveForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Reserve</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateReserve} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reserveType">Reserve Type *</Label>
                  <Select
                    value={reserveForm.reserveType}
                    onValueChange={(value) => setReserveForm(prev => ({
                      ...prev,
                      reserveType: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCURRED_LOSS">Incurred Loss</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="SALVAGE_RECOVERY">Salvage Recovery</SelectItem>
                      <SelectItem value="LEGAL_EXPENSES">Legal Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={reserveForm.currency}
                    onValueChange={(value) => setReserveForm(prev => ({ ...prev, currency: value }))}
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
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={reserveForm.amount}
                    onChange={(e) => setReserveForm(prev => ({
                      ...prev,
                      amount: Number(e.target.value)
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Reserve notes and justification"
                  value={reserveForm.notes || ''}
                  onChange={(e) => setReserveForm(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={createReserveMutation.isPending}
                >
                  {createReserveMutation.isPending ? 'Creating...' : 'Create Reserve'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReserveForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Request Payment Form */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request Claim Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select
                    value={paymentForm.paymentType}
                    onValueChange={(value) => setPaymentForm(prev => ({
                      ...prev,
                      paymentType: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDEMNITY">Indemnity</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="LEGAL">Legal</SelectItem>
                      <SelectItem value="MEDICAL">Medical</SelectItem>
                      <SelectItem value="REHABILITATION">Rehabilitation</SelectItem>
                      <SelectItem value="LOSS_OF_EARNINGS">Loss of Earnings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payeeType">Payee Type *</Label>
                  <Select
                    value={paymentForm.payeeType}
                    onValueChange={(value) => setPaymentForm(prev => ({
                      ...prev,
                      payeeType: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="PROVIDER">Provider</SelectItem>
                      <SelectItem value="LAWYER">Lawyer</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="payeeName">Payee Name *</Label>
                  <Input
                    id="payeeName"
                    required
                    value={paymentForm.payeeName}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      payeeName: e.target.value
                    }))}
                    placeholder="Payee name"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    required
                    value={paymentForm.dueDate}
                    onChange={(e) => setPaymentForm(prev => ({
                      ...prev,
                      dueDate: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  placeholder="Payment description and justification"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="payeeReference">Payee Reference (Optional)</Label>
                <Input
                  id="payeeReference"
                  placeholder="Payee reference or account number"
                  value={paymentForm.payeeReference || ''}
                  onChange={(e) => setPaymentForm(prev => ({
                    ...prev,
                    payeeReference: e.target.value
                  }))}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? 'Requesting...' : 'Request Payment'}
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

      {/* Pending Payments Alert */}
      {paymentsData?.filter((p: ClaimPayment) => p.status === 'PENDING').length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {paymentsData.filter((p: ClaimPayment) => p.status === 'PENDING').length} payment{paymentsData.filter((p: ClaimPayment) => p.status === 'PENDING').length > 1 ? 's' : ''} awaiting approval
              </span>
              <Button size="sm" variant="outline" className="ml-4">
                Review Pending Payments
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Claim Reserves */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Reserves</CardTitle>
        </CardHeader>
        <CardContent>
          {reservesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : reservesData?.length ? (
            <div className="space-y-4">
              {reservesData.map((reserve: ClaimReserve) => (
                <div key={reserve.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">Reserve #{reserve.id}</span>
                        <Badge className={getReserveTypeColor(reserve.reserveType)}>
                          {reserve.reserveType.replace('_', ' ')}
                        </Badge>
                        <Badge className={getReserveStatusColor(reserve.status)}>
                          {reserve.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(reserve.amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Currency:</span>
                          <span className="ml-2">{reserve.currency}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reserved:</span>
                          <span className="ml-2">{formatDate(reserve.reservedAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Adjusted:</span>
                          <span className="ml-2">
                            {reserve.lastAdjustmentAt ? formatDate(reserve.lastAdjustmentAt) : 'Never'}
                          </span>
                        </div>
                      </div>
                      {reserve.notes && (
                        <p className="text-sm text-gray-600 mt-2">{reserve.notes}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {reserve.status === 'ACTIVE' && (
                        <>
                          <Button size="sm" variant="outline">
                            Adjust
                          </Button>
                          <Button size="sm" variant="outline">
                            Close
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No reserves found for this claim</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Payments</CardTitle>
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
              {paymentsData.map((payment: ClaimPayment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">Payment #{payment.id}</span>
                        <Badge className={getPaymentTypeColor(payment.paymentType)}>
                          {payment.paymentType.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPaymentStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {payment.payeeType}: {payment.payeeName}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(payment.amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Due Date:</span>
                          <span className="ml-2">{formatDate(payment.dueDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Requested:</span>
                          <span className="ml-2">{formatDate(payment.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Currency:</span>
                          <span className="ml-2">{payment.currency}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{payment.description}</p>
                      {payment.failureReason && (
                        <p className="text-sm text-red-600 mt-2">
                          Failure: {payment.failureReason}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {payment.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprovePayment(payment.id, true)}
                            disabled={approvePaymentMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprovePayment(payment.id, false)}
                            disabled={approvePaymentMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {payment.status === 'APPROVED' && (
                        <Button size="sm">
                          Execute
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found for this claim</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}