import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { insertCompanyBenefitSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// Extend the schema with any additional validation
const formSchema = insertCompanyBenefitSchema.extend({
  // Add any custom validations here
  companyId: z.coerce.number(),
  benefitId: z.coerce.number(),
  premiumId: z.coerce.number()
});

type CompanyBenefitFormValues = z.infer<typeof formSchema>;

interface CompanyBenefitFormProps {
  onSuccess?: () => void;
}

export default function CompanyBenefitForm({ onSuccess }: CompanyBenefitFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies, benefits, and premiums for the select inputs
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["/api/companies"],
  });

  const { data: benefits, isLoading: isLoadingBenefits } = useQuery({
    queryKey: ["/api/benefits"],
  });

  const { data: premiums, isLoading: isLoadingPremiums } = useQuery({
    queryKey: ["/api/premiums"],
  });

  // Set up default values
  const defaultValues: Partial<CompanyBenefitFormValues> = {
    companyId: 0,
    benefitId: 0,
    premiumId: 0,
    isActive: true,
    additionalCoverage: false,
    additionalCoverageDetails: ""
  };

  const form = useForm<CompanyBenefitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const companyBenefitMutation = useMutation({
    mutationFn: async (data: CompanyBenefitFormValues) => {
      return apiRequest("/api/company-benefits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Company Benefit Created",
        description: "The company benefit has been successfully created.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/company-benefits"] });
      
      // Call the success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset the form
      form.reset(defaultValues);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create company benefit. Please try again.",
        variant: "destructive",
      });
      console.error("Company benefit creation error:", error);
    },
  });

  const onSubmit = (data: CompanyBenefitFormValues) => {
    // If additionalCoverage is false, clear additionalCoverageDetails
    if (!data.additionalCoverage) {
      data.additionalCoverageDetails = "";
    }
    
    companyBenefitMutation.mutate(data);
  };

  // Watch for additionalCoverage to decide whether to show additionalCoverageDetails
  const additionalCoverage = form.watch("additionalCoverage");

  // Get the selected company and premium to show more information
  const selectedCompanyId = form.watch("companyId");
  const selectedCompany = companies?.find(c => c.id === Number(selectedCompanyId));
  
  const selectedPremiumId = form.watch("premiumId");
  const selectedPremium = premiums?.find(p => p.id === Number(selectedPremiumId));

  const isLoading = isLoadingCompanies || isLoadingBenefits || isLoadingPremiums;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies?.map(company => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The company this benefit will be assigned to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCompany && (
              <div className="flex flex-col justify-center p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">Selected Company:</p>
                <p className="text-lg font-semibold">{selectedCompany.name}</p>
                {selectedCompany.industry && (
                  <p className="text-xs text-muted-foreground">
                    Industry: {selectedCompany.industry}
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="benefitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a benefit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {benefits?.map(benefit => (
                        <SelectItem key={benefit.id} value={benefit.id.toString()}>
                          {benefit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The benefit to add to the company</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="premiumId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Premium</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a premium" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {premiums?.map(premium => (
                        <SelectItem key={premium.id} value={premium.id.toString()}>
                          {`Premium #${premium.id} - $${premium.total.toFixed(2)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>The premium this benefit is associated with</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPremium && (
              <div className="flex flex-col justify-center p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">Selected Premium:</p>
                <p className="text-lg font-semibold">${selectedPremium.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Premium ID: {selectedPremium.id}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="additionalCoverage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Additional Coverage</FormLabel>
                    <FormDescription>
                      Does this company have additional coverage beyond the standard benefit?
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {additionalCoverage && (
              <FormField
                control={form.control}
                name="additionalCoverageDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Coverage Details</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter details about additional coverage"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Details about any additional coverage beyond the standard benefit</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onSuccess) onSuccess();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={companyBenefitMutation.isPending || isLoading}
          >
            {companyBenefitMutation.isPending ? "Creating..." : "Add Company Benefit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}