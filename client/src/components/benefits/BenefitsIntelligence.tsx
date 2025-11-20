import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Lightbulb,
  Shield,
  Heart,
  Activity,
  DollarSign,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  BarChart3,
  Zap,
  Users,
  Calendar,
  Star,
  Award,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

interface BenefitInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'optimization' | 'opportunity';
  title: string;
  description: string;
  category: 'medical' | 'wellness' | 'financial' | 'preventive' | 'lifestyle';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  potentialSavings?: number;
  healthImpact?: 'positive' | 'neutral' | 'negative';
  actionRequired: boolean;
  actionItems: string[];
  confidence: number;
  validUntil: Date;
  source: 'usage_pattern' | 'health_data' | 'behavior_analysis' | 'seasonal' | 'comparative';
  applied: boolean;
  appliedDate?: Date;
}

interface SpendingPattern {
  category: string;
  amount: number;
  utilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  projection: number;
  recommendations: string[];
}

interface HealthMetric {
  metric: string;
  value: number;
  target: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
  impact: string;
}

interface BenefitsIntelligenceProps {
  memberId: string;
  memberName?: string;
}

export const BenefitsIntelligence: React.FC<BenefitsIntelligenceProps> = ({ memberId, memberName }) => {
  const [insights, setInsights] = useState<BenefitInsight[]>([]);
  const [spendingPatterns, setSpendingPatterns] = useState<SpendingPattern[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date>(new Date());

  // Mock data - in a real app, this would come from APIs
  useEffect(() => {
    const mockInsights: BenefitInsight[] = [
      {
        id: '1',
        type: 'recommendation',
        title: 'Increase Preventive Care Usage',
        description: 'Based on your health profile, you\'re underutilizing preventive care benefits that could save you $1,200 annually.',
        category: 'preventive',
        priority: 'high',
        potentialSavings: 1200,
        healthImpact: 'positive',
        actionRequired: true,
        actionItems: [
          'Schedule annual physical exam',
          'Complete age-appropriate screenings',
          'Review vaccination history'
        ],
        confidence: 0.92,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        source: 'usage_pattern',
        applied: false
      },
      {
        id: '2',
        type: 'optimization',
        title: 'Optimize Prescription Drug Usage',
        description: 'Switching to generic alternatives for 3 current medications could save you $45 per month.',
        category: 'medical',
        priority: 'medium',
        potentialSavings: 540,
        healthImpact: 'neutral',
        actionRequired: true,
        actionItems: [
          'Consult with your doctor about generic alternatives',
          'Review current medication list',
          'Check pharmacy preferred drug list'
        ],
        confidence: 0.88,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        source: 'comparative',
        applied: false
      },
      {
        id: '3',
        type: 'opportunity',
        title: 'Wellness Program Credits Available',
        description: 'You\'re eligible for wellness program credits worth $500 this quarter through health activities.',
        category: 'wellness',
        priority: 'medium',
        potentialSavings: 500,
        healthImpact: 'positive',
        actionRequired: true,
        actionItems: [
          'Complete health risk assessment',
          'Join fitness challenge',
          'Track daily steps for 30 days'
        ],
        confidence: 0.95,
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        source: 'seasonal',
        applied: false
      },
      {
        id: '4',
        type: 'warning',
        title: 'High Specialist Visit Utilization',
        description: 'Your specialist visit frequency is 40% higher than peers with similar conditions. Consider care coordination.',
        category: 'medical',
        priority: 'medium',
        potentialSavings: 300,
        healthImpact: 'neutral',
        actionRequired: true,
        actionItems: [
          'Review care coordination options',
          'Consult with primary care physician',
          'Explore telehealth alternatives'
        ],
        confidence: 0.85,
        validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        source: 'behavior_analysis',
        applied: false
      },
      {
        id: '5',
        type: 'recommendation',
        title: 'Dental Benefits Optimization',
        description: 'You have unused dental benefits worth $350 that expire at year-end. Schedule preventive cleaning.',
        category: 'lifestyle',
        priority: 'low',
        potentialSavings: 350,
        healthImpact: 'positive',
        actionRequired: true,
        actionItems: [
          'Schedule dental cleaning',
          'Check orthodontic coverage',
          'Review family dental benefits'
        ],
        confidence: 0.90,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        source: 'usage_pattern',
        applied: true,
        appliedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    const mockSpendingPatterns: SpendingPattern[] = [
      {
        category: 'Primary Care',
        amount: 450,
        utilization: 75,
        trend: 'stable',
        projection: 480,
        recommendations: ['Maintain current usage', 'Consider telehealth for routine visits']
      },
      {
        category: 'Specialist Visits',
        amount: 1200,
        utilization: 120,
        trend: 'increasing',
        projection: 1440,
        recommendations: ['Review specialist necessity', 'Explore consolidated care options']
      },
      {
        category: 'Prescription Drugs',
        amount: 680,
        utilization: 85,
        trend: 'decreasing',
        projection: 650,
        recommendations: ['Continue generic usage', 'Review mail-order options']
      },
      {
        category: 'Preventive Care',
        amount: 150,
        utilization: 45,
        trend: 'stable',
        projection: 150,
        recommendations: ['Increase utilization to 80%', 'Schedule annual screenings']
      },
      {
        category: 'Wellness Programs',
        amount: 0,
        utilization: 0,
        trend: 'stable',
        projection: 200,
        recommendations: ['Join available programs', 'Track activities for credits']
      }
    ];

    const mockHealthMetrics: HealthMetric[] = [
      {
        metric: 'Physical Activity',
        value: 6500,
        target: 10000,
        unit: 'steps/day',
        trend: 'improving',
        impact: 'Improves cardiovascular health and reduces healthcare costs'
      },
      {
        metric: 'Preventive Care Score',
        value: 65,
        target: 100,
        unit: 'score',
        trend: 'improving',
        impact: 'Higher scores correlate with lower long-term healthcare costs'
      },
      {
        metric: 'Medication Adherence',
        value: 85,
        target: 95,
        unit: 'percentage',
        trend: 'stable',
        impact: 'Better adherence prevents complications and reduces costs'
      },
      {
        metric: 'Stress Level',
        value: 6,
        target: 4,
        unit: 'scale 1-10',
        trend: 'declining',
        impact: 'Lower stress levels improve overall health outcomes'
      }
    ];

    setInsights(mockInsights);
    setSpendingPatterns(mockSpendingPatterns);
    setHealthMetrics(mockHealthMetrics);
  }, [memberId]);

  // Get icon for insight type
  const getInsightIcon = (type: string) => {
    const iconMap = {
      recommendation: Lightbulb,
      warning: AlertTriangle,
      optimization: TrendingUp,
      opportunity: Target
    };
    return iconMap[type as keyof typeof iconMap] || Info;
  };

  // Get color for insight type
  const getInsightColor = (type: string) => {
    const colorMap = {
      recommendation: 'text-blue-600 bg-blue-50',
      warning: 'text-yellow-600 bg-yellow-50',
      optimization: 'text-green-600 bg-green-50',
      opportunity: 'text-purple-600 bg-purple-50'
    };
    return colorMap[type as keyof typeof colorMap] || 'text-gray-600 bg-gray-50';
  };

  // Get color for priority
  const getPriorityColor = (priority: string) => {
    const colorMap = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colorMap[priority as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const iconMap = {
      medical: Heart,
      wellness: Activity,
      financial: DollarSign,
      preventive: Shield,
      lifestyle: Users
    };
    return iconMap[category as keyof typeof iconMap] || Info;
  };

  // Get color for trend
  const getTrendColor = (trend: string) => {
    const colorMap = {
      increasing: 'text-red-600',
      decreasing: 'text-green-600',
      stable: 'text-gray-600',
      improving: 'text-green-600',
      declining: 'text-red-600'
    };
    return colorMap[trend as keyof typeof colorMap] || 'text-gray-600';
  };

  // Get icon for trend
  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing' || trend === 'improving') return TrendingUp;
    if (trend === 'decreasing' || trend === 'declining') return TrendingDown;
    return Activity;
  };

  // Calculate total potential savings
  const totalPotentialSavings = insights
    .filter(insight => !insight.applied)
    .reduce((total, insight) => total + (insight.potentialSavings || 0), 0);

  // Get insights by priority
  const insightsByPriority = {
    urgent: insights.filter(i => i.priority === 'urgent' && !i.applied),
    high: insights.filter(i => i.priority === 'high' && !i.applied),
    medium: insights.filter(i => i.priority === 'medium' && !i.applied),
    low: insights.filter(i => i.priority === 'low' && !i.applied)
  };

  // Handle applying insight
  const handleApplyInsight = async (insightId: string) => {
    setInsights(prev => prev.map(insight =>
      insight.id === insightId
        ? { ...insight, applied: true, appliedDate: new Date() }
        : insight
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span>Benefits Intelligence</span>
          </h1>
          <p className="text-gray-600">
            AI-powered insights to optimize your healthcare benefits and costs
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last analyzed</p>
          <p className="text-sm font-medium text-gray-900">{lastAnalyzed.toLocaleString()}</p>
          <Button variant="outline" size="sm" className="mt-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Potential Savings</p>
                  <p className="text-2xl font-bold text-gray-900">${totalPotentialSavings}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Insights</p>
                  <p className="text-2xl font-bold text-gray-900">{insights.filter(i => !i.applied).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Applied</p>
                  <p className="text-2xl font-bold text-gray-900">{insights.filter(i => i.applied).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Intelligent Insights</TabsTrigger>
          <TabsTrigger value="spending">Spending Analysis</TabsTrigger>
          <TabsTrigger value="health">Health Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="space-y-6">
            {/* Priority Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(insightsByPriority).map(([priority, items]) => {
                const Icon = priority === 'urgent' ? AlertTriangle :
                           priority === 'high' ? TrendingUp :
                           priority === 'medium' ? Info : CheckCircle;
                return (
                  <Card key={priority} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium capitalize">{priority}</p>
                            <p className="text-2xl font-bold">{items.length}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(priority)}>
                          {items.length} actions
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Insights List */}
            <div className="space-y-4">
              {insights.filter(insight => !insight.applied).map((insight) => {
                const Icon = getInsightIcon(insight.type);
                const CategoryIcon = getCategoryIcon(insight.category);
                return (
                  <Card key={insight.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getInsightColor(insight.type)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{insight.title}</CardTitle>
                            <CardDescription className="mt-1">{insight.description}</CardDescription>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getPriorityColor(insight.priority)}>
                                {insight.priority}
                              </Badge>
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <CategoryIcon className="h-4 w-4" />
                                <span className="capitalize">{insight.category}</span>
                              </div>
                              {insight.potentialSavings && (
                                <div className="flex items-center space-x-1 text-sm text-green-600">
                                  <DollarSign className="h-4 w-4" />
                                  <span>${insight.potentialSavings} savings</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Confidence</p>
                            <p className="text-sm font-medium">{Math.round(insight.confidence * 100)}%</p>
                          </div>
                          <Button
                            onClick={() => handleApplyInsight(insight.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Action Items</p>
                          <ul className="mt-1 space-y-1">
                            {insight.actionItems.map((item, index) => (
                              <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Valid until {insight.validUntil.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Info className="h-4 w-4" />
                            <span>Source: {insight.source.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spending">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Spending Patterns</span>
                  </CardTitle>
                  <CardDescription>Your healthcare spending by category with trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {spendingPatterns.map((pattern, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pattern.category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">${pattern.amount}</span>
                            <div className={`flex items-center space-x-1 ${getTrendColor(pattern.trend)}`}>
                              {React.createElement(getTrendIcon(pattern.trend), { className: "h-4 w-4" })}
                              <span className="text-xs capitalize">{pattern.trend}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Utilization</span>
                            <span>{pattern.utilization}%</span>
                          </div>
                          <Progress value={pattern.utilization} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-500">
                          <span>Projected: ${pattern.projection}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Optimization Opportunities</span>
                  </CardTitle>
                  <CardDescription>Recommendations to reduce spending while maintaining care quality</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {spendingPatterns.filter(p => p.recommendations.length > 0).map((pattern, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <p className="font-medium">{pattern.category}</p>
                        <ul className="mt-1 space-y-1">
                          {pattern.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="text-sm text-gray-600 flex items-center space-x-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5" />
                  <span>Health Metrics & Impact</span>
                </CardTitle>
                <CardDescription>Key health indicators and their impact on your healthcare costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {healthMetrics.map((metric, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{metric.metric}</span>
                        <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend)}`}>
                          {React.createElement(getTrendIcon(metric.trend), { className: "h-4 w-4" })}
                          <span className="text-sm capitalize">{metric.trend}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{metric.value} / {metric.target} {metric.unit}</span>
                          <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                        </div>
                        <Progress value={(metric.value / metric.target) * 100} className="h-2" />
                      </div>
                      <p className="text-sm text-gray-600">{metric.impact}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Personalized Recommendations</span>
                </CardTitle>
                <CardDescription>Top prioritized actions to maximize your benefits value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights
                    .filter(insight => !insight.applied)
                    .sort((a, b) => {
                      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 3;
                      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 3;
                      return aPriority - bPriority;
                    })
                    .slice(0, 5)
                    .map((insight, index) => {
                      const Icon = getInsightIcon(insight.type);
                      return (
                        <div key={insight.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Icon className="h-5 w-5 text-blue-600" />
                              <h3 className="font-medium">{insight.title}</h3>
                              <Badge className={getPriorityColor(insight.priority)} variant="outline">
                                {insight.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            {insight.potentialSavings && (
                              <p className="text-sm text-green-600 font-medium mt-1">
                                Potential savings: ${insight.potentialSavings}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleApplyInsight(insight.id)}
                            size="sm"
                            variant="outline"
                          >
                            Take Action
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};