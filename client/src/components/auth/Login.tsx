import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  BuildingOfficeIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

type UserRole = 'insurance' | 'institution' | 'provider';

interface RoleInfo {
  type: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
}

const roleInfos: RoleInfo[] = [
  {
    type: 'insurance',
    title: 'Insurance Provider',
    description: 'Access company management, member enrollment, premium calculation, and comprehensive analytics',
    icon: BuildingOfficeIcon,
    color: 'blue',
    features: ['Member Management', 'Premium Calculation', 'Claims Processing', 'Analytics Dashboard', 'System Administration'],
  },
  {
    type: 'institution',
    title: 'Medical Institution',
    description: 'Manage medical institution data, provider networks, and healthcare facility information',
    icon: BuildingLibraryIcon,
    color: 'green',
    features: ['Institution Profile', 'Provider Management', 'Schemes & Benefits', 'Claim Processing', 'Quality Metrics'],
  },
  {
    type: 'provider',
    title: 'Healthcare Provider',
    description: 'Submit claims, access member verification, manage patient care documentation',
    icon: UserGroupIcon,
    color: 'purple',
    features: ['Claim Submission', 'Member Verification', 'Patient Care', 'Documentation', 'Treatment Planning'],
  },
];

const Login: React.FC = () => {
  // const navigate = useNavigate();
  // const [location] = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'insurance' as UserRole,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('insurance');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';
      // navigate(redirectTo);
      console.log('User authenticated, would redirect to dashboard');
    }
  }, [isAuthenticated]);

  // Clear error when form data changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData.email, formData.password, selectedRole]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setFormData(prev => ({
      ...prev,
      userType: role,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
        userType: selectedRole,
      });
    } catch (error) {
      // Error is handled by auth context
      console.error('Login error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  const getRoleColorClasses = (role: UserRole) => {
    const colors = {
      insurance: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        badge: 'bg-blue-100 text-blue-800',
        selected: 'border-blue-500 bg-blue-50 ring-blue-200',
      },
      institution: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        badge: 'bg-green-100 text-green-800',
        selected: 'border-green-500 bg-green-50 ring-green-200',
      },
      provider: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        badge: 'bg-purple-100 text-purple-800',
        selected: 'border-purple-500 bg-purple-50 ring-purple-200',
      },
    };
    return colors[role];
  };

  const selectedRoleInfo = roleInfos.find(role => role.type === selectedRole);
  const roleColors = getRoleColorClasses(selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Medical Coverage System
          </h1>
          <p className="text-xl text-gray-600">
            Comprehensive Healthcare Management Platform
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Role Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Select Your Role</CardTitle>
                <CardDescription className="text-center">
                  Choose the role that best describes your position in the healthcare ecosystem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roleInfos.map((roleInfo) => {
                  const Icon = roleInfo.icon;
                  const isSelected = selectedRole === roleInfo.type;
                  const colors = getRoleColorClasses(roleInfo.type);

                  return (
                    <div
                      key={roleInfo.type}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${colors.selected} ring-2`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleRoleSelect(roleInfo.type)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-6 w-6 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {roleInfo.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {roleInfo.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {roleInfo.features.slice(0, 3).map((feature, index) => (
                              <Badge key={index} className={`text-xs ${colors.badge}`}>
                                {feature}
                              </Badge>
                            ))}
                            {roleInfo.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{roleInfo.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className={`absolute top-4 right-4 h-6 w-6 rounded-full ${colors.bg} flex items-center justify-center`}>
                            <div className={`h-3 w-3 rounded-full ${colors.text} bg-current`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Sign In
                </CardTitle>
                {selectedRoleInfo && (
                  <CardDescription className="text-center">
                    Signing in as{' '}
                    <span className={`font-semibold ${roleColors.text}`}>
                      {selectedRoleInfo.title}
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="h-11 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 w-11 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || !formData.email || !formData.password}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Demo Accounts:
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p>Insurance: admin@medicover.com / admin123</p>
                    <p>Institution: hospital@medicover.com / hospital123</p>
                    <p>Provider: doctor@medicover.com / doctor123</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role-Specific Features */}
            {selectedRoleInfo && (
              <Card className={`${roleColors.bg} ${roleColors.border}`}>
                <CardContent className="pt-6">
                  <h4 className={`font-semibold ${roleColors.text} mb-3`}>
                    Available Features for {selectedRoleInfo.title}:
                  </h4>
                  <ul className="space-y-2">
                    {selectedRoleInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <div className={`h-2 w-2 rounded-full ${roleColors.text} bg-current mr-3`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;