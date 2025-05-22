
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Special case for IT Officer credentials
      if (username === "itofficer" && password === "123456") {
        // Store session data in localStorage for IT Officer
        localStorage.setItem('employeeData', JSON.stringify({
          id: "it-officer-id",
          username: "itofficer",
          role: "it officer",
        }));
        
        toast({
          title: "Success",
          description: "IT Officer logged in successfully",
        });
        
        navigate("/it-dashboard");
        return;
      }
      
      // First, check for ward account login
      const { data: wardData, error: wardError } = await supabase
        .from("ward_accounts")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();
      
      if (wardData) {
        // Ward login successful
        const sessionId = Date.now().toString();
        
        // Store ward session data in localStorage
        localStorage.setItem('wardData', JSON.stringify({
          id: wardData.id,
          username: wardData.username,
          ward: wardData.ward,
          sessionId: sessionId
        }));
        
        // Create active session record
        await supabase
          .from("ward_active_sessions")
          .insert({
            ward_id: wardData.id,
            session_id: sessionId,
            device_info: navigator.userAgent
          });
        
        toast({
          title: "Success",
          description: `Welcome to ${wardData.ward} ward dashboard`,
        });
        
        navigate("/ward-dashboard");
        return;
      }
      
      // If not a ward account, check employee table
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();
      
      if (employeeError || !employeeData) {
        throw new Error("Invalid username or password");
      }
      
      // Employee authenticated successfully
      const role = employeeData.role?.toLowerCase();
      
      // Update last activity timestamp
      await supabase
        .from("employees")
        .update({
          // Using created_at as a timestamp field since last_active doesn't exist
          created_at: new Date().toISOString()
        })
        .eq("id", employeeData.id);
      
      toast({
        title: "Success",
        description: "You have been logged in successfully",
      });

      // Redirect based on role
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
    } catch (error: any) {
      // Log the error to console
      console.error("Login failed:", error.message);
      
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
        <Label htmlFor="username" className="text-gray-700">Username</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30"
          placeholder="Enter your username"
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
