import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { wellnessApi } from '@/services/wellnessApi';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const WellnessIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runApiTests = async () => {
    setIsTesting(true);
    const results = [];

    // Test API Connection
    try {
      const connectionTest = await wellnessApi.testConnection();
      results.push({
        test: 'API Connection',
        status: connectionTest.success ? 'success' : 'error',
        message: connectionTest.message,
        details: connectionTest
      });
    } catch (error) {
      results.push({
        test: 'API Connection',
        status: 'error',
        message: `Connection failed: ${error}`,
        details: error
      });
    }

    // Test Get Integrations
    try {
      const integrations = await wellnessApi.getIntegrations();
      results.push({
        test: 'Get Integrations',
        status: 'success',
        message: `Found ${integrations.length} integrations`,
        details: { count: integrations.length, data: integrations }
      });
    } catch (error) {
      results.push({
        test: 'Get Integrations',
        status: 'error',
        message: `Failed to fetch integrations: ${error}`,
        details: error
      });
    }

    // Test Get Health Data
    try {
      const healthData = await wellnessApi.getHealthData({ limit: 10 });
      results.push({
        test: 'Get Health Data',
        status: 'success',
        message: `Found ${healthData.total} health data points`,
        details: { count: healthData.total, data: healthData.data }
      });
    } catch (error) {
      results.push({
        test: 'Get Health Data',
        status: 'error',
        message: `Failed to fetch health data: ${error}`,
        details: error
      });
    }

    // Test Get Health Metrics
    try {
      const metrics = await wellnessApi.getHealthMetrics('30d');
      results.push({
        test: 'Get Health Metrics',
        status: 'success',
        message: 'Health metrics retrieved successfully',
        details: metrics
      });
    } catch (error) {
      results.push({
        test: 'Get Health Metrics',
        status: 'error',
        message: `Failed to fetch health metrics: ${error}`,
        details: error
      });
    }

    // Test Get Incentives
    try {
      const incentives = await wellnessApi.getIncentives();
      results.push({
        test: 'Get Wellness Incentives',
        status: 'success',
        message: `Found ${incentives.length} incentives`,
        details: { count: incentives.length, data: incentives }
      });
    } catch (error) {
      results.push({
        test: 'Get Wellness Incentives',
        status: 'error',
        message: `Failed to fetch incentives: ${error}`,
        details: error
      });
    }

    // Test Get Coaches
    try {
      const coaches = await wellnessApi.getCoaches();
      results.push({
        test: 'Get Wellness Coaches',
        status: 'success',
        message: `Found ${coaches.total} coaches`,
        details: { count: coaches.total, data: coaches.coaches }
      });
    } catch (error) {
      results.push({
        test: 'Get Wellness Coaches',
        status: 'error',
        message: `Failed to fetch coaches: ${error}`,
        details: error
      });
    }

    // Test Get Wellness Stats
    try {
      const stats = await wellnessApi.getWellnessStats('30d');
      results.push({
        test: 'Get Wellness Stats',
        status: 'success',
        message: 'Wellness stats retrieved successfully',
        details: stats
      });
    } catch (error) {
      results.push({
        test: 'Get Wellness Stats',
        status: 'error',
        message: `Failed to fetch wellness stats: ${error}`,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wellness API Integration Test</CardTitle>
              <CardDescription>
                Test all wellness API endpoints to verify backend integration
              </CardDescription>
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.test}</h4>
                    {getStatusBadge(result.status)}
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
              Click "Run Tests" to test the wellness API integration
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};