import { Link, useLocation } from 'wouter';
import { useAuth } from '@/features/actions/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getGroupedNavigation, getRoleColorClasses, roleLabels } from '@/config/navigation';
import { Divider } from '@/ui/divider';

/**
 * Role-aware Navigation Sidebar
 * Displays different navigation items based on user's role
 */
export default function RoleSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const roleInfo = roleLabels[user.userType];
  const colors = getRoleColorClasses(user.userType);
  const groupedNav = getGroupedNavigation(user.userType);

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b ${colors.border}`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900">MediCorp</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
            {user.userType === 'insurance' ? 'Admin' : user.userType === 'institution' ? 'Hospital' : 'Provider'}
          </span>
        </div>
        <p className="text-xs text-gray-600">{roleInfo.label}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {Object.entries(groupedNav).map(([category, items]: [string, Array<{ id: string; path: string; label: string; description: string; icon: React.ComponentType<{ className?: string }>; badge?: string }>]) => (
          <div key={category}>
            <div className={`px-4 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider`}>
              {category}
            </div>
            {items.map((item: { id: string; path: string; label: string; description: string; icon: React.ComponentType<{ className?: string }>; badge?: string }) => (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors',
                  location === item.path && `${colors.bg} border-l-4 ${colors.border} text-gray-900`
                )}
                title={item.description}
              >
                <item.icon className={cn('h-5 w-5 mr-3 text-neutral-500', location === item.path && colors.text)} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            {category !== Object.keys(groupedNav)[Object.keys(groupedNav).length - 1] && (
              <div className="my-2" />
            )}
          </div>
        ))}
      </nav>

      {/* Footer with User Info */}
      <div className={`p-4 border-t ${colors.border} bg-gray-50`}>
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-full ${colors.light} flex items-center justify-center text-white font-bold`}>
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            <p className="text-xs text-gray-600 truncate capitalize">{user.userType}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}