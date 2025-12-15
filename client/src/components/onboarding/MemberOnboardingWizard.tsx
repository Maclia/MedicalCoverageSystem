import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  icon: string;
}

interface MemberFormData {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  companyId: number;

  // Enhanced Personal Information
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;

  // Dependent Information
  memberType: 'principal' | 'dependent';
  principalId?: number;
  dependentType?: 'spouse' | 'child' | 'parent' | 'guardian';
  hasDisability: boolean;
  disabilityDetails?: string;

  // Risk Assessment
  riskScore?: number;
  riskFactors: string[];

  // Wellness Integration
  wellnessInterests: string[];
  fitnessLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

  // Benefits Preferences
  preferredCoverage: string[];
  coverageLevel: 'basic' | 'standard' | 'premium';

  // Document Upload
  documents: File[];

  // Enhanced Consent Management
  acceptedTerms: boolean;
  consentToMarketing: boolean;
  dataSharingConsent: boolean;
  consentToProviders: boolean;
  consentToPartners: boolean;
  consentToWellnessPrograms: boolean;
}

export default function MemberOnboardingWizard({ companyId }: { companyId?: number }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    employeeId: '',
    companyId: companyId || 0,
    // Enhanced fields with defaults
    gender: undefined,
    maritalStatus: undefined,
    nationalId: '',
    passportNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Kenya',
    memberType: 'principal',
    hasDisability: false,
    riskFactors: [],
    wellnessInterests: [],
    fitnessLevel: 'moderate',
    preferredCoverage: [],
    coverageLevel: 'standard',
    documents: [],
    acceptedTerms: false,
    consentToMarketing: false,
    dataSharingConsent: false,
    consentToProviders: false,
    consentToPartners: false,
    consentToWellnessPrograms: false
  });

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Personal and employment details',
      required: true,
      completed: false,
      icon: 'person'
    },
    {
      id: 'dependents',
      title: 'Family Members',
      description: 'Add spouse and dependent information',
      required: false,
      completed: false,
      icon: 'family_restroom'
    },
    {
      id: 'health-assessment',
      title: 'Health Assessment',
      description: 'Medical history and risk factors',
      required: true,
      completed: false,
      icon: 'health_and_safety'
    },
    {
      id: 'wellness-profile',
      title: 'Wellness Profile',
      description: 'Fitness goals and health interests',
      required: false,
      completed: false,
      icon: 'favorite'
    },
    {
      id: 'benefits-selection',
      title: 'Coverage Preferences',
      description: 'Choose insurance coverage options',
      required: true,
      completed: false,
      icon: 'shield'
    },
    {
      id: 'document-upload',
      title: 'Document Upload',
      description: 'Upload required documents',
      required: true,
      completed: false,
      icon: 'upload_file'
    },
    {
      id: 'review-consent',
      title: 'Review & Consent',
      description: 'Review information and provide consent',
      required: true,
      completed: false,
      icon: 'fact_check'
    }
  ]);

  // Risk assessment query
  const { data: riskFactors } = useQuery({
    queryKey: ['/api/risk-factors'],
    queryFn: async () => {
      const response = await fetch('/api/risk-factors');
      if (!response.ok) throw new Error('Failed to fetch risk factors');
      return response.json();
    }
  });

  // Wellness programs query
  const { data: wellnessPrograms } = useQuery({
    queryKey: ['/api/wellness-programs'],
    queryFn: async () => {
      const response = await fetch('/api/wellness-programs');
      if (!response.ok) throw new Error('Failed to fetch wellness programs');
      return response.json();
    }
  });

  // Benefits query
  const { data: availableBenefits } = useQuery({
    queryKey: ['/api/benefits/available', companyId],
    queryFn: async () => {
      const url = companyId ? `/api/benefits/available?companyId=${companyId}` : '/api/benefits/available';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch benefits');
      return response.json();
    }
  });

  // Create member mutation using enhanced enrollment endpoint
  const createMemberMutation = useMutation({
    mutationFn: async (memberData: MemberFormData) => {
      // Transform the data to match the enhanced schema format
      const transformedData = {
        ...memberData,
        // Map consent fields to proper consent format
        consents: [
          { consentType: 'data_processing', consentGiven: memberData.dataSharingConsent },
          { consentType: 'marketing_communications', consentGiven: memberData.consentToMarketing },
          { consentType: 'data_sharing_providers', consentGiven: memberData.consentToProviders },
          { consentType: 'data_sharing_partners', consentGiven: memberData.consentToPartners },
          { consentType: 'wellness_programs', consentGiven: memberData.consentToWellnessPrograms }
        ]
      };

      const response = await fetch('/api/members/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      localStorage.removeItem('onboarding-progress'); // Clear saved progress
      toast({
        title: "Success",
        description: "Member has been successfully enrolled with enhanced information.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enroll member",
        variant: "destructive",
      });
    }
  });

  // Calculate progress
  const calculateProgress = () => {
    const completedSteps = onboardingSteps.filter(step => step.completed).length;
    return Math.round((completedSteps / onboardingSteps.length) * 100);
  };

  // Calculate risk score
  const calculateRiskScore = () => {
    if (!formData.riskFactors || formData.riskFactors.length === 0) return 0;

    // Simple risk calculation (would be more sophisticated in production)
    const highRiskFactors = ['smoking', 'obesity', 'chronic_condition'];
    const selectedHighRisk = formData.riskFactors.filter(factor =>
      highRiskFactors.includes(factor)
    ).length;

    return Math.min(100, selectedHighRisk * 25 + (formData.riskFactors.length - selectedHighRisk) * 10);
  };

  // Validate current step
  const validateStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'basic-info':
        return formData.firstName && formData.lastName && formData.email &&
               formData.phone && formData.dateOfBirth && formData.employeeId;
      case 'dependents':
        return formData.memberType === 'principal' ||
               (formData.memberType === 'dependent' && formData.principalId);
      case 'health-assessment':
        return formData.riskFactors && formData.riskFactors.length > 0;
      case 'benefits-selection':
        return formData.preferredCoverage && formData.preferredCoverage.length > 0 &&
               formData.coverageLevel;
      case 'document-upload':
        return formData.documents && formData.documents.length > 0;
      case 'review-consent':
        return formData.acceptedTerms && formData.dataSharingConsent;
      default:
        return true;
    }
  };

  // Update step completion
  const updateStepCompletion = () => {
    const updatedSteps = onboardingSteps.map(step => ({
      ...step,
      completed: validateStep(step.id)
    }));

    const updatedStep = updatedSteps[currentStep];
    if (updatedStep.completed !== onboardingSteps[currentStep].completed) {
      setOnboardingSteps(updatedSteps);
    }
  };

  // Auto-save progress
  useEffect(() => {
    const progress = calculateProgress();
    if (progress > 0) {
      localStorage.setItem('onboarding-progress', JSON.stringify({
        currentStep,
        formData,
        progress,
        timestamp: new Date().toISOString()
      }));
    }
  }, [formData, currentStep]);

  // Restore progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboarding-progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setFormData(parsed.formData);
        setCurrentStep(parsed.currentStep);

        // Restore step completion
        const restoredSteps = onboardingSteps.map(step => ({
          ...step,
          completed: validateStep(step.id)
        }));
        setOnboardingSteps(restoredSteps);
      } catch (error) {
        console.error('Failed to restore onboarding progress:', error);
      }
    }
  }, []);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      updateStepCompletion();
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    updateStepCompletion();

    if (currentStep === onboardingSteps.length - 1) {
      // Final submission
      const finalFormData = {
        ...formData,
        riskScore: calculateRiskScore()
      };

      await createMemberMutation.mutateAsync(finalFormData);
    } else {
      // Just move to next step
      nextStep();
    }
  };

  const progress = calculateProgress();

  const renderStepContent = () => {
    switch (onboardingSteps[currentStep].id) {
      case 'basic-info':
        return (
          <div className="space-y-8">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="space-y-4">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'male' | 'female' | 'other' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maritalStatus: value as 'single' | 'married' | 'divorced' | 'widowed' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Address Information</h3>
              <div className="space-y-4">
                <Label htmlFor="address">Physical Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter physical address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="space-y-4">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="Enter postal code"
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kenya">Kenya</SelectItem>
                      <SelectItem value="Uganda">Uganda</SelectItem>
                      <SelectItem value="Tanzania">Tanzania</SelectItem>
                      <SelectItem value="Rwanda">Rwanda</SelectItem>
                      <SelectItem value="Burundi">Burundi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Identification Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Identification Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="nationalId">National ID Number</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
                    placeholder="8-digit National ID"
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="passportNumber">Passport Number (Optional)</Label>
                  <Input
                    id="passportNumber"
                    value={formData.passportNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, passportNumber: e.target.value }))}
                    placeholder="Enter passport number"
                  />
                </div>
              </div>
            </div>

            {/* Employment & Member Type Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Employment & Membership</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="Enter employee ID"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <Label>Member Type</Label>
                  <Select
                    value={formData.memberType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, memberType: value as 'principal' | 'dependent' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">Principal Member</SelectItem>
                      <SelectItem value="dependent">Dependent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dependents':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-lg font-semibold">Family Member Information</h3>
              <p className="text-gray-600">Add spouse and children to your coverage</p>
            </div>

            {formData.memberType === 'dependent' && (
              <div className="space-y-4">
                <Label htmlFor="principalId">Select Principal Member</Label>
                <Select
                  value={formData.principalId?.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, principalId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select principal member" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Would be populated with actual principal members */}
                    <SelectItem value="1">John Doe</SelectItem>
                    <SelectItem value="2">Jane Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4">
              <Label>Dependent Type</Label>
              <Select
                value={formData.dependentType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dependentType: value as 'spouse' | 'child' }))}
                disabled={formData.memberType === 'principal'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'health-assessment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Health Assessment</h3>
              <p className="text-gray-600 mb-6">
                Help us understand your health profile for better coverage and wellness recommendations
              </p>
            </div>

            {riskFactors && (
              <div className="space-y-4">
                <Label>Select Risk Factors</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {riskFactors.map((factor: any) => (
                    <div key={factor.id} className="flex items-center space-x-2 p-3 border rounded">
                      <input
                        type="checkbox"
                        id={factor.id}
                        checked={formData.riskFactors.includes(factor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, riskFactors: [...prev.riskFactors, factor.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, riskFactors: prev.riskFactors.filter(id => id !== factor.id) }));
                          }
                        }}
                      />
                      <Label htmlFor={factor.id} className="text-sm">{factor.label}</Label>
                      {factor.description && (
                        <span className="text-xs text-gray-500">{factor.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'wellness-profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Wellness Profile</h3>
              <p className="text-gray-600 mb-6">
                Connect with wellness programs and get personalized health recommendations
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="fitnessLevel">Fitness Level</Label>
              <Select
                value={formData.fitnessLevel}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fitnessLevel: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Light Activity</SelectItem>
                  <SelectItem value="moderate">Moderate Activity</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="very-active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {wellnessPrograms && (
              <div className="space-y-4">
                <Label>Wellness Interests</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {wellnessPrograms.map((program: any) => (
                    <div key={program.id} className="flex items-center space-x-2 p-3 border rounded">
                      <input
                        type="checkbox"
                        id={program.id}
                        checked={formData.wellnessInterests.includes(program.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, wellnessInterests: [...prev.wellnessInterests, program.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, wellnessInterests: prev.wellnessInterests.filter(id => id !== program.id) }));
                          }
                        }}
                      />
                      <Label htmlFor={program.id} className="text-sm">{program.name}</Label>
                      {program.description && (
                        <span className="text-xs text-gray-500">{program.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'benefits-selection':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Coverage Preferences</h3>
              <p className="text-gray-600 mb-6">
                Select your preferred coverage options and customize your insurance package
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="coverageLevel">Coverage Level</Label>
              <Select
                value={formData.coverageLevel}
                onValueChange={(value) => setFormData(prev => ({ ...prev, coverageLevel: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Coverage</SelectItem>
                  <SelectItem value="standard">Standard Coverage</SelectItem>
                  <SelectItem value="premium">Premium Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {availableBenefits && (
              <div className="space-y-4">
                <Label>Select Benefits</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableBenefits.map((benefit: any) => (
                    <div key={benefit.id} className="flex items-center space-x-2 p-3 border rounded">
                      <input
                        type="checkbox"
                        id={benefit.id}
                        checked={formData.preferredCoverage.includes(benefit.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, preferredCoverage: [...prev.preferredCoverage, benefit.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, preferredCoverage: prev.preferredCoverage.filter(id => id !== benefit.id) }));
                          }
                        }}
                      />
                      <div>
                        <Label htmlFor={benefit.id} className="text-sm font-medium">{benefit.name}</Label>
                        <div className="text-xs text-gray-500">{benefit.category}</div>
                        <div className="text-xs text-green-600">{benefit.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'document-upload':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
              <p className="text-gray-600 mb-6">
                Upload required documents for verification
              </p>
            </div>

            <div className="space-y-4">
              <Label>Required Documents</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-gray-600 mb-2">Drag and drop files here or click to browse</p>
                <Button variant="outline">Choose Files</Button>
              </div>
            </div>
          </div>
        );

      case 'review-consent':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review & Consent</h3>
              <p className="text-gray-600 mb-6">
                Review your information and provide consent
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="acceptedTerms"
                    checked={formData.acceptedTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                  />
                  <Label htmlFor="acceptedTerms">I accept the terms and conditions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dataSharingConsent"
                    checked={formData.dataSharingConsent}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataSharingConsent: e.target.checked }))}
                  />
                  <Label htmlFor="dataSharingConsent">I consent to data processing</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="consentToMarketing"
                    checked={formData.consentToMarketing}
                    onChange={(e) => setFormData(prev => ({ ...prev, consentToMarketing: e.target.checked }))}
                  />
                  <Label htmlFor="consentToMarketing">I consent to marketing communications</Label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Member Onboarding</h2>
          <Badge className={
            progress >= 75 ? 'bg-green-100 text-green-800' :
            progress >= 50 ? 'bg-blue-100 text-blue-800' :
            progress >= 25 ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }>
            Step {currentStep + 1} of {onboardingSteps.length}
          </Badge>
        </div>

        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{progress}% Complete</span>
          <span>Auto-saving progress...</span>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-between mb-6">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <div className="flex space-x-2">
          {onboardingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`w-3 h-3 rounded-full ${
                index === currentStep ? 'bg-blue-500' :
                step.completed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={currentStep === onboardingSteps.length - 1 ? handleSubmit : nextStep}
          disabled={createMemberMutation.isPending}
        >
          {createMemberMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            currentStep === onboardingSteps.length - 1 ? 'Complete Onboarding' : 'Next'
          )}
        </Button>
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="material-icons mr-2">{onboardingSteps[currentStep].icon}</i>
            {onboardingSteps[currentStep].title}
            {onboardingSteps[currentStep].required && <Badge className="ml-2 bg-red-100 text-red-800">Required</Badge>}
          </CardTitle>
          <CardDescription>{onboardingSteps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}