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
  CalculationStep
} from '@/services/api/premiumCalculatorApi';

const AGE_BANDS = [
  { label: '0-17', min: 0, max: 17, base: 18000 },
  { label: '18-25', min: 18, max: 25, base: 28000 },
  { label: '26-35', min: 26, max: 35, base: 42000 },
  { label: '36-45', min: 36, max: 45, base: 58000 },
  { label: '46-55', min: 46, max: 55, base: 78000 },
  { label: '56-65', min: 56, max: 65, base: 110000 },
  { label: '66-75', min: 66, max: 75, base: 165000 },
  { label: '75+', min: 76, max: 120, base: 240000 }
];

const REGIONS = [
  { code: 'NAIROBI_TOP', name: 'Nairobi Top Tier Hospitals', factor: 1.30 },
  { code: 'NAIROBI_STANDARD', name: 'Nairobi Standard Network', factor: 1.10 },
  { code: 'URBAN', name: 'Urban (Mombasa, Kisumu, Nakuru)', factor: 1.00 },
  { code: 'RURAL', name: 'Rural Network', factor: 0.85 }
];

const COVER_LIMITS = [
  { value: 500000, label: 'KES 500,000', factor: 0.75 },
  { value: 1000000, label: 'KES 1,000,000', factor: 1.00 },
  { value: 2500000, label: 'KES 2,500,000', factor: 1.45 },
  { value: 5000000, label: 'KES 5,000,000', factor: 1.95 },
  { value: 10000000, label: 'KES 10,000,000', factor: 2.60 }
];

const RISK_LEVELS = [
  { code: 'STANDARD', name: 'No pre-existing conditions', factor: 1.00 },
  { code: 'CONTROLLED_CHRONIC', name: 'Controlled chronic condition', factor: 1.15 },
  { code: 'MULTIPLE_CHRONIC', name: 'Multiple chronic conditions', factor: 1.35 },
  { code: 'HIGH_RISK', name: 'High risk profile', factor: 1.60 }
];

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

export const PremiumCalculator: React.FC = () => {
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

  const calculatePremiumMutation = useCalculatePremiumMutation();

  const onSubmit = async (data: FormData) => {
    const input: PremiumCalculationInput = {
      ...data,
      coverType: 'INPATIENT'
    };
    
    calculatePremiumMutation.mutate(input);
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
                              Band: {AGE_BANDS.find(b => age >= b.min && age <= b.max)?.label || 'Unknown'}
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
                                {region.name}
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
                                <SelectItem key={limit.value} value={limit.value.toString()}>
                                  {limit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground mt-1">
                            Factor: {COVER_LIMITS.find(l => l.value === coverLimit)?.factor}x
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
                                {risk.name}
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
              <div className="text-center py-8 text-muted-foreground">
                Rate table management interface coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemes">
          <Card>
            <CardHeader>
              <CardTitle>Scheme Pricing</CardTitle>
              <CardDescription>
                Corporate scheme specific pricing and overrides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Scheme pricing configuration interface coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PremiumCalculator;