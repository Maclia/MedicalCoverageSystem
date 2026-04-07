import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels, getRoleColorClasses } from '@/config/navigation';
import UserMenu from './UserMenu';
import {
  Bars3Icon,
  BellIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  toggleSidebar: () => void;
}

/**
 * Enhanced Header with User Context
 * Shows current page title, user role, notifications, and user menu
 */
export default function RoleAwareHeader({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Get page title based on current route
  const getPageTitle = (): string => {
    const pathSegments = location.split('/').filter(Boolean);
    
    const titleMap: Record<string, string> = {
      // Insurance
      '': 'Dashboard',
      'dashboard': 'Dashboard',
      'dashboard/insurance': 'Insurance Dashboard',
      'companies': 'Companies',
      'members': 'Members',
      'dependents': 'Dependents',
      'premiums': 'Premiums',
      'periods': 'Periods',
      'benefits': 'Benefits',
      'regions': 'Regions',
      'schemes-management': 'Schemes & Benefits',
      'finance': 'Finance',
      'claims-management': 'Claims Processing',
      'analytics': 'Analytics',

      // Institution
      'dashboard/institution': 'Institution Dashboard',
      'medical-institutions': 'Medical Institutions',
      'medical-personnel': 'Personnel',
      'quality': 'Quality & Documentation',
      'patient-search': 'Patient Search',
      'member-search': 'Member Search',

      // Provider
      'dashboard/provider': 'Provider Dashboard',
      'patients': 'My Patients',
      'appointments': 'Appointments',
      'earnings': 'My Earnings',
      'messages': 'Messages',
      'provider-claim-submission': 'Submit Claim',
      'provider-schemes-management': 'Schemes & Benefits',
      'provider-verification': 'Member Verification',
      'wellness': 'Wellness Programs',

      // Shared
      'claims': 'Claims',
      'communication': 'Communication',
      'risk-assessment': 'Risk Assessment',
      'profile': 'My Profile',
      'settings': 'Settings',
      'not-found': 'Page Not Found',
    };

    const baseRoute = pathSegments[0] || '';
    return titleMap[location.replace('/', '').split('/')[0]] || 'Dashboard';
  };

  const roleInfo = user ? roleLabels[user.userType] : null;
  const colors = user ? getRoleColorClasses(user.userType) : null;
  const pageTitle = getPageTitle();

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left Section: Menu & Title */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{pageTitle}</h2>
            {user && colors && (
              <p className={`text-xs ${colors.text} font-medium`}>
                {roleInfo?.label}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Actions & User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 relative"
            aria-label="Notifications"
          >
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Help */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
            aria-label="Help"
          >
            <QuestionMarkCircleIcon className="h-6 w-6" />
          </button>

          {/* User Menu */}
          <div className="ml-4 border-l border-gray-200">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}