import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertDependentMemberSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
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
import { Textarea } from "@/components/ui/textarea";

// Extend schema with validation rules
const formSchema = insertDependentMemberSchema.extend({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.string(),
  hasDisability: z.boolean().optional(),
  disabilityDetails: z.string().optional(),
});

type DependentFormValues = z.infer<typeof formSchema>;

interface DependentFormProps {
  onSuccess?: () => void;
}

export default function DependentForm({ onSuccess }: DependentFormProps) {
  const { toast } = useToast();
  
  const { data: principals } = useQuery({
    queryKey: ['/api/members/principal'],
  });
  
  const form = useForm<DependentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: 0,
      principalId: 0,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      memberType: "dependent",
      dependentType: "spouse",
      hasDisability: false,
      disabilityDetails: "",
    },
  });
  
  const dependentType = form.watch("dependentType");
  const hasDisability = form.watch("hasDisability");
  const dateOfBirth = form.watch("dateOfBirth");
  
  // Show/hide validation message based on date of birth and dependent type
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = differenceInYears(today, birthDate);
      
      if (dependentType === "spouse" && age < 18) {
        form.setError("dateOfBirth", {
          type: "manual",
          message: "Spouse must be at least 18 years old",
        });
      } else if (dependentType === "child" && age > 18 && !hasDisability) {
        form.setError("dateOfBirth", {
          type: "manual",
          message: "Child must be 18 years or younger unless they have a disability",
        });
      } else {
        form.clearErrors("dateOfBirth");
      }
    }
  }, [dateOfBirth, dependentType, hasDisability, form]);
  
  const mutation = useMutation({
    mutationFn: async (data: DependentFormValues) => {
      const response = await apiRequest("POST", "/api/members/dependent", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependent has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dependent",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: DependentFormValues) => {
    // Convert IDs from string to number
    const formattedData = {
      ...data,
      principalId: Number(data.principalId),
      companyId: data.companyId, // This will be set by the backend based on principal's companyId
    };
    
    // Include disability details only if hasDisability is true
    if (data.dependentType === "child" && data.hasDisability && data.disabilityDetails) {
      formattedData.disabilityDetails = data.disabilityDetails;
    } else {
      formattedData.disabilityDetails = undefined;
    }
    
    mutation.mutate(formattedData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="principalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Principal Member</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(Number(value))} 
                value={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select principal member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {principals?.map((principal) => (
                    <SelectItem key={principal.id} value={principal.id.toString()}>
                      {principal.firstName} {principal.lastName}
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
          name="dependentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dependent Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                {dependentType === "spouse" 
                  ? "Spouse must be 18 years or older" 
                  : "Child must be between 1 day and 18 years old (unless has disability)"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {dependentType === "child" && (
          <>
            <FormField
              control={form.control}
              name="hasDisability"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Has disability (special needs)</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            {hasDisability && (
              <FormField
                control={form.control}
                name="disabilityDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disability Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter disability details" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
        
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
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Dependent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
