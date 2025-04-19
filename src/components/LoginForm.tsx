import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

type WardAccount = {
  id: string;
  ward: string;
  username: string;
  password: string;
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
    
    if (username === 'itofficer' && password === '123456') {
      toast({
        title: "Success",
        description: "Accessing IT Dashboard with special credentials.",
      });
      navigate('/it-dashboard');
      setIsLoading(false);
      return;
    }
    
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (employeeError) {
        console.error('Employee login error:', employeeError);
      }

      if (employeeData) {
        const employee = employeeData as unknown as Employee;

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
          case 'it_personnel':
            navigate('/it-dashboard');
            break;
          default:
            navigate('/dashboard');
        }
        setIsLoading(false);
        return;
      }

      const { data: wardData, error: wardError } = await supabase
        .from('ward_accounts')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (wardError) {
        console.error('Ward account login error:', wardError);
      }

      if (wardData) {
        const { data: activeSession } = await supabase
          .from('ward_active_sessions')
          .select('*')
          .eq('ward_id', wardData.id)
          .single();

        if (activeSession) {
          await supabase
            .from('unauthorized_login_attempts')
            .insert({
              ward_id: wardData.id,
              ward_name: wardData.ward,
              device_info: navigator.userAgent
            });

          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "This ward account is currently in use on another device.",
          });
          setIsLoading(false);
          return;
        }

        const sessionId = crypto.randomUUID();
        const { error: sessionError } = await supabase
          .from('ward_active_sessions')
          .insert({
            ward_id: wardData.id,
            session_id: sessionId,
            device_info: navigator.userAgent
          });

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create session. Please try again.",
          });
          setIsLoading(false);
          return;
        }

        localStorage.setItem('wardData', JSON.stringify({
          id: wardData.id,
          ward: wardData.ward,
          username: wardData.username,
          sessionId
        }));

        toast({
          title: "Success",
          description: `You have successfully logged in to ward ${wardData.ward}.`,
        });

        navigate('/ward-dashboard');
        setIsLoading(false);
        return;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid username or password.",
      });
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
              className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
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
