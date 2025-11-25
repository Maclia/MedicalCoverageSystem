import React, { ReactNode } from 'react';
// import { useLocation, useNavigate } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LockClosedIcon, HomeIcon } from '@heroicons/react/24/outline';
import Login from './Login';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('insurance' | 'institution' | 'provider')[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
  fallbackPath = '/login'
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  // const [location, navigate] = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // const returnUrl = encodeURIComponent(location);
    // const loginPath = `${fallbackPath}${returnUrl ? `?redirect=${returnUrl}` : ''}`;
    // navigate(loginPath, { replace: true });
    console.log('Would redirect to login');
    return null;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.userType)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <LockClosedIcon className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Your current role: <span className="font-semibold capitalize">{user.userType}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Required roles: {allowedRoles.join(', ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="w-full"
                variant="outline"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>

              <Button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full"
                variant="ghost"
              >
                Switch Account
              </Button>
            </div>

            {allowedRoles.includes('insurance') && user.userType === 'insurance' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  You have administrator access. You can manage all aspects of the system.
                </p>
              </div>
            )}

            {allowedRoles.includes('institution') && user.userType === 'institution' && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  You have institution access. You can manage providers, claims, and hospital operations.
                </p>
              </div>
            )}

            {allowedRoles.includes('provider') && user.userType === 'provider' && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  You have provider access. You can manage patients, appointments, and submit claims.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If all checks pass, render the children
  return <>{children}</>;
};

export default ProtectedRoute;