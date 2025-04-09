
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase
        .from('employees')
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

      // Store employee data in localStorage
      localStorage.setItem('employeeData', JSON.stringify({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        employeeId: data.employee_id
      }));

      toast({
        title: "Success",
        description: `You have successfully logged in as ${data.role.replace('_', ' ')}.`,
      });

      // Navigate based on role
      switch (data.role) {
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
