import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Message,
  Mail,
  Bell,
  Megaphone,
  ChatBubble,
  Send,
  Reply,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Eye,
  Download,
  Settings,
  Archive,
  Star,
  Calendar,
  FileText,
  BarChart3,
  Activity,
  User,
  Phone,
  MessageSquare,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { communicationApi } from '@/services/communicationApi';
import {
  Communication,
  MessageThread,
  CommunicationDashboard as ICommunicationDashboard,
  ChatSession,
  Announcement,
  Survey
} from '@shared/types/communication';

interface CommunicationDashboardProps {
  memberId: string;
  memberName?: string;
}

export const CommunicationDashboard: React.FC<CommunicationDashboardProps> = ({
  memberId,
  memberName
}) => {
  const [dashboard, setDashboard] = useState<ICommunicationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showThreadDialog, setShowThreadDialog] = useState(false);
  const [composeData, setComposeData] = useState({
    type: 'message',
    subject: '',
    content: '',
    priority: 'normal',
    category: 'general',
    recipientId: '',
    channel: 'in_app'
  });

  useEffect(() => {
    loadDashboard();
  }, [memberId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const dashboardData = await communicationApi.getDashboard(memberId);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error loading communication dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <Star className="h-4 w-4 text-orange-500" />;
      case 'normal': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'low': return <Activity className="h-4 w-4 text-gray-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'sms': return <Phone className="h-5 w-5" />;
      case 'push': return <Bell className="h-5 w-5" />;
      case 'chat': return <ChatBubble className="h-5 w-5" />;
      case 'message': return <Message className="h-5 w-5" />;
      default: return <Message className="h-5 w-5" />;
    }
  };

  const handleSendMessage = async () => {
    if (!composeData.content.trim()) return;

    try {
      await communicationApi.createCommunication({
        memberId,
        ...composeData,
        senderId: memberId, // In real app, this would be current user ID
        senderName: memberName || 'User',
        senderRole: 'member'
      });

      // Reset form and close dialog
      setComposeData({
        type: 'message',
        subject: '',
        content: '',
        priority: 'normal',
        category: 'general',
        recipientId: '',
        channel: 'in_app'
      });
      setShowComposeDialog(false);
      await loadDashboard();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMarkAsRead = async (threadId: string) => {
    try {
      await communicationApi.markThreadAsRead(threadId);
      await loadDashboard();
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    try {
      await communicationApi.archiveThread(threadId);
      await loadDashboard();
    } catch (error) {
      console.error('Error archiving thread:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Communication Data Unavailable</AlertTitle>
        <AlertDescription>
          Unable to load communication data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-gray-600">
            {memberName ? `for ${memberName}` : 'Member'} • Manage messages, notifications, and more
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowComposeDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
          <Button variant="outline" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Communications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{dashboard.summary.totalCommunications}</p>
                <p className="text-sm text-gray-500">All time</p>
              </div>
              <Message className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unread Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{dashboard.unreadCount}</p>
                <p className="text-sm text-gray-500">Requires attention</p>
              </div>
              <Bell className="h-8 w-8 text-orange-500" />
            </div>
            {dashboard.unreadCount > 0 && (
              <Progress value={100} className="mt-3 h-2 bg-orange-100" />
            )}
          </CardContent>
        </Card>

        {/* Delivery Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{Math.round(dashboard.summary.deliveryRate)}%</p>
                <p className="text-sm text-gray-500">Success rate</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={dashboard.summary.deliveryRate} className="mt-3 h-2 bg-green-100" />
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{Math.round(dashboard.summary.responseRate)}%</p>
                <p className="text-sm text-gray-500">Engagement</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={dashboard.summary.responseRate} className="mt-3 h-2 bg-purple-100" />
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{dashboard.summary.averageResponseTime}h</p>
                <p className="text-sm text-gray-500">Response speed</p>
              </div>
              <Clock className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Communications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Message className="h-5 w-5" />
                  <span>Recent Communications</span>
                </CardTitle>
                <CardDescription>
                  Latest messages and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.recentCommunications.slice(0, 5).map((communication: Communication) => (
                    <div key={communication.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                         onClick={() => setSelectedCommunication(communication)}>
                      <div className="mt-1">
                        {getTypeIcon(communication.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{communication.subject || 'No Subject'}</p>
                          <Badge className={getStatusColor(communication.status)}>
                            {communication.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">{communication.content}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <span>{new Date(communication.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{communication.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Threads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ChatBubble className="h-5 w-5" />
                  <span>Active Conversations</span>
                </CardTitle>
                <CardDescription>
                  Ongoing message threads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.activeThreads.slice(0, 5).map((thread: MessageThread) => (
                    <div key={thread.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                         onClick={() => {
                           setSelectedThread(thread);
                           setShowThreadDialog(true);
                         }}>
                      <div className="mt-1">
                        {getPriorityIcon(thread.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{thread.subject || 'New Conversation'}</p>
                          <div className="flex items-center space-x-2">
                            {thread.unreadCount > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                {thread.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">{thread.lastMessagePreview}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <span>{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{thread.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common communication tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dashboard.quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => {
                      if (action.action === 'compose') {
                        setShowComposeDialog(true);
                      }
                    }}
                  >
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">{action.title}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Message Threads</CardTitle>
                  <CardDescription>View and manage your conversations</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.activeThreads.map((thread: MessageThread) => (
                  <div key={thread.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                       onClick={() => {
                         setSelectedThread(thread);
                         setShowThreadDialog(true);
                       }}>
                    <div className="flex items-center space-x-3">
                      {getPriorityIcon(thread.priority)}
                      <div>
                        <p className="font-medium">{thread.subject || 'New Conversation'}</p>
                        <p className="text-sm text-gray-600 mt-1">{thread.lastMessagePreview}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <span>{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{thread.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                          {thread.unreadCount} unread
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(thread.id);
                      }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveThread(thread.id);
                      }}>
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Megaphone className="h-5 w-5" />
                <span>Announcements</span>
              </CardTitle>
              <CardDescription>System announcements and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.announcements.map((announcement: Announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{announcement.title}</h3>
                          <Badge className={
                            announcement.type === 'emergency' ? 'bg-red-100 text-red-800' :
                            announcement.type === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            announcement.type === 'feature' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {announcement.type}
                          </Badge>
                          <Badge className={
                            announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{announcement.content}</p>
                        <div className="text-sm text-gray-500">
                          By {announcement.authorName} • {new Date(announcement.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-gray-500">{announcement.viewCount} views</span>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Read
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Surveys</span>
              </CardTitle>
              <CardDescription>Participate in surveys and provide feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.surveys.map((survey: Survey) => (
                  <div key={survey.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{survey.title}</h3>
                          <Badge className={
                            survey.type === 'satisfaction' ? 'bg-blue-100 text-blue-800' :
                            survey.type === 'feedback' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {survey.type}
                          </Badge>
                          <Badge className={
                            survey.status === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {survey.status}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{survey.description}</p>
                        <div className="text-sm text-gray-500">
                          {survey.questions.length} questions • {survey.metrics.responseRate}% response rate
                        </div>
                      </div>
                      <Button size="sm">
                        Take Survey
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Communication Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Communications</span>
                    <span className="font-medium">{dashboard.summary.totalCommunications}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delivery Rate</span>
                    <span className="font-medium">{Math.round(dashboard.summary.deliveryRate)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Read Rate</span>
                    <span className="font-medium">{Math.round(dashboard.summary.openRate)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Response Rate</span>
                    <span className="font-medium">{Math.round(dashboard.summary.responseRate)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Engagement Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Satisfaction Rating</span>
                      <span>{dashboard.summary.satisfactionRating}/5.0</span>
                    </div>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(dashboard.summary.satisfactionRating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-medium">{dashboard.summary.averageResponseTime} hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Threads</span>
                    <span className="font-medium">{dashboard.activeThreads.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Communication Preferences</span>
              </CardTitle>
              <CardDescription>Manage your notification and communication settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive important updates via email</p>
                        </div>
                      </div>
                      <Button size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className="text-sm text-gray-600">Real-time notifications on your device</p>
                        </div>
                      </div>
                      <Button size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Text message alerts for urgent matters</p>
                        </div>
                      </div>
                      <Button size="sm">Configure</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Quiet Hours</h3>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">Set times when you don't want to receive non-urgent notifications</p>
                    <Button size="sm">Set Quiet Hours</Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Message Preferences</h3>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">Configure how messages are displayed and organized</p>
                    <Button size="sm">Manage Preferences</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>
              Send a new message or notification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={composeData.type} onValueChange={(value) => setComposeData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Enter subject (optional)"
                value={composeData.subject}
                onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={composeData.category} onValueChange={(value) => setComposeData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={composeData.priority} onValueChange={(value) => setComposeData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={composeData.content}
                onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={!composeData.content.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread Dialog */}
      <Dialog open={showThreadDialog} onOpenChange={setShowThreadDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Conversation</DialogTitle>
            <DialogDescription>
              {selectedThread?.subject || 'Message Thread'}
            </DialogDescription>
          </DialogHeader>

          {selectedThread && (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-4">
                {/* Mock conversation messages */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                    Y
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-sm">This is a sample conversation message.</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">You • {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Type your reply..."
                  className="flex-1"
                  rows={3}
                />
                <Button>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThreadDialog(false)}>
              Close
            </Button>
            <Button onClick={() => handleMarkAsRead(selectedThread!.id)}>
              Mark as Read
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Details Dialog */}
      <Dialog open={!!selectedCommunication} onOpenChange={() => setSelectedCommunication(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Communication Details</DialogTitle>
            <DialogDescription>
              {selectedCommunication?.subject || 'Message Details'}
            </DialogDescription>
          </DialogHeader>

          {selectedCommunication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="capitalize">{selectedCommunication.type}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(selectedCommunication.status)}>
                    {selectedCommunication.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p className="capitalize">{selectedCommunication.category}</p>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <p className="capitalize">{selectedCommunication.priority}</p>
                </div>
              </div>

              <div>
                <span className="font-medium">Content:</span>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                  {selectedCommunication.content}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                <p>From: {selectedCommunication.senderName}</p>
                <p>Date: {new Date(selectedCommunication.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCommunication(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};