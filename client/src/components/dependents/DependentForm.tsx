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

// Enhanced schema with validation rules for the new dependent fields
const formSchema = insertDependentMemberSchema.extend({
  firstName: z.string().min(2, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Please enter a valid phone number").max(20, "Phone number must be less than 20 characters").optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  hasDisability: z.boolean().default(false),
  disabilityDetails: z.string().max(500, "Disability details must be less than 500 characters").optional().or(z.literal("")),
  // Enhanced fields for dependents
  gender: z.enum(["male", "female", "other"]).optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  nationalId: z.string().regex(/^[0-9]{8}$/, "Kenyan National ID must be 8 digits").optional().or(z.literal("")),
  passportNumber: z.string().min(6, "Passport number must be at least 6 characters").optional().or(z.literal("")),
  address: z.string().max(200, "Address must be less than 200 characters").optional().or(z.literal("")),
  city: z.string().max(100, "City must be less than 100 characters").optional().or(z.literal("")),
  postalCode: z.string().max(20, "Postal code must be less than 20 characters").optional().or(z.literal("")),
  country: z.string().default("Kenya"),
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
      // Enhanced fields with defaults
      gender: undefined,
      maritalStatus: undefined,
      nationalId: "",
      passportNumber: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Kenya",
    },
  });
  
  const dependentType = form.watch("dependentType");
  const hasDisability = form.watch("hasDisability");
  const dateOfBirth = form.watch("dateOfBirth");
  
  // Enhanced validation logic based on dependent type and age limits
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = differenceInYears(today, birthDate);

      // Dependent age validation rules
      const ageLimits = {
        spouse: { min: 18, max: 120 },
        child: { min: 0, max: 18 },
        parent: { min: 18, max: 120 },
        guardian: { min: 18, max: 120 }
      };

      const limits = ageLimits[dependentType as keyof typeof ageLimits];

      if (dependentType === "spouse" && age < limits.min) {
        form.setError("dateOfBirth", {
          type: "manual",
          message: `Spouse must be at least ${limits.min} years old`,
        });
      } else if (dependentType === "child" && age > limits.max && !hasDisability) {
        form.setError("dateOfBirth", {
          type: "manual",
          message: `Child must be ${limits.max} years or younger unless they have a disability`,
        });
      } else if (age < limits.min || age > limits.max) {
        form.setError("dateOfBirth", {
          type: "manual",
          message: `Age for ${dependentType} must be between ${limits.min} and ${limits.max} years`,
        });
      } else {
        form.clearErrors("dateOfBirth");
      }
    }
  }, [dateOfBirth, dependentType, hasDisability, form]);
  
  const mutation = useMutation({
    mutationFn: async (data: DependentFormValues) => {
      // Use the enhanced member enrollment endpoint for dependents
      const response = await apiRequest("POST", "/api/members/enroll", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dependent has been successfully enrolled with enhanced information",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members/dependent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll dependent",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dependent Relationship Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Dependent Information</h3>

          <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

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

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marital Status (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
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
                      : dependentType === "child"
                      ? "Child must be between 0-18 years (unless has disability)"
                      : dependentType === "parent" || dependentType === "guardian"
                      ? "Must be 18 years or older"
                      : "Please enter valid date of birth"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Information (Optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address Information Section (Optional) */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Address Information (Optional)</h3>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Physical Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Physical address" {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Postal code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Kenya">Kenya</SelectItem>
                      <SelectItem value="Uganda">Uganda</SelectItem>
                      <SelectItem value="Tanzania">Tanzania</SelectItem>
                      <SelectItem value="Rwanda">Rwanda</SelectItem>
                      <SelectItem value="Burundi">Burundi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Identification Information Section (Optional) */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Identification Information (Optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nationalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID Number</FormLabel>
                  <FormControl>
                    <Input placeholder="8-digit National ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passportNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passport Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Passport number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Disability Information */}
        {(dependentType === "child" || dependentType === "parent") && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Disability Information</h3>

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
                        placeholder="Please describe the disability and any special accommodations needed"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
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
            {mutation.isPending ? "Enrolling..." : "Enroll Dependent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
