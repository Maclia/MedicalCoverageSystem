import { useLocation } from "wouter";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  
  // Function to get the page title based on the current location
  const getPageTitle = (): string => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/companies":
        return "Companies";
      case "/members":
        return "Members";
      case "/dependents": 
        return "Dependents";
      case "/premiums":
        return "Premiums";
      case "/periods":
        return "Periods";
      case "/benefits":
        return "Benefits";
      case "/regions":
        return "Regions";
      case "/medical-institutions":
        return "Medical Institutions";
      case "/medical-personnel":
        return "Medical Personnel";
      case "/panel-documentation":
        return "Panel Documentation";
      case "/claims":
        return "Claims";
      case "/reports":
        return "Reports";
      case "/settings":
        return "Settings";
      default:
        return "MediCorp Insurance";
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="md:hidden mr-4 text-neutral-700 focus:outline-none"
          >
            <i className="material-icons">menu</i>
          </button>
          <h2 className="text-lg font-semibold text-neutral-700">{getPageTitle()}</h2>
        </div>
        <div className="flex items-center">
          <button className="p-2 rounded-full text-neutral-500 hover:bg-neutral-50 hover:text-primary">
            <i className="material-icons">notifications</i>
          </button>
          <button className="ml-2 p-2 rounded-full text-neutral-500 hover:bg-neutral-50 hover:text-primary">
            <i className="material-icons">help_outline</i>
          </button>
        </div>
      </div>
    </header>
  );
}
