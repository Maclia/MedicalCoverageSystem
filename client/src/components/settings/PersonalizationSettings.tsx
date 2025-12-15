import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Settings,
  Brain,
  Shield,
  Bell,
  MapPin,
  Activity,
  Eye,
  EyeOff,
  Clock,
  Smartphone,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Users,
  Heart,
  Star,
  Lock,
  Unlock,
  Database,
  Cloud,
  SmartphoneIcon,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';

interface PersonalizationPreference {
  id: string;
  category: 'notifications' | 'privacy' | 'ai_features' | 'content' | 'accessibility' | 'data_usage';
  title: string;
  description: string;
  type: 'toggle' | 'slider' | 'select' | 'text' | 'multi_select';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  impact: 'high' | 'medium' | 'low';
  aiOptimized: boolean;
  lastUpdated: Date;
}

interface PersonalizationProfile {
  memberId: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  contentComplexity: 'simple' | 'moderate' | 'detailed';
  interactionFrequency: 'minimal' | 'balanced' | 'frequent';
  decisionSupport: 'independent' | 'guided' | 'assisted';
  dataSharingLevel: 'minimal' | 'standard' | 'comprehensive';
  aiAssistanceLevel: 'basic' | 'moderate' | 'advanced';
  personalizationStrength: number; // 0-100
  privacyLevel: number; // 0-100
  notificationFrequency: number; // 0-100
}

interface PersonalizationSettingsProps {
  memberId: string;
  memberName?: string;
}

export const PersonalizationSettings: React.FC<PersonalizationSettingsProps> = ({ memberId, memberName }) => {
  const [preferences, setPreferences] = useState<PersonalizationPreference[]>([]);
  const [profile, setProfile] = useState<PersonalizationProfile | null>(null);
  const [activeTab, setActiveTab] = useState('preferences');
  const [loading, setLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDataExportDialog, setShowDataExportDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mock data - in a real app, this would come from APIs
  useEffect(() => {
    const mockPreferences: PersonalizationPreference[] = [
      {
        id: 'ai_recommendations',
        category: 'ai_features',
        title: 'AI-Powered Recommendations',
        description: 'Receive personalized benefit and wellness recommendations based on your usage patterns',
        type: 'toggle',
        value: true,
        impact: 'high',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'predictive_insights',
        category: 'ai_features',
        title: 'Predictive Health Insights',
        description: 'Get AI-driven predictions about potential health needs and benefit utilization',
        type: 'toggle',
        value: true,
        impact: 'high',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'smart_notifications',
        category: 'notifications',
        title: 'Smart Notification Timing',
        description: 'AI will determine the best times to send notifications based on your activity',
        type: 'toggle',
        value: true,
        impact: 'medium',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'personalization_strength',
        category: 'content',
        title: 'Personalization Strength',
        description: 'How much AI should personalize your experience (0 = minimal, 100 = maximum)',
        type: 'slider',
        value: 75,
        min: 0,
        max: 100,
        step: 5,
        impact: 'high',
        aiOptimized: false,
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'privacy_level',
        category: 'privacy',
        title: 'Privacy Protection Level',
        description: 'Balance between personalization and privacy (0 = minimal privacy, 100 = maximum privacy)',
        type: 'slider',
        value: 80,
        min: 0,
        max: 100,
        step: 5,
        impact: 'high',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'location_tracking',
        category: 'privacy',
        title: 'Location-Based Services',
        description: 'Use your location to find nearby providers and urgent care facilities',
        type: 'toggle',
        value: false,
        impact: 'medium',
        aiOptimized: false,
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'notification_channels',
        category: 'notifications',
        title: 'Notification Channels',
        description: 'Choose how you receive important updates',
        type: 'multi_select',
        value: ['email', 'push'],
        options: ['email', 'sms', 'push', 'in_app'],
        impact: 'medium',
        aiOptimized: false,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'data_sharing',
        category: 'data_usage',
        title: 'Anonymous Data Sharing',
        description: 'Share anonymized usage data to improve AI recommendations for all members',
        type: 'toggle',
        value: true,
        impact: 'medium',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'learning_style',
        category: 'content',
        title: 'Learning Style Preference',
        description: 'How you prefer to receive and process information',
        type: 'select',
        value: 'visual',
        options: ['visual', 'auditory', 'kinesthetic', 'reading'],
        impact: 'medium',
        aiOptimized: true,
        lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'content_complexity',
        category: 'content',
        title: 'Content Complexity',
        description: 'Level of detail in explanations and recommendations',
        type: 'select',
        value: 'moderate',
        options: ['simple', 'moderate', 'detailed'],
        impact: 'low',
        aiOptimized: false,
        lastUpdated: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      }
    ];

    const mockProfile: PersonalizationProfile = {
      memberId: memberId,
      learningStyle: 'visual',
      contentComplexity: 'moderate',
      interactionFrequency: 'balanced',
      decisionSupport: 'guided',
      dataSharingLevel: 'standard',
      aiAssistanceLevel: 'moderate',
      personalizationStrength: 75,
      privacyLevel: 80,
      notificationFrequency: 60
    };

    setPreferences(mockPreferences);
    setProfile(mockProfile);
  }, [memberId]);

  // Handle preference change
  const handlePreferenceChange = (preferenceId: string, newValue: any) => {
    setPreferences(prev => prev.map(pref =>
      pref.id === preferenceId
        ? { ...pref, value: newValue, lastUpdated: new Date() }
        : pref
    ));
    setHasUnsavedChanges(true);
  };

  // Handle profile change
  const handleProfileChange = (field: keyof PersonalizationProfile, value: any) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
      setHasUnsavedChanges(true);
    }
  };

  // Save settings
  const handleSave = async () => {
    setLoading(true);
    try {
      // In a real app, this would call an API
      console.log('Saving preferences:', preferences);
      console.log('Saving profile:', profile);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setShowResetDialog(true);
  };

  // Confirm reset
  const confirmReset = () => {
    // Reset to default values
    setPreferences(prev => prev.map(pref => ({
      ...pref,
      value: pref.id === 'personalization_strength' ? 50 :
             pref.id === 'privacy_level' ? 75 :
             pref.id === 'ai_recommendations' ? true :
             pref.id === 'predictive_insights' ? true :
             pref.id === 'smart_notifications' ? false :
             pref.id === 'location_tracking' ? false :
             pref.id === 'data_sharing' ? true :
             pref.id === 'notification_channels' ? ['email'] :
             pref.id === 'learning_style' ? 'moderate' :
             pref.id === 'content_complexity' ? 'moderate' :
             pref.value,
      lastUpdated: new Date()
    })));
    setShowResetDialog(false);
    setHasUnsavedChanges(true);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconMap = {
      notifications: <Bell className="h-5 w-5" />,
      privacy: <Shield className="h-5 w-5" />,
      ai_features: <Brain className="h-5 w-5" />,
      content: <Settings className="h-5 w-5" />,
      accessibility: <Users className="h-5 w-5" />,
      data_usage: <Database className="h-5 w-5" />
    };
    return iconMap[category as keyof typeof iconMap] || <Settings className="h-5 w-5" />;
  };

  // Get impact color
  const getImpactColor = (impact: string) => {
    const colorMap = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colorMap[impact as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  // Render preference control
  const renderPreferenceControl = (preference: PersonalizationPreference) => {
    switch (preference.type) {
      case 'toggle':
        return (
          <Switch
            checked={preference.value}
            onCheckedChange={(checked) => handlePreferenceChange(preference.id, checked)}
          />
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <Slider
              value={[preference.value]}
              onValueChange={([value]) => handlePreferenceChange(preference.id, value)}
              min={preference.min || 0}
              max={preference.max || 100}
              step={preference.step || 1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{preference.min || 0}</span>
              <span className="font-medium">{preference.value}</span>
              <span>{preference.max || 100}</span>
            </div>
          </div>
        );

      case 'select':
        return (
          <Select
            value={preference.value}
            onValueChange={(value) => handlePreferenceChange(preference.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {preference.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        return (
          <div className="space-y-2">
            {preference.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${preference.id}-${option}`}
                  checked={preference.value.includes(option)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...preference.value, option]
                      : preference.value.filter((v: string) => v !== option);
                    handlePreferenceChange(preference.id, newValue);
                  }}
                  className="rounded"
                />
                <Label htmlFor={`${preference.id}-${option}`} className="text-sm">
                  {option.replace('_', ' ').charAt(0).toUpperCase() + option.replace('_', ' ').slice(1)}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return <Input value={preference.value} onChange={(e) => handlePreferenceChange(preference.id, e.target.value)} />;
    }
  };

  // Group preferences by category
  const preferencesByCategory = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = [];
    }
    acc[pref.category].push(pref);
    return acc;
  }, {} as Record<string, PersonalizationPreference[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <span>Personalization Settings</span>
          </h1>
          <p className="text-gray-600">
            Customize your AI-powered experience and privacy preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge className="bg-orange-100 text-orange-800">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasUnsavedChanges}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Personalization Profile Summary */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Your Personalization Profile</span>
            </CardTitle>
            <CardDescription>
              AI has created a profile based on your usage patterns and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{profile.personalizationStrength}%</div>
                <div className="text-sm text-gray-600">Personalization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{profile.privacyLevel}%</div>
                <div className="text-sm text-gray-600">Privacy Protection</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{profile.aiAssistanceLevel}</div>
                <div className="text-sm text-gray-600">AI Assistance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{profile.learningStyle}</div>
                <div className="text-sm text-gray-600">Learning Style</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Data</TabsTrigger>
          <TabsTrigger value="ai">AI Features</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <div className="space-y-6">
            {Object.entries(preferencesByCategory).map(([category, categoryPrefs]) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(category)}
                    <div>
                      <CardTitle className="capitalize">
                        {category.replace('_', ' ')}
                      </CardTitle>
                      <CardDescription>
                        {categoryPrefs.length} settings in this category
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {categoryPrefs.map((preference) => (
                      <div key={preference.id} className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Label className="font-medium">{preference.title}</Label>
                              {preference.aiOptimized && (
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  AI Optimized
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{preference.description}</p>
                          </div>
                          <Badge className={getImpactColor(preference.impact)}>
                            {preference.impact} impact
                          </Badge>
                        </div>
                        {renderPreferenceControl(preference)}
                        <div className="text-xs text-gray-500">
                          Last updated: {preference.lastUpdated.toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="privacy">
          <div className="space-y-6">
            {/* Privacy Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Privacy Overview</span>
                </CardTitle>
                <CardDescription>
                  Review and manage your data privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Data Collection</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Only essential data is collected to provide personalized services
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lock className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Data Security</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Your data is encrypted and protected with industry-standard security
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Data Sharing</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Anonymized data may be shared to improve AI services
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy Controls</CardTitle>
                <CardDescription>
                  Fine-tune your privacy preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {preferences
                    .filter(p => p.category === 'privacy')
                    .map((preference) => (
                      <div key={preference.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{preference.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{preference.description}</p>
                        </div>
                        {renderPreferenceControl(preference)}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Manage your personal data and privacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setShowDataExportDialog(true)}
                  >
                    <Download className="h-6 w-6" />
                    <span>Export My Data</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                  >
                    <Eye className="h-6 w-6" />
                    <span>View Data Usage</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="space-y-6">
            {/* AI Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI-Powered Features</span>
                </CardTitle>
                <CardDescription>
                  Control how AI assists and personalizes your experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {preferences
                    .filter(p => p.category === 'ai_features')
                    .map((preference) => (
                      <div key={preference.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium">{preference.title}</h3>
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              AI Powered
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{preference.description}</p>
                        </div>
                        {renderPreferenceControl(preference)}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Learning Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>AI Learning Preferences</CardTitle>
                <CardDescription>
                  How AI should learn from your interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="interaction_freq">Interaction Frequency</Label>
                    <Select
                      value={profile?.interactionFrequency}
                      onValueChange={(value) => handleProfileChange('interactionFrequency', value)}
                    >
                      <SelectTrigger id="interaction_freq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal - Only essential interactions</SelectItem>
                        <SelectItem value="balanced">Balanced - Moderate assistance</SelectItem>
                        <SelectItem value="frequent">Frequent - Proactive assistance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="decision_support">Decision Support Level</Label>
                    <Select
                      value={profile?.decisionSupport}
                      onValueChange={(value) => handleProfileChange('decisionSupport', value)}
                    >
                      <SelectTrigger id="decision_support">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="independent">Independent - Minimal guidance</SelectItem>
                        <SelectItem value="guided">Guided - Helpful suggestions</SelectItem>
                        <SelectItem value="assisted">Assisted - Comprehensive support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="space-y-6">
            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Advanced Settings</span>
                </CardTitle>
                <CardDescription>
                  Technical customization options for power users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Debug Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">AI Debug Mode</h3>
                      <p className="text-sm text-gray-600">Show AI reasoning and confidence scores</p>
                    </div>
                    <Switch />
                  </div>

                  {/* API Access */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">API Access</h3>
                      <p className="text-sm text-gray-600">Allow third-party apps to access your data</p>
                    </div>
                    <Switch />
                  </div>

                  {/* Experimental Features */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Experimental Features</h3>
                      <p className="text-sm text-gray-600">Try new AI features before they're released</p>
                    </div>
                    <Switch />
                  </div>

                  {/* Cache Management */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Clear AI Cache</h3>
                      <p className="text-sm text-gray-600">Reset AI learning data and preferences</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Technical details about your personalization setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">AI Model Version:</span> v2.4.1
                  </div>
                  <div>
                    <span className="font-medium">Last Training:</span> 2024-11-15
                  </div>
                  <div>
                    <span className="font-medium">Data Points Analyzed:</span> 1,247
                  </div>
                  <div>
                    <span className="font-medium">Prediction Accuracy:</span> 94.2%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default Settings?</DialogTitle>
            <DialogDescription>
              This will reset all personalization settings to their default values. You can always customize them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReset} className="bg-red-600 hover:bg-red-700">
              Reset Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Export Dialog */}
      <Dialog open={showDataExportDialog} onOpenChange={setShowDataExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Your Data</DialogTitle>
            <DialogDescription>
              Download a copy of your personal data and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data Format</Label>
              <Select defaultValue="json">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Range</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => console.log('Exporting data...')}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};