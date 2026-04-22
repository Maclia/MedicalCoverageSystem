import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/features/actions/contexts/AuthContext';
import { getRoleColorClasses } from '@/config/navigation';

/**
 * Dashboard Selector
 * Redirects users to their role-specific dashboard
 * or shows appropriate dashboard based on user role
 */
export default function DashboardSelector() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to role-specific dashboard
      const dashboardRoute = `/dashboard/${user.userType}`;
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to MediCorp</h1>
          <p className="text-lg text-gray-600">Please log in to continue.</p>
        </div>
      </div>
    );
  }

  const colors = getRoleColorClasses(user.userType);
  const roleEmojis = {
    insurance: '🏢',
    institution: '🏥',
    provider: '👨‍⚕️',
  };

  return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center p-4`}>
      <div className="text-center">
        <div className="text-6xl mb-4">{roleEmojis[user.userType]}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user.email}!</h1>
        <p className={`text-lg ${colors.text} font-medium mb-4`}>Redirecting to your dashboard...</p>
        <div className={`animate-pulse h-1 w-32 ${colors.light} rounded-full mx-auto`}></div>
      </div>
    </div>
  );
}