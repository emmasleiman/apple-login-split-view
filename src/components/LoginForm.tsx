
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
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        
        if (userError) throw userError;
        
        const role = userData?.role?.toLowerCase();
        
        // Log login action
        await supabase.from("access_logs").insert({
          user_id: data.user.id,
          email: data.user.email,
          action: "login",
          role: role,
          status: "success"
        });
        
        toast({
          title: "Success",
          description: "You have been logged in successfully",
        });

        if (role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "data encoder") {
          navigate("/dashboard");
        } else if (role === "lab technician") {
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
      // Log failed login attempt
      await supabase.from("access_logs").insert({
        email: email,
        action: "login",
        status: "failed",
        details: error.message
      });
      
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
        <div className="password-input-container">
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
            className="password-toggle-button"
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
