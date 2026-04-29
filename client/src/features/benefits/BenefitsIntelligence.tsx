import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { useBenefits, useCompanyBenefits } from '@api/benefitsApi';
import {
  Brain,
  TrendingUp,
  Lightbulb,
  Shield,
  Activity,
  DollarSign,
  Target,
  CheckCircle,
  Info,
  BarChart3,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface BenefitsIntelligenceProps {
  memberId: string;
  memberName?: string;
}

type MemberSummary = {
  id: number;
  firstName?: string;
  lastName?: string;
  companyId?: number;
};

type Insight = {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  potentialSavings?: number;
  recommendations: string[];
};

export const BenefitsIntelligence: React.FC<BenefitsIntelligenceProps> = ({ memberId, memberName }) => {
  const [activeTab, setActiveTab] = useState('insights');

  const { data: member } = useQuery({
    queryKey: ['/api/core/members', memberId],
    queryFn: async () => {
      const response = await fetch(`/api/core/members/${memberId}`, { credentials: 'include' });
      const payload = await response.json();
      return payload?.data as MemberSummary;
    },
    enabled: Boolean(memberId),
  });

  const { data: benefits = [], isLoading: loadingBenefits, refetch: refetchBenefits } = useBenefits();
  const { data: companyBenefits = [], isLoading: loadingCompanyBenefits, refetch: refetchCompanyBenefits } = useCompanyBenefits(
    member?.companyId ? String(member.companyId) : undefined
  );

  const loading = loadingBenefits || loadingCompanyBenefits;
  const resolvedMemberName = memberName || [member?.firstName, member?.lastName].filter(Boolean).join(' ') || `Member #${memberId}`;

  const activeCompanyBenefits = useMemo(
    () => companyBenefits.filter((benefit) => benefit.isActive),
    [companyBenefits]
  );

  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = [];

    if (activeCompanyBenefits.length === 0) {
      items.push({
        id: 'no-benefits',
        title: 'No active company benefits found',
        description: 'This member’s company does not yet have active persisted benefit selections. Add company benefits to enable coverage intelligence.',
        priority: 'high',
        category: 'setup',
        recommendations: [
          'Create company benefit mappings for the member’s company',
          'Confirm the company has an active premium period',
        ],
      });
    }

    const uncappedBenefits = activeCompanyBenefits.filter((benefit) => !benefit.limitAmount || benefit.limitAmount <= 0);
    if (uncappedBenefits.length > 0) {
      items.push({
        id: 'uncapped',
        title: 'Review uncapped benefit limits',
        description: `${uncappedBenefits.length} active benefits have no company-specific limit. That may be correct, but it is worth validating against underwriting intent.`,
        priority: 'medium',
        category: 'financial',
        recommendations: [
          'Confirm whether unlimited coverage is intentional',
          'Add a company-level limit where required',
        ],
      });
    }

    const reducedCoverage = activeCompanyBenefits.filter((benefit) => (benefit.coverageRate ?? 100) < 100);
    if (reducedCoverage.length > 0) {
      items.push({
        id: 'reduced-coverage',
        title: 'Reduced coverage benefits detected',
        description: `${reducedCoverage.length} company benefits cover less than 100% and may need clearer member communication.`,
        priority: 'medium',
        category: 'coverage',
        recommendations: [
          'Review copay and coinsurance communications',
          'Highlight member out-of-pocket expectations',
        ],
      });
    }

    const preventiveBenefits = benefits.filter((benefit) =>
      ['wellness', 'preventive', 'medical'].includes(benefit.category)
    );
    if (preventiveBenefits.length > 0) {
      items.push({
        id: 'preventive',
        title: 'Preventive benefit inventory available',
        description: `${preventiveBenefits.length} persisted standard benefits could support preventive and early-intervention care strategies.`,
        priority: 'low',
        category: 'preventive',
        recommendations: [
          'Map preventive benefits into member onboarding',
          'Promote high-value preventive coverage first',
        ],
      });
    }

    return items;
  }, [activeCompanyBenefits, benefits]);

  const categoryBreakdown = useMemo(() => {
    const counts = activeCompanyBenefits.reduce<Record<string, number>>((acc, item) => {
      const key = item.benefitCategory || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeCompanyBenefits]);

  const totalLimit = activeCompanyBenefits.reduce((sum, benefit) => sum + Number(benefit.limitAmount || 0), 0);
  const averageCoverage = activeCompanyBenefits.length
    ? Math.round(activeCompanyBenefits.reduce((sum, benefit) => sum + Number(benefit.coverageRate ?? 100), 0) / activeCompanyBenefits.length)
    : 0;

  const refreshAll = async () => {
    await Promise.all([refetchBenefits(), refetchCompanyBenefits()]);
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-800';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-24 rounded-lg bg-gray-100" />
        <div className="animate-pulse h-64 rounded-lg bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span>Benefits Intelligence</span>
          </h1>
          <p className="text-gray-600">
            Service-backed benefit intelligence for {resolvedMemberName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Company Benefits</p>
                <p className="text-2xl font-bold">{activeCompanyBenefits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Configured Limit Value</p>
                <p className="text-2xl font-bold">${totalLimit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Average Coverage</p>
                <p className="text-2xl font-bold">{averageCoverage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Generated Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Mix</TabsTrigger>
          <TabsTrigger value="catalog">Benefit Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{insight.title}</CardTitle>
                    <CardDescription>{insight.description}</CardDescription>
                  </div>
                  <Badge className={getPriorityColor(insight.priority)}>{insight.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {insight.potentialSavings && (
                  <div className="text-sm text-green-700 font-medium">
                    Potential savings: ${insight.potentialSavings.toLocaleString()}
                  </div>
                )}
                {insight.recommendations.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Category Distribution
              </CardTitle>
              <CardDescription>Breakdown of persisted company-selected benefits by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryBreakdown.length > 0 ? categoryBreakdown.map((item) => {
                const percentage = Math.round((item.count / activeCompanyBenefits.length) * 100);
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{item.category}</span>
                      <span>{item.count} benefits</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              }) : (
                <div className="text-sm text-gray-500">No active company benefits to analyze yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Standard Benefits
                </CardTitle>
                <CardDescription>Persisted benefit definitions from the insurance service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {benefits.slice(0, 8).map((benefit) => (
                  <div key={benefit.id} className="rounded-lg border p-3">
                    <div className="font-medium">{benefit.name}</div>
                    <div className="text-sm text-gray-600 capitalize">{benefit.category}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Company Selections
                </CardTitle>
                <CardDescription>Persisted company-specific selections for this member’s employer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeCompanyBenefits.slice(0, 8).map((benefit) => (
                  <div key={benefit.id} className="rounded-lg border p-3">
                    <div className="font-medium">{benefit.benefitName || `Benefit #${benefit.benefitId}`}</div>
                    <div className="text-sm text-gray-600 capitalize">{benefit.benefitCategory || 'other'}</div>
                    <div className="text-xs text-gray-500">
                      Coverage: {benefit.coverageRate ?? 100}% | Limit: {benefit.limitAmount ? `$${benefit.limitAmount}` : 'No limit'}
                    </div>
                  </div>
                ))}
                {activeCompanyBenefits.length === 0 && (
                  <div className="text-sm text-gray-500">No company benefit selections found.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BenefitsIntelligence;
