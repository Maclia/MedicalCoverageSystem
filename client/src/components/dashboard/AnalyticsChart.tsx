import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AnalyticsChartProps {
  title: string;
  dataEndpoint: string;
  metricKey: string;
  color?: string;
  showProjections?: boolean;
}

interface DataPoint {
  date: string;
  value: number;
  projected?: number;
}

interface TrendData {
  current: number;
  previous: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export default function AnalyticsChart({
  title,
  dataEndpoint,
  metricKey,
  color = "#3b82f6",
  showProjections = false
}: AnalyticsChartProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  // Enhanced query with time range support
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: [dataEndpoint, timeRange],
    queryFn: async () => {
      const response = await fetch(`${dataEndpoint}?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return response.json();
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  // Industry benchmarks query
  const { data: benchmarks } = useQuery({
    queryKey: ['/api/analytics/benchmarks', metricKey],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/benchmarks?metric=${metricKey}`);
      if (!response.ok) throw new Error('Failed to fetch benchmarks');
      return response.json();
    }
  });

  // Calculate trend data
  const calculateTrend = (data: DataPoint[]): TrendData => {
    if (!data || data.length < 2) {
      return {
        current: 0,
        previous: 0,
        changePercent: 0,
        trend: 'stable'
      };
    }

    const current = data[data.length - 1].value;
    const previous = data[0].value;
    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      changePercent: Math.abs(changePercent),
      trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable'
    };
  };

  const trendData = chartData ? calculateTrend(chartData) : null;

  // Chart rendering functions
  const renderLineChart = (data: DataPoint[]) => (
    <div className="relative h-64 w-full">
      <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={`grid-${i}`}
            x1="0"
            y1={i * 40}
            x2="400"
            y2={i * 40}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Data line */}
        {data.length > 1 && (
          <polyline
            points={data.map((point, i) => {
              const x = (i / (data.length - 1)) * 380 + 10;
              const y = 180 - ((point.value - Math.min(...data.map(d => d.value))) /
                           (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))))) * 160;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        )}

        {/* Data points */}
        {data.map((point, i) => {
          const x = (i / (data.length - 1)) * 380 + 10;
          const y = 180 - ((point.value - Math.min(...data.map(d => d.value))) /
                       (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))))) * 160;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              className="hover:r-6 cursor-pointer"
            />
          );
        })}

        {/* Projection line */}
        {showProjections && data[data.length - 1]?.projected && (
          <>
            <line
              x1={(data.length - 1) / (data.length - 1) * 380 + 10}
              y1={180 - ((data[data.length - 1].value - Math.min(...data.map(d => d.value))) /
                          (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))))) * 160}
              x2="390"
              y2={180 - ((data[data.length - 1].projected! - Math.min(...data.map(d => d.value))) /
                           (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))))) * 160}
              stroke={color}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.7"
            />
            <circle
              cx="390"
              cy={180 - ((data[data.length - 1].projected! - Math.min(...data.map(d => d.value)))) / (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value)))) * 160}
              r="4"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </>
        )}
      </svg>
    </div>
  );

  const renderBarChart = (data: DataPoint[]) => (
    <div className="relative h-64 w-full">
      <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        {data.map((point, i) => {
          const barWidth = 300 / data.length - 10;
          const x = (i / data.length) * 380 + 20;
          const height = ((point.value - Math.min(...data.map(d => d.value))) /
                       (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))))) * 160;
          const y = 180 - height;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              fill={color}
              className="hover:opacity-80 cursor-pointer"
            />
          );
        })}
      </svg>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Error loading analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load analytics data</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Real-time analytics with {showProjections ? 'projections' : 'historical data'}
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Trend Summary */}
        {trendData && (
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Current Value</p>
              <p className="text-lg font-semibold">{trendData.current.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className={`flex items-center text-sm ${
                trendData.trend === 'up' ? 'text-green-600' :
                trendData.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <i className="material-icons mr-1">
                  {trendData.trend === 'up' ? 'trending_up' :
                   trendData.trend === 'down' ? 'trending_down' : 'trending_flat'}
                </i>
                {trendData.trend === 'up' ? '+' :
                 trendData.trend === 'down' ? '-' : ''}
                {trendData.changePercent.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">vs previous period</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Previous</p>
              <p className="text-lg font-semibold">{trendData.previous.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData && chartData.length > 0 && (
          <>
            {chartType === 'line' && renderLineChart(chartData)}
            {chartType === 'bar' && renderBarChart(chartData)}
            {chartType === 'area' && renderLineChart(chartData)}
          </>
        )}

        {/* Industry Benchmark Comparison */}
        {benchmarks && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Industry Benchmark Comparison</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-blue-600">Your Performance</p>
                <p className="text-lg font-bold text-blue-900">
                  {trendData?.current.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Industry Average</p>
                <p className="text-lg font-bold text-blue-900">
                  {benchmarks.industryAverage.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <Badge className={
                trendData.current > benchmarks.industryAverage * 1.1 ? 'bg-green-100 text-green-800' :
                trendData.current < benchmarks.industryAverage * 0.9 ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {trendData.current > benchmarks.industryAverage * 1.1 ? 'Above Average' :
                 trendData.current < benchmarks.industryAverage * 0.9 ? 'Below Average' :
                 'On Par'}
              </Badge>
            </div>
          </div>
        )}

        {/* Projections Note */}
        {showProjections && (
          <div className="mt-4 p-3 bg-purple-50 rounded">
            <div className="flex items-center text-sm text-purple-800">
              <i className="material-icons mr-2 text-purple-600">insights</i>
              <div>
                <p className="font-medium">AI-Powered Projections</p>
                <p className="text-xs mt-1">
                  Dashed line shows predicted values based on historical trends and patterns
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}