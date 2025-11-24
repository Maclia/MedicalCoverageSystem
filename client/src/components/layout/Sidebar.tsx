import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";

interface SidebarLink {
  path: string;
  label: string;
  icon: string;
}

const mainLinks: SidebarLink[] = [
  { path: "/", label: "Dashboard", icon: "dashboard" },
  { path: "/companies", label: "Companies", icon: "business" },
  { path: "/members", label: "Members", icon: "people" },
  { path: "/premiums", label: "Premiums", icon: "payments" },
  { path: "/benefits", label: "Benefits", icon: "medical_services" },
];

const medicalPanelLinks: SidebarLink[] = [
  { path: "/regions", label: "Regions", icon: "explore" },
  { path: "/medical-institutions", label: "Institutions", icon: "local_hospital" },
  { path: "/medical-personnel", label: "Personnel", icon: "person" },
  { path: "/panel-documentation", label: "Documentation", icon: "folder" },
  { path: "/claims", label: "Legacy Claims", icon: "receipt_long" },
  { path: "/claims-management", label: "Claims Processing", icon: "fact_check" },
  { path: "/provider-claim-submission", label: "Submit Claim", icon: "add_circle" },
];

const managementLinks: SidebarLink[] = [
  { path: "/periods", label: "Periods", icon: "history" },
  { path: "/reports", label: "Reports", icon: "description" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-neutral-200">
      <div className="p-4 border-b border-neutral-200 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-primary">MediCorp Insurance</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Main
        </div>
        {mainLinks.map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50",
              location === link.path && "bg-primary-50 border-l-4 border-primary"
            )}
          >
            <i className="material-icons text-lg mr-3 text-neutral-500">{link.icon}</i>
            {link.label}
          </Link>
        ))}
        
        <div className="px-4 mt-6 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Medical Panel
        </div>
        {medicalPanelLinks.map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50",
              location === link.path && "bg-primary-50 border-l-4 border-primary"
            )}
          >
            <i className="material-icons text-lg mr-3 text-neutral-500">{link.icon}</i>
            {link.label}
          </Link>
        ))}
        
        <div className="px-4 mt-6 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Management
        </div>
        {managementLinks.map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50",
              location === link.path && "bg-primary-50 border-l-4 border-primary"
            )}
          >
            <i className="material-icons text-lg mr-3 text-neutral-500">{link.icon}</i>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center">
          <AvatarWithInitials name="Admin User" />
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-700">Admin User</p>
            <p className="text-xs text-neutral-500">Administrator</p>
          </div>
          <div className="ml-auto">
            <button className="text-neutral-500 hover:text-neutral-700">
              <i className="material-icons">logout</i>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
