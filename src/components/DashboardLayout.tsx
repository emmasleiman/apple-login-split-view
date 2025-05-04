
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
  Bell,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar
} from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: string;
}

// Inner layout component that uses the sidebar context
const DashboardLayoutInner = ({ children, title, role }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state: sidebarState } = useSidebar();

  // Role-specific menu items
  const getMenuItems = () => {
    switch (role.toLowerCase()) {
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
          { icon: Users, label: 'Users', path: '/admin-dashboard' },
          { icon: BedDouble, label: 'Wards', path: '/admin-dashboard' },
          { icon: ClipboardCheck, label: 'Reports', path: '/admin-dashboard' },
          { icon: Settings, label: 'Settings', path: '/admin-dashboard' }
        ];
      case 'data encoder':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: Users, label: 'Patients', path: '/dashboard' },
          { icon: ClipboardCheck, label: 'Records', path: '/dashboard' }
        ];
      case 'lab technician':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/lab-dashboard' },
          { icon: Microscope, label: 'Tests', path: '/lab-dashboard' },
          { icon: ClipboardCheck, label: 'Results', path: '/lab-dashboard' }
        ];
      case 'it officer':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/it-dashboard' },
          { icon: Users, label: 'Accounts', path: '/it-dashboard' },
          { icon: Settings, label: 'System', path: '/it-dashboard' }
        ];
      default:
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/' }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen w-full bg-gray-50 font-inter">
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 border-b border-sidebar-border flex items-center px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            TraceMed
          </h1>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.label}
                    >
                      <a
                        href={item.path}
                        className="flex items-center"
                      >
                        <item.icon className="mr-2" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                {role[0].toUpperCase()}
              </div>
              <span className="ml-2 text-sm text-gray-600">{role}</span>
            </div>
            <LogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl font-medium text-gray-800">{title}</h1>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Bell size={20} />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

// Wrapper component that provides the sidebar context
const DashboardLayout = (props: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <DashboardLayoutInner {...props} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
