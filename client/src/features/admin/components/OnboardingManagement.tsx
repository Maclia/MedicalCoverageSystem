import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  Mail,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Shield,
  Award,
  Target,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronRight,
  Info
} from 'lucide-react';

interface OnboardingSession {
  id: number;
  memberId: number;
  currentDay: number;
  status: 'pending' | 'active' | 'completed' | 'paused' | 'cancelled';
  activationCompleted: boolean;
  startDate: string;
  completionDate?: string;
  totalPointsEarned: number;
  streakDays: number;
  memberName: string;
  memberEmail: string;
  companyName: string;
  progressPercentage: number;
  completedTasks: number;
  totalTasks: number;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: number;
  companyName?: string;
  status: string;
}

interface OnboardingStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  averageProgress: number;
  currentDayDistribution: Record<number, number>;
  completionRate: number;
  averageTimeToComplete: number;
  pointsAwarded: number;
}

interface DocumentQueue {
  id: number;
  memberId: number;
  originalFileName: string;
  documentType: string;
  uploadDate: string;
  verificationStatus: string;
  memberName: string;
  memberEmail: string;
  companyName: string;
}

export const OnboardingManagement: React.FC = () => {
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [documentQueue, setDocumentQueue] = useState<DocumentQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    companyId: '',
    day: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState<'date' | 'progress' | 'name' | 'company'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [filters, sortBy, sortOrder]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch onboarding overview with filters
      let url = '/api/admin/onboarding/overview';
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.day) params.append('day', filters.day);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setStats(data.stats);

        // Extract unique members from sessions
        const uniqueMembers = data.sessions.map((s: OnboardingSession) => ({
          id: s.memberId,
          firstName: s.memberName.split(' ')[0] || '',
          lastName: s.memberName.split(' ').slice(1).join(' ') || '',
          email: s.memberEmail,
          companyId: 0, // Would need to be included in API response
          companyName: s.companyName,
          status: 'active'
        }));
        setMembers(uniqueMembers);
      }
    } catch (err) {
      setError('Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }

    // Fetch document queue
    try {
      const docResponse = await fetch('/api/admin/documents/review-queue?status=pending');
      if (docResponse.ok) {
        const docData = await docResponse.json();
        setDocumentQueue(docData);
      }
    } catch (err) {
      console.error('Failed to fetch document queue:', err);
    }
  };

  const filteredAndSortedSessions = React.useMemo(() => {
    let filtered = [...sessions];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(session =>
        session.memberName.toLowerCase().includes(searchTerm) ||
        session.memberEmail.toLowerCase().includes(searchTerm) ||
        session.companyName.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'progress':
          comparison = a.progressPercentage - b.progressPercentage;
          break;
        case 'name':
          comparison = a.memberName.localeCompare(b.memberName);
          break;
        case 'company':
          comparison = a.companyName.localeCompare(b.companyName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sessions, filters.search, sortBy, sortOrder]);

  const handleAdvanceDay = async (sessionId: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/onboarding/${sessionId}/advance-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchData();
      } else {
        setError('Failed to advance onboarding day');
      }
    } catch (err) {
      setError('Error advancing onboarding day');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <UserX className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Member Name', 'Email', 'Company', 'Status', 'Current Day', 'Progress', 'Points', 'Start Date', 'Completion Date', 'Streak Days'],
      ...filteredAndSortedSessions.map(session => [
        session.memberName,
        session.memberEmail,
        session.companyName,
        session.status,
        session.currentDay,
        `${session.progressPercentage}%`,
        session.totalPointsEarned,
        session.startDate,
        session.completionDate || 'N/A',
        session.streakDays
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onboarding-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding Management</h1>
          <p className="text-gray-600">Monitor and manage member onboarding progress</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.activeSessions}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-full">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{stats.completedSessions}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.completionRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Progress Distribution */}
          {stats && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Day Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.currentDayDistribution).map(([day, count]) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm font-medium">Day {day}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${(count / stats.totalSessions) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Key Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Progress</span>
                      <span className="text-sm font-medium">{stats.averageProgress.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Time to Complete</span>
                      <span className="text-sm font-medium">{stats.averageTimeToComplete} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Points Awarded</span>
                      <span className="text-sm font-medium">{stats.pointsAwarded}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search members..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortBy">Sort By</Label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Start Date</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortOrder">Order</Label>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        <div className="flex items-center space-x-1">
                          <ArrowDown className="h-3 w-3" />
                          <span>Descending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="asc">
                        <div className="flex items-center space-x-1">
                          <ArrowUp className="h-3 w-3" />
                          <span>Ascending</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {filteredAndSortedSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {getStatusIcon(session.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{session.memberName}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{session.memberEmail}</p>
                          <p className="text-sm text-gray-600 mb-3">{session.companyName}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Day</span>
                              <p className="font-medium">{session.currentDay}/7</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Progress</span>
                              <div className="flex items-center space-x-2">
                                <Progress value={session.progressPercentage} className="w-16 h-2" />
                                <span className="font-medium">{session.progressPercentage}%</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Points</span>
                              <p className="font-medium">{session.totalPointsEarned}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Streak</span>
                              <p className="font-medium">{session.streakDays} days</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {session.status === 'active' && (
                          <Button
                            size="sm"
                            onClick={() => handleAdvanceDay(session.id, 'Manual advancement by admin')}
                          >
                            <ChevronRight className="h-4 w-4" />
                            Advance Day
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Document Review Queue</span>
                <Badge className="ml-2">{documentQueue.length} pending</Badge>
              </CardTitle>
              <CardDescription>
                Review and verify member documents uploaded during onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentQueue.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending documents to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentQueue.map((document) => (
                    <div key={document.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{document.originalFileName}</h3>
                            <p className="text-sm text-gray-600 mb-1">{document.memberName}</p>
                            <p className="text-sm text-gray-600 mb-1">{document.companyName}</p>
                            <div className="flex items-center space-x-2 mb-3">
                              <Badge variant="outline">{document.documentType}</Badge>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Pending Review
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Uploaded: {new Date(document.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600 mb-4">
                    Detailed analytics and reporting features would be implemented here.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {stats?.completionRate.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {stats?.averageProgress.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600">Avg Progress</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trends & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">High Completion Rate</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {stats?.completionRate > 70 ? 'Excellent' : 'Good'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Active Engagement</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {stats?.activeSessions} active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Points System</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {stats?.pointsAwarded} total points
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};