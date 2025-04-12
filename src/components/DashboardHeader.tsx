
import { Button } from "@/components/ui/button";
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import LogoutButton from "./LogoutButton";

interface DashboardHeaderProps {
  title: string;
  role: string;
}

const DashboardHeader = ({ title, role }: DashboardHeaderProps) => {
  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{role}</span> Dashboard
          </div>
          <Menubar className="border-none bg-transparent">
            <MenubarMenu>
              <LogoutButton />
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
