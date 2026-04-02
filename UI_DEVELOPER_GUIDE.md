# UI Alignment - Developer Quick Reference

## 🚀 Quick Start

### View Test Credentials
**Insurance Admin**:
- Email: `admin@medicover.com`
- Password: `admin123`
- Expected Dashboard: `/dashboard/insurance` (Blue)

**Hospital Manager**:
- Email: `hospital@medicover.com`
- Password: `hospital123`
- Expected Dashboard: `/dashboard/institution` (Green)

**Healthcare Provider**:
- Email: `doctor@medicover.com`
- Password: `doctor123`
- Expected Dashboard: `/dashboard/provider` (Purple)

---

## 📖 Component Documentation

### RoleSidebar Component
**Location**: `client/src/components/layout/RoleSidebar.tsx`

**Features**:
- Automatically filters navigation based on `user.userType`
- Groups items by category (Main, Management, System)
- Highlights current page
- Shows user info footer

**Usage**:
```tsx
import RoleSidebar from '@/components/layout/RoleSidebar';

<RoleSidebar /> // Uses AuthContext to get user role
```

**Props**: None (uses AuthContext internally)

**Dependencies**:
- `useAuth()` from AuthContext
- `getGroupedNavigation()` from config/navigation

---

### RoleAwareHeader Component
**Location**: `client/src/components/layout/RoleAwareHeader.tsx`

**Features**:
- Displays current page title
- Shows user email and role
- Role-specific styling
- Notifications and help buttons
- Integrates UserMenu

**Usage**:
```tsx
import RoleAwareHeader from '@/components/layout/RoleAwareHeader';

interface Props {
  toggleSidebar: () => void; // Mobile sidebar toggle
}

<RoleAwareHeader toggleSidebar={toggleSidebar} />
```

**Auto Page Titles**:
- Based on current route (wouter location)
- Updates automatically when route changes
- Customizable via `titleMap` in component

---

### UserMenu Component
**Location**: `client/src/components/layout/UserMenu.tsx`

**Features**:
- User avatar with initials
- Dropdown menu with click-outside detection
- Profile and settings links
- Logout with loading state
- Shows entity/company name

**Usage**:
```tsx
import UserMenu from '@/components/layout/UserMenu';

<UserMenu /> // Uses AuthContext
```

**Props**: None  

**Callbacks**:
- Profile click → navigates to `/profile`
- Logout click → calls `logout()` then redirects to `/login`

---

### ProtectedRoute Component
**Location**: `client/src/components/auth/ProtectedRoute.tsx`

**Features**:
- Authenticates before rendering
- Role-based access control
- Auto-redirect to login if needed
- Access denied UI
- Loading state

**Usage**:
```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// No role restriction (all authenticated users)
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

// With role restrictions
<ProtectedRoute allowedRoles={['insurance', 'institution']}>
  <AdminPanel />
</ProtectedRoute>
```

**Props**:
```tsx
{
  children: ReactNode;
  allowedRoles?: ('insurance' | 'institution' | 'provider')[];
  requireAuth?: boolean; // default: true
  fallbackPath?: string; // default: '/login'
}
```

**Behavior**:
- Loading → Shows spinner
- Not authenticated → Redirects to fallbackPath
- Role mismatch → Shows access denied card
- OK → Renders children

---

### DashboardSelector Component
**Location**: `client/src/pages/DashboardSelector.tsx`

**Features**:
- Auto-detects user role
- Redirects to `/dashboard/{role}`
- Loading state
- Handles unauthenticated users

**Usage in App.tsx**:
```tsx
import DashboardSelector from '@/pages/DashboardSelector';

<Route path="/" component={DashboardSelector} />
```

---

## ⚙️ Navigation Configuration

**Location**: `client/src/config/navigation.ts`

### Adding Navigation Items

```typescript
// Add to appropriate array (insuranceNavigation, institutionNavigation, or providerNavigation)
export const insuranceNavigation: NavItem[] = [
  {
    id: 'unique-id',
    label: 'Reports',
    path: '/reports',
    icon: DocumentIcon,
    category: 'Management',
    roles: ['insurance'],
    description: 'View and generate reports',
    badge: 'New' // Optional
  },
  // ... more items
];
```

### NavItem Properties
```typescript
interface NavItem {
  id: string;                    // Unique identifier
  label: string;                 // Display text
  path: string;                  // Route path
  icon: React.ComponentType;     // Heroicons component
  category: string;              // Grouping (Main, Management, System)
  roles: ('insurance' | ...)[]; // Which roles can see this
  badge?: string;                // Optional badge text
  description?: string;          // Tooltip text (optional)
}
```

### Helper Functions

```typescript
// Get navigation for a specific role
const items = getNavigationForRole('insurance');

// Get grouped navigation (by category)
const grouped = getGroupedNavigation('institution');
// Returns: { Main: [...], Management: [...], System: [...] }

// Get role display info
const info = roleLabels['provider'];
// Returns: { label, description, color }

// Get role colors
const colors = getRoleColorClasses('insurance');
// Returns: { bg, border, text, badge, light, dark }
```

---

## 🔑 Working with AuthContext

### User Type
```typescript
interface User {
  id: number;
  email: string;
  userType: 'insurance' | 'institution' | 'provider';
  entityId: number;
  isActive: boolean;
  lastLogin?: Date;
  entityData: any;
}
```

### Auth Methods
```typescript
const { 
  user,              // Current user object or null
  isAuthenticated,   // Boolean
  isLoading,         // Boolean
  error,             // Error string or null
  login,             // (credentials) => Promise<void>
  logout,            // () => Promise<void>
  hasRole,           // (role) => boolean
  clearError         // () => void
} = useAuth();
```

---

## 🎨 Using Role Colors

```typescript
import { getRoleColorClasses } from '@/config/navigation';

const colors = getRoleColorClasses(user.userType);

// Available colors:
colors.bg       // bg-{color}-50
colors.border   // border-{color}-200
colors.text     // text-{color}-900
colors.badge    // bg-{color}-100 text-{color}-800
colors.light    // bg-{color}-500
colors.dark     // bg-{color}-600
```

### Example Usage
```tsx
<div className={colors.bg}>
  <h2 className={colors.text}>Section Title</h2>
  <button className={`${colors.light} text-white`}>Action</button>
</div>
```

---

## 🧭 Navigation Usage Patterns

### Sidebar Navigation
```tsx
const grouped = getGroupedNavigation(user.userType);

Object.entries(grouped).map(([category, items]) => (
  <div key={category}>
    <h3>{category}</h3>
    {items.map(item => (
      <Link key={item.id} href={item.path}>
        <item.icon /> {item.label}
      </Link>
    ))}
  </div>
))
```

### Breadcrumb
```tsx
const navItem = insuranceNavigation.find(i => i.path === location);
<span>{navItem?.label || 'Dashboard'}</span>
```

### Mobile Menu
```tsx
getNavigationForRole(user.userType).map(item => (
  <button 
    key={item.id}
    onClick={() => navigate(item.path)}
  >
    {item.label}
  </button>
))
```

---

## 🔒 Protected Routes Examples

### Simple Protection (Any Authenticated User)
```tsx
<Route path="/profile">
  <ProtectedRoute>
    <ProfilePage />
  </ProtectedRoute>
</Route>
```

### Role-Specific (Insurance Only)
```tsx
<Route path="/companies">
  <ProtectedRoute allowedRoles={['insurance']}>
    <CompaniesPage />
  </ProtectedRoute>
</Route>
```

### Multiple Roles
```tsx
<Route path="/claims">
  <ProtectedRoute allowedRoles={['insurance', 'institution', 'provider']}>
    <ClaimsPage />
  </ProtectedRoute>
</Route>
```

---

## 🚧 Common Issues & Solutions

### Issue: Sidebar Not Updating
**Cause**: AuthContext not loading user  
**Solution**: Check `useAuth()` returns `user` object

### Issue: Navigation Links Not Working
**Cause**: Wouter route not configured  
**Solution**: Verify route exists in App.tsx

### Issue: Access Denied Shown to Correct User
**Cause**: Role mismatch in allowedRoles array  
**Solution**: Verify role spelling (lowercase)

### Issue: Redirect Loop
**Cause**: ProtectedRoute fallback path is protected  
**Solution**: Ensure fallback path (default: `/login`) is not protected

---

## 📱 Mobile Responsive Design

### Sidebar
- Hidden on mobile (`hidden md:flex`)
- Toggle with hamburger menu
- Overlay on mobile

### Header
- Always visible
- Menu icon on mobile
- Collapses user info

### User Menu
- Dropdown on all screens
- Touch-friendly buttons

---

## 🧪 Testing Navigation

### Test Role-Based Access
```bash
# Insurance Admin can access these
GET /api/core/companies
GET /api/core/members
GET /finance/dashboard

# Hospital Manager cannot access these
GET /api/core/companies → 403 Forbidden
GET /finance/dashboard → 403 Forbidden
```

### Test Login Flow
```bash
1. Logout
2. Login with insurance credentials
3. Should redirect to /dashboard/insurance
4. Sidebar shows insurance items
5. Header shows "Insurance Admin"
```

### Test Unauthorized Access
```bash
1. Login as insurance admin
2. Manually visit /medical-institutions
3. Should show "Access Denied" card
4. "Go to Dashboard" button works
```

---

## 📚 File Structure
```
client/src/
├── config/
│   └── navigation.ts          ← Navigation config
├── components/
│   ├── auth/
│   │   ├── Login.tsx          ← Login page
│   │   └── ProtectedRoute.tsx  ← Route protection
│   ├── layout/
│   │   ├── AppLayout.tsx       ← Main layout
│   │   ├── RoleSidebar.tsx     ← Dynamic sidebar
│   │   ├── RoleAwareHeader.tsx ← User-aware header
│   │   └── UserMenu.tsx        ← Profile menu
│   └── dashboards/
│       ├── InsuranceDashboard.tsx   ← Insurance specific
│       ├── InstitutionDashboard.tsx ← Hospital specific
│       └── ProviderDashboard.tsx    ← Provider specific
├── contexts/
│   └── AuthContext.tsx        ← Auth state
└── pages/
    ├── DashboardSelector.tsx   ← Auto-redirector
    └── ...other pages
```

---

## ✅ Checklist for New Developers

- [ ] Understand role types: insurance, institution, provider
- [ ] Know test credentials for each role
- [ ] Know location of navigation config
- [ ] Understand how ProtectedRoute works
- [ ] Can add new navigation items
- [ ] Understand role colors (blue, green, purple)
- [ ] Know how to use AuthContext
- [ ] Tested login flow with all roles
- [ ] Tested access control
- [ ] Checked responsive design

---

## 🆘 Still Need Help?

1. Check UI_ALIGNMENT_AUDIT.md for issues
2. Check UI_ALIGNMENT_FIXES.md for solutions
3. Review navigation.ts for config examples
4. Look at RoleSidebar.tsx for component pattern
5. Check ProtectedRoute.tsx for auth logic

---

**Last Updated**: April 2, 2026  
**Version**: 1.0
