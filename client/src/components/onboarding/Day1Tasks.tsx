import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  Camera,
  Shield,
  FileText,
  Star,
  Zap
} from 'lucide-react';

interface Day1TasksProps {
  memberId: number;
  onTaskComplete?: (taskId: number) => void;
}

interface MemberProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

export const Day1Tasks: React.FC<Day1TasksProps> = ({ memberId, onTaskComplete }) => {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<MemberProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }
  });

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Complete Your Profile',
      description: 'Add your personal details, contact information, and emergency contacts.',
      completed: false,
      points: 20
    },
    {
      id: 2,
      title: 'Upload Government ID',
      description: 'Upload a clear photo of your government-issued identification.',
      completed: false,
      points: 15
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');

  useEffect(() => {
    fetchMemberData();
  }, [memberId]);

  const fetchMemberData = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch member data:', err);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    if (field.startsWith('emergencyContact.')) {
      const emergencyField = field.split('.')[1];
      setProfile(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [emergencyField]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateProfile = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender'];
    const missing = required.filter(field => !profile[field as keyof MemberProfile]);

    if (missing.length > 0) {
      setError(`Please complete all required fields: ${missing.join(', ')}`);
      return false;
    }

    if (!profile.emergencyContact.name || !profile.emergencyContact.phone) {
      setError('Please complete emergency contact information');
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      markTaskAsComplete(1);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const markTaskAsComplete = (taskId: number) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: true } : task
    ));

    if (onTaskComplete) {
      onTaskComplete(taskId);
    }
  };

  const handleDocumentUpload = () => {
    markTaskAsComplete(2);
    setActiveTab('documents');
  };

  const overallProgress = (tasks.filter(task => task.completed).length / tasks.length) * 100;
  const totalPointsEarned = tasks.filter(task => task.completed).reduce((sum, task) => sum + task.points, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Day 1!</h1>
        <p className="text-lg text-gray-600 mb-4">
          Let's start by setting up your profile and uploading your documents
        </p>

        {/* Progress */}
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Today's Progress
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-sm text-gray-500">
            <span>{tasks.filter(task => task.completed).length} of {tasks.length} tasks completed</span>
            <span>{totalPointsEarned} points earned</span>
          </div>
        </div>
      </div>

      {/* Tasks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>
            Complete these tasks to advance your onboarding journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`border rounded-lg p-4 ${
                  task.completed
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 ${task.completed ? 'text-green-600' : 'text-gray-400'}`}>
                    {task.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.completed && (
                        <Badge className="text-xs bg-green-100 text-green-800" variant="secondary">
                          +{task.points} pts
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'documents')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Complete Profile</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Upload Documents</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {activeTab === 'profile' && (
        <Card>
          <CardContent className="pt-6">
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={profile.gender} onValueChange={(value) => handleProfileChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={profile.address}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      placeholder="Enter your street address"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => handleProfileChange('city', e.target.value)}
                        placeholder="Enter your city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={profile.state}
                        onChange={(e) => handleProfileChange('state', e.target.value)}
                        placeholder="Enter your state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={profile.zipCode}
                        onChange={(e) => handleProfileChange('zipCode', e.target.value)}
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={profile.country} onValueChange={(value) => handleProfileChange('country', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Emergency Contact
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emergencyName">Contact Name *</Label>
                    <Input
                      id="emergencyName"
                      value={profile.emergencyContact.name}
                      onChange={(e) => handleProfileChange('emergencyContact.name', e.target.value)}
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyRelationship">Relationship *</Label>
                      <Input
                        id="emergencyRelationship"
                        value={profile.emergencyContact.relationship}
                        onChange={(e) => handleProfileChange('emergencyContact.relationship', e.target.value)}
                        placeholder="e.g., Spouse, Parent, Friend"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Phone Number *</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={profile.emergencyContact.phone}
                        onChange={(e) => handleProfileChange('emergencyContact.phone', e.target.value)}
                        placeholder="Emergency contact phone"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="emergencyEmail">Email (Optional)</Label>
                    <Input
                      id="emergencyEmail"
                      type="email"
                      value={profile.emergencyContact.email}
                      onChange={(e) => handleProfileChange('emergencyContact.email', e.target.value)}
                      placeholder="Emergency contact email"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveProfile}
                  disabled={isSaving || tasks[0].completed}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : tasks[0].completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Profile Completed
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Complete Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Required Documents
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a clear photo of your government-issued identification
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Government ID
                </h3>
                <p className="text-gray-600 mb-4">
                  Acceptable formats: JPG, PNG, PDF (Max 10MB)
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/member/documents/${memberId}`)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  <p className="text-sm text-gray-500">
                    or drag and drop files here
                  </p>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <h4 className="font-medium text-blue-900 mb-2">Upload Tips:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure the ID is clear and all text is readable</li>
                    <li>• Include all four corners of the document</li>
                    <li>• Make sure there's no glare or shadows</li>
                    <li>• Documents are encrypted and stored securely</li>
                  </ul>
                </div>
              </div>

              {tasks[1].completed && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    Government ID uploaded successfully! You've earned 15 points.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Complete Banner */}
      {overallProgress === 100 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Star className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Day 1 Complete! 🎉
              </h3>
              <p className="text-green-700 mb-4">
                Great job! You've earned {totalPointsEarned} points and completed all today's tasks.
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => navigate(`/member/onboarding/${memberId}`)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};