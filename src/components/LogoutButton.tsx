
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const LogoutButton = ({ 
  variant = "outline", 
  size = "default",
  className = "" 
}: LogoutButtonProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all user data from storage
    localStorage.removeItem('employeeData');
    localStorage.removeItem('wardData');
    
    // Clear any session timeout
    const timeoutId = sessionStorage.getItem('sessionTimeoutId');
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      sessionStorage.removeItem('sessionTimeoutId');
    }
    
    toast.success("You have been logged out successfully");
    navigate("/");
  };

  return (
    <Button 
      onClick={handleLogout} 
      variant={variant} 
      size={size}
      className={className}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
};

export default LogoutButton;
