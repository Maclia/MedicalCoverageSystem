import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Slider } from '../../../components/ui/slider';
import { Button } from '../../../components/ui/button';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  useCalculatePremiumMutation,
  PremiumCalculationInput,
  PremiumCalculationResult,
  CalculationStep,
  RateTable,
  SchemeOverride,
  getRateTables,
  getSchemeOverrides
} from '@api/premiumCalculatorApi';

import { useQuery } from '@tanstack/react-query';

// Fetch rate tables from live backend API
const useRateTables = () => {
  return useQuery({
    queryKey: ['premium-rate-tables'],
    queryFn: getRateTables,
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
};

// Fetch scheme pricing configuration from live backend API
const useSchemePricing = () => {
  return useQuery({
    queryKey: ['scheme-pricing-config'],
    queryFn: () => getSchemeOverrides('all'),
    staleTime: 30 * 60 * 1000,
  });
};

// Fallback default values when API is not available
const DEFAULT_RATE_TABLES = {
  AGE_BANDS: [
    { min: 0, max: 17, label: '0-17', factor: 0.7 },
    { min: 18, max: 25, label: '18-25', factor: 0.85 },
    { min: 26, max: 35, label: '26-35', factor: 1.0 },
    { min: 36, max: 45, label: '36-45', factor: 1.15 },
    { min: 46, max: 55, label: '46-55', factor: 1.4 },
    { min: 56, max: 65, label: '56-65', factor: 1.75 },
    { min: 66, max: 120, label: '65+', factor: 2.3 }
  ],
  REGIONS: [
    { code: 'NAIROBI', name: 'Nairobi Metro', factor: 1.0 },
    { code: 'URBAN', name: 'Major Urban Centers', factor: 0.95 },
    { code: 'UPCOUNTRY', name: 'Upcountry', factor: 0.85 },
    { code: 'COAST', name: 'Coast Region', factor: 0.9 },
    { code: 'RIFT_VALLEY', name: 'Rift Valley', factor: 0.88 }
  ],
  COVER_LIMITS: [
    { value: 500000, label: 'KES 500,000', factor: 0.55 },
    { value: 1000000, label: 'KES 1,000,000', factor: 0.75 },
    { value: 2500000, label: 'KES 2,500,000', factor: 1.0 },
    { value: 5000000, label: 'KES 5,000,000', factor: 1.35 },
    { value: 10000000, label: 'KES 10,000,000', factor: 1.8 }
  ],
  RISK_LEVELS: [
    { code: 'PREFERRED', name: 'Preferred Risk', factor: 0.85 },
    { code: 'STANDARD', name: 'Standard Risk', factor: 1.0 },
    { code: 'SUB_STANDARD', name: 'Sub-Standard', factor: 1.3 },
    { code: 'HIGH', name: 'High Risk', factor: 1.6 }
  ]
};

interface FormData {
  age: number;
  gender: 'MALE' | 'FEMALE';
  regionCode: string;
  coverLimit: number;
  riskCode: string;
  lifestyleCode: 'SMOKER' | 'NON_SMOKER';
  familySize: number;
  outpatientLimit: number;
}

interface PremiumCalculatorProps {
  onSuccess?: () => void;
}

export const PremiumCalculator: React.FC<PremiumCalculatorProps> = ({ onSuccess }) => {
  const { control, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      age: 35,
      gender: 'MALE',
      regionCode: 'URBAN',
      coverLimit: 2500000,
      riskCode: 'STANDARD',
      lifestyleCode: 'NON_SMOKER',
      familySize: 1,
      outpatientLimit: 100000
    }
  });

  const coverLimit = watch('coverLimit');
  const age = watch('age');

  const rateTables = useRateTables();
  const schemePricing = useSchemePricing();

  // Process API rate tables (group by type)
  const rateTableData = rateTables.data || [];
  
  // Extract rate tables by type with fallback defaults
  const AGE_BANDS = rateTableData.find(t => t.type === 'AGE_BAND')?.values || DEFAULT_RATE_TABLES.AGE_BANDS;
  const REGIONS = rateTableData.find(t => t.type === 'REGION')?.values || DEFAULT_RATE_TABLES.REGIONS;
  const COVER_LIMITS = rateTableData.find(t => t.type === 'COVER_LIMIT')?.values || DEFAULT_RATE_TABLES.COVER_LIMITS;
  const RISK_LEVELS = rateTableData.find(t => t.type === 'RISK_LEVEL')?.values || DEFAULT_RATE_TABLES.RISK_LEVELS;

  const calculatePremiumMutation = useCalculatePremiumMutation();

  const onSubmit = async (data: FormData) => {
    const input: PremiumCalculationInput = {
      ...data,
      coverType: 'INPATIENT'
    };
    
    calculatePremiumMutation.mutate(input, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess();
        }
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Premium Calculator</TabsTrigger>
          <TabsTrigger value="rate-tables">Rate Tables</TabsTrigger>
          <TabsTrigger value="schemes">Scheme Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Premium Calculator</CardTitle>
                <CardDescription>
                  Calculate medical insurance premium based on member profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Controller
                        name="age"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Input type="number" min="0" max="120" {...field} />
                            <div className="text-xs text-muted-foreground mt-1">
                              Band: {AGE_BANDS.find(b => age >= (b.min ?? 0) && age <= (b.max ?? 120))?.label || 'Unknown'}
                            </div>
                          </div>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Region / Hospital Network</Label>
                    <Controller
                      name="regionCode"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REGIONS.map(region => (
                              <SelectItem key={region.code} value={region.code}>
                                {'name' in region ? region.name : region.label ?? region.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Inpatient Cover Limit</Label>
                    <Controller
                      name="coverLimit"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Select
                            onValueChange={(v: string) => field.onChange(parseInt(v))}
                            defaultValue={field.value.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            {COVER_LIMITS.map(limit => (
                              <SelectItem key={limit.value ?? limit.label} value={(limit.value ?? 0).toString()}>
                                {limit.label}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                            <div className="text-xs text-muted-foreground mt-1">
                              Factor: {COVER_LIMITS.find(l => (l.value ?? 0) === coverLimit)?.factor ?? 1.0}x
                            </div>
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Medical Risk Profile</Label>
                    <Controller
                      name="riskCode"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RISK_LEVELS.map(risk => (
                            <SelectItem key={risk.code} value={risk.code}>
                              {'name' in risk ? risk.name : risk.label ?? risk.code}
                            </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lifestyle</Label>
                    <Controller
                      name="lifestyleCode"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NON_SMOKER">Non Smoker</SelectItem>
                            <SelectItem value="SMOKER">Smoker</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Family Size: {watch('familySize')}</Label>
                    <Controller
                      name="familySize"
                      control={control}
                      render={({ field }) => (
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={([val]: number[]) => field.onChange(val)}
                        />
                      )}
                    />
                  </div>

                   <Button type="submit" className="w-full" disabled={calculatePremiumMutation.isPending}>
                     {calculatePremiumMutation.isPending ? 'Calculating...' : 'Calculate Premium'}
                   </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
               <CardHeader>
                 <CardTitle>Calculation Result</CardTitle>
                 {calculatePremiumMutation.data && (
                   <CardDescription>
                     Generated {new Date(calculatePremiumMutation.data.calculationDate).toLocaleString()}
                   </CardDescription>
                 )}
               </CardHeader>
               <CardContent>
                 {!calculatePremiumMutation.data ? (
                   <div className="text-center py-12 text-muted-foreground">
                     Enter member details to calculate premium
                   </div>
                 ) : (
                   <div className="space-y-6">
                     <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                       <div className="text-4xl font-bold">
                         {formatCurrency(calculatePremiumMutation.data.finalPremium)}
                       </div>
                       <div className="text-sm text-muted-foreground mt-1">
                         Annual Premium
                       </div>
                       <Badge variant="secondary" className="mt-2">
                         Monthly: {formatCurrency(calculatePremiumMutation.data.finalPremium / 12)}
                       </Badge>
                     </div>

                     <Separator />

                     <div className="space-y-3">
                       <h4 className="font-medium">Calculation Breakdown</h4>
                       {calculatePremiumMutation.data.breakdown.map((step: CalculationStep, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1">
                          <div>
                            <div className="text-sm font-medium">{step.step.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-muted-foreground">{step.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {step.factor ? `${step.factor.toFixed(3)}x` : formatCurrency(step.value)}
                            </div>
                            <div className="text-xs font-bold">= {formatCurrency(step.result)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rate-tables">
          <Card>
            <CardHeader>
              <CardTitle>Rate Table Management</CardTitle>
              <CardDescription>
                Manage versioned rate tables, factors and pricing rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Active Rate Table v2.1.0 effective from 2026-01-01
                  </div>
                  <Button size="sm">
                    Create New Version
                  </Button>
                </div>
                
                <Tabs defaultValue="age-bands">
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="age-bands">Age Bands</TabsTrigger>
                    <TabsTrigger value="regions">Regions</TabsTrigger>
                    <TabsTrigger value="cover-limits">Cover Limits</TabsTrigger>
                    <TabsTrigger value="risk-levels">Risk Levels</TabsTrigger>
                    <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="age-bands" className="pt-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium">Age Band</th>
                            <th className="p-3 text-left font-medium">Min Age</th>
                            <th className="p-3 text-left font-medium">Max Age</th>
                            <th className="p-3 text-left font-medium">Factor</th>
                            <th className="p-3 text-left font-medium">Base Premium</th>
                            <th className="p-3 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {AGE_BANDS.map((band, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-3">{band.label}</td>
                              <td className="p-3">{band.min ?? 0}</td>
                              <td className="p-3">{band.max ?? 120}</td>
                              <td className="p-3 font-mono">{(band.factor ?? 1.0).toFixed(2)}x</td>
                              <td className="p-3">{formatCurrency(2500 * (band.factor ?? 1.0))}</td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="regions" className="pt-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium">Region Code</th>
                            <th className="p-3 text-left font-medium">Region Name</th>
                            <th className="p-3 text-left font-medium">Factor</th>
                            <th className="p-3 text-left font-medium">Status</th>
                            <th className="p-3 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {REGIONS.map((region, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-3 font-mono">{region.code}</td>
                              <td className="p-3">{'name' in region ? region.name : region.label ?? region.code}</td>
                              <td className="p-3 font-mono">{(region.factor ?? 1.0).toFixed(2)}x</td>
                              <td className="p-3"><Badge variant="secondary">Active</Badge></td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="cover-limits" className="pt-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium">Cover Limit</th>
                            <th className="p-3 text-left font-medium">Value</th>
                            <th className="p-3 text-left font-medium">Factor</th>
                            <th className="p-3 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {COVER_LIMITS.map((limit, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-3">{limit.label}</td>
                              <td className="p-3 font-mono">{(limit.value ?? 0).toLocaleString()}</td>
                              <td className="p-3 font-mono">{(limit.factor ?? 1.0).toFixed(2)}x</td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="risk-levels" className="pt-4">
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium">Risk Code</th>
                            <th className="p-3 text-left font-medium">Risk Level</th>
                            <th className="p-3 text-left font-medium">Factor</th>
                            <th className="p-3 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {RISK_LEVELS.map((risk, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-3 font-mono">{risk.code}</td>
                              <td className="p-3">{'name' in risk ? risk.name : risk.label ?? risk.code}</td>
                              <td className="p-3 font-mono">{(risk.factor ?? 1.0).toFixed(2)}x</td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm">Edit</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="pt-4">
                  <h4 className="font-medium mb-3">Rate Table History</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Version 2.1.0</div>
                        <div className="text-sm text-muted-foreground">Effective 2026-01-01 • Current Active</div>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Version 2.0.0</div>
                        <div className="text-sm text-muted-foreground">Effective 2025-07-01 • Superseded</div>
                      </div>
                      <Badge variant="secondary">Archived</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemes">
          <Card>
            <CardHeader>
              <CardTitle>Scheme Pricing Configuration</CardTitle>
              <CardDescription>
                Corporate scheme specific pricing, discounts and overrides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                  Configure custom pricing rules for corporate schemes
                  </div>
                  <Button size="sm">
                    Add Scheme Override
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base">Standard Corporate Scheme</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Discount</span>
                          <span className="font-medium">15% Standard</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Minimum Members</span>
                          <span className="font-medium">10+</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge>Active</Badge>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button variant="secondary" size="sm" className="w-full">Edit Rules</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base">Government Parastatal Scheme</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Discount</span>
                          <span className="font-medium">22% Negotiated</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Contract Expiry</span>
                          <span className="font-medium">31 Dec 2026</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge>Active</Badge>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button variant="secondary" size="sm" className="w-full">View Details</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base">NGO & Non-Profit Scheme</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Discount</span>
                          <span className="font-medium">30% Special Rate</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Eligibility</span>
                          <span className="font-medium">Registered NGOs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant="secondary">Draft</Badge>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button variant="secondary" size="sm" className="w-full">Configure</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base">SME Business Scheme</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Discount</span>
                          <span className="font-medium">8% Tiered</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Band</span>
                          <span className="font-medium">5-50 Employees</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge>Active</Badge>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Button variant="secondary" size="sm" className="w-full">Edit Rules</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Override Priority Rules</h4>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-medium">Rule Name</th>
                          <th className="p-3 text-left font-medium">Type</th>
                          <th className="p-3 text-left font-medium">Value</th>
                          <th className="p-3 text-left font-medium">Priority</th>
                          <th className="p-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3">Large Group Discount</td>
                          <td className="p-3"><Badge variant="secondary">Percentage</Badge></td>
                          <td className="p-3 font-medium">-15%</td>
                          <td className="p-3">1</td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">No Claims Bonus</td>
                          <td className="p-3"><Badge variant="secondary">Percentage</Badge></td>
                          <td className="p-3 font-medium">-10%</td>
                          <td className="p-3">2</td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Wellness Program Incentive</td>
                          <td className="p-3"><Badge variant="secondary">Fixed</Badge></td>
                          <td className="p-3 font-medium">-KES 500</td>
                          <td className="p-3">3</td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PremiumCalculator;
