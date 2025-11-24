import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Heart,
  Shield,
  TrendingUp,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Target,
  Users,
  Lightbulb,
  Activity,
  BookOpen,
  Calendar,
  ChevronRight,
  Sparkles,
  Zap,
  Award,
  Flag,
  RefreshCw
} from 'lucide-react';

interface RecommendationEngineProps {
  memberId: number;
  memberProfile?: {
    age?: number;
    gender?: string;
    healthGoals?: string[];
    interests?: string[];
    currentDay?: number;
    totalPoints?: number;
  };
}

interface Recommendation {
  id: string;
  type: 'preventive_care' | 'wellness' | 'cost_optimization' | 'care_coordination' | 'educational';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionUrl?: string;
  actionText?: string;
  validUntil?: string;
  personalizedReason: string;
  confidence: number;
  tags: string[];
  estimatedTimeToComplete?: string;
  potentialBenefit?: string;
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  personalizationInsights: {
    primaryInterests: string[];
    engagementLevel: string;
    recommendedFocusAreas: string[];
  };
}

const recommendationIcons = {
  preventive_care: <Shield className="h-5 w-5" />,
  wellness: <Heart className="h-5 w-5" />,
  cost_optimization: <TrendingUp className="h-5 w-5" />,
  care_coordination: <Users className="h-5 w-5" />,
  educational: <BookOpen className="h-5 w-5" />
};

const recommendationColors = {
  preventive_care: 'text-blue-600 bg-blue-100',
  wellness: 'text-red-600 bg-red-100',
  cost_optimization: 'text-green-600 bg-green-100',
  care_coordination: 'text-purple-600 bg-purple-100',
  educational: 'text-yellow-600 bg-yellow-100'
};

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  memberId,
  memberProfile
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [personalizationInsights, setPersonalizationInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [feedback, setFeedback] = useState<Record<string, 'helpful' | 'not_helpful'>>({});

  useEffect(() => {
    fetchRecommendations();
  }, [memberId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}/recommendations?limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: RecommendationResponse = await response.json();
      setRecommendations(data.recommendations || []);
      setPersonalizationInsights(data.personalizationInsights);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      console.error('Recommendation fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const provideFeedback = async (recommendationId: string, feedbackType: 'helpful' | 'not_helpful', rating?: number, text?: string) => {
    try {
      setFeedback(prev => ({ ...prev, [recommendationId]: feedbackType }));

      const response = await fetch(`/api/members/${memberId}/recommendations/${recommendationId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: feedbackType === 'helpful' ? 'clicked' : 'dismissed',
          feedbackRating: rating,
          feedbackText: text
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record feedback');
      }

    } catch (err) {
      console.error('Feedback submission error:', err);
    }
  };

  const refreshRecommendations = () => {
    fetchRecommendations();
    setFeedback({});
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const getFilteredRecommendations = () => {
    if (activeTab === 'all') return recommendations;
    return recommendations.filter(rec => rec.type === activeTab);
  };

  const getTopRecommendations = () => {
    return [...recommendations]
      .sort((a, b) => {
        const priorityWeight = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        const confidenceWeight = b.confidence - a.confidence;
        return priorityWeight + confidenceWeight;
      })
      .slice(0, 3);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Brain className="h-8 w-8 text-blue-600 mr-3 animate-pulse" />
            <div>
              <p className="font-medium text-gray-900">Generating personalized recommendations...</p>
              <p className="text-sm text-gray-600">Our AI is analyzing your profile and health needs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>AI-Powered Recommendations</span>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    Beta
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Personalized insights and actions tailored to your health journey
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRecommendations}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Personalization Insights */}
      {personalizationInsights && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Your Personalization Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Primary Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {personalizationInsights.primaryInterests.map((interest: string, index: number) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Engagement Level</h4>
                <Badge className={personalizationInsights.engagementLevel === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {personalizationInsights.engagementLevel === 'high' ? 'Highly Engaged' : 'Moderately Engaged'}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {personalizationInsights.recommendedFocusAreas.map((area: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Top Recommendations For You</span>
          </CardTitle>
          <CardDescription>
            Priority actions based on your current health journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getTopRecommendations().map((recommendation) => (
              <div key={recommendation.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${recommendationColors[recommendation.type]}`}>
                      {recommendationIcons[recommendation.type]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                        <Badge className={`text-xs ${getPriorityColor(recommendation.priority)}`}>
                          {recommendation.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(recommendation.confidence * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{recommendation.description}</p>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                        <p className="text-sm text-blue-800">
                          <strong>Why this matters:</strong> {recommendation.personalizedReason}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {recommendation.estimatedTimeToComplete && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{recommendation.estimatedTimeToComplete}</span>
                            </span>
                          )}
                          {recommendation.potentialBenefit && (
                            <span className="flex items-center space-x-1">
                              <Award className="h-3 w-3" />
                              <span>{recommendation.potentialBenefit}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {recommendation.actionUrl && (
                            <Button size="sm" onClick={() => window.open(recommendation.actionUrl, '_blank')}>
                              {recommendation.actionText || 'Learn More'}
                            </Button>
                          )}
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => provideFeedback(recommendation.id, 'helpful')}
                              className={`px-2 ${feedback[recommendation.id] === 'helpful' ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => provideFeedback(recommendation.id, 'not_helpful')}
                              className={`px-2 ${feedback[recommendation.id] === 'not_helpful' ? 'bg-red-100 text-red-700 border-red-200' : ''}`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {recommendation.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t">
                    <span className="text-xs text-gray-500">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {recommendation.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Recommendations with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>All Recommendations</CardTitle>
          <CardDescription>
            Browse all personalized recommendations by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="preventive_care">Preventive</TabsTrigger>
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="cost_optimization">Savings</TabsTrigger>
              <TabsTrigger value="care_coordination">Care</TabsTrigger>
              <TabsTrigger value="educational">Learn</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {getFilteredRecommendations().length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No recommendations found in this category.</p>
                  <Button variant="outline" className="mt-3" onClick={() => setActiveTab('all')}>
                    View All Recommendations
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredRecommendations().map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full ${recommendationColors[recommendation.type]} mt-1`}>
                            {recommendationIcons[recommendation.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                              <Badge className={`text-xs ${getPriorityColor(recommendation.priority)}`}>
                                {recommendation.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Confidence: {Math.round(recommendation.confidence * 100)}%</span>
                              {recommendation.validUntil && (
                                <span>Valid until {new Date(recommendation.validUntil).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {recommendation.actionUrl && (
                            <Button size="sm" variant="outline">
                              View
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => provideFeedback(recommendation.id, 'helpful')}
                              className={`px-2 ${feedback[recommendation.id] === 'helpful' ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => provideFeedback(recommendation.id, 'not_helpful')}
                              className={`px-2 ${feedback[recommendation.id] === 'not_helpful' ? 'bg-red-100 text-red-700 border-red-200' : ''}`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-5 w-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">How Our AI Works</h4>
                <p className="text-sm text-gray-600">
                  Our recommendation engine analyzes your profile, behavior, and health goals to provide personalized insights.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Flag className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
              <Button variant="outline" size="sm" onClick={refreshRecommendations}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};