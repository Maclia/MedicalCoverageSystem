import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/services/financeApi';
import { formatCurrency, formatDate } from '@/utils/format';
import type {
  Commission,
  CommissionPaymentRun,
  AgentPerformanceMetrics,
  CommissionCalculationFormData,
  CommissionFilters
} from '@/types/finance';

export default function CommissionsOverview() {
  const [showCalculationForm, setShowCalculationForm] = useState(false);
  const [showPaymentRunForm, setShowPaymentRunForm] = useState(false);
  const [filters, setFilters] = useState<CommissionFilters>({});
  const [calculationForm, setCalculationForm] = useState<CommissionCalculationFormData>({
    premiumAmount: 0,
    commissionType: 'new_business',
  });
  const queryClient = useQueryClient();

  // Fetch commissions
  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions', 'payment-runs', filters],
    queryFn: () => commissionsApi.getPaymentRuns(filters).then(res => res.data),
  });

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['commissions', 'leaderboard'],
    queryFn: () => commissionsApi.getLeaderboard().then(res => res.data),
  });

  // Calculate commission mutation
  const calculateCommissionMutation = useMutation({
    mutationFn: (data: CommissionCalculationFormData) => commissionsApi.calculateCommission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setShowCalculationForm(false);
      setCalculationForm({
        premiumAmount: 0,
        commissionType: 'new_business',
      });
    },
  });

  // Create payment run mutation
  const createPaymentRunMutation = useMutation({
    mutationFn: (data: any) => commissionsApi.createPaymentRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', 'payment-runs'] });
      setShowPaymentRunForm(false);
    },
  });

  const handleCalculateCommission = (e: React.FormEvent) => {
    e.preventDefault();
    calculateCommissionMutation.mutate(calculationForm);
  };

  const handleCreatePaymentRun = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      periodStart: formData.get('periodStart') as string,
      periodEnd: formData.get('periodEnd') as string,
      runType: formData.get('runType') as string,
      dryRun: formData.get('dryRun') === 'on',
      includeTaxes: formData.get('includeTaxes') === 'on',
      includeAdjustments: formData.get('includeAdjustments') === 'on',
    };
    createPaymentRunMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PROCESSED': return 'bg-purple-100 text-purple-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'EARNED': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'CLAWED_BACK': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-blue-100 text-blue-800';
      case 'ADJUSTED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Commission Management</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCalculationForm(!showCalculationForm)}
              >
                {showCalculationForm ? 'Cancel' : 'Calculate Commission'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPaymentRunForm(!showPaymentRunForm)}
              >
                {showPaymentRunForm ? 'Cancel' : 'Create Payment Run'}
              </Button>
              <Button>
                Generate Statements
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calculate Commission Form */}
      {showCalculationForm && (
        <Card>
          <CardHeader>
            <CardTitle>Calculate Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCalculateCommission} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agentId">Agent ID (Optional)</Label>
                  <Input
                    id="agentId"
                    type="number"
                    value={calculationForm.agentId || ''}
                    onChange={(e) => setCalculationForm(prev => ({
                      ...prev,
                      agentId: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="Agent ID"
                  />
                </div>
                <div>
                  <Label htmlFor="policyId">Policy ID (Optional)</Label>
                  <Input
                    id="policyId"
                    type="number"
                    value={calculationForm.policyId || ''}
                    onChange={(e) => setCalculationForm(prev => ({
                      ...prev,
                      policyId: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="Policy ID"
                  />
                </div>
                <div>
                  <Label htmlFor="premiumAmount">Premium Amount *</Label>
                  <Input
                    id="premiumAmount"
                    type="number"
                    step="0.01"
                    required
                    value={calculationForm.premiumAmount}
                    onChange={(e) => setCalculationForm(prev => ({
                      ...prev,
                      premiumAmount: Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="commissionType">Commission Type *</Label>
                  <Select
                    value={calculationForm.commissionType}
                    onValueChange={(value) => setCalculationForm(prev => ({
                      ...prev,
                      commissionType: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_business">New Business</SelectItem>
                      <SelectItem value="renewal">Renewal</SelectItem>
                      <SelectItem value="endorsement">Endorsement</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="calculationDate">Calculation Date (Optional)</Label>
                  <Input
                    id="calculationDate"
                    type="date"
                    value={calculationForm.calculationDate || ''}
                    onChange={(e) => setCalculationForm(prev => ({
                      ...prev,
                      calculationDate: e.target.value || undefined
                    }))}
                  />
                </div>
              </div>

              {/* Commission Modifiers */}
              <div className="space-y-3">
                <Label>Commission Modifiers</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isNewAgent"
                      checked={calculationForm.modifiers?.isNewAgent || false}
                      onCheckedChange={(checked) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: { ...prev.modifiers, isNewAgent: checked }
                      }))}
                    />
                    <Label htmlFor="isNewAgent" className="text-sm">New Agent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isNewBusiness"
                      checked={calculationForm.modifiers?.isNewBusiness || false}
                      onCheckedChange={(checked) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: { ...prev.modifiers, isNewBusiness: checked }
                      }))}
                    />
                    <Label htmlFor="isNewBusiness" className="text-sm">New Business</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isGroupPolicy"
                      checked={calculationForm.modifiers?.isGroupPolicy || false}
                      onCheckedChange={(checked) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: { ...prev.modifiers, isGroupPolicy: checked }
                      }))}
                    />
                    <Label htmlFor="isGroupPolicy" className="text-sm">Group Policy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasClaims"
                      checked={calculationForm.modifiers?.hasClaims || false}
                      onCheckedChange={(checked) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: { ...prev.modifiers, hasClaims: checked }
                      }))}
                    />
                    <Label htmlFor="hasClaims" className="text-sm">Has Claims</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="policyAge" className="text-sm">Policy Age:</Label>
                    <Input
                      id="policyAge"
                      type="number"
                      placeholder="0"
                      className="w-20 h-8"
                      value={calculationForm.modifiers?.policyAge || ''}
                      onChange={(e) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: {
                          ...prev.modifiers,
                          policyAge: e.target.value ? Number(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="customerAge" className="text-sm">Customer Age:</Label>
                    <Input
                      id="customerAge"
                      type="number"
                      placeholder="0"
                      className="w-20 h-8"
                      value={calculationForm.modifiers?.customerAge || ''}
                      onChange={(e) => setCalculationForm(prev => ({
                        ...prev,
                        modifiers: {
                          ...prev.modifiers,
                          customerAge: e.target.value ? Number(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={calculateCommissionMutation.isPending}
                >
                  {calculateCommissionMutation.isPending ? 'Calculating...' : 'Calculate Commission'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCalculationForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Create Payment Run Form */}
      {showPaymentRunForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Commission Payment Run</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePaymentRun} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart">Period Start *</Label>
                  <Input id="periodStart" name="periodStart" type="date" required />
                </div>
                <div>
                  <Label htmlFor="periodEnd">Period End *</Label>
                  <Input id="periodEnd" name="periodEnd" type="date" required />
                </div>
                <div>
                  <Label htmlFor="runType">Run Type *</Label>
                  <Select name="runType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select run type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="dryRun" name="dryRun" />
                  <Label htmlFor="dryRun">Dry Run (Preview Only)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="includeTaxes" name="includeTaxes" defaultChecked />
                  <Label htmlFor="includeTaxes">Include Tax Withholding</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="includeAdjustments" name="includeAdjustments" defaultChecked />
                  <Label htmlFor="includeAdjustments">Include Adjustments</Label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={createPaymentRunMutation.isPending}
                >
                  {createPaymentRunMutation.isPending ? 'Creating...' : 'Create Payment Run'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentRunForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : leaderboardData?.length ? (
              <div className="space-y-4">
                {leaderboardData.slice(0, 5).map((agent: any, index: number) => (
                  <div key={agent.agentId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Agent {agent.agentId}</p>
                        <p className="text-sm text-gray-600">{agent.department || 'Sales'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(agent.totalCommission)}</p>
                      <p className="text-sm text-gray-600">{agent.policiesSold} policies</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No performance data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {commissionsData?.filter((run: CommissionPaymentRun) => run.status === 'completed').length || 0}
                </p>
                <p className="text-sm text-gray-600">Completed Runs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {commissionsData?.filter((run: CommissionPaymentRun) => run.status === 'approved').length || 0}
                </p>
                <p className="text-sm text-gray-600">Pending Runs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(commissionsData?.reduce((sum: number, run: CommissionPaymentRun) => sum + run.totalAmount, 0) || 0)}
                </p>
                <p className="text-sm text-gray-600">Total Commission</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {commissionsData?.reduce((sum: number, run: CommissionPaymentRun) => sum + run.agentCount, 0) || 0}
                </p>
                <p className="text-sm text-gray-600">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Payment Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : commissionsData?.length ? (
            <div className="space-y-4">
              {commissionsData.map((run: CommissionPaymentRun) => (
                <div key={run.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">Run #{run.id}</span>
                        <Badge className={getStatusColor(run.status)}>
                          {run.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {formatDate(run.runDate)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(run.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Agents:</span>
                          <span className="ml-2">{run.agentCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Net Payment:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(run.summary.totalNetPayment)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Success Rate:</span>
                          <span className="ml-2">
                            {run.agentCount > 0
                              ? `${((run.summary.successCount / run.agentCount) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                      </div>
                      {run.paymentDate && (
                        <p className="text-sm text-gray-600 mt-2">
                          Paid on: {formatDate(run.paymentDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      {run.status === 'draft' && (
                        <Button size="sm">
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No payment runs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}