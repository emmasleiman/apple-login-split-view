
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Define an Employee type to match our database schema
type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  role: string;
  gender: string;
  employee_id: string;
  contact_number?: string | null;
  created_at?: string;
}

const LoginForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Use type assertion to bypass strict TypeScript checking
      const { data, error } = await supabase
        .from('employees' as any)
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid username or password.",
        });
        setIsLoading(false);
        return;
      }

      // Cast the data to our Employee type for safe access
      const employee = data as unknown as Employee;

      // Store employee data in localStorage with proper typing
      localStorage.setItem('employeeData', JSON.stringify({
        id: employee.id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: employee.role,
        employeeId: employee.employee_id
      }));

      toast({
        title: "Success",
        description: `You have successfully logged in as ${employee.role.replace('_', ' ')}.`,
      });

      // Navigate based on role
      switch (employee.role) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'data_encoder':
          navigate('/dashboard');
          break;
        case 'lab_technician':
          navigate('/lab-dashboard');
          break;
        case 'it_personnel': // For backward compatibility
          navigate('/it-dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while trying to log in.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Username handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-16 text-xl border border-gray-200 rounded-md px-6 
                focus:border-gray-400 transition-colors bg-gray-50/50"
              autoComplete="username"
            />
          </div>
          
          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-16 text-xl border border-gray-200 rounded-md px-6
                focus:border-gray-400 transition-colors bg-gray-50/50"
              autoComplete="current-password"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-5 text-gray-500 hover:text-gray-800 transition-colors"
            >
              {showPassword ? <EyeOff size={26} /> : <Eye size={26} />}
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-7 rounded-md 
              font-normal transition-all h-16 text-xl"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        
        <div className="text-center">
          <a href="#" className="text-xl text-gray-600 hover:text-gray-900 transition-colors">
            Forgot password?
          </a>
        </div>
      </form>
      
      <div className="mt-14 text-center text-gray-400 text-lg">
        &copy; {new Date().getFullYear()} TraceMed. All rights reserved.
      </div>
    </div>
  );
};

export default LoginForm;
