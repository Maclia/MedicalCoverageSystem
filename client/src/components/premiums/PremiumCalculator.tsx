import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/utils/format";

// Define form schema
const formSchema = z.object({
  companyId: z.number().positive("Please select a company"),
  periodId: z.number().positive("Please select a period"),
});

type PremiumCalculatorValues = z.infer<typeof formSchema>;

interface PremiumCalculatorProps {
  onSuccess?: () => void;
}

type CalculationResult = {
  companyId: number;
  periodId: number;
  principalCount: number;
  spouseCount: number;
  childCount: number;
  specialNeedsCount: number;
  subtotal: number;
  tax: number;
  total: number;
  rates: {
    principalRate: number;
    spouseRate: number;
    childRate: number;
    specialNeedsRate: number;
    taxRate: number;
  };
};

export default function PremiumCalculator({ onSuccess }: PremiumCalculatorProps) {
  const { toast } = useToast();
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  
  const { data: companies } = useQuery({
    queryKey: ['/api/companies'],
  });
  
  const { data: periods } = useQuery({
    queryKey: ['/api/periods'],
  });
  
  const form = useForm<PremiumCalculatorValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: 0,
      periodId: 0,
    },
  });
  
  const calculateMutation = useMutation({
    mutationFn: async (data: PremiumCalculatorValues) => {
      const response = await apiRequest("POST", "/api/premiums/calculate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCalculationResult(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate premium",
        variant: "destructive",
      });
    },
  });
  
  const saveMutation = useMutation({
    mutationFn: async (data: CalculationResult) => {
      const response = await apiRequest("POST", "/api/premiums", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Premium has been successfully saved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/premiums'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setCalculationResult(null);
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save premium",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: PremiumCalculatorValues) => {
    calculateMutation.mutate(data);
  };
  
  const saveCalculation = () => {
    if (calculationResult) {
      saveMutation.mutate(calculationResult);
    }
  };
  
  const totalMembers = calculationResult 
    ? calculationResult.principalCount + calculationResult.spouseCount + calculationResult.childCount + calculationResult.specialNeedsCount
    : 0;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(Number(value))} 
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="periodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Premium Period</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(Number(value))} 
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {periods?.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!calculationResult && (
          <div className="flex justify-end mt-4">
            <Button 
              type="submit" 
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? "Calculating..." : "Calculate"}
            </Button>
          </div>
        )}
      </form>
      
      {calculationResult && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-3">Premium Calculation Results</h4>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Principal Members</span>
              <span className="text-sm font-medium text-gray-700">{calculationResult.principalCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Spouse Dependents</span>
              <span className="text-sm font-medium text-gray-700">{calculationResult.spouseCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Child Dependents</span>
              <span className="text-sm font-medium text-gray-700">{calculationResult.childCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Special Needs Children</span>
              <span className="text-sm font-medium text-gray-700">{calculationResult.specialNeedsCount}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Total Members</span>
              <span className="text-sm font-medium text-gray-700">{totalMembers}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Principal Rate</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.rates.principalRate)} each</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Spouse Rate</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.rates.spouseRate)} each</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Child Rate</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.rates.childRate)} each</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Special Needs Rate</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.rates.specialNeedsRate)} each</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Period Subtotal</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Tax ({calculationResult.rates.taxRate * 100}%)</span>
              <span className="text-sm font-medium text-gray-700">{formatCurrency(calculationResult.tax)}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
              <span className="text-sm font-bold text-primary">Total Premium</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(calculationResult.total)}</span>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSuccess}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveCalculation}
              disabled={saveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending ? "Saving..." : "Save Calculation"}
            </Button>
          </div>
        </div>
      )}
    </Form>
  );
}
