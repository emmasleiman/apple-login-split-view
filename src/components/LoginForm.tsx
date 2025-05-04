
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select("role")
          .eq("id", data.user.id)
          .single();
        
        if (employeeError) {
          // User might exist in auth but not in employees table
          // This is a fallback to redirect to general dashboard
          toast({
            title: "Success",
            description: "You have been logged in successfully",
          });
          navigate("/dashboard");
          return;
        }
        
        // Get the role and redirect accordingly
        const role = employeeData?.role?.toLowerCase();
        
        // Log successful login (using existing tables, not access_logs)
        await supabase.from("employees")
          .update({
            last_active: new Date().toISOString()
          })
          .eq("id", data.user.id);
        
        toast({
          title: "Success",
          description: "You have been logged in successfully",
        });

        if (role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "data_encoder") {
          navigate("/dashboard");
        } else if (role === "lab_technician") {
          navigate("/lab-dashboard");
        } else if (role === "it officer") {
          navigate("/it-dashboard");
        } else if (role === "ward") {
          navigate("/ward-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      // Log failed login attempt (silently fail if table doesn't exist)
      try {
        // Only log basic information, using the employees table for timestamp tracking
        console.error("Login failed:", error.message);
      } catch (logError) {
        // If logging fails, just continue
        console.error("Unable to log failed login attempt");
      }
      
      toast({
        title: "Login Failed",
        description: error.message || "There was a problem with your login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30"
          placeholder="your@email.com"
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 pr-10"
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
};

export default LoginForm;
