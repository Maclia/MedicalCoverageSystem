import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Calendar,
  Phone,
  MapPin,
  DollarSign,
  Heart,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Activity,
  MessageSquare,
  Download,
  Upload,
  Search,
  Settings,
  Star,
  Award,
  Zap,
  Target,
  Camera,
  CreditCard,
  FileCheck,
  Bell,
  HelpCircle,
  Plus,
  ChevronRight,
  Sparkles
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
  lastLogin: Date;
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

interface ContextualActionsProps {
  memberId: string;
  memberName?: string;
  userRole?: string;
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({ memberId, memberName, userRole = 'member' }) => {
  const [actions, setActions] = useState<ContextualAction[]>([]);
  const [categories, setCategories] = useState<ActionCategory[]>([]);
  const [memberContext, setMemberContext] = useState<MemberContext | null>(null);
  const [activeTab, setActiveTab] = useState('smart');
  const [loading, setLoading] = useState(false);
  const [showAIDetails, setShowAIDetails] = useState(false);

  // Mock data - in a real app, this would come from APIs and AI analysis
  useEffect(() => {
    const mockMemberContext: MemberContext = {
      profileCompletion: 85,
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
      pendingDocuments: 2,
      upcomingAppointments: 1,
      unviewedMessages: 3,
      claimsInProgress: 1,
      benefitsExpiring: 1,
      wellnessStreak: 7,
      locationConsent: false,
      notificationPreferences: ['email', 'sms'],
      recentActivity: [
        'viewed_benefits',
        'downloaded_id_card',
        'checked_claim_status',
        'updated_profile'
      ]
    };

    const mockActions: ContextualAction[] = [
      {
        id: '1',
        type: 'urgent',
        title: 'Complete Profile Setup',
        description: 'Finish setting up your profile to unlock all benefits features',
        icon: <Settings className="h-5 w-5" />,
        action: '/profile/edit',
        category: 'account',
        priority: 1,
        timeEstimate: '5 min',
        impact: 'high',
        context: 'Profile is 85% complete. Missing emergency contacts and preferences.',
        aiReasoning: 'Based on your recent activity, you\'re exploring benefits but haven\'t fully completed your profile. Completing it will personalize your experience.',
        progress: 85,
        completed: false
      },
      {
        id: '2',
        type: 'primary',
        title: 'Upload Pending Documents',
        description: 'Upload insurance card and ID to complete verification',
        icon: <Upload className="h-5 w-5" />,
        action: '/documents/upload',
        category: 'documents',
        priority: 2,
        timeEstimate: '10 min',
        impact: 'high',
        context: '2 documents pending verification.',
        aiReasoning: 'You have upcoming appointments that may require verified documents. Uploading now prevents delays.',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        type: 'secondary',
        title: 'Schedule Annual Physical',
        description: 'Book your preventive care appointment before benefits expire',
        icon: <Calendar className="h-5 w-5" />,
        action: '/appointments/schedule',
        category: 'appointments',
        priority: 3,
        timeEstimate: '3 min',
        impact: 'high',
        context: 'Preventive care benefits expire in 45 days.',
        aiReasoning: 'Your age and health profile indicate annual physical is due. Scheduling now ensures you use benefits before expiration.',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        type: 'secondary',
        title: 'Check Claim Status',
        description: 'Track your recent dental cleaning claim submission',
        icon: <FileCheck className="h-5 w-5" />,
        action: '/claims/status',
        category: 'claims',
        priority: 4,
        timeEstimate: '2 min',
        impact: 'medium',
        context: '1 claim in processing for 5 days.',
        aiReasoning: 'Claims typically process within 7 days. Checking now ensures everything is on track.'
      },
      {
        id: '5',
        type: 'primary',
        title: 'Find In-Network Provider',
        description: 'Locate nearby covered providers for your upcoming needs',
        icon: <Search className="h-5 w-5" />,
        action: '/providers/search',
        category: 'benefits',
        priority: 5,
        timeEstimate: '5 min',
        impact: 'medium',
        context: 'You searched for specialists last week.',
        aiReasoning: 'Based on your browsing history, you\'re likely looking for specialist care. Finding in-network providers saves money.'
      },
      {
        id: '6',
        type: 'secondary',
        title: 'Enable Location Services',
        description: 'Allow location access for nearby urgent care and emergencies',
        icon: <MapPin className="h-5 w-5" />,
        action: '/settings/location',
        category: 'account',
        priority: 6,
        timeEstimate: '1 min',
        impact: 'medium',
        context: 'Location services disabled.',
        aiReasoning: 'You frequently access the app from different locations. Enabling location helps find nearest care in emergencies.'
      },
      {
        id: '7',
        type: 'secondary',
        title: 'Review Wellness Benefits',
        description: 'Explore available wellness programs and credits',
        icon: <Heart className="h-5 w-5" />,
        action: '/wellness/programs',
        category: 'wellness',
        priority: 7,
        timeEstimate: '8 min',
        impact: 'low',
        context: '7-day wellness streak achieved!',
        aiReasoning: 'Your 7-day wellness streak shows commitment. Reviewing wellness programs could earn you rewards.',
        completed: false
      },
      {
        id: '8',
        type: 'secondary',
        title: 'View Insurance Cards',
        description: 'Access your digital and physical insurance cards',
        icon: <CreditCard className="h-5 w-5" />,
        action: '/cards',
        category: 'benefits',
        priority: 8,
        timeEstimate: '1 min',
        impact: 'medium',
        context: 'Appointment scheduled in 3 days.',
        aiReasoning: 'You have an upcoming appointment. Having your ID card ready saves time at check-in.',
        completed: true
      }
    ];

    const mockCategories: ActionCategory[] = [
      {
        id: 'urgent',
        title: 'Urgent Actions',
        description: 'Time-sensitive items requiring immediate attention',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        color: 'bg-red-50 border-red-200',
        actions: mockActions.filter(a => a.type === 'urgent')
      },
      {
        id: 'quick',
        title: 'Quick Actions',
        description: 'Common tasks you can complete in under 5 minutes',
        icon: <Zap className="h-6 w-6 text-yellow-600" />,
        color: 'bg-yellow-50 border-yellow-200',
        actions: mockActions.filter(a => a.timeEstimate.includes('min') && parseInt(a.timeEstimate) <= 5)
      },
      {
        id: 'high-impact',
        title: 'High Impact',
        description: 'Actions that provide the most value to your health and savings',
        icon: <TrendingUp className="h-6 w-6 text-green-600" />,
        color: 'bg-green-50 border-green-200',
        actions: mockActions.filter(a => a.impact === 'high')
      },
      {
        id: 'recommended',
        title: 'AI Recommended',
        description: 'Personalized suggestions based on your usage patterns',
        icon: <Sparkles className="h-6 w-6 text-purple-600" />,
        color: 'bg-purple-50 border-purple-200',
        actions: mockActions.filter(a => a.aiReasoning)
      }
    ];

    setActions(mockActions);
    setCategories(mockCategories);
    setMemberContext(mockMemberContext);
  }, [memberId]);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const iconMap = {
      benefits: <Shield className="h-5 w-5" />,
      claims: <FileText className="h-5 w-5" />,
      documents: <FileText className="h-5 w-5" />,
      appointments: <Calendar className="h-5 w-5" />,
      wellness: <Heart className="h-5 w-5" />,
      account: <Settings className="h-5 w-5" />,
      emergency: <AlertTriangle className="h-5 w-5" />
    };
    return iconMap[category as keyof typeof iconMap] || <HelpCircle className="h-5 w-5" />;
  };

  // Get color for action type
  const getActionColor = (type: string) => {
    const colorMap = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      primary: 'bg-blue-100 text-blue-800 border-blue-200',
      secondary: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get color for impact
  const getImpactColor = (impact: string) => {
    const colorMap = {
      high: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-gray-600 bg-gray-50'
    };
    return colorMap[impact as keyof typeof colorMap] || 'text-gray-600 bg-gray-50';
  };

  // Handle action click
  const handleActionClick = (action: ContextualAction) => {
    // In a real app, this would navigate to the appropriate page
    console.log('Action clicked:', action);

    // Mark as completed if applicable
    if (action.category === 'benefits' || action.category === 'account') {
      setActions(prev => prev.map(a =>
        a.id === action.id ? { ...a, completed: true } : a
      ));
    }
  };

  // Get urgency indicator
  const getUrgencyIndicator = (action: ContextualAction) => {
    if (action.deadline) {
      const daysUntilDeadline = Math.ceil((action.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline <= 3) {
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      } else if (daysUntilDeadline <= 7) {
        return <Clock className="h-4 w-4 text-yellow-600" />;
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Smart Actions</span>
          </h1>
          <p className="text-gray-600">
            AI-powered personalized actions based on your current needs and patterns
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

      {/* Context Summary */}
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
                <div className="text-2xl font-bold text-gray-900">{actions.filter(a => !a.completed).length}</div>
                <div className="text-sm text-gray-600">Action Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart">Smart Actions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="all">All Actions</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="smart">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <span>Recommended for You</span>
                </CardTitle>
                <CardDescription>AI-selected actions based on your current context</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions
                    .filter(action => action.type === 'urgent' || action.type === 'primary')
                    .slice(0, 3)
                    .map((action) => (
                      <div
                        key={action.id}
                        className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${getActionColor(action.type)}`}
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 mt-0.5">
                              {action.icon}
                            </div>
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

                        {/* Progress Bar for applicable actions */}
                        {action.progress !== undefined && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{action.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${action.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Common tasks you can complete right now</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <FileText className="h-6 w-6" />, title: 'Submit Claim', action: '/claims/new' },
                    { icon: <Phone className="h-6 w-6" />, title: 'Contact Support', action: '/support' },
                    { icon: <MapPin className="h-6 w-6" />, title: 'Find Provider', action: '/providers' },
                    { icon: <Download className="h-6 w-6" />, title: 'Download Forms', action: '/forms' },
                    { icon: <Calendar className="h-6 w-6" />, title: 'Book Appointment', action: '/appointments' },
                    { icon: <Shield className="h-6 w-6" />, title: 'View Benefits', action: '/benefits' }
                  ].map((quickAction, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1 hover:bg-blue-50"
                      onClick={() => console.log('Quick action:', quickAction.action)}
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
            {categories.map((category) => (
              <Card key={category.id} className={`border ${category.color}`}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {category.icon}
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <Badge className="ml-auto">
                      {category.actions.length} actions
                    </Badge>
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
            {actions
              .filter(action => !action.completed)
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
                      <Button
                        onClick={() => handleActionClick(action)}
                        size="sm"
                        className="ml-4"
                      >
                        {action.completed ? 'View' : 'Start'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="space-y-4">
            {actions
              .filter(action => action.completed)
              .map((action) => (
                <Card key={action.id} className="opacity-75">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-700">{action.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Completed
                            </Badge>
                            <Badge variant="outline">{action.category}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {actions.filter(action => action.completed).length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No completed actions yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Complete actions from your recommendations to see them here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};