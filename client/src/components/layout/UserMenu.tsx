import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleColorClasses, roleLabels } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

/**
 * User Profile Menu in Header
 * Shows logged-in user info and logout/settings options
 */
export default function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const colors = getRoleColorClasses(user.userType);
  const roleInfo = roleLabels[user.userType];

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSettings = () => {
    navigate('/profile');
    setIsOpen(false);
  };

  const userInitials = user.email
    .split('@')[0]
    .split('.')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-expanded={isOpen}
      >
        <div className={`h-8 w-8 rounded-full ${colors.light} flex items-center justify-center text-white text-sm font-semibold`}>
          {userInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{user.email}</p>
          <p className="text-xs text-gray-500 capitalize">{roleInfo.label}</p>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2">
          {/* User Info Header */}
          <div className={`px-4 py-3 border-b ${colors.border} ${colors.bg}`}>
            <p className="text-sm font-semibold text-gray-900">{user.email}</p>
            <p className={`text-xs mt-1 ${colors.text} font-medium`}>{roleInfo.label}</p>
            <p className="text-xs text-gray-600 mt-1">{user.userType === 'insurance' && user.entityData?.entityName ? `Company: ${user.entityData.entityName}` : user.entityData?.entityName || 'No entity assigned'}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile */}
            <button
              onClick={handleSettings}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserCircleIcon className="h-4 w-4 mr-3 text-gray-400" />
              <span>My Profile</span>
            </button>

            {/* Settings */}
            <button
              onClick={handleSettings}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
              <span>Settings</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Logout */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
              <span>{isLoading ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
