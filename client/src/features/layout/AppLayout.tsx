import { useState } from "react";
import { cn } from "@/lib/utils";
import RoleSidebar from "./RoleSidebar";
import RoleAwareHeader from "./RoleAwareHeader";
import Breadcrumb from "@/components/Breadcrumb";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
      >
        <div 
          className="fixed inset-0 bg-neutral-900 bg-opacity-75"
          onClick={toggleSidebar}
          aria-hidden="true"
        ></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
          <RoleSidebar />
        </div>
      </div>
      
      {/* Desktop sidebar */}
      <RoleSidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleAwareHeader toggleSidebar={toggleSidebar} />
        <div className="px-6 pt-4 pb-2 bg-white border-b border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <Breadcrumb />
        </div>
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
