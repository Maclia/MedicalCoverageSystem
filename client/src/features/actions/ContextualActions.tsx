import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import {
  FileText,
  Calendar,
  Phone,
  MapPin,
  Heart,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  Settings,
  Star,
  Zap,
  Target,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ContextualAction {
  id: string;
  type: 'primary' | 'secondary' | 'urgent';
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  category: 'benefits' | 'claims' | 'documents' | 'appointments' | 'wellness' | 'account' | 'emergency';
  priority: number;
  timeEstimate: string;
  impact: 'high' | 'medium' | 'low';
  context: string;
  aiReasoning?: string;
  deadline?: Date;
  progress?: number;
  completed?: boolean;
}

interface ActionCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actions: ContextualAction[];
}

interface MemberContext {
  profileCompletion: number;
  lastLogin: Date | null;
  pendingDocuments: number;
  upcomingAppointments: number;
  unviewedMessages: number;
  claimsInProgress: number;
  benefitsExpiring: number;
  wellnessStreak: number;
  locationConsent: boolean;
  notificationPreferences: string[];
  recentActivity: string[];
}

interface RecommendationApiItem {
  id: string;
  type: 'preventive_care' | 'wellness' | 'cost_optimization' | 'care_coordination' | 'educational';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  actionUrl?: string;
  validUntil?: string;
  personalizedReason?: string;
  estimatedTimeToComplete?: string;
}

interface RecommendationsResponse {
  recommendations?: RecommendationApiItem[];
}

interface PersonalizedDashboardResponse {
  profileCompletion?: number;
  lastLogin?: string;
  pendingDocuments?: number;
  upcomingAppointments?: number;
  unviewedMessages?: number;
  claimsInProgress?: number;
  benefitsExpiring?: number;
  wellnessStreak?: number;
  locationConsent?: boolean;
  notificationPreferences?: string[];
  recentActivity?: string[];
}

interface ContextualActionsProps {
  memberId: string;
  memberName?: string;
  userRole?: string;
}

const getCategoryIcon = (category: ContextualAction['category']): React.ReactNode => {
  const iconMap: Record<ContextualAction['category'], React.ReactNode> = {
    benefits: <Shield className="h-5 w-5" />,
    claims: <FileText className="h-5 w-5" />,
    documents: <FileText className="h-5 w-5" />,
    appointments: <Calendar className="h-5 w-5" />,
    wellness: <Heart className="h-5 w-5" />,
    account: <Settings className="h-5 w-5" />,
    emergency: <AlertTriangle className="h-5 w-5" />,
  };

  return iconMap[category];
};

const mapRecommendationCategory = (
  recommendation: RecommendationApiItem
): ContextualAction['category'] => {
  switch (recommendation.type) {
    case 'preventive_care':
      return 'appointments';
    case 'wellness':
      return 'wellness';
    case 'cost_optimization':
      return 'benefits';
    case 'care_coordination':
      return 'claims';
    case 'educational':
      return 'account';
    default:
      return 'account';
  }
};

const mapPriorityToImpact = (
  priority: RecommendationApiItem['priority']
): ContextualAction['impact'] => {
  switch (priority) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
};

const mapRecommendationToAction = (
  recommendation: RecommendationApiItem,
  index: number
): ContextualAction => {
  const category = mapRecommendationCategory(recommendation);

  return {
    id: recommendation.id,
    type:
      recommendation.priority === 'high'
        ? 'urgent'
        : recommendation.priority === 'medium'
          ? 'primary'
          : 'secondary',
    title: recommendation.title,
    description: recommendation.description,
    icon: getCategoryIcon(category),
    action: recommendation.actionUrl || '#',
    category,
    priority: index + 1,
    timeEstimate: recommendation.estimatedTimeToComplete || '5 min',
    impact: mapPriorityToImpact(recommendation.priority),
    context: recommendation.category || recommendation.type.replace('_', ' '),
    aiReasoning: recommendation.personalizedReason,
    deadline: recommendation.validUntil ? new Date(recommendation.validUntil) : undefined,
    completed: false,
  };
};

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  memberId,
  memberName,
  userRole = 'member',
}) => {
  const [actions, setActions] = useState<ContextualAction[]>([]);
  const [memberContext, setMemberContext] = useState<MemberContext | null>(null);
  const [activeTab, setActiveTab] = useState('smart');
  const [loading, setLoading] = useState(true);
  const [showAIDetails, setShowAIDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContextualActions = async () => {
      setLoading(true);
      setError(null);

      try {
        const [recommendationsResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/members/${memberId}/recommendations?limit=20`),
          fetch(`/api/members/${memberId}/personalized-dashboard`),
        ]);

        const recommendationsPayload: RecommendationsResponse = recommendationsResponse.ok
          ? await recommendationsResponse.json()
          : {};
        const dashboardPayload: PersonalizedDashboardResponse = dashboardResponse.ok
          ? await dashboardResponse.json()
          : {};

        setActions(
          (recommendationsPayload.recommendations || []).map((recommendation, index) =>
            mapRecommendationToAction(recommendation, index)
          )
        );

        setMemberContext({
          profileCompletion: dashboardPayload.profileCompletion ?? 0,
          lastLogin: dashboardPayload.lastLogin ? new Date(dashboardPayload.lastLogin) : null,
          pendingDocuments: dashboardPayload.pendingDocuments ?? 0,
          upcomingAppointments: dashboardPayload.upcomingAppointments ?? 0,
          unviewedMessages: dashboardPayload.unviewedMessages ?? 0,
          claimsInProgress: dashboardPayload.claimsInProgress ?? 0,
          benefitsExpiring: dashboardPayload.benefitsExpiring ?? 0,
          wellnessStreak: dashboardPayload.wellnessStreak ?? 0,
          locationConsent: dashboardPayload.locationConsent ?? false,
          notificationPreferences: dashboardPayload.notificationPreferences ?? [],
          recentActivity: dashboardPayload.recentActivity ?? [],
        });

        if (!recommendationsResponse.ok && !dashboardResponse.ok) {
          setError('Unable to load contextual actions from backend services right now.');
        }
      } catch (err) {
        setActions([]);
        setMemberContext(null);
        setError(err instanceof Error ? err.message : 'Failed to load contextual actions');
      } finally {
        setLoading(false);
      }
    };

    void loadContextualActions();
  }, [memberId]);

  const categories = useMemo<ActionCategory[]>(
    () =>
      [
        {
          id: 'urgent',
          title: 'Urgent Actions',
          description: 'Time-sensitive items requiring immediate attention',
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
          color: 'bg-red-50 border-red-200',
          actions: actions.filter((action) => action.type === 'urgent'),
        },
        {
          id: 'quick',
          title: 'Quick Actions',
          description: 'Common tasks you can complete in under 5 minutes',
          icon: <Zap className="h-6 w-6 text-yellow-600" />,
          color: 'bg-yellow-50 border-yellow-200',
          actions: actions.filter(
            (action) =>
              action.timeEstimate.includes('min') &&
              parseInt(action.timeEstimate, 10) <= 5
          ),
        },
        {
          id: 'high-impact',
          title: 'High Impact',
          description: 'Actions that provide the most value to your health and savings',
          icon: <TrendingUp className="h-6 w-6 text-green-600" />,
          color: 'bg-green-50 border-green-200',
          actions: actions.filter((action) => action.impact === 'high'),
        },
        {
          id: 'recommended',
          title: 'AI Recommended',
          description: 'Personalized suggestions based on your usage patterns',
          icon: <Sparkles className="h-6 w-6 text-purple-600" />,
          color: 'bg-purple-50 border-purple-200',
          actions: actions.filter((action) => Boolean(action.aiReasoning)),
        },
      ].filter((category) => category.actions.length > 0),
    [actions]
  );

  const getActionColor = (type: ContextualAction['type']) => {
    const colorMap: Record<ContextualAction['type'], string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      primary: 'bg-blue-100 text-blue-800 border-blue-200',
      secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return colorMap[type];
  };

  const getImpactColor = (impact: ContextualAction['impact']) => {
    const colorMap: Record<ContextualAction['impact'], string> = {
      high: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-gray-600 bg-gray-50',
    };

    return colorMap[impact];
  };

  const handleActionClick = (action: ContextualAction) => {
    if (action.action && action.action !== '#') {
      window.location.href = action.action;
    }

    void fetch(`/api/members/${memberId}/recommendations/${action.id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ response: 'clicked' }),
    }).catch((err) => {
      console.error('Failed to record contextual action feedback:', err);
    });
  };

  const getUrgencyIndicator = (action: ContextualAction) => {
    if (action.deadline) {
      const daysUntilDeadline = Math.ceil(
        (action.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= 3) {
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      }

      if (daysUntilDeadline <= 7) {
        return <Clock className="h-4 w-4 text-yellow-600" />;
      }
    }

    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-3 animate-pulse" />
            <p className="font-medium text-gray-900">Loading contextual actions...</p>
            <p className="text-sm text-gray-600">
              Fetching personalized recommendations from backend services
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Smart Actions</span>
          </h1>
          <p className="text-gray-600">
            Personalized actions from backend recommendations
            {memberName ? ` for ${memberName}` : ''}
            {userRole !== 'member' ? ` (${userRole})` : ''}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-purple-100 text-purple-800">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIDetails(!showAIDetails)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {showAIDetails ? 'Hide' : 'Show'} AI Insights
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {memberContext && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.profileCompletion}%</div>
                <div className="text-sm text-gray-600">Profile Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.pendingDocuments}</div>
                <div className="text-sm text-gray-600">Pending Docs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.upcomingAppointments}</div>
                <div className="text-sm text-gray-600">Appointments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.claimsInProgress}</div>
                <div className="text-sm text-gray-600">Active Claims</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.wellnessStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.benefitsExpiring}</div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{memberContext.unviewedMessages}</div>
                <div className="text-sm text-gray-600">New Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{actions.length}</div>
                <div className="text-sm text-gray-600">Action Items</div>
              </div>
            </div>
            {memberContext.lastLogin && (
              <p className="text-xs text-gray-500 mt-4 text-right">
                Last login: {memberContext.lastLogin.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart">Smart Actions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="all">All Actions</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="smart">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <span>Recommended for You</span>
                </CardTitle>
                <CardDescription>
                  Backend-selected actions based on your current context
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions.filter((action) => action.type === 'urgent' || action.type === 'primary').length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-6">
                      No prioritized backend recommendations are available for this member yet.
                    </div>
                  )}
                  {actions
                    .filter((action) => action.type === 'urgent' || action.type === 'primary')
                    .slice(0, 3)
                    .map((action) => (
                      <div
                        key={action.id}
                        className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${getActionColor(action.type)}`}
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 mt-0.5">{action.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm">{action.title}</h3>
                              <p className="text-xs text-gray-600 mt-1">{action.description}</p>

                              {showAIDetails && action.aiReasoning && (
                                <div className="mt-2 p-2 bg-white bg-opacity-60 rounded text-xs text-blue-700">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <Sparkles className="h-3 w-3" />
                                    <span className="font-medium">AI Insight:</span>
                                  </div>
                                  {action.aiReasoning}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {action.timeEstimate}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs ${getImpactColor(action.impact)}`}>
                                    {action.impact} impact
                                  </Badge>
                                </div>
                                {getUrgencyIndicator(action)}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Common navigation shortcuts available right now</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <FileText className="h-6 w-6" />, title: 'Submit Claim', action: '/claims/new' },
                    { icon: <Phone className="h-6 w-6" />, title: 'Contact Support', action: '/support' },
                    { icon: <MapPin className="h-6 w-6" />, title: 'Find Provider', action: '/providers' },
                    { icon: <Download className="h-6 w-6" />, title: 'Download Forms', action: '/forms' },
                    { icon: <Calendar className="h-6 w-6" />, title: 'Book Appointment', action: '/appointments' },
                    { icon: <CreditCard className="h-6 w-6" />, title: 'View Cards', action: '/cards' },
                  ].map((quickAction) => (
                    <Button
                      key={quickAction.title}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1 hover:bg-blue-50"
                      onClick={() => {
                        window.location.href = quickAction.action;
                      }}
                    >
                      {quickAction.icon}
                      <span className="text-xs">{quickAction.title}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-6">
            {categories.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No categorized recommendations are available right now</p>
                </CardContent>
              </Card>
            )}
            {categories.map((category) => (
              <Card key={category.id} className={`border ${category.color}`}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {category.icon}
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <Badge className="ml-auto">{category.actions.length} actions</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.actions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between p-3 bg-white bg-opacity-60 rounded-lg cursor-pointer hover:bg-opacity-100 transition-all"
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-center space-x-3">
                          {getCategoryIcon(action.category)}
                          <div>
                            <h4 className="font-medium text-sm">{action.title}</h4>
                            <p className="text-xs text-gray-600">{action.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {action.timeEstimate}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${getImpactColor(action.impact)}`}>
                                {action.impact} impact
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-4">
            {actions.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No contextual actions are available right now</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Personalized recommendations will appear here once the backend returns them
                  </p>
                </CardContent>
              </Card>
            )}
            {actions
              .sort((a, b) => a.priority - b.priority)
              .map((action) => (
                <Card key={action.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`p-2 rounded-lg ${getActionColor(action.type)}`}>
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{action.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{action.description}</p>

                          {showAIDetails && action.aiReasoning && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-900">AI Reasoning</span>
                              </div>
                              <p className="text-sm text-blue-700">{action.aiReasoning}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{action.category}</Badge>
                              <Badge variant="outline">{action.timeEstimate}</Badge>
                              <Badge className={getImpactColor(action.impact)}>
                                {action.impact} impact
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getUrgencyIndicator(action)}
                              {action.deadline && (
                                <span className="text-xs text-gray-500">
                                  Due: {action.deadline.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleActionClick(action)} size="sm" className="ml-4">
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Completion is tracked by backend feedback, not local mock state</p>
              <p className="text-sm text-gray-400 mt-1">
                Use the smart actions above to record clicks and engagement against backend recommendations
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
