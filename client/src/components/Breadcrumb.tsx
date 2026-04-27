import React from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'dashboard/insurance': 'Insurance Dashboard',
  'dashboard/institution': 'Institution Dashboard',
  'dashboard/provider': 'Provider Dashboard',
  'companies': 'Companies',
  'members': 'Members',
  'dependents': 'Dependents',
  'premiums': 'Premiums',
  'periods': 'Periods',
  'benefits': 'Benefits',
  'regions': 'Regions',
  'analytics': 'Analytics',
  'claims-management': 'Claims Management',
  'schemes-management': 'Schemes Management',
  'finance': 'Finance',
  'medical-institutions': 'Medical Institutions',
  'medical-personnel': 'Medical Personnel',
  'institution-analytics': 'Institution Analytics',
  'quality': 'Quality Documentation',
  'provider-claim-submission': 'Claim Submission',
  'provider-schemes-management': 'Provider Schemes',
  'appointments': 'Appointments',
  'patients': 'Patients',
  'member-search': 'Member Search',
  'earnings': 'Earnings',
  'messages': 'Messages',
  'claims': 'Claims',
  'wellness': 'Wellness',
  'risk-assessment': 'Risk Assessment',
  'profile': 'Profile',
  'settings': 'Settings',
};

const Breadcrumb: React.FC = () => {
  const [location] = useLocation();
  
  // Remove leading slash and split into segments
  const pathSegments = location.replace(/^\//, '').split('/').filter(Boolean);
  
  // Build breadcrumb items
  const items: BreadcrumbItem[] = [
    { label: 'Home', path: '/' }
  ];
  
  let accumulatedPath = '';
  
  for (let i = 0; i < pathSegments.length; i++) {
    accumulatedPath += '/' + pathSegments[i];
    const fullPath = accumulatedPath;
    const segment = pathSegments[i];
    
    // Check if segment is an ID (numeric or UUID)
    const isIdSegment = /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    
    let label = routeLabels[accumulatedPath.replace(/^\//, '')] || routeLabels[segment];
    
    if (!label) {
      if (isIdSegment) {
        label = `#${segment}`;
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }
    }
    
    items.push({
      label,
      path: fullPath,
      isActive: i === pathSegments.length - 1
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            )}
            
            {index === 0 ? (
              <Link
                href={item.path}
                className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <Home className="h-4 w-4" />
              </Link>
            ) : item.isActive ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.path}
                className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;