
import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Users, 
  Microscope, 
  ClipboardCheck, 
  BedDouble,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: string;
}

const DashboardLayout = ({ children, title, role }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Role-specific menu items
  const getMenuItems = () => {
    switch (role.toLowerCase()) {
      case 'admin':
        return [
          { icon: Home, label: 'Dashboard', path: '/admin-dashboard' },
          { icon: Users, label: 'Users', path: '/admin-dashboard' },
          { icon: BedDouble, label: 'Wards', path: '/admin-dashboard' },
          { icon: ClipboardCheck, label: 'Reports', path: '/admin-dashboard' },
          { icon: Settings, label: 'Settings', path: '/admin-dashboard' }
        ];
      case 'data encoder':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard' },
          { icon: Users, label: 'Patients', path: '/dashboard' },
          { icon: ClipboardCheck, label: 'Records', path: '/dashboard' }
        ];
      case 'lab technician':
        return [
          { icon: Home, label: 'Dashboard', path: '/lab-dashboard' },
          { icon: Microscope, label: 'Tests', path: '/lab-dashboard' },
          { icon: ClipboardCheck, label: 'Results', path: '/lab-dashboard' }
        ];
      case 'it officer':
        return [
          { icon: Home, label: 'Dashboard', path: '/it-dashboard' },
          { icon: Users, label: 'Accounts', path: '/it-dashboard' },
          { icon: Settings, label: 'System', path: '/it-dashboard' }
        ];
      default:
        return [
          { icon: Home, label: 'Dashboard', path: '/' }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo Area */}
        <div className={cn(
          "h-16 border-b border-gray-100 flex items-center px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && <h1 className="text-lg font-semibold text-gray-800">TraceMed</h1>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-4">
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <a 
                    href={item.path}
                    className={cn(
                      "flex items-center py-2.5 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mx-2",
                      collapsed ? "justify-center" : ""
                    )}
                  >
                    <item.icon size={20} className={collapsed ? "" : "mr-3"} />
                    {!collapsed && <span>{item.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* User Area */}
        <div className={cn(
          "p-4 border-t border-gray-100 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {role[0].toUpperCase()}
            </div>
            {!collapsed && <span className="ml-2 text-sm text-gray-600">{role}</span>}
          </div>
          {!collapsed && <LogoutButton />}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-medium text-gray-800">{title}</h1>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Bell size={20} />
            </Button>
            {collapsed && <LogoutButton />}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
