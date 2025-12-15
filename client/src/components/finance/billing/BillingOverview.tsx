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
import { billingApi } from '@/services/financeApi';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice, InvoiceFilters, InvoiceFormData } from '@/types/finance';

export default function BillingOverview() {
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['billing', 'invoices', filters],
    queryFn: () => billingApi.getInvoices(filters).then(res => res.data),
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => billingApi.generateInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      setShowGenerateForm(false);
    },
  });

  const handleGenerateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InvoiceFormData = {
      memberId: formData.get('memberId') ? Number(formData.get('memberId')) : undefined,
      companyId: formData.get('companyId') ? Number(formData.get('companyId')) : undefined,
      billingPeriodStart: formData.get('billingPeriodStart') as string,
      billingPeriodEnd: formData.get('billingPeriodEnd') as string,
      invoiceType: formData.get('invoiceType') as any,
      generateLineItems: formData.get('generateLineItems') === 'on',
      applyProration: formData.get('applyProration') === 'on',
      includeTaxes: formData.get('includeTaxes') === 'on',
      includeDiscounts: formData.get('includeDiscounts') === 'on',
      dueDate: formData.get('dueDate') as string || undefined,
      description: formData.get('description') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
      currency: formData.get('currency') as string || undefined,
    };
    generateInvoiceMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'PARTIALLY_PAID': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL': return 'bg-blue-100 text-blue-800';
      case 'CORPORATE': return 'bg-purple-100 text-purple-800';
      case 'GROUP': return 'bg-green-100 text-green-800';
      case 'ADJUSTMENT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Billing Management</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerateForm(!showGenerateForm)}
              >
                {showGenerateForm ? 'Cancel' : 'Generate Invoice'}
              </Button>
              <Button onClick={() => billingApi.processBillingCycle({ dryRun: true })}>
                Process Billing Cycle
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Generate Invoice Form */}
      {showGenerateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="memberId">Member ID</Label>
                  <Input
                    id="memberId"
                    name="memberId"
                    type="number"
                    placeholder="For individual billing"
                  />
                </div>
                <div>
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    name="companyId"
                    type="number"
                    placeholder="For corporate billing"
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceType">Invoice Type</Label>
                  <Select name="invoiceType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="CORPORATE">Corporate</SelectItem>
                      <SelectItem value="GROUP">Group</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select name="currency" defaultValue="USD">
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
                  <Label htmlFor="billingPeriodStart">Billing Period Start</Label>
                  <Input
                    id="billingPeriodStart"
                    name="billingPeriodStart"
                    type="date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="billingPeriodEnd">Billing Period End</Label>
                  <Input
                    id="billingPeriodEnd"
                    name="billingPeriodEnd"
                    type="date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Custom Amount (Optional)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="generateLineItems" name="generateLineItems" defaultChecked />
                  <Label htmlFor="generateLineItems">Generate Line Items Automatically</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="applyProration" name="applyProration" defaultChecked />
                  <Label htmlFor="applyProration">Apply Proration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="includeTaxes" name="includeTaxes" defaultChecked />
                  <Label htmlFor="includeTaxes">Include Taxes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="includeDiscounts" name="includeDiscounts" defaultChecked />
                  <Label htmlFor="includeDiscounts">Include Discounts</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Invoice description"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={generateInvoiceMutation.isPending}
                >
                  {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="typeFilter">Type</Label>
              <Select
                value={filters.invoiceType || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, invoiceType: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
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

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : invoicesData?.length ? (
            <div className="space-y-4">
              {invoicesData.map((invoice: Invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">{invoice.invoiceNumber}</span>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                        <Badge className={getTypeColor(invoice.invoiceType)}>
                          {invoice.invoiceType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Issue Date:</span>
                          <span className="ml-2">{formatDate(invoice.issueDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Due Date:</span>
                          <span className="ml-2">{formatDate(invoice.dueDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Currency:</span>
                          <span className="ml-2">{invoice.currency}</span>
                        </div>
                      </div>
                      {invoice.description && (
                        <p className="text-sm text-gray-600 mt-2">{invoice.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => billingApi.getInvoice(invoice.id)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => billingApi.updateInvoice(invoice.id, { status: 'SENT' })}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}