/**
 * Role-based Navigation Configuration
 * 
 * Defines which navigation items are available to each user role
 */

import {
  HomeIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  UsersIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  CogIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
  HeartIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  category: string;
  roles: ('insurance' | 'institution' | 'provider')[];
  badge?: string;
  description?: string;
}

/**
 * Insurance Provider Navigation
 */
export const insuranceNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard/insurance',
    icon: HomeIcon,
    category: 'Main',
    roles: ['insurance'],
    description: 'Overview of members, claims, and premiums',
  },
  {
    id: 'companies',
    label: 'Companies',
    path: '/companies',
    icon: BuildingOfficeIcon,
    category: 'Main',
    roles: ['insurance'],
    description: 'Manage employer companies and contracts',
  },
  {
    id: 'members',
    label: 'Members',
    path: '/members',
    icon: UsersIcon,
    category: 'Main',
    roles: ['insurance'],
    description: 'View and manage all members',
  },
  {
    id: 'premiums',
    label: 'Premiums',
    path: '/premiums',
    icon: CreditCardIcon,
    category: 'Main',
    roles: ['insurance'],
    description: 'Premium calculations and billing',
  },
  {
    id: 'benefits',
    label: 'Benefits',
    path: '/benefits',
    icon: ShieldCheckIcon,
    category: 'Main',
    roles: ['insurance'],
    description: 'Manage benefit plans',
  },
  {
    id: 'schemes-management',
    label: 'Schemes & Benefits',
    path: '/schemes-management',
    icon: ClipboardDocumentIcon,
    category: 'Management',
    roles: ['insurance'],
    description: 'Insurance schemes configuration',
  },
  {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    icon: CurrencyDollarIcon,
    category: 'Management',
    roles: ['insurance'],
    description: 'Financial operations and ledger',
  },
  {
    id: 'claims-management',
    label: 'Claims Processing',
    path: '/claims-management',
    icon: CheckCircleIcon,
    category: 'Management',
    roles: ['insurance'],
    description: 'Process and manage claims',
  },
  {
    id: 'regions',
    label: 'Regions',
    path: '/regions',
    icon: DocumentChartBarIcon,
    category: 'Management',
    roles: ['insurance'],
    description: 'Regional management',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    category: 'System',
    roles: ['insurance'],
    description: 'System configuration',
  },
];

/**
 * Medical Institution Navigation
 */
export const institutionNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard/institution',
    icon: HomeIcon,
    category: 'Main',
    roles: ['institution'],
    description: 'Institution overview and analytics',
  },
  {
    id: 'medical-institutions',
    label: 'Medical Institutions',
    path: '/medical-institutions',
    icon: BuildingOfficeIcon,
    category: 'Main',
    roles: ['institution'],
    description: 'Manage institution data',
  },
  {
    id: 'medical-personnel',
    label: 'Personnel',
    path: '/medical-personnel',
    icon: UserGroupIcon,
    category: 'Main',
    roles: ['institution'],
    description: 'Manage medical staff',
  },
  {
    id: 'provider-schemes-management',
    label: 'Schemes & Benefits',
    path: '/provider-schemes-management',
    icon: ClipboardDocumentIcon,
    category: 'Management',
    roles: ['institution'],
    description: 'Manage available schemes',
  },
  {
    id: 'claims-management',
    label: 'Claims Processing',
    path: '/claims-management',
    icon: CheckCircleIcon,
    category: 'Management',
    roles: ['institution'],
    description: 'Process institutional claims',
  },
  {
    id: 'patient-search',
    label: 'Patient Search',
    path: '/member-search',
    icon: UsersIcon,
    category: 'Management',
    roles: ['institution'],
    description: 'Search and verify members',
  },
  {
    id: 'quality',
    label: 'Quality & Documentation',
    path: '/quality',
    icon: DocumentChartBarIcon,
    category: 'Management',
    roles: ['institution'],
    description: 'Quality metrics and documentation',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    category: 'System',
    roles: ['institution'],
    description: 'Institution settings',
  },
];

/**
 * Healthcare Provider Navigation
 */
export const providerNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard/provider',
    icon: HomeIcon,
    category: 'Main',
    roles: ['provider'],
    description: 'Your clinical dashboard',
  },
  {
    id: 'patients',
    label: 'My Patients',
    path: '/patients',
    icon: UsersIcon,
    category: 'Main',
    roles: ['provider'],
    description: 'View your patient list',
  },
  {
    id: 'member-search',
    label: 'Member Search',
    path: '/member-search',
    icon: UserGroupIcon,
    category: 'Main',
    roles: ['provider'],
    description: 'Search and verify members',
  },
  {
    id: 'claim-submission',
    label: 'Submit Claim',
    path: '/provider-claim-submission',
    icon: ClipboardDocumentIcon,
    category: 'Main',
    roles: ['provider'],
    description: 'Submit patient claims',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: CalendarIcon,
    category: 'Management',
    roles: ['provider'],
    description: 'Manage appointments',
  },
  {
    id: 'earnings',
    label: 'My Earnings',
    path: '/earnings',
    icon: CurrencyDollarIcon,
    category: 'Management',
    roles: ['provider'],
    description: 'View earnings and payments',
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/messages',
    icon: ChatBubbleLeftIcon,
    category: 'Management',
    roles: ['provider'],
    badge: 'New',
    description: 'Communication with insurers',
  },
  {
    id: 'wellness',
    label: 'Wellness Programs',
    path: '/wellness/my-programs',
    icon: HeartIcon,
    category: 'Management',
    roles: ['provider'],
    description: 'Patient wellness initiatives',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    category: 'System',
    roles: ['provider'],
    description: 'Profile and settings',
  },
];

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(role: 'insurance' | 'institution' | 'provider'): NavItem[] {
  switch (role) {
    case 'insurance':
      return insuranceNavigation;
    case 'institution':
      return institutionNavigation;
    case 'provider':
      return providerNavigation;
    default:
      return [];
  }
}

/**
 * Get grouped navigation (by category)
 */
export function getGroupedNavigation(role: 'insurance' | 'institution' | 'provider'): Record<string, NavItem[]> {
  const navItems = getNavigationForRole(role);
  const grouped: Record<string, NavItem[]> = {};

  navItems.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });

  return grouped;
}

/**
 * Get role label and description
 */
export const roleLabels: Record<string, { label: string; description: string; color: string }> = {
  insurance: {
    label: 'Insurance Admin',
    description: 'Insurance Company Administrator',
    color: 'blue',
  },
  institution: {
    label: 'Institution Admin',
    description: 'Medical Institution Manager',
    color: 'green',
  },
  provider: {
    label: 'Healthcare Provider',
    description: 'Medical Professional',
    color: 'purple',
  },
};

/**
 * Get color classes for role
 */
export function getRoleColorClasses(role: 'insurance' | 'institution' | 'provider') {
  const colors = {
    insurance: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
      light: 'bg-blue-500',
      dark: 'bg-blue-600',
    },
    institution: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-800',
      light: 'bg-green-500',
      dark: 'bg-green-600',
    },
    provider: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-800',
      light: 'bg-purple-500',
      dark: 'bg-purple-600',
    },
  };
  return colors[role];
}
