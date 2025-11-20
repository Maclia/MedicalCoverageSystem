import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Heart,
  Shield,
  Star,
  TrendingUp,
  Users,
  Target,
  Zap,
  Calendar,
  Award,
  Gift,
  Clock,
  ChevronRight,
  Activity,
  BookOpen,
  Lightbulb,
  CheckCircle
} from 'lucide-react';

interface PersonalizedWelcomeProps {
  memberId: number;
  memberData?: {
    firstName: string;
    lastName: string;
    email: string;
    company?: {
      name: string;
      industry?: string;
    };
    onboardingStatus?: {
      currentDay: number;
      totalPoints: number;
      streakDays: number;
      status: string;
    };
  };
}

interface PersonalizedContent {
  greeting: string;
  motivationalMessage: string;
  contextualTips: string[];
  recommendedActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    priority: 'high' | 'medium' | 'low';
    action: () => void;
  }>;
  personalizedStats: Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
  }>;
  upcomingFeatures: Array<{
    title: string;
    description: string;
    unlockDay: number;
    icon: React.ReactNode;
  }>;
}

const timeBasedGreetings = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening"
};

const motivationalMessages = {
  new_member: [
    "Every great journey begins with a single step!",
    "Your health journey starts today - let's make it amazing!",
    "Welcome to your personalized health experience!",
    "Small steps lead to big health improvements!"
  ],
  active_member: [
    "You're making great progress on your health journey!",
    "Consistency is the key to achieving your health goals!",
    "Your dedication to wellness is inspiring!",
    "Keep up the excellent work on your health goals!"
  ],
  engaged_member: [
    "You're a health champion! Your commitment is remarkable!",
    "Your proactive approach to health is making a real difference!",
    "Your wellness journey is truly inspiring others!",
    "You're setting an amazing example for healthy living!"
  ]
};

const contextualTips = {
  benefits: [
    "Did you know? Preventive care services are often fully covered!",
    "Regular check-ups can catch health issues early, when they're most treatable.",
    "Your insurance includes telehealth options for convenient virtual consultations."
  ],
  wellness: [
    "Just 30 minutes of daily activity can significantly improve your health.",
    "Staying hydrated throughout the day supports overall wellness and energy levels.",
    "Quality sleep is just as important as diet and exercise for your health."
  ],
  productivity: [
    "Taking short breaks during work can boost productivity and reduce stress.",
    "Regular movement throughout the day helps maintain focus and energy.",
    "Mindful breathing exercises can quickly reduce workplace stress."
  ]
};

export const PersonalizedWelcome: React.FC<PersonalizedWelcomeProps> = ({
  memberId,
  memberData
}) => {
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    generatePersonalizedContent();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, [memberData]);

  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return timeBasedGreetings.morning;
    if (hour < 17) return timeBasedGreetings.afternoon;
    return timeBasedGreetings.evening;
  };

  const getMemberEngagementLevel = () => {
    if (!memberData?.onboardingStatus) return 'new_member';

    const { currentDay, totalPoints, streakDays } = memberData.onboardingStatus;

    if (currentDay >= 7 && totalPoints >= 100 && streakDays >= 5) return 'engaged_member';
    if (currentDay >= 3 && totalPoints >= 50) return 'active_member';
    return 'new_member';
  };

  const generatePersonalizedContent = async () => {
    setLoading(true);

    try {
      const greeting = getTimeBasedGreeting();
      const engagementLevel = getMemberEngagementLevel();
      const firstName = memberData?.firstName || 'Member';
      const companyName = memberData?.company?.name || 'your company';

      // Fetch member preferences and behavior analytics
      const [preferencesResponse, behaviorResponse] = await Promise.all([
        fetch(`/api/members/${memberId}/personalized-dashboard`),
        fetch(`/api/members/${memberId}/analytics?limit=10`)
      ]);

      let preferences = null;
      let recentBehavior = [];

      if (preferencesResponse.ok) {
        preferences = await preferencesResponse.json();
      }

      if (behaviorResponse.ok) {
        recentBehavior = await behaviorResponse.json();
      }

      // Determine most used features from behavior analytics
      const featureUsage = recentBehavior.reduce((acc: any, behavior: any) => {
        const resource = behavior.resourceName;
        acc[resource] = (acc[resource] || 0) + 1;
        return acc;
      }, {});

      const mostUsedFeatures = Object.entries(featureUsage)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 3)
        .map(([feature]) => feature);

      // Generate motivational message
      const messages = motivationalMessages[engagementLevel as keyof typeof motivationalMessages];
      const motivationalMessage = messages[Math.floor(Math.random() * messages.length)];

      // Generate contextual tips based on usage and preferences
      let tips: string[] = [];

      if (mostUsedFeatures.includes('benefits') || recentBehavior.some((b: any) => b.resourceName.includes('benefit'))) {
        tips = tips.concat(contextualTips.benefits.slice(0, 2));
      }

      if (mostUsedFeatures.includes('wellness') || recentBehavior.some((b: any) => b.resourceName.includes('wellness'))) {
        tips = tips.concat(contextualTips.wellness.slice(0, 1));
      }

      if (tips.length === 0) {
        tips = contextualTips.wellness.slice(0, 2);
      }

      // Generate recommended actions
      const recommendedActions = [];

      if (engagementLevel === 'new_member') {
        recommendedActions.push({
          id: 'complete_onboarding',
          title: 'Complete Your Onboarding',
          description: 'Finish setting up your profile to unlock all features',
          icon: <Target className="h-5 w-5" />,
          priority: 'high' as const,
          action: () => window.location.href = `/member/onboarding/${memberId}`
        });
      }

      if (memberData?.onboardingStatus?.currentDay < 7) {
        recommendedActions.push({
          id: 'todays_tasks',
          title: `Day ${memberData.onboardingStatus.currentDay} Tasks`,
          description: 'Complete today\'s onboarding activities',
          icon: <Calendar className="h-5 w-5" />,
          priority: 'high' as const,
          action: () => window.location.href = `/member/onboarding/${memberId}`
        });
      }

      if (preferences?.recommendations && preferences.recommendations.length > 0) {
        const topRecommendation = preferences.recommendations[0];
        recommendedActions.push({
          id: 'recommendation',
          title: topRecommendation.title,
          description: topRecommendation.description,
          icon: <Lightbulb className="h-5 w-5" />,
          priority: 'medium' as const,
          action: () => console.log('Navigate to recommendation:', topRecommendation.id)
        });
      }

      if (engagementLevel !== 'new_member') {
        recommendedActions.push({
          id: 'wellness_check',
          title: 'Wellness Check-in',
          description: 'Log today\'s health activities and mood',
          icon: <Heart className="h-5 w-5" />,
          priority: 'medium' as const,
          action: () => window.location.href = `/member/wellness/${memberId}`
        });
      }

      // Generate personalized stats
      const personalizedStats = [
        {
          label: 'Journey Progress',
          value: `${memberData?.onboardingStatus?.currentDay || 0}/7 days`,
          icon: <TrendingUp className="h-5 w-5" />,
          color: 'text-blue-600 bg-blue-100'
        },
        {
          label: 'Points Earned',
          value: `${memberData?.onboardingStatus?.totalPoints || 0} pts`,
          icon: <Star className="h-5 w-5" />,
          color: 'text-yellow-600 bg-yellow-100'
        },
        {
          label: 'Current Streak',
          value: `${memberData?.onboardingStatus?.streakDays || 0} days`,
          icon: <Zap className="h-5 w-5" />,
          color: 'text-orange-600 bg-orange-100'
        }
      ];

      if (engagementLevel !== 'new_member') {
        personalizedStats.push({
          label: 'Active Days',
          value: `${Math.floor((memberData?.onboardingStatus?.currentDay || 0) * 1.2)} days`,
          icon: <Activity className="h-5 w-5" />,
          color: 'text-green-600 bg-green-100'
        });
      }

      // Generate upcoming features
      const upcomingFeatures = [];

      if (memberData?.onboardingStatus?.currentDay < 7) {
        const currentDay = memberData.onboardingStatus.currentDay;
        upcomingFeatures.push({
          title: 'Wellness Program Access',
          description: 'Join personalized wellness challenges and earn rewards',
          unlockDay: 3,
          icon: <Award className="h-5 w-5" />
        });

        upcomingFeatures.push({
          title: 'Benefits Intelligence',
          description: 'AI-powered insights to maximize your health coverage',
          unlockDay: 5,
          icon: <Brain className="h-5 w-5" />
        });

        upcomingFeatures.push({
          title: 'Health Journey Analytics',
          description: 'Detailed tracking and progress visualization',
          unlockDay: 7,
          icon: <TrendingUp className="h-5 w-5" />
        });
      }

      const content: PersonalizedContent = {
        greeting: `${greeting}, ${firstName}!`,
        motivationalMessage,
        contextualTips: tips.slice(0, 3),
        recommendedActions: recommendedActions.slice(0, 3),
        personalizedStats,
        upcomingFeatures
      };

      setPersonalizedContent(content);

    } catch (error) {
      console.error('Failed to generate personalized content:', error);

      // Fallback content
      setPersonalizedContent({
        greeting: `Welcome back, ${memberData?.firstName || 'Member'}!`,
        motivationalMessage: "Your health journey is important to us!",
        contextualTips: contextualTips.wellness.slice(0, 2),
        recommendedActions: [],
        personalizedStats: [
          {
            label: 'Welcome!',
            value: 'Getting started',
            icon: <Sparkles className="h-5 w-5" />,
            color: 'text-blue-600 bg-blue-100'
          }
        ],
        upcomingFeatures: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!personalizedContent) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Unable to load personalized content at this time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isFeatureUnlocked = (unlockDay: number) => {
    return (memberData?.onboardingStatus?.currentDay || 0) >= unlockDay;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {personalizedContent.greeting}
                </h1>
              </div>
              <p className="text-lg text-gray-700 mb-4">
                {personalizedContent.motivationalMessage}
              </p>
              {memberData?.company?.name && (
                <p className="text-sm text-gray-600">
                  Welcome to your personalized health portal at {memberData.company.name}
                </p>
              )}
            </div>
            <div className="hidden md:block">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <Clock className="h-5 w-5 text-blue-600 mb-1" />
                <p className="text-xs text-gray-600">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personalized Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {personalizedContent.personalizedStats.map((stat, index) => (
          <Card key={index} className="text-center">
            <CardContent className="pt-6">
              <div className={`inline-flex p-2 rounded-full ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recommended Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Recommended for You</span>
            </CardTitle>
            <CardDescription>
              Personalized actions based on your journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {personalizedContent.recommendedActions.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">All caught up! Check back later for new recommendations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {personalizedContent.recommendedActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={action.action}
                  >
                    <div className={`mt-0.5 ${getPriorityColor(action.priority)} p-1 rounded`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{action.title}</h4>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(action.priority)}`}
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contextual Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Health Tips for You</span>
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalizedContent.contextualTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="mt-1">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Learn More</h4>
                  <p className="text-sm text-blue-700">
                    Explore our health education library for more tips and resources.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Features */}
      {personalizedContent.upcomingFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5" />
              <span>Upcoming Features</span>
            </CardTitle>
            <CardDescription>
              Complete more onboarding days to unlock these features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {personalizedContent.upcomingFeatures.map((feature, index) => {
                const isUnlocked = isFeatureUnlocked(feature.unlockDay);
                return (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      isUnlocked
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-full ${
                        isUnlocked ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {feature.icon}
                      </div>
                      {isUnlocked ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Day {feature.unlockDay}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                    {isUnlocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => {
                          // Handle navigation to unlocked feature
                          console.log('Navigate to:', feature.title);
                        }}
                      >
                        Try Now
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Feature Unlock Progress</span>
                <span className="text-sm text-gray-600">
                  {memberData?.onboardingStatus?.currentDay || 0}/7 days
                </span>
              </div>
              <Progress
                value={(memberData?.onboardingStatus?.currentDay || 0) * (100 / 7)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};