import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { insertBenefitSchema } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// Extend the schema with any additional validation
const formSchema = insertBenefitSchema.extend({
  // Add any custom validations here
  limitAmount: z.coerce.number().min(0, "Limit amount must be positive"),
  waitingPeriodDays: z.coerce.number().min(0, "Waiting period must be positive").optional(),
});

type BenefitFormValues = z.infer<typeof formSchema>;

interface BenefitFormProps {
  onSuccess?: () => void;
}

export default function BenefitForm({ onSuccess }: BenefitFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up default values
  const defaultValues: Partial<BenefitFormValues> = {
    name: "",
    description: "",
    category: "medical",
    coverageDetails: "",
    limitAmount: 0,
    hasWaitingPeriod: false,
    waitingPeriodDays: 0,
    isStandard: true,
  };

  const form = useForm<BenefitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const benefitMutation = useMutation({
    mutationFn: async (data: BenefitFormValues) => {
      return apiRequest("/api/benefits", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Benefit Created",
        description: "The benefit has been successfully created.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      
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
        description: "Failed to create benefit. Please try again.",
        variant: "destructive",
      });
      console.error("Benefit creation error:", error);
    },
  });

  const onSubmit = (data: BenefitFormValues) => {
    // If hasWaitingPeriod is false, set waitingPeriodDays to undefined
    if (!data.hasWaitingPeriod) {
      data.waitingPeriodDays = undefined;
    }
    
    benefitMutation.mutate(data);
  };

  // Show/hide waiting period days based on hasWaitingPeriod
  const hasWaitingPeriod = form.watch("hasWaitingPeriod");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefit Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter benefit name" {...field} />
                </FormControl>
                <FormDescription>The name of the insurance benefit</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                    <SelectItem value="vision">Vision</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>The category this benefit belongs to</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter benefit description"
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormDescription>A detailed description of what this benefit covers</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coverageDetails"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Coverage Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter coverage details"
                    {...field}
                    rows={2}
                  />
                </FormControl>
                <FormDescription>Specific details about coverage percentages, copays, etc.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="limitAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Maximum amount covered (0 for no limit)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasWaitingPeriod"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Waiting Period</FormLabel>
                  <FormDescription>
                    Does this benefit have a waiting period?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {hasWaitingPeriod && (
            <FormField
              control={form.control}
              name="waitingPeriodDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waiting Period Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Number of days before benefit becomes active</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isStandard"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Standard Benefit</FormLabel>
                  <FormDescription>
                    Is this a standard benefit available to all companies?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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
            disabled={benefitMutation.isPending}
          >
            {benefitMutation.isPending ? "Creating..." : "Create Benefit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}