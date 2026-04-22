import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Calendar, User, MoreHorizontal, Plus, TrendingUp, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Opportunity {
  id: string;
  leadId: string;
  opportunityName: string;
  stage: string;
  estimatedValue?: number;
  actualValue?: number;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  leadFirstName: string;
  leadLastName: string;
  leadEmail: string;
  leadCompany?: string;
  ownerName: string;
}

interface StageData {
  stage: string;
  opportunities: Opportunity[];
  count: number;
  totalValue: number;
  avgProbability: number;
}

const stageColors: Record<string, string> = {
  lead: "bg-gray-100 border-gray-200",
  qualified: "bg-blue-50 border-blue-200",
  quotation: "bg-yellow-50 border-yellow-200",
  underwriting: "bg-purple-50 border-purple-200",
  issuance: "bg-green-50 border-green-200",
  closed_won: "bg-emerald-50 border-emerald-200",
  closed_lost: "bg-red-50 border-red-200"
};

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  quotation: "Quotation",
  underwriting: "Underwriting",
  issuance: "Issuance",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost"
};

export default function SalesPipeline() {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({
    leadId: "",
    opportunityName: "",
    estimatedValue: "",
    expectedCloseDate: "",
    ownerId: ""
  });

  const queryClient = useQueryClient();

  // Fetch opportunities
  const { data: opportunitiesData, isLoading, error } = useQuery({
    queryKey: ['/api/crm/opportunities', selectedAgent, selectedDateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(selectedAgent !== "all" && { owner: selectedAgent }),
        ...(selectedDateRange !== "all" && { dateRange: selectedDateRange })
      });

      const response = await fetch(`/api/crm/opportunities?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      return response.json();
    }
  });

  // Move opportunity stage mutation
  const moveStageMutation = useMutation({
    mutationFn: async ({ opportunityId, newStage, notes }: { opportunityId: string; newStage: string; notes?: string }) => {
      const response = await fetch(`/api/crm/opportunities/${opportunityId}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStage, notes })
      });
      if (!response.ok) {
        throw new Error('Failed to move opportunity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/opportunities'] });
    }
  });

  // Create opportunity mutation
  const createOpportunityMutation = useMutation({
    mutationFn: async (opportunityData: any) => {
      const response = await fetch('/api/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opportunityData)
      });
      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/opportunities'] });
      setIsCreateDialogOpen(false);
      setNewOpportunity({
        leadId: "",
        opportunityName: "",
        estimatedValue: "",
        expectedCloseDate: "",
        ownerId: ""
      });
    }
  });

  const pipelineData = useMemo(() => {
    if (!opportunitiesData?.pipeline) return {};

    const stages: Record<string, StageData> = {};
    const stageOrder = ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost'];

    // Initialize stages
    stageOrder.forEach(stage => {
      stages[stage] = {
        stage,
        opportunities: [],
        count: 0,
        totalValue: 0,
        avgProbability: 0
      };
    });

    // Populate with opportunities
    Object.entries(opportunitiesData.pipeline).forEach(([stage, opportunities]: [string, Opportunity[]]) => {
      const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
      const avgProbability = opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length
        : 0;

      stages[stage] = {
        stage,
        opportunities,
        count: opportunities.length,
        totalValue,
        avgProbability: Math.round(avgProbability)
      };
    });

    return stages;
  }, [opportunitiesData]);

  const handleMoveStage = (opportunityId: string, newStage: string) => {
    moveStageMutation.mutate({ opportunityId, newStage });
  };

  const handleCreateOpportunity = () => {
    createOpportunityMutation.mutate({
      ...newOpportunity,
      estimatedValue: parseInt(newOpportunity.estimatedValue),
      ownerId: parseInt(newOpportunity.ownerId)
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KES', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading pipeline...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading pipeline: {(error as Error).message}</div>;
  }

  const stageOrder = ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600">Track and manage sales opportunities</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Opportunity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Opportunity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="opportunityName">Opportunity Name *</Label>
                <Input
                  id="opportunityName"
                  value={newOpportunity.opportunityName}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, opportunityName: e.target.value })}
                  placeholder="Annual Health Insurance Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadId">Lead ID *</Label>
                <Input
                  id="leadId"
                  value={newOpportunity.leadId}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, leadId: e.target.value })}
                  placeholder="Enter lead UUID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  value={newOpportunity.estimatedValue}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, estimatedValue: e.target.value })}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={newOpportunity.expectedCloseDate}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, expectedCloseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <Input
                  id="ownerId"
                  type="number"
                  value={newOpportunity.ownerId}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, ownerId: e.target.value })}
                  placeholder="Agent ID"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOpportunity} disabled={createOpportunityMutation.isPending}>
                {createOpportunityMutation.isPending ? 'Creating...' : 'Create Opportunity'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opportunitiesData?.metrics?.totalOpportunities || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(opportunitiesData?.metrics?.totalEstimatedValue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Closed Won</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opportunitiesData?.metrics?.closedWonOpportunities || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opportunitiesData?.metrics?.winRate || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {/* Agent options would be populated here */}
              </SelectContent>
            </Select>
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Kanban Board */}
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4" style={{ minWidth: 'max-content' }}>
          {stageOrder.map((stage) => {
            const stageData = pipelineData[stage];
            if (!stageData) return null;

            return (
              <div key={stage} className="flex-shrink-0 w-80">
                <Card className={`h-fit ${stageColors[stage]} border`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{stageLabels[stage]}</CardTitle>
                      <Badge variant="secondary" className="bg-white">
                        {stageData.count}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Total Value: {formatCurrency(stageData.totalValue)}</div>
                      <div>Avg Probability: {stageData.avgProbability}%</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stageData.opportunities.map((opportunity) => (
                      <Card key={opportunity.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">
                                  {opportunity.opportunityName}
                                </h4>
                                <div className="text-xs text-gray-500 mt-1">
                                  {opportunity.leadFirstName} {opportunity.leadLastName}
                                  {opportunity.leadCompany && (
                                    <span> • {opportunity.leadCompany}</span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                  <DropdownMenuItem>Move to...</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Value and Probability */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(opportunity.estimatedValue || 0)}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {opportunity.probability}%
                              </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                                style={{ width: `${opportunity.probability}%` }}
                              />
                            </div>

                            {/* Expected Close Date */}
                            {opportunity.expectedCloseDate && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(opportunity.expectedCloseDate), 'MMM d, yyyy')}
                              </div>
                            )}

                            {/* Owner */}
                            <div className="text-xs text-gray-500 flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {opportunity.ownerName}
                            </div>

                            {/* Stage Movement Actions */}
                            {stage !== 'closed_won' && stage !== 'closed_lost' && (
                              <div className="flex space-x-2">
                                {stageOrder.indexOf(stage) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs"
                                    onClick={() => handleMoveStage(opportunity.id, stageOrder[stageOrder.indexOf(stage) - 1])}
                                    disabled={moveStageMutation.isPending}
                                  >
                                    ← Back
                                  </Button>
                                )}
                                {stageOrder.indexOf(stage) < stageOrder.length - 1 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs"
                                    onClick={() => handleMoveStage(opportunity.id, stageOrder[stageOrder.indexOf(stage) + 1])}
                                    disabled={moveStageMutation.isPending}
                                  >
                                    Forward →
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {stageData.opportunities.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-sm">No opportunities in this stage</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}