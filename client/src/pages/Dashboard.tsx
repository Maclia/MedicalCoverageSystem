import { useQuery } from "@tanstack/react-query";
import StatCards from "@/components/dashboard/StatCards";
import RecentRegistrations from "@/components/dashboard/RecentRegistrations";
import QuickActions from "@/components/dashboard/QuickActions";
import PremiumPeriodCard from "@/components/dashboard/PremiumPeriodCard";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
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
  );
}
