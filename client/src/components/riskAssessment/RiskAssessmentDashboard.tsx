import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  RiskAssessment,
  RiskRecommendation,
  RiskAlert,
  RiskActionItem,
  RiskFactor,
  RiskPrediction
} from '../../../../shared/types/riskAssessment';
import { riskApi } from '@/services/riskApi';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Target,
  Calendar,
  User,
  Heart,
  Brain,
  BarChart3,
  Settings,
  Bell,
  FileText,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Download,
  Eye,
  Plus,
  Filter
} from 'lucide-react';

interface RiskAssessmentDashboardProps {
  memberId: string;
  memberName?: string;
}

export const RiskAssessmentDashboard: React.FC<RiskAssessmentDashboardProps> = ({
  memberId,
  memberName
}) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RiskRecommendation | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadRiskDashboard();
  }, [memberId]);

  const loadRiskDashboard = async () => {
    setLoading(true);
    try {
      const dashboardData = await riskApi.getRiskDashboard(memberId);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error loading risk dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'high': return <AlertCircle className="h-5 w-5" />;
      case 'moderate': return <Info className="h-5 w-5" />;
      case 'low': return <CheckCircle className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'chronic disease': return <Heart className="h-5 w-5" />;
      case 'mental health': return <Brain className="h-5 w-5" />;
      case 'lifestyle': return <Activity className="h-5 w-5" />;
      case 'preventive': return <Shield className="h-5 w-5" />;
      case 'environmental': return <Info className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const handleRecommendationUpdate = async (recommendationId: string, status: string) => {
    try {
      await riskApi.updateRecommendationStatus(recommendationId, status);
      await loadRiskDashboard(); // Refresh data
      setShowRecommendationDialog(false);
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await riskApi.acknowledgeRiskAlert(alertId);
      await loadRiskDashboard(); // Refresh data
      setShowAlertDialog(false);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const report = await riskApi.generateRiskReport(memberId, {
        format: 'pdf',
        period: '12m',
        includeHistory: true
      });
      // In a real implementation, this would trigger a download
      alert('Risk assessment report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
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
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Risk Data Available</AlertTitle>
        <AlertDescription>
          Risk assessment data is not available for this member. Please ensure the member has completed their initial assessment.
        </AlertDescription>
      </Alert>
    );
  }

  const { currentAssessment, historicalData, alerts, recommendations, predictions } = dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Assessment Dashboard</h1>
          <p className="text-gray-600">
            {memberName ? `for ${memberName}` : 'Member'} • Last updated: {new Date(currentAssessment.lastUpdated).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => loadRiskDashboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleGenerateReport}>
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts && alerts.filter(a => a.severity === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Risk Alert</AlertTitle>
          <AlertDescription className="text-red-700">
            {alerts.filter(a => a.severity === 'critical').length} critical risk factor(s) detected requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Risk Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{currentAssessment.overallRiskScore}</p>
                <Badge className={getRiskLevelColor(currentAssessment.riskLevel)}>
                  {getRiskLevelIcon(currentAssessment.riskLevel)}
                  <span className="ml-1 capitalize">{currentAssessment.riskLevel}</span>
                </Badge>
              </div>
              <div className="text-right">
                {getTrendIcon(currentAssessment.trendAnalysis.overallTrend)}
                <p className="text-sm text-gray-500 capitalize">{currentAssessment.trendAnalysis.overallTrend}</p>
              </div>
            </div>
            <Progress
              value={currentAssessment.overallRiskScore}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Compliance Level */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Compliance Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{Math.round(currentAssessment.complianceLevel)}%</p>
                <p className="text-sm text-gray-500">Recommendation completion</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress
              value={currentAssessment.complianceLevel}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Active Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {recommendations?.filter(r => r.status === 'pending').length || 0}
                </p>
                <p className="text-sm text-gray-500">Pending action</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Next Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Next Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">
                  {new Date(currentAssessment.nextAssessmentDue).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">Due date</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Risk Trend</span>
                </CardTitle>
                <CardDescription>
                  Risk score progression over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Trend visualization would be displayed here</p>
                    <p className="text-sm text-gray-400">
                      {currentAssessment.trendAnalysis.overallTrend} trend, {currentAssessment.trendAnalysis.trendRate.toFixed(1)} points/month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Top Risk Factors</span>
                </CardTitle>
                <CardDescription>
                  Highest contributing risk factors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentAssessment.topRiskFactors?.slice(0, 5).map((factor: RiskFactor, index: number) => (
                    <div key={factor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{factor.name}</p>
                          <p className="text-sm text-gray-500">{factor.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getRiskLevelColor(factor.riskLevel)}>
                          {factor.riskLevel}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">{factor.impact}% impact</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Insights */}
          {dashboard.insights && dashboard.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Key Insights</span>
                </CardTitle>
                <CardDescription>
                  Important observations and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboard.insights.slice(0, 4).map((insight: any) => (
                    <div key={insight.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded">
                      {insight.impact === 'positive' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(currentAssessment.categoryScores).map((category: any) => (
              <Card key={category.category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category.category)}
                      <CardTitle className="text-lg">{category.category}</CardTitle>
                    </div>
                    <Badge className={getRiskLevelColor(category.level)}>
                      {getRiskLevelIcon(category.level)}
                      <span className="ml-1 capitalize">{category.level}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Score Display */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Score</span>
                        <span>{Math.round(category.score)}/100</span>
                      </div>
                      <Progress value={category.score} className="h-2" />
                    </div>

                    {/* Weight Display */}
                    <div className="flex justify-between text-sm">
                      <span>Weight in Overall Score</span>
                      <span>{Math.round(category.weight * 100)}%</span>
                    </div>

                    {/* Trend */}
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(category.trend)}
                      <span className="text-sm capitalize">{category.trend}</span>
                      <span className="text-sm text-gray-500">
                        Last evaluated: {new Date(category.lastEvaluated).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Risk Factors Count */}
                    <div className="flex justify-between text-sm">
                      <span>Risk Factors</span>
                      <span>{category.factors?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recommendations</h2>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations?.map((recommendation: RiskRecommendation) => (
              <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      <CardDescription>{recommendation.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={
                        recommendation.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        recommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {recommendation.priority}
                      </Badge>
                      <Badge className={
                        recommendation.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                        recommendation.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        recommendation.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {recommendation.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Impact and Effort */}
                    <div className="flex justify-between text-sm">
                      <span>Expected Impact: {recommendation.impact}%</span>
                      <span>Required Effort: {recommendation.effort}%</span>
                    </div>

                    {/* Timeframe */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Timeframe: {recommendation.timeframe}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {recommendation.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRecommendation(recommendation);
                              setShowRecommendationDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecommendationUpdate(recommendation.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        </>
                      )}
                      {recommendation.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleRecommendationUpdate(recommendation.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Risk Alerts</h2>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>

          <div className="space-y-4">
            {alerts?.map((alert: RiskAlert) => (
              <Card key={alert.id} className={
                alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200'
              }>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {alert.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                        {alert.severity === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                        {alert.severity === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge className={
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {alert.severity}
                        </Badge>
                        {alert.actionRequired && (
                          <Badge variant="outline">Action Required</Badge>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()} • {alert.category}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowAlertDialog(true);
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.acknowledged && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Risk Predictions</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Predictions
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {predictions?.map((prediction: RiskPrediction) => (
              <Card key={prediction.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{prediction.targetOutcome}</CardTitle>
                  <CardDescription>
                    {prediction.predictionType.replace('_', ' ').toUpperCase()} • Valid until {new Date(prediction.validUntil).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Probability */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Probability</span>
                        <span>{Math.round(prediction.probability)}%</span>
                      </div>
                      <Progress value={prediction.probability} className="h-2" />
                    </div>

                    {/* Confidence */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span>{Math.round(prediction.confidence)}%</span>
                      </div>
                      <Progress value={prediction.confidence} className="h-2" />
                    </div>

                    {/* Timeframe */}
                    <div className="flex justify-between text-sm">
                      <span>Timeframe</span>
                      <span>{prediction.timeframe}</span>
                    </div>

                    {/* Model Info */}
                    <div className="text-xs text-gray-500">
                      Model: {prediction.model} v{prediction.version}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="factors" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Risk Factors Analysis</h2>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Factor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentAssessment.topRiskFactors?.map((factor: RiskFactor) => (
              <Card key={factor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{factor.name}</CardTitle>
                    <Badge className={getRiskLevelColor(factor.riskLevel)}>
                      {factor.riskLevel}
                    </Badge>
                  </div>
                  <CardDescription>{factor.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Current Value */}
                    <div className="flex justify-between">
                      <span className="text-sm">Current Value:</span>
                      <span className="font-medium">
                        {typeof factor.value === 'number' ? factor.value.toFixed(1) : factor.value} {factor.unit}
                      </span>
                    </div>

                    {/* Normal Range */}
                    {factor.normalRange && (
                      <div className="flex justify-between">
                        <span className="text-sm">Normal Range:</span>
                        <span className="text-sm">
                          {factor.normalRange.min} - {factor.normalRange.max} {factor.unit}
                        </span>
                      </div>
                    )}

                    {/* Impact */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Impact</span>
                        <span>{factor.impact}%</span>
                      </div>
                      <Progress value={factor.impact} className="h-2" />
                    </div>

                    {/* Trend */}
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(factor.trend)}
                      <span className="text-sm capitalize">{factor.trend}</span>
                    </div>

                    {/* Data Points */}
                    <div className="text-xs text-gray-500">
                      {factor.dataPoints.length} data points • Last updated: {new Date(factor.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recommendation Details Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Recommendation Details</DialogTitle>
            <DialogDescription>
              Review the recommendation and take action
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedRecommendation.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedRecommendation.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge>{selectedRecommendation.priority}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <Badge variant="outline">{selectedRecommendation.type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Impact</p>
                  <p className="text-sm">{selectedRecommendation.impact}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Effort</p>
                  <p className="text-sm">{selectedRecommendation.effort}%</p>
                </div>
              </div>

              {selectedRecommendation.specificActions && selectedRecommendation.specificActions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Specific Actions:</p>
                  <ul className="text-sm space-y-1">
                    {selectedRecommendation.specificActions.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <ArrowRight className="h-3 w-3 mr-2 mt-1 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Timeframe:</p>
                <p className="text-sm">{selectedRecommendation.timeframe}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendationDialog(false)}>
              Close
            </Button>
            {selectedRecommendation?.status === 'pending' && (
              <Button
                onClick={() => handleRecommendationUpdate(selectedRecommendation.id, 'in_progress')}
              >
                Get Started
              </Button>
            )}
            {selectedRecommendation?.status === 'in_progress' && (
              <Button
                onClick={() => handleRecommendationUpdate(selectedRecommendation.id, 'completed')}
              >
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Details Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Risk Alert Details</DialogTitle>
            <DialogDescription>
              Review and acknowledge this risk alert
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {selectedAlert.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                {selectedAlert.severity === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                {selectedAlert.severity === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                <Badge className={
                  selectedAlert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  selectedAlert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }>
                  {selectedAlert.severity}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium">{selectedAlert.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Category</p>
                  <p>{selectedAlert.category}</p>
                </div>
                <div>
                  <p className="font-medium">Created</p>
                  <p>{new Date(selectedAlert.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedAlert.actionItems && selectedAlert.actionItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Required Actions:</p>
                  <ul className="text-sm space-y-1">
                    {selectedAlert.actionItems.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <ArrowRight className="h-3 w-3 mr-2 mt-1 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertDialog(false)}>
              Cancel
            </Button>
            {selectedAlert && (
              <Button onClick={() => handleAlertAcknowledge(selectedAlert.id)}>
                Acknowledge Alert
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};