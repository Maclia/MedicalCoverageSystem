import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Users,
  Building,
  Calendar,
  Award,
  Shield,
  Info
} from 'lucide-react';

interface OnboardingFormData {
  // Basic Information
  npiNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  specialties: string[];

  // Practice Information
  entityType: 'individual' | 'group' | 'facility';
  practiceName: string;
  taxId: string;

  // Location
  locations: Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    fax: string;
    isPrimary: boolean;
  }>;

  // Credentials
  credentials: Array<{
    type: string;
    number: string;
    issuedBy: string;
    issuedDate: string;
    expiryDate: string;
  }>;

  // Network Preferences
  networkTier: 'tier1' | 'tier2' | 'tier3';
  participationLevel: 'full' | 'partial' | 'limited';
  acceptanceStatus: 'new' | 'medicare' | 'medicaid' | 'private' | 'combo';

  // Terms
  termsAccepted: boolean;
  hipaaAgreement: boolean;
  backgroundCheckConsent: boolean;
}

const ProviderOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    npiNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    specialties: [],
    entityType: 'individual',
    practiceName: '',
    taxId: '',
    locations: [{
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      fax: '',
      isPrimary: true
    }],
    credentials: [],
    networkTier: 'tier1',
    participationLevel: 'full',
    acceptanceStatus: 'private',
    termsAccepted: false,
    hipaaAgreement: false,
    backgroundCheckConsent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 1, title: 'Basic Information', icon: User },
    { id: 2, title: 'Practice Details', icon: Building },
    { id: 3, title: 'Credentials', icon: Award },
    { id: 4, title: 'Network Preferences', icon: Users },
    { id: 5, title: 'Terms & Agreements', icon: Shield }
  ];

  const totalSteps = steps.length;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.npiNumber || formData.npiNumber.length < 10) {
          newErrors.npiNumber = 'NPI number must be at least 10 characters';
        }
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Valid email is required';
        }
        if (!formData.phone || formData.phone.length < 10) {
          newErrors.phone = 'Valid phone number is required';
        }
        if (!formData.specialization) newErrors.specialization = 'Specialization is required';
        break;

      case 2:
        if (!formData.taxId || formData.taxId.length < 9) {
          newErrors.taxId = 'Valid Tax ID is required';
        }
        if (formData.entityType !== 'individual' && !formData.practiceName) {
          newErrors.practiceName = 'Practice name is required for groups and facilities';
        }
        if (!formData.locations[0].address) newErrors.address = 'Address is required';
        if (!formData.locations[0].city) newErrors.city = 'City is required';
        if (!formData.locations[0].state) newErrors.state = 'State is required';
        if (!formData.locations[0].zipCode) newErrors.zipCode = 'Zip code is required';
        break;

      case 3:
        if (formData.credentials.length === 0) {
          newErrors.credentials = 'At least one credential is required';
        }
        break;

      case 4:
        // Network preferences have defaults, so no required validation
        break;

      case 5:
        if (!formData.termsAccepted) newErrors.terms = 'Terms must be accepted';
        if (!formData.hipaaAgreement) newErrors.hipaa = 'HIPAA agreement is required';
        if (!formData.backgroundCheckConsent) newErrors.backgroundCheck = 'Background check consent is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Redirect to success page or show success message
        window.location.href = '/providers/success';
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to submit application' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [...prev.locations, {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        fax: '',
        isPrimary: false
      }]
    }));
  };

  const updateLocation = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, i) =>
        i === index ? { ...loc, [field]: value } : loc
      )
    }));
  };

  const removeLocation = (index: number) => {
    if (formData.locations.length > 1) {
      setFormData(prev => ({
        ...prev,
        locations: prev.locations.filter((_, i) => i !== index)
      }));
    }
  };

  const addCredential = () => {
    setFormData(prev => ({
      ...prev,
      credentials: [...prev.credentials, {
        type: '',
        number: '',
        issuedBy: '',
        issuedDate: '',
        expiryDate: ''
      }]
    }));
  };

  const updateCredential = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      credentials: prev.credentials.map((cred, i) =>
        i === index ? { ...cred, [field]: value } : cred
      )
    }));
  };

  const removeCredential = (index: number) => {
    setFormData(prev => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== index)
    }));
  };

  const renderStep = () => {
    const StepIcon = steps[currentStep - 1].icon;

    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Please provide your basic professional and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="npiNumber">NPI Number *</Label>
                  <Input
                    id="npiNumber"
                    value={formData.npiNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, npiNumber: e.target.value }))}
                    placeholder="1234567890"
                    className={errors.npiNumber ? 'border-red-500' : ''}
                  />
                  {errors.npiNumber && <p className="text-sm text-red-500">{errors.npiNumber}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="doctor@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="specialization">Primary Specialization *</Label>
                  <Select value={formData.specialization} onValueChange={(value) => setFormData(prev => ({ ...prev, specialization: value }))}>
                    <SelectTrigger className={errors.specialization ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                      <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Obstetrics/Gynecology">Obstetrics/Gynecology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.specialization && <p className="text-sm text-red-500">{errors.specialization}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5" />
                Practice Details
              </CardTitle>
              <CardDescription>
                Information about your practice type and locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <RadioGroup
                    value={formData.entityType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, entityType: value as any }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual">Individual Provider</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="group" />
                      <Label htmlFor="group">Medical Group</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="facility" id="facility" />
                      <Label htmlFor="facility">Medical Facility</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="practiceName">Practice Name</Label>
                  <Input
                    id="practiceName"
                    value={formData.practiceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, practiceName: e.target.value }))}
                    placeholder={formData.entityType === 'individual' ? 'Optional for individuals' : 'Required for groups/facilities'}
                    className={errors.practiceName ? 'border-red-500' : ''}
                  />
                  {errors.practiceName && <p className="text-sm text-red-500">{errors.practiceName}</p>}
                </div>

                <div>
                  <Label htmlFor="taxId">Tax ID *</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="12-3456789"
                    className={errors.taxId ? 'border-red-500' : ''}
                  />
                  {errors.taxId && <p className="text-sm text-red-500">{errors.taxId}</p>}
                </div>
              </div>

              {/* Locations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Practice Locations</Label>
                  <Button type="button" variant="outline" onClick={addLocation}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.locations.map((location, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          Location {index + 1} {location.isPrimary && <Badge variant="outline" className="ml-2">Primary</Badge>}
                        </h4>
                        {formData.locations.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocation(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`location-name-${index}`}>Location Name</Label>
                          <Input
                            id={`location-name-${index}`}
                            value={location.name}
                            onChange={(e) => updateLocation(index, 'name', e.target.value)}
                            placeholder="Main Office, Branch, etc."
                          />
                        </div>

                        <div>
                          <Label htmlFor={`location-phone-${index}`}>Phone</Label>
                          <Input
                            id={`location-phone-${index}`}
                            value={location.phone}
                            onChange={(e) => updateLocation(index, 'phone', e.target.value)}
                            placeholder="(555) 123-4567"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor={`location-address-${index}`}>Address *</Label>
                          <Input
                            id={`location-address-${index}`}
                            value={location.address}
                            onChange={(e) => updateLocation(index, 'address', e.target.value)}
                            placeholder="123 Main St"
                            className={errors.address && index === 0 ? 'border-red-500' : ''}
                          />
                          {errors.address && index === 0 && <p className="text-sm text-red-500">{errors.address}</p>}
                        </div>

                        <div>
                          <Label htmlFor={`location-city-${index}`}>City *</Label>
                          <Input
                            id={`location-city-${index}`}
                            value={location.city}
                            onChange={(e) => updateLocation(index, 'city', e.target.value)}
                            className={errors.city && index === 0 ? 'border-red-500' : ''}
                          />
                          {errors.city && index === 0 && <p className="text-sm text-red-500">{errors.city}</p>}
                        </div>

                        <div>
                          <Label htmlFor={`location-state-${index}`}>State *</Label>
                          <Input
                            id={`location-state-${index}`}
                            value={location.state}
                            onChange={(e) => updateLocation(index, 'state', e.target.value)}
                            placeholder="CA"
                            className={errors.state && index === 0 ? 'border-red-500' : ''}
                          />
                          {errors.state && index === 0 && <p className="text-sm text-red-500">{errors.state}</p>}
                        </div>

                        <div>
                          <Label htmlFor={`location-zip-${index}`}>Zip Code *</Label>
                          <Input
                            id={`location-zip-${index}`}
                            value={location.zipCode}
                            onChange={(e) => updateLocation(index, 'zipCode', e.target.value)}
                            placeholder="90210"
                            className={errors.zipCode && index === 0 ? 'border-red-500' : ''}
                          />
                          {errors.zipCode && index === 0 && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                        </div>

                        <div>
                          <Label htmlFor={`location-fax-${index}`}>Fax</Label>
                          <Input
                            id={`location-fax-${index}`}
                            value={location.fax}
                            onChange={(e) => updateLocation(index, 'fax', e.target.value)}
                            placeholder="(555) 123-4568"
                          />
                        </div>
                      </div>

                      {formData.locations.length > 1 && (
                        <div className="mt-3">
                          <Checkbox
                            id={`primary-${index}`}
                            checked={location.isPrimary}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  locations: prev.locations.map((loc, i) => ({
                                    ...loc,
                                    isPrimary: i === index
                                  }))
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`primary-${index}`} className="ml-2">
                            Set as primary location
                          </Label>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5" />
                Professional Credentials
              </CardTitle>
              <CardDescription>
                Please provide information about your professional licenses and certifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <Label>Professional Credentials</Label>
                <Button type="button" variant="outline" onClick={addCredential}>
                  <Award className="h-4 w-4 mr-2" />
                  Add Credential
                </Button>
              </div>

              {errors.credentials && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.credentials}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {formData.credentials.map((credential, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Credential {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCredential(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`credential-type-${index}`}>Credential Type *</Label>
                        <Select
                          value={credential.type}
                          onValueChange={(value) => updateCredential(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select credential type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Medical License">Medical License</SelectItem>
                            <SelectItem value="Board Certification">Board Certification</SelectItem>
                            <SelectItem value="DEA Registration">DEA Registration</SelectItem>
                            <SelectItem value="State License">State License</SelectItem>
                            <SelectItem value="Hospital Privileges">Hospital Privileges</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`credential-number-${index}`}>License/Certificate Number *</Label>
                        <Input
                          id={`credential-number-${index}`}
                          value={credential.number}
                          onChange={(e) => updateCredential(index, 'number', e.target.value)}
                          placeholder="License number"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`credential-issuer-${index}`}>Issuing Authority *</Label>
                        <Input
                          id={`credential-issuer-${index}`}
                          value={credential.issuedBy}
                          onChange={(e) => updateCredential(index, 'issuedBy', e.target.value)}
                          placeholder="State Medical Board, etc."
                        />
                      </div>

                      <div>
                        <Label htmlFor={`credential-expiry-${index}`}>Expiry Date *</Label>
                        <Input
                          id={`credential-expiry-${index}`}
                          type="date"
                          value={credential.expiryDate}
                          onChange={(e) => updateCredential(index, 'expiryDate', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`credential-issued-${index}`}>Issue Date</Label>
                        <Input
                          id={`credential-issued-${index}`}
                          type="date"
                          value={credential.issuedDate}
                          onChange={(e) => updateCredential(index, 'issuedDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {formData.credentials.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No credentials added yet</p>
                  <Button type="button" variant="outline" onClick={addCredential}>
                    Add Your First Credential
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5" />
                Network Preferences
              </CardTitle>
              <CardDescription>
                Select your preferred network participation options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="networkTier">Network Tier Preference</Label>
                  <Select value={formData.networkTier} onValueChange={(value) => setFormData(prev => ({ ...prev, networkTier: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier1">Tier 1 - Premier Network</SelectItem>
                      <SelectItem value="tier2">Tier 2 - Standard Network</SelectItem>
                      <SelectItem value="tier3">Tier 3 - Basic Network</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-2">
                    Higher tiers typically offer better reimbursement rates but may have stricter requirements.
                  </p>
                </div>

                <div>
                  <Label htmlFor="participationLevel">Participation Level</Label>
                  <Select value={formData.participationLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, participationLevel: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Participation</SelectItem>
                      <SelectItem value="partial">Partial Participation</SelectItem>
                      <SelectItem value="limited">Limited Participation</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-2">
                    Determines the extent of your participation in our network programs.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label>Insurance Acceptance Status</Label>
                  <RadioGroup
                    value={formData.acceptanceStatus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, acceptanceStatus: value as any }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new">New Patients Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medicare" id="medicare" />
                      <Label htmlFor="medicare">Medicare Patients</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medicaid" id="medicaid" />
                      <Label htmlFor="medicaid">Medicaid Patients</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private">Private Insurance Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="combo" id="combo" />
                      <Label htmlFor="combo">Combination (Multiple Types)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These preferences help us match you with the most appropriate network opportunities. You can update these settings after joining the network.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5" />
                Terms & Agreements
              </CardTitle>
              <CardDescription>
                Please review and accept the required agreements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: checked as boolean }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                      Provider Network Terms & Conditions *
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      I agree to abide by the provider network terms and conditions, including all policies and procedures outlined in the provider handbook.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-sm">
                      View Full Terms
                    </Button>
                  </div>
                </div>
                {errors.terms && <p className="text-sm text-red-500">{errors.terms}</p>}

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="hipaa"
                    checked={formData.hipaaAgreement}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hipaaAgreement: checked as boolean }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="hipaa" className="text-sm font-medium cursor-pointer">
                      HIPAA Compliance Agreement *
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      I understand and agree to comply with all HIPAA privacy and security requirements for handling protected health information (PHI).
                    </p>
                    <Button variant="link" className="p-0 h-auto text-sm">
                      View HIPAA Policy
                    </Button>
                  </div>
                </div>
                {errors.hipaa && <p className="text-sm text-red-500">{errors.hipaa}</p>}

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="background"
                    checked={formData.backgroundCheckConsent}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, backgroundCheckConsent: checked as boolean }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="background" className="text-sm font-medium cursor-pointer">
                      Background Check Consent *
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      I consent to a comprehensive background check, including license verification, malpractice history, and disciplinary action review.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-sm">
                      View Background Check Policy
                    </Button>
                  </div>
                </div>
                {errors.backgroundCheck && <p className="text-sm text-red-500">{errors.backgroundCheck}</p>}
              </div>

              {errors.submit && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Provider Application</h2>
              <span className="text-sm text-gray-600">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 text-center ${
                    isActive ? 'text-blue-600 font-medium' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <form onSubmit={handleSubmit}>
        {renderStep()}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          <div className="text-sm text-gray-600">
            {currentStep === totalSteps ? (
              <span>Ready to submit your application</span>
            ) : (
              <span>Continue to next step</span>
            )}
          </div>

          {currentStep === totalSteps ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProviderOnboarding;