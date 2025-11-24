import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { riskApi } from '@/services/riskApi';
import { CheckCircle, AlertCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export const RiskAssessmentTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testMemberId] = useState('test-member-123');

  const runApiTests = async () => {
    setIsTesting(true);
    const results = [];

    // Test API Connection
    try {
      const connectionTest = await riskApi.testConnection();
      results.push({
        test: 'Risk API Connection',
        status: connectionTest.success ? 'success' : 'error',
        message: connectionTest.message,
        details: connectionTest
      });
    } catch (error) {
      results.push({
        test: 'Risk API Connection',
        status: 'error',
        message: `Connection failed: ${error}`,
        details: error
      });
    }

    // Test Get Current Risk Assessment
    try {
      const assessment = await riskApi.getCurrentRiskAssessment(testMemberId);
      results.push({
        test: 'Get Current Risk Assessment',
        status: 'success',
        message: `Risk score: ${assessment.overallRiskScore} (${assessment.riskLevel})`,
        details: {
          score: assessment.overallRiskScore,
          level: assessment.riskLevel,
          categories: Object.keys(assessment.categoryScores)
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Current Risk Assessment',
        status: 'error',
        message: `Failed to fetch risk assessment: ${error}`,
        details: error
      });
    }

    // Test Create Risk Assessment
    try {
      const newAssessment = await riskApi.createRiskAssessment(testMemberId, {
        assessedBy: 'system',
        forceCalculate: true
      });
      results.push({
        test: 'Create Risk Assessment',
        status: 'success',
        message: `Created assessment with score: ${newAssessment.overallRiskScore}`,
        details: {
          id: newAssessment.id,
          score: newAssessment.overallRiskScore,
          riskLevel: newAssessment.riskLevel
        }
      });
    } catch (error) {
      results.push({
        test: 'Create Risk Assessment',
        status: 'error',
        message: `Failed to create risk assessment: ${error}`,
        details: error
      });
    }

    // Test Get Risk Recommendations
    try {
      const recommendations = await riskApi.getRiskRecommendations(testMemberId);
      results.push({
        test: 'Get Risk Recommendations',
        status: 'success',
        message: `Found ${recommendations.length} recommendations`,
        details: {
          count: recommendations.length,
          pending: recommendations.filter(r => r.status === 'pending').length,
          priorities: recommendations.reduce((acc, r) => {
            acc[r.priority] = (acc[r.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Recommendations',
        status: 'error',
        message: `Failed to fetch recommendations: ${error}`,
        details: error
      });
    }

    // Test Get Risk Alerts
    try {
      const alerts = await riskApi.getRiskAlerts(testMemberId);
      results.push({
        test: 'Get Risk Alerts',
        status: 'success',
        message: `Found ${alerts.length} alerts`,
        details: {
          count: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          unread: alerts.filter(a => !a.read).length,
          acknowledged: alerts.filter(a => a.acknowledged).length
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Alerts',
        status: 'error',
        message: `Failed to fetch alerts: ${error}`,
        details: error
      });
    }

    // Test Get Risk Factors
    try {
      const factors = await riskApi.getRiskFactors(testMemberId);
      results.push({
        test: 'Get Risk Factors',
        status: 'success',
        message: `Found ${factors.length} risk factors`,
        details: {
          count: factors.length,
          critical: factors.filter(f => f.riskLevel === 'critical').length,
          categories: [...new Set(factors.map(f => f.category))]
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Factors',
        status: 'error',
        message: `Failed to fetch risk factors: ${error}`,
        details: error
      });
    }

    // Test Get Risk Predictions
    try {
      const predictions = await riskApi.getPredictions(testMemberId);
      results.push({
        test: 'Get Risk Predictions',
        status: 'success',
        message: `Found ${predictions.length} predictions`,
        details: {
          count: predictions.length,
          types: [...new Set(predictions.map(p => p.predictionType))],
          avgProbability: predictions.length > 0
            ? predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length
            : 0
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Predictions',
        status: 'error',
        message: `Failed to fetch predictions: ${error}`,
        details: error
      });
    }

    // Test Get Risk Benchmarks
    try {
      const benchmarks = await riskApi.getBenchmarks();
      results.push({
        test: 'Get Risk Benchmarks',
        status: 'success',
        message: `Found ${benchmarks.length} benchmarks`,
        details: {
          count: benchmarks.length,
          categories: [...new Set(benchmarks.map(b => b.category))],
          populations: [...new Set(benchmarks.map(b => b.population))]
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Benchmarks',
        status: 'error',
        message: `Failed to fetch benchmarks: ${error}`,
        details: error
      });
    }

    // Test Get Risk Action Items
    try {
      const actionItems = await riskApi.getRiskActionItems(testMemberId);
      results.push({
        test: 'Get Risk Action Items',
        status: 'success',
        message: `Found ${actionItems.length} action items`,
        details: {
          count: actionItems.length,
          pending: actionItems.filter(item => item.status === 'pending').length,
          overdue: actionItems.filter(item => item.status === 'overdue').length,
          types: [...new Set(actionItems.map(item => item.type))]
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Action Items',
        status: 'error',
        message: `Failed to fetch action items: ${error}`,
        details: error
      });
    }

    // Test Get Risk Dashboard
    try {
      const dashboard = await riskApi.getRiskDashboard(testMemberId);
      results.push({
        test: 'Get Risk Dashboard',
        status: 'success',
        message: 'Risk dashboard retrieved successfully',
        details: {
          hasAssessment: !!dashboard.currentAssessment,
          recommendationsCount: dashboard.recommendations?.length || 0,
          alertsCount: dashboard.alerts?.length || 0,
          insightsCount: dashboard.insights?.length || 0
        }
      });
    } catch (error) {
      results.push({
        test: 'Get Risk Dashboard',
        status: 'error',
        message: `Failed to fetch risk dashboard: ${error}`,
        details: error
      });
    }

    // Test Calculate Risk Scores
    try {
      const scores = await riskApi.calculateRiskScores(testMemberId);
      results.push({
        test: 'Calculate Risk Scores',
        status: 'success',
        message: `Calculated risk score: ${scores.overallScore}`,
        details: {
          overallScore: scores.overallScore,
          riskLevel: scores.riskLevel,
          categories: Object.keys(scores.categoryScores),
          calculatedAt: scores.calculatedAt
        }
      });
    } catch (error) {
      results.push({
        test: 'Calculate Risk Scores',
        status: 'error',
        message: `Failed to calculate risk scores: ${error}`,
        details: error
      });
    }

    // Test Generate Risk Report
    try {
      const report = await riskApi.generateRiskReport(testMemberId, {
        format: 'pdf',
        period: '12m',
        includeHistory: true
      });
      results.push({
        test: 'Generate Risk Report',
        status: 'success',
        message: 'Risk report generated successfully',
        details: {
          reportId: report.id,
          format: report.format,
          period: report.period,
          hasSummary: !!report.summary
        }
      });
    } catch (error) {
      results.push({
        test: 'Generate Risk Report',
        status: 'error',
        message: `Failed to generate risk report: ${error}`,
        details: error
      });
    }

    // Test Add Risk Factor
    try {
      const newFactor = await riskApi.addRiskFactor({
        memberId: testMemberId,
        name: 'Test Blood Pressure',
        category: 'chronicDisease',
        value: 125,
        unit: 'mmHg',
        normalRange: { min: 90, max: 120 },
        source: 'manual',
        confidence: 85
      });
      results.push({
        test: 'Add Risk Factor',
        status: 'success',
        message: `Added risk factor: ${newFactor.name}`,
        details: {
          id: newFactor.id,
          name: newFactor.name,
          value: newFactor.value,
          riskLevel: newFactor.riskLevel
        }
      });
    } catch (error) {
      results.push({
        test: 'Add Risk Factor',
        status: 'error',
        message: `Failed to add risk factor: ${error}`,
        details: error
      });
    }

    setTestResults(results);
    setIsTesting(false);
  };

  useEffect(() => {
    runApiTests();
  }, []);

  const getStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge className="bg-green-100 text-green-800">Success</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Error</Badge>
    );
  };

  const getTrendIcon = (details: any) => {
    if (details.score && details.previousScore) {
      return details.score > details.previousScore ? (
        <TrendingUp className="h-4 w-4 text-red-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-green-500" />
      );
    }
    return null;
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const totalCount = testResults.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Risk Assessment API Integration Test</CardTitle>
              <CardDescription>
                Test all risk assessment API endpoints to verify backend integration
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{successCount}</span> / {totalCount} tests passing
              </div>
              <Button
                onClick={runApiTests}
                disabled={isTesting}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testing...' : 'Run Tests'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.test}</h4>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(result.details)}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>

                  {/* Show some details for successful tests */}
                  {result.status === 'success' && result.details && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <details>
                        <summary className="cursor-pointer font-medium">Details</summary>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {testResults.length === 0 && !isTesting && (
            <div className="text-center py-8 text-gray-500">
              Click "Run Tests" to test the risk assessment API integration
            </div>
          )}

          {/* Test Summary */}
          {testResults.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3">Test Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Tests</p>
                  <p className="font-semibold">{totalCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Passed</p>
                  <p className="font-semibold text-green-600">{successCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Failed</p>
                  <p className="font-semibold text-red-600">{totalCount - successCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Success Rate</p>
                  <p className="font-semibold">{Math.round((successCount / totalCount) * 100)}%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};