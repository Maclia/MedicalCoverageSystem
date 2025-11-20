import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Lock,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Shield,
  Users,
  FileText
} from 'lucide-react';

interface WelcomeActivationProps {
  memberId: number;
  activationToken?: string;
  memberData?: {
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
  };
}

export const WelcomeActivation: React.FC<WelcomeActivationProps> = ({
  memberId,
  activationToken,
  memberData
}) => {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    emailFrequency: 'daily' as 'daily' | 'weekly' | 'none',
    smsEnabled: true,
    timezone: 'UTC',
    preferredTime: '09:00',
    language: 'en',
    communicationChannel: 'email' as 'email' | 'sms' | 'both'
  });

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const securityQuestions = [
    "What was your childhood nickname?",
    "What is the name of your first pet?",
    "What elementary school did you attend?",
    "What is your mother's maiden name?",
    "In what city were you born?"
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.password) {
          setError('Password is required');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (!formData.securityQuestion1 || !formData.securityAnswer1) {
          setError('Please complete the first security question');
          return false;
        }
        break;

      case 2:
        if (!formData.securityQuestion2 || !formData.securityAnswer2) {
          setError('Please complete the second security question');
          return false;
        }
        break;

      case 3:
        // No validation needed for preferences step
        break;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleActivation = async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = activationToken
        ? '/api/members/activate-with-token'
        : `/api/members/${memberId}/activate`;

      const payload = activationToken
        ? {
            token: activationToken,
            password: formData.password,
            securityQuestions: [
              {
                question: formData.securityQuestion1,
                answer: formData.securityAnswer1
              },
              {
                question: formData.securityQuestion2,
                answer: formData.securityAnswer2
              }
            ],
            communicationPreferences: {
              emailFrequency: formData.emailFrequency,
              smsEnabled: formData.smsEnabled,
              timezone: formData.timezone,
              preferredTime: formData.preferredTime,
              language: formData.language,
              communicationChannel: formData.communicationChannel
            }
          }
        : {
            password: formData.password,
            securityQuestions: [
              {
                question: formData.securityQuestion1,
                answer: formData.securityAnswer1
              },
              {
                question: formData.securityQuestion2,
                answer: formData.securityAnswer2
              }
            ],
            communicationPreferences: {
              emailFrequency: formData.emailFrequency,
              smsEnabled: formData.smsEnabled,
              timezone: formData.timezone,
              preferredTime: formData.preferredTime,
              language: formData.language,
              communicationChannel: formData.communicationChannel
            }
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      setSuccess(true);

      // Redirect to onboarding dashboard after a short delay
      setTimeout(() => {
        navigate(`/member/onboarding/${memberId}`);
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during activation');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 8) return { strength: 0, color: 'bg-gray-300', text: 'Too short' };
    if (password.length < 12) return { strength: 25, color: 'bg-red-500', text: 'Weak' };
    if (password.length < 16) return { strength: 50, color: 'bg-yellow-500', text: 'Medium' };
    if (password.match(/[a-z]/) && password.match(/[A-Z]/) && password.match(/[0-9]/)) {
      return { strength: 75, color: 'bg-blue-500', text: 'Strong' };
    }
    return { strength: 100, color: 'bg-green-500', text: 'Very Strong' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-center">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h1>
            <p className="text-gray-600 mb-4">
              Your account has been successfully activated. You're being redirected to your personalized dashboard...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {memberData?.companyName || 'Your Health Coverage'}
          </h1>
          <p className="text-lg text-gray-600">
            Let's get your account set up, {memberData?.firstName || 'Member'}!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This will only take a few minutes to complete
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Password & First Security Question */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Create Your Password
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Choose a strong password to secure your account
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      className="mt-1"
                    />
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Password strength: {passwordStrength.text}</span>
                          <span>{passwordStrength.strength}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Security Question 1
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="securityQuestion1">Select Question</Label>
                      <select
                        id="securityQuestion1"
                        value={formData.securityQuestion1}
                        onChange={(e) => handleInputChange('securityQuestion1', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a security question</option>
                        {securityQuestions.map((question, index) => (
                          <option key={index} value={question}>
                            {question}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="securityAnswer1">Your Answer</Label>
                      <Input
                        id="securityAnswer1"
                        type="text"
                        value={formData.securityAnswer1}
                        onChange={(e) => handleInputChange('securityAnswer1', e.target.value)}
                        placeholder="Enter your answer"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Second Security Question */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Add Extra Security
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Set up another security question for additional protection
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="securityQuestion2">Select Question</Label>
                    <select
                      id="securityQuestion2"
                      value={formData.securityQuestion2}
                      onChange={(e) => handleInputChange('securityQuestion2', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a security question</option>
                      {securityQuestions.map((question, index) => (
                        <option key={index} value={question}>
                          {question}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="securityAnswer2">Your Answer</Label>
                    <Input
                      id="securityAnswer2"
                      type="text"
                      value={formData.securityAnswer2}
                      onChange={(e) => handleInputChange('securityAnswer2', e.target.value)}
                      placeholder="Enter your answer"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Security Tips</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Use answers that are memorable but not easily guessable</li>
                        <li>• Avoid using personal information that could be found online</li>
                        <li>• Consider using a memorable phrase or inside joke</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Communication Preferences */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Customize Your Experience
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Set your communication preferences to personalize your journey
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      <Mail className="inline h-5 w-5 mr-2" />
                      Email Preferences
                    </h3>

                    <div>
                      <Label>Email Frequency</Label>
                      <select
                        value={formData.emailFrequency}
                        onChange={(e) => handleInputChange('emailFrequency', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="daily">Daily updates</option>
                        <option value="weekly">Weekly digest</option>
                        <option value="none">No email updates</option>
                      </select>
                    </div>

                    <div>
                      <Label>Preferred Time</Label>
                      <Input
                        type="time"
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Timezone</Label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      <Phone className="inline h-5 w-5 mr-2" />
                      SMS & Communication
                    </h3>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smsEnabled"
                        checked={formData.smsEnabled}
                        onCheckedChange={(checked) => handleInputChange('smsEnabled', checked)}
                      />
                      <Label htmlFor="smsEnabled">Enable SMS notifications</Label>
                    </div>

                    <div>
                      <Label>Communication Channel</Label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="communicationChannel"
                            value="email"
                            checked={formData.communicationChannel === 'email'}
                            onChange={(e) => handleInputChange('communicationChannel', e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Email only</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="communicationChannel"
                            value="sms"
                            checked={formData.communicationChannel === 'sms'}
                            onChange={(e) => handleInputChange('communicationChannel', e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>SMS only</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="communicationChannel"
                            value="both"
                            checked={formData.communicationChannel === 'both'}
                            onChange={(e) => handleInputChange('communicationChannel', e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Email and SMS</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>Language</Label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Personalized Journey</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Based on your preferences, we'll tailor your onboarding experience and send you relevant content at the perfect time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleActivation}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Activating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Activate My Account
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-medium text-gray-900">7-Day Onboarding</h3>
            </div>
            <p className="text-sm text-gray-600">
              Complete personalized daily tasks to unlock your benefits
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-medium text-gray-900">Secure & Private</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your data is protected with enterprise-grade security
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="font-medium text-gray-900">Quick Setup</h3>
            </div>
            <p className="text-sm text-gray-600">
              Get started in minutes with guided step-by-step process
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};