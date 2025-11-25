import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/utils/format";

export default function StatCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: complianceData } = useQuery({
    queryKey: ['/api/compliance/quick-stats'],
    enabled: false // Will be enabled when backend endpoint is ready
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-lg shadow-sm p-5 animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-6 w-16 bg-gray-300 rounded"></div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            </div>
            <div className="mt-4 h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total Companies"
        value={data?.totalCompanies || 0}
        icon="business"
        iconBgColor="bg-blue-100"
        iconTextColor="text-blue-600"
        changeValue="8% from last period"
        changeDirection="up"
      />
      <StatCard
        title="Active Members"
        value={data?.activeMembers || 0}
        icon="people"
        iconBgColor="bg-orange-100"
        iconTextColor="text-orange-600"
        changeValue="12% from last period"
        changeDirection="up"
      />
      <StatCard
        title="Consent Coverage"
        value={`${data?.consentCoverage || 0}%`}
        icon="verified_user"
        iconBgColor="bg-green-100"
        iconTextColor="text-green-600"
        changeValue="3% from last period"
        changeDirection="up"
      />
      <StatCard
        title="Documents Processed"
        value={data?.documentsProcessed || 0}
        icon="description"
        iconBgColor="bg-purple-100"
        iconTextColor="text-purple-600"
        changeValue="22% from last period"
        changeDirection="up"
      />
      <StatCard
        title="Active Premiums"
        value={formatCurrency(data?.activePremiums || 0)}
        icon="payments"
        iconBgColor="bg-emerald-100"
        iconTextColor="text-emerald-600"
        changeValue="15% from last period"
        changeDirection="up"
      />
    </div>
  );
}
