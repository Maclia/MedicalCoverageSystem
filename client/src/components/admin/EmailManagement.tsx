import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Send,
  TestTube,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Edit,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  type: 'activation' | 'onboarding_reminder' | 'milestone' | 'achievement' | 'engagement';
  subject: string;
  triggers: string[];
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

interface EmailStats {
  totalScheduled: number;
  sent: number;
  pending: number;
}

interface EmailManagementProps {
  userRole: string;
}

export const EmailManagement: React.FC<EmailManagementProps> = ({ userRole }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [memberId, setMemberId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      setError('Failed to fetch email templates');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      setError('Failed to fetch email statistics');
    }
  };

  const sendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      setError('Please select a template and provide a test email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          testEmail,
          additionalData: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Test email sent successfully!');
      } else {
        setError('Failed to send test email');
      }
    } catch (err) {
      setError('Error sending test email');
    } finally {
      setIsLoading(false);
    }
  };

  const sendToMember = async () => {
    if (!selectedTemplate || !memberId) {
      setError('Please select a template and provide a member ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          memberId: parseInt(memberId),
          additionalData: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Email sent to member successfully!');
      } else {
        setError('Failed to send email to member');
      }
    } catch (err) {
      setError('Error sending email to member');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerEmailFlow = async (trigger: string) => {
    if (!memberId) {
      setError('Please provide a member ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/email/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: parseInt(memberId),
          trigger,
          additionalData: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Email trigger '${trigger}' executed successfully!`);
      } else {
        setError('Failed to trigger email flow');
      }
    } catch (err) {
      setError('Error triggering email flow');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'activation': return 'bg-blue-100 text-blue-800';
      case 'onboarding_reminder': return 'bg-purple-100 text-purple-800';
      case 'milestone': return 'bg-green-100 text-green-800';
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      case 'engagement': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Management</h1>
          <p className="text-gray-600">Manage email templates and communications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Email Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalScheduled}</div>
                <p className="text-sm text-gray-600">Total Scheduled</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <p className="text-sm text-gray-600">Sent</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="send">Send Email</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage and preview email templates for different communication types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <Badge className={getTypeColor(template.type)}>
                            {template.type.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(template.priority)}>
                            {template.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Subject: {template.subject}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.triggers.map((trigger) => (
                            <Badge key={trigger} variant="outline" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Email Tab */}
        <TabsContent value="send">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Template</Label>
                    <Select value={selectedTemplate?.id || ''} onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Selected Template:</p>
                      <p className="text-sm text-gray-600">{selectedTemplate.name}</p>
                      <p className="text-sm text-gray-500">{selectedTemplate.subject}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Send Options */}
            <Card>
              <CardHeader>
                <CardTitle>Send Options</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="test">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="test">Test Email</TabsTrigger>
                    <TabsTrigger value="member">Send to Member</TabsTrigger>
                  </TabsList>

                  <TabsContent value="test">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="testEmail">Test Email Address</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="Enter test email address"
                        />
                      </div>
                      <Button
                        onClick={sendTestEmail}
                        disabled={!selectedTemplate || !testEmail || isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <TestTube className="h-4 w-4 mr-2" />
                            Send Test Email
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="member">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="memberId">Member ID</Label>
                        <Input
                          id="memberId"
                          type="number"
                          value={memberId}
                          onChange={(e) => setMemberId(e.target.value)}
                          placeholder="Enter member ID"
                        />
                      </div>
                      <Button
                        onClick={sendToMember}
                        disabled={!selectedTemplate || !memberId || isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send to Member
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers">
          <Card>
            <CardHeader>
              <CardTitle>Manual Email Triggers</CardTitle>
              <CardDescription>
                Manually trigger email workflows for testing or specific situations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="memberId">Member ID</Label>
                  <Input
                    id="memberId"
                    type="number"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="Enter member ID"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => triggerEmailFlow('member_activated')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Activation
                  </Button>
                  <Button
                    onClick={() => triggerEmailFlow('day1_incomplete')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Day 1 Reminder
                  </Button>
                  <Button
                    onClick={() => triggerEmailFlow('48_hours_since_activation')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    48h Reminder
                  </Button>
                  <Button
                    onClick={() => triggerEmailFlow('day4_reached')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Halfway Milestone
                  </Button>
                  <Button
                    onClick={() => triggerEmailFlow('onboarding_completed')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completion
                  </Button>
                  <Button
                    onClick={() => triggerEmailFlow('achievement_unlocked')}
                    disabled={!memberId || isLoading}
                    variant="outline"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Achievement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
              <CardDescription>
                Monitor email delivery performance and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Detailed email analytics and reporting features would be implemented here.
                </p>
                <div className="flex justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats?.sent || 0}
                    </div>
                    <p className="text-sm text-gray-600">Emails Sent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {templates.length}
                    </div>
                    <p className="text-sm text-gray-600">Active Templates</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};