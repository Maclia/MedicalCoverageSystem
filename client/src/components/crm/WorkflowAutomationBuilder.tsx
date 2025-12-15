import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  Square,
  Plus,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Trash2,
  Edit,
  Save,
  ArrowRight,
  ArrowDown,
  Mail,
  Phone,
  Calendar,
  TaskIcon,
  Send,
  Globe,
  Timer,
  GitBranch,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'notification' | 'task' | 'webhook';
  config: Record<string, any>;
  nextStep?: string;
  conditions?: Record<string, any>;
}

interface WorkflowDefinition {
  id: string;
  workflowName: string;
  description: string;
  triggerType: 'event' | 'schedule' | 'manual';
  triggerConditions?: string;
  steps: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  statistics?: {
    totalExecutions: number;
    runningExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
  };
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  triggeredBy: number;
  entityId?: string;
  entityType?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  currentStep: number;
  startedAt: string;
  completedAt?: string;
  variables?: string;
  error?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: 'event' | 'schedule' | 'manual';
  steps: WorkflowStep[];
}

const stepTypeIcons: Record<string, React.ComponentType<any>> = {
  action: Settings,
  condition: GitBranch,
  delay: Timer,
  notification: Mail,
  task: TaskIcon,
  webhook: Globe
};

const statusColors: Record<string, string> = {
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800'
};

const statusIcons: Record<string, React.ComponentType<any>> = {
  running: Activity,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: Square,
  paused: Pause
};

export default function WorkflowAutomationBuilder() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('workflows');
  const [editingWorkflow, setEditingWorkflow] = useState<Partial<WorkflowDefinition>>({});
  const [editingSteps, setEditingSteps] = useState<WorkflowStep[]>([]);

  const queryClient = useQueryClient();

  // Fetch workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/crm/workflow-automation'],
    queryFn: async () => {
      const response = await fetch('/api/crm/workflow-automation');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      return response.json();
    }
  });

  // Fetch executions
  const { data: executionsData, isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/crm/workflow-automation/executions'],
    queryFn: async () => {
      const response = await fetch('/api/crm/workflow-automation/executions');
      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }
      return response.json();
    }
  });

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/crm/workflow-automation/templates'],
    queryFn: async () => {
      const response = await fetch('/api/crm/workflow-automation/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Partial<WorkflowDefinition>) => {
      const response = await fetch('/api/crm/workflow-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update workflow mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkflowDefinition> }) => {
      const response = await fetch(`/api/crm/workflow-automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation'] });
      setIsEditDialogOpen(false);
      setSelectedWorkflow(null);
    }
  });

  // Trigger workflow mutation
  const triggerWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, entityId, entityType, variables }: {
      workflowId: string;
      entityId?: string;
      entityType?: string;
      variables?: Record<string, any>;
    }) => {
      const response = await fetch(`/api/crm/workflow-automation/${workflowId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, entityType, variables })
      });
      if (!response.ok) {
        throw new Error('Failed to trigger workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation/executions'] });
    }
  });

  // Pause execution mutation
  const pauseExecutionMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const response = await fetch(`/api/crm/workflow-automation/executions/${executionId}/pause`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to pause execution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation/executions'] });
    }
  });

  // Resume execution mutation
  const resumeExecutionMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const response = await fetch(`/api/crm/workflow-automation/executions/${executionId}/resume`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to resume execution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation/executions'] });
    }
  });

  // Cancel execution mutation
  const cancelExecutionMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const response = await fetch(`/api/crm/workflow-automation/executions/${executionId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to cancel execution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-automation/executions'] });
    }
  });

  const workflows = workflowsData?.data || [];
  const executions = executionsData?.data || [];
  const templates = templatesData?.data || [];

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const handleCreateWorkflow = () => {
    createWorkflowMutation.mutate(editingWorkflow);
  };

  const handleUpdateWorkflow = () => {
    if (selectedWorkflow) {
      updateWorkflowMutation.mutate({
        id: selectedWorkflow.id,
        data: {
          ...editingWorkflow,
          steps: JSON.stringify(editingSteps)
        }
      });
    }
  };

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setEditingWorkflow({
      workflowName: workflow.workflowName,
      description: workflow.description,
      triggerType: workflow.triggerType,
      triggerConditions: workflow.triggerConditions,
      isActive: workflow.isActive,
      priority: workflow.priority
    });
    try {
      setEditingSteps(JSON.parse(workflow.steps));
    } catch (e) {
      setEditingSteps([]);
    }
    setIsEditDialogOpen(true);
  };

  const handleCreateFromTemplate = (template: WorkflowTemplate) => {
    setEditingWorkflow({
      workflowName: template.name,
      description: template.description,
      triggerType: template.triggerType,
      isActive: true,
      priority: 5
    });
    setEditingSteps(template.steps);
    setIsCreateDialogOpen(true);
  };

  const addStep = (type: string) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: `New ${type} step`,
      type: type as WorkflowStep['type'],
      config: {}
    };
    setEditingSteps([...editingSteps, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setEditingSteps(editingSteps.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (stepId: string) => {
    setEditingSteps(editingSteps.filter(step => step.id !== stepId));
  };

  const renderStepEditor = (step: WorkflowStep) => {
    const StepIcon = stepTypeIcons[step.type];

    return (
      <Card className="mb-4 border-2 border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <StepIcon className="w-5 h-5 text-blue-600" />
              <Input
                value={step.name}
                onChange={(e) => updateStep(step.id, { name: e.target.value })}
                className="w-64"
              />
              <Badge variant="outline">{step.type}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeStep(step.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Step-specific configuration */}
          <div className="grid grid-cols-2 gap-4">
            {step.type === 'notification' && (
              <>
                <div>
                  <Label>Notification Type</Label>
                  <Select
                    value={step.config.notificationType || 'email'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: { ...step.config, notificationType: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="notification">In-App Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Input
                    value={step.config.target || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, target: e.target.value }
                    })}
                    placeholder="{{lead.email}} or user ID"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Message</Label>
                  <Textarea
                    value={step.config.message || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, message: e.target.value }
                    })}
                    placeholder="Message content with variables like {{lead.name}}"
                  />
                </div>
              </>
            )}

            {step.type === 'delay' && (
              <div>
                <Label>Duration</Label>
                <Input
                  value={step.config.duration || '1h'}
                  onChange={(e) => updateStep(step.id, {
                    config: { ...step.config, duration: e.target.value }
                  })}
                  placeholder="1h, 30m, 2d"
                />
              </div>
            )}

            {step.type === 'task' && (
              <>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={step.config.title || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, title: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Input
                    value={step.config.assignedTo || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, assignedTo: e.target.value }
                    })}
                    placeholder="{{lead.assignedAgentId}}"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={step.config.priority || 'medium'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: { ...step.config, priority: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={step.config.description || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, description: e.target.value }
                    })}
                  />
                </div>
              </>
            )}

            {step.type === 'condition' && (
              <>
                <div>
                  <Label>Field</Label>
                  <Input
                    value={step.config.condition?.field || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        condition: { ...step.config.condition, field: e.target.value }
                      }
                    })}
                    placeholder="lead.status"
                  />
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select
                    value={step.config.condition?.operator || 'equals'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        condition: { ...step.config.condition, operator: value }
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="in">In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    value={step.config.condition?.value || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: {
                        ...step.config,
                        condition: { ...step.config.condition, value: e.target.value }
                      }
                    })}
                  />
                </div>
              </>
            )}

            {step.type === 'webhook' && (
              <>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={step.config.url || ''}
                    onChange={(e) => updateStep(step.id, {
                      config: { ...step.config, url: e.target.value }
                    })}
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select
                    value={step.config.method || 'POST'}
                    onValueChange={(value) => updateStep(step.id, {
                      config: { ...step.config, method: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Payload (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(step.config.data || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const data = JSON.parse(e.target.value);
                        updateStep(step.id, { config: { ...step.config, data } });
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600">
            Create and manage automated workflows for your CRM processes
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Workflow Name</Label>
                    <Input
                      value={editingWorkflow.workflowName || ''}
                      onChange={(e) => setEditingWorkflow({
                        ...editingWorkflow,
                        workflowName: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>Trigger Type</Label>
                    <Select
                      value={editingWorkflow.triggerType || 'manual'}
                      onValueChange={(value) => setEditingWorkflow({
                        ...editingWorkflow,
                        triggerType: value as any
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="schedule">Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingWorkflow.description || ''}
                    onChange={(e) => setEditingWorkflow({
                      ...editingWorkflow,
                      description: e.target.value
                    })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Workflow Steps</Label>
                    <Select onValueChange={addStep}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add step" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="condition">Condition</SelectItem>
                        <SelectItem value="delay">Delay</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    {editingSteps.map((step, index) => (
                      <div key={step.id} className="relative">
                        {renderStepEditor(step)}
                        {index < editingSteps.length - 1 && (
                          <div className="flex justify-center py-2">
                            <ArrowDown className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                    {editingSteps.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No steps added yet. Add your first step to get started.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWorkflow}
                    disabled={createWorkflowMutation.isPending || editingSteps.length === 0}
                  >
                    {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: WorkflowTemplate) => (
              <div key={template.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                <Badge variant="outline" className="mb-3">{template.category}</Badge>
                <div className="flex justify-between items-center">
                  <Badge variant="outline">{template.triggerType}</Badge>
                  <Button
                    size="sm"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {workflows.map((workflow: WorkflowDefinition) => (
              <Card key={workflow.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{workflow.workflowName}</h3>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {workflow.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={(checked) => updateWorkflowMutation.mutate({
                          id: workflow.id,
                          data: { isActive: checked }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <Badge variant="outline">{workflow.triggerType}</Badge>
                    <Badge variant="outline">Priority: {workflow.priority}</Badge>
                  </div>

                  {workflow.statistics && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Total Executions:</span>
                        <span className="ml-2 font-medium">{workflow.statistics.totalExecutions}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Success Rate:</span>
                        <span className="ml-2 font-medium">
                          {workflow.statistics.totalExecutions > 0
                            ? Math.round((workflow.statistics.completedExecutions / workflow.statistics.totalExecutions) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Created {format(new Date(workflow.createdAt), 'MMM d, yyyy')}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWorkflow(workflow)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => triggerWorkflowMutation.mutate({
                          workflowId: workflow.id
                        })}
                        disabled={triggerWorkflowMutation.isPending}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Workflow</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Started</th>
                      <th className="text-left p-3">Duration</th>
                      <th className="text-left p-3">Progress</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution: WorkflowExecution) => {
                      const StatusIcon = statusIcons[execution.status];
                      const duration = execution.completedAt
                        ? formatDuration(
                            (new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000
                          )
                        : formatDuration(
                            (new Date().getTime() - new Date(execution.startedAt).getTime()) / 1000
                          );

                      return (
                        <tr key={execution.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{execution.workflowName}</div>
                              {execution.entityId && execution.entityType && (
                                <div className="text-sm text-gray-500">
                                  {execution.entityType} #{execution.entityId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="w-4 h-4" />
                              <Badge className={statusColors[execution.status]}>
                                {execution.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            {format(new Date(execution.startedAt), 'MMM d, HH:mm')}
                          </td>
                          <td className="p-3">
                            {duration}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              Step {execution.currentStep}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {execution.status === 'running' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pauseExecutionMutation.mutate(execution.id)}
                                  disabled={pauseExecutionMutation.isPending}
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              )}
                              {execution.status === 'paused' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resumeExecutionMutation.mutate(execution.id)}
                                  disabled={resumeExecutionMutation.isPending}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              {['running', 'paused'].includes(execution.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelExecutionMutation.mutate(execution.id)}
                                  disabled={cancelExecutionMutation.isPending}
                                >
                                  <Square className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Workflow Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Workflow Name</Label>
                  <Input
                    value={editingWorkflow.workflowName || ''}
                    onChange={(e) => setEditingWorkflow({
                      ...editingWorkflow,
                      workflowName: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>Trigger Type</Label>
                  <Select
                    value={editingWorkflow.triggerType || 'manual'}
                    onValueChange={(value) => setEditingWorkflow({
                      ...editingWorkflow,
                      triggerType: value as any
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingWorkflow.description || ''}
                  onChange={(e) => setEditingWorkflow({
                    ...editingWorkflow,
                    description: e.target.value
                  })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Workflow Steps</Label>
                  <Select onValueChange={addStep}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add step" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                      <SelectItem value="delay">Delay</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {editingSteps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {renderStepEditor(step)}
                      {index < editingSteps.length - 1 && (
                        <div className="flex justify-center py-2">
                          <ArrowDown className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {editingSteps.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No steps added yet. Add your first step to get started.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWorkflow}
                  disabled={updateWorkflowMutation.isPending || editingSteps.length === 0}
                >
                  {updateWorkflowMutation.isPending ? 'Updating...' : 'Update Workflow'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}