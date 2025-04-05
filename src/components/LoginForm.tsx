
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    
    // Simple credential check for demo purposes
    setTimeout(() => {
      if (username === 'abc' && password === '123') {
        toast({
          title: "Success",
          description: "You have successfully logged in as Data Encoder.",
        });
        navigate('/dashboard');
      } else if (username === 'def' && password === '456') {
        toast({
          title: "Success",
          description: "You have successfully logged in as Admin.",
        });
        navigate('/admin-dashboard');
      } else if (username === 'ghi' && password === '789') {
        toast({
          title: "Success",
          description: "You have successfully logged in as Lab Technician.",
        });
        navigate('/lab-dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid username or password.",
        });
      }
      setIsLoading(false);
    }, 1000);

    // ---------------------------------------------------------
    // This is where backend authentication code should go.
    // It should:
    // 1. Send credentials to authentication API endpoint
    // 2. Validate user exists and has appropriate role (admin or data encoder)
    // 3. Check password hash against stored hash
    // 4. Generate and return JWT token for authenticated user with role claim
    // 5. Store token in localStorage or secure cookie
    // 6. Implement proper error handling for invalid credentials
    // ---------------------------------------------------------
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
