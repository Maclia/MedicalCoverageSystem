import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertPeriodSchema, insertPremiumRateSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend schema with validation rules
const periodFormSchema = insertPeriodSchema.extend({
  name: z.string().min(2, "Period name must be at least 2 characters"),
  startDate: z.string().refine(val => val !== "", {
    message: "Start date is required"
  }),
  endDate: z.string().refine(val => val !== "", {
    message: "End date is required"
  }),
});

// Add rate fields to the form schema
const formSchema = periodFormSchema.extend({
  principalRate: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)), 
    z.number().min(0, "Rate must be a positive number")
  ),
  spouseRate: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)), 
    z.number().min(0, "Rate must be a positive number")
  ),
  childRate: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)), 
    z.number().min(0, "Rate must be a positive number")
  ),
  specialNeedsRate: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)), 
    z.number().min(0, "Rate must be a positive number")
  ),
  taxRate: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)), 
    z.number().min(0, "Tax rate must be a positive number").max(1, "Tax rate must be between 0 and 1")
  ),
});

type PeriodFormValues = z.infer<typeof formSchema>;

interface PeriodFormProps {
  onSuccess?: () => void;
}

export default function PeriodForm({ onSuccess }: PeriodFormProps) {
  const { toast } = useToast();
  
  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      status: "upcoming",
      principalRate: 350,
      spouseRate: 275,
      childRate: 175,
      specialNeedsRate: 225,
      taxRate: 0.1,
    },
  });
  
  const createPeriodMutation = useMutation({
    mutationFn: async (data: PeriodFormValues) => {
      // First create the period
      const periodData = {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      };
      
      const periodResponse = await apiRequest("POST", "/api/periods", periodData);
      const period = await periodResponse.json();
      
      // Then create the premium rates for this period
      const rateData = {
        periodId: period.id,
        principalRate: data.principalRate,
        spouseRate: data.spouseRate,
        childRate: data.childRate,
        specialNeedsRate: data.specialNeedsRate,
        taxRate: data.taxRate,
      };
      
      const rateResponse = await apiRequest("POST", "/api/premium-rates", rateData);
      return rateResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Period and rates have been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/premium-rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create period",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: PeriodFormValues) => {
    createPeriodMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Q1 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="border-t border-gray-200 mt-6 pt-6">
          <h3 className="text-md font-medium mb-4">Premium Rates</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="principalRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal Rate</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="spouseRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spouse Rate</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="childRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child Rate</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specialNeedsRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Needs Rate</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="taxRate"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Tax Rate (0-1)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="1" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createPeriodMutation.isPending}
          >
            {createPeriodMutation.isPending ? "Saving..." : "Save Period"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
