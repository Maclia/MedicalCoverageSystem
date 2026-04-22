import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatCards from "@/features/dashboard/StatCards";
import RecentRegistrations from "@/features/dashboard/RecentRegistrations";
import QuickActions from "@/features/dashboard/QuickActions";
import PremiumPeriodCard from "@/features/dashboard/PremiumPeriodCard";
import AdvancedAnalytics from "@/features/dashboard/AdvancedAnalytics";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<'overview' | 'analytics'>('overview');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const toggleView = () => {
    setViewMode(prev => prev === 'overview' ? 'analytics' : 'overview');
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Dashboard</CardTitle>
              <p className="text-sm text-gray-600">
                {viewMode === 'overview'
                  ? 'Basic overview with company statistics'
                  : 'Advanced analytics with real-time KPI tracking and AI insights'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium mr-2">
                {viewMode === 'overview' ? 'Overview' : 'Analytics'}
              </span>
              <Switch
                checked={viewMode === 'analytics'}
                onCheckedChange={toggleView}
              />
              <Button
                variant={viewMode === 'analytics' ? 'default' : 'outline'}
                size="sm"
                onClick={toggleView}
              >
                {viewMode === 'analytics' ? '📊 View Analytics' : '📊 Go Advanced'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Based on View Mode */}
      {viewMode === 'overview' ? (
        <div className="space-y-8">
          {/* Overview Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
            <StatCards />
          </div>

          {/* Recent Registrations & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentRegistrations />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <QuickActions />
              <PremiumPeriodCard />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Advanced Analytics Dashboard */}
          <AdvancedAnalytics />
        </div>
      )}
    </div>
  );
}
