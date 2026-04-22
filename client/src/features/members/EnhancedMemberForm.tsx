import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Upload, User, MapPin, FileText, Users, Info } from "lucide-react";

// Enhanced validation schema for comprehensive member enrollment
const enhancedMemberSchema = z.object({
  // Company and Member Type
  companyId: z.number().min(1, "Company is required"),
  memberType: z.enum(["principal", "dependent"], {
    required_error: "Please select member type",
  }),
  principalId: z.number().optional(),
  dependentType: z.enum(["spouse", "child", "parent"]).optional(),

  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must be less than 50 characters"),
  dateOfBirth: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      return age >= 0 && actualAge <= 120; // Basic validation
    },
    { message: "Please enter a valid date of birth" }
  ),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select gender",
  }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),

  // Contact Information
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(/^254[7]\d{8}$/, "Please enter a valid Kenyan phone number (e.g., 254712345678)"),
  alternativePhone: z.string().regex(/^254[7]\d{8}$/).optional().or(z.literal("")),

  // Address Information
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
  city: z.string().min(2, "City is required").optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Kenya"),

  // Identification
  nationalId: z.string().regex(/^\d{8}$/, "National ID must be exactly 8 digits").optional().or(z.literal("")),
  passportNumber: z.string().min(6, "Passport number must be at least 6 characters").optional().or(z.literal("")),

  // Employment Information (for corporate members)
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  gradeId: z.number().optional(),

  // Disability Information
  hasDisability: z.boolean().default(false),
  disabilityDetails: z.string().optional(),

  // Beneficiary Information
  beneficiaryName: z.string().optional(),
  beneficiaryRelationship: z.string().optional(),
  beneficiaryContact: z.string().optional(),

  // Enrollment Options
  autoActivate: z.boolean().default(false),
  sendWelcomeEmail: z.boolean().default(true),
  sendWelcomeSMS: z.boolean().default(true),

  // Terms and Consent
  consentDataProcessing: z.boolean().default(false),
  consentMarketing: z.boolean().default(false),
  consentPrivacy: z.boolean().default(false),
}).refine((data) => {
  // Conditional validations
  if (data.memberType === "dependent") {
    if (!data.principalId) {
      return false;
    }
    if (!data.dependentType) {
      return false;
    }
  }

  if (data.hasDisability && !data.disabilityDetails) {
    return false;
  }

  // At least one identification method
  if (!data.nationalId && !data.passportNumber) {
    return false;
  }

  // Required consents
  if (!data.consentDataProcessing || !data.consentPrivacy) {
    return false;
  }

  return true;
}, {
  message: "Please complete all required fields and accept necessary consents",
});

type EnhancedMemberFormValues = z.infer<typeof enhancedMemberSchema>;

interface EnhancedMemberFormProps {
  onSuccess?: () => void;
  companyId?: number;
  defaultMemberType?: "principal" | "dependent";
}

export default function EnhancedMemberForm({ onSuccess, companyId, defaultMemberType }: EnhancedMemberFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");
  const [showConsentErrors, setShowConsentErrors] = useState(false);

  // Fetch companies for dropdown
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['/api/companies'],
  });

  // Fetch principal members if adding dependent
  const { data: principalMembers } = useQuery({
    queryKey: ['/api/members/principal'],
    enabled: false, // Only fetch when needed
  });

  // Fetch employee grades if company is selected
  const { data: employeeGrades } = useQuery({
    queryKey: ['/api/companies', companyId, 'grades'],
    enabled: !!companyId,
  });

  const form = useForm<EnhancedMemberFormValues>({
    resolver: zodResolver(enhancedMemberSchema),
    defaultValues: {
      companyId: companyId || 0,
      memberType: defaultMemberType || "principal",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: undefined,
      maritalStatus: undefined,
      email: "",
      phone: "",
      alternativePhone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Kenya",
      nationalId: "",
      passportNumber: "",
      employeeId: "",
      department: "",
      jobTitle: "",
      gradeId: undefined,
      hasDisability: false,
      disabilityDetails: "",
      beneficiaryName: "",
      beneficiaryRelationship: "",
      beneficiaryContact: "",
      autoActivate: false,
      sendWelcomeEmail: true,
      sendWelcomeSMS: true,
      consentDataProcessing: false,
      consentMarketing: false,
      consentPrivacy: false,
    },
  });

  // Watch member type for conditional fields
  const memberType = form.watch("memberType");
  const hasDisability = form.watch("hasDisability");
  const selectedCompanyId = form.watch("companyId");

  const mutation = useMutation({
    mutationFn: async (data: EnhancedMemberFormValues) => {
      // Remove UI-only fields before sending to API
      const { autoActivate, sendWelcomeEmail, sendWelcomeSMS, consentMarketing, ...apiData } = data;

      const response = await apiRequest("POST", "/api/members/enroll", {
        ...apiData,
        autoActivate,
        sendWelcomeNotifications: sendWelcomeEmail || sendWelcomeSMS,
      });
      return response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Member ${response.data?.firstName} ${response.data?.lastName} has been successfully enrolled${response.autoActivate ? ' and activated' : ''}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members/principal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll member. Please check all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnhancedMemberFormValues) => {
    // Check required consents
    if (!data.consentDataProcessing || !data.consentPrivacy) {
      setShowConsentErrors(true);
      setActiveTab("consent");
      return;
    }

    mutation.mutate(data);
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  };

  const watchedDateOfBirth = form.watch("dateOfBirth");
  const age = calculateAge(watchedDateOfBirth);

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enhanced Member Enrollment
          </CardTitle>
          <CardDescription>
            Complete member enrollment with comprehensive information collection and validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="personal" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="employment" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Employment
                  </TabsTrigger>
                  <TabsTrigger value="beneficiary" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Beneficiary
                  </TabsTrigger>
                  <TabsTrigger value="consent" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Consent
                  </TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company *</FormLabel>
                          <Select
                            disabled={isLoadingCompanies || !!companyId}
                            onValueChange={(value) => {
                              field.onChange(Number(value));
                              form.setValue("gradeId", undefined); // Reset grade when company changes
                            }}
                            value={field.value.toString()}
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
                      name="memberType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select member type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="principal">Principal Member</SelectItem>
                              <SelectItem value="dependent">Dependent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {memberType === "dependent" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="principalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Principal Member *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select principal member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {principalMembers?.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {member.firstName} {member.lastName} ({member.employeeId})
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
                            <FormLabel>Relationship *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="parent">Parent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} />
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
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                          {age !== null && (
                            <FormDescription>Age: {age} years</FormDescription>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
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
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select marital status" />
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National ID Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter 8-digit national ID" {...field} />
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            Format: 8 digits (e.g., 12345678)
                          </FormDescription>
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
                            <Input placeholder="Enter passport number" {...field} />
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            Required for non-citizens
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

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
                          <FormLabel>Member has disability</FormLabel>
                          <FormDescription>
                            Check if the member has any disability that may require special accommodations
                          </FormDescription>
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
                          <FormLabel>Disability Details *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please describe the disability and any special requirements"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* Contact Information Tab */}
                <TabsContent value="contact" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
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
                          <FormLabel>Primary Phone *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="254712345678" {...field} />
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            Kenyan format (e.g., 254712345678)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="alternativePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="254712345679" {...field} />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Optional alternate contact number
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter physical address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
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
                            <Input placeholder="Enter postal code" {...field} />
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
                          <FormControl>
                            <Input placeholder="Enter country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Employment Information Tab */}
                <TabsContent value="employment" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter employee ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter department" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedCompanyId && employeeGrades && (
                    <FormField
                      control={form.control}
                      name="gradeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Grade</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employeeGrades.map((grade) => (
                                <SelectItem key={grade.id} value={grade.id.toString()}>
                                  {grade.gradeCode} - {grade.gradeName} (Level {grade.level})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <FormDescription>
                            Grade determines benefit package and premium calculations
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* Beneficiary Information Tab */}
                <TabsContent value="beneficiary" className="space-y-4 mt-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Beneficiary information is used in case of member death to ensure smooth claims processing and benefit transfer.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="beneficiaryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beneficiary Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter beneficiary name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="beneficiaryRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Member</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Spouse, Child, Parent" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="beneficiaryContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beneficiary Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter beneficiary phone or email" {...field} />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Phone number or email address for contacting the beneficiary
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Consent Tab */}
                <TabsContent value="consent" className="space-y-4 mt-6">
                  {showConsentErrors && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Please accept the required consents (Data Processing and Privacy Policy) to continue.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="consentDataProcessing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-base font-medium">
                              Data Processing Consent *
                            </FormLabel>
                            <FormDescription className="text-sm">
                              I consent to the collection, processing, and storage of my personal data for healthcare insurance purposes in accordance with applicable data protection laws.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consentPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-base font-medium">
                              Privacy Policy Agreement *
                            </FormLabel>
                            <FormDescription className="text-sm">
                              I have read and agree to the privacy policy governing the use and protection of my personal and health information.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consentMarketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-base font-medium">
                              Marketing Communications (Optional)
                            </FormLabel>
                            <FormDescription className="text-sm">
                              I consent to receiving marketing communications about additional products, services, and wellness programs that may be relevant to me.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Enrollment Options</h4>

                    <FormField
                      control={form.control}
                      name="autoActivate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Auto-activate Membership</FormLabel>
                            <FormDescription>
                              Automatically activate the membership upon successful enrollment (requires admin approval)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sendWelcomeEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Send Welcome Email</FormLabel>
                            <FormDescription>
                              Send welcome email with membership details and next steps
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sendWelcomeSMS"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Send Welcome SMS</FormLabel>
                            <FormDescription>
                              Send welcome SMS with membership confirmation
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSuccess}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const tabs = ["personal", "contact", "employment", "beneficiary", "consent"];
                      const currentIndex = tabs.indexOf(activeTab);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                      setActiveTab(tabs[prevIndex]);
                    }}
                    disabled={activeTab === "personal"}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const tabs = ["personal", "contact", "employment", "beneficiary", "consent"];
                      const currentIndex = tabs.indexOf(activeTab);
                      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : currentIndex;
                      setActiveTab(tabs[nextIndex]);
                    }}
                    disabled={activeTab === "consent"}
                  >
                    Next
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  size="lg"
                >
                  {mutation.isPending ? "Enrolling..." : "Complete Enrollment"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}