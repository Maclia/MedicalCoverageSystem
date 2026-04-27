import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Bell, Palette, Keyboard, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/actions/contexts/AuthContext';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  timezone: z.string().default('Africa/Nairobi'),
  locale: z.string().default('en-US'),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  soundAlerts: z.boolean().default(true),
  desktopNotifications: z.boolean().default(false),
  claimUpdates: z.boolean().default(true),
  memberAlerts: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
  systemAnnouncements: z.boolean().default(true),
});

const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  density: z.enum(['comfortable', 'compact', 'standard']).default('standard'),
  sidebarWidth: z.number().min(200).max(400).default(280),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
});

const securitySchema = z.object({
  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.number().default(30),
  allowRememberMe: z.boolean().default(true),
  deviceFingerprinting: z.boolean().default(true),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;
type AppearanceFormData = z.infer<typeof appearanceSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;

const UserSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      timezone: 'Africa/Nairobi',
      locale: 'en-US',
    }
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      soundAlerts: true,
      desktopNotifications: false,
      claimUpdates: true,
      memberAlerts: true,
      paymentReminders: true,
      systemAnnouncements: true,
    }
  });

  const appearanceForm = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: 'system',
      density: 'standard',
      sidebarWidth: 280,
      reducedMotion: false,
      highContrast: false,
    }
  });

  const securityForm = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      allowRememberMe: true,
      deviceFingerprinting: true,
    }
  });

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitNotifications = async (data: NotificationFormData) => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notification preferences updated",
        description: "Your notification settings have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitAppearance = async (data: AppearanceFormData) => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Apply theme immediately
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (data.theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
      
      toast({
        title: "Appearance settings updated",
        description: "Your display preferences have been applied.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appearance settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitSecurity = async (data: SecurityFormData) => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Security settings updated",
        description: "Your security preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update security settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and system configuration
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register('firstName')}
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...profileForm.register('lastName')}
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register('email')}
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...profileForm.register('phone')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={profileForm.watch('timezone')}
                      onValueChange={(value) => profileForm.setValue('timezone', value)}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Nairobi">East Africa Time (Nairobi)</SelectItem>
                        <SelectItem value="Africa/Johannesburg">South Africa Standard Time</SelectItem>
                        <SelectItem value="Africa/Lagos">West Africa Time</SelectItem>
                        <SelectItem value="Europe/London">Greenwich Mean Time</SelectItem>
                        <SelectItem value="America/New_York">Eastern Standard Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locale">Language</Label>
                    <Select
                      value={profileForm.watch('locale')}
                      onValueChange={(value) => profileForm.setValue('locale', value)}
                    >
                      <SelectTrigger id="locale">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive alerts and updates
              </CardDescription>
            </CardHeader>
            <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Delivery Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={notificationForm.watch('emailNotifications')}
                        onCheckedChange={(checked) => notificationForm.setValue('emailNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="pushNotifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        checked={notificationForm.watch('pushNotifications')}
                        onCheckedChange={(checked) => notificationForm.setValue('pushNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="soundAlerts">Sound Alerts</Label>
                        <p className="text-sm text-muted-foreground">Play sound for important notifications</p>
                      </div>
                      <Switch
                        id="soundAlerts"
                        checked={notificationForm.watch('soundAlerts')}
                        onCheckedChange={(checked) => notificationForm.setValue('soundAlerts', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="claimUpdates">Claim Updates</Label>
                        <p className="text-sm text-muted-foreground">Notify when claim status changes</p>
                      </div>
                      <Switch
                        id="claimUpdates"
                        checked={notificationForm.watch('claimUpdates')}
                        onCheckedChange={(checked) => notificationForm.setValue('claimUpdates', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="memberAlerts">Member Alerts</Label>
                        <p className="text-sm text-muted-foreground">Important member status changes</p>
                      </div>
                      <Switch
                        id="memberAlerts"
                        checked={notificationForm.watch('memberAlerts')}
                        onCheckedChange={(checked) => notificationForm.setValue('memberAlerts', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="paymentReminders">Payment Reminders</Label>
                        <p className="text-sm text-muted-foreground">Premium payment due reminders</p>
                      </div>
                      <Switch
                        id="paymentReminders"
                        checked={notificationForm.watch('paymentReminders')}
                        onCheckedChange={(checked) => notificationForm.setValue('paymentReminders', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="systemAnnouncements">System Announcements</Label>
                        <p className="text-sm text-muted-foreground">System maintenance and updates</p>
                      </div>
                      <Switch
                        id="systemAnnouncements"
                        checked={notificationForm.watch('systemAnnouncements')}
                        onCheckedChange={(checked) => notificationForm.setValue('systemAnnouncements', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <form onSubmit={appearanceForm.handleSubmit(onSubmitAppearance)}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={appearanceForm.watch('theme')}
                      onValueChange={(value: any) => appearanceForm.setValue('theme', value)}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System Default</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="density">Interface Density</Label>
                    <Select
                      value={appearanceForm.watch('density')}
                      onValueChange={(value: any) => appearanceForm.setValue('density', value)}
                    >
                      <SelectTrigger id="density">
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="reducedMotion">Reduced Motion</Label>
                      <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
                    </div>
                    <Switch
                      id="reducedMotion"
                      checked={appearanceForm.watch('reducedMotion')}
                      onCheckedChange={(checked) => appearanceForm.setValue('reducedMotion', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="highContrast">High Contrast</Label>
                      <p className="text-sm text-muted-foreground">Increase contrast for better readability</p>
                    </div>
                    <Switch
                      id="highContrast"
                      checked={appearanceForm.watch('highContrast')}
                      onCheckedChange={(checked) => appearanceForm.setValue('highContrast', checked)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Applying...' : 'Apply Settings'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage account security and authentication options
              </CardDescription>
            </CardHeader>
            <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Switch
                      id="twoFactorEnabled"
                      checked={securityForm.watch('twoFactorEnabled')}
                      onCheckedChange={(checked) => securityForm.setValue('twoFactorEnabled', checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="5"
                      max="120"
                      {...securityForm.register('sessionTimeout', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowRememberMe">Remember Me</Label>
                      <p className="text-sm text-muted-foreground">Allow persistent login sessions</p>
                    </div>
                    <Switch
                      id="allowRememberMe"
                      checked={securityForm.watch('allowRememberMe')}
                      onCheckedChange={(checked) => securityForm.setValue('allowRememberMe', checked)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Security Settings'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserSettingsPage;