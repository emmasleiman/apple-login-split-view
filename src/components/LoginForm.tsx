
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
          description: "You have successfully logged in.",
        });
        navigate('/dashboard');
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
    // 2. Validate user exists and has data encoder role
    // 3. Check password hash against stored hash
    // 4. Generate and return JWT token for authenticated user
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
              className="h-12 border border-gray-200 rounded-md px-4 
                focus:border-gray-400 transition-colors bg-gray-50/50 text-base"
              autoComplete="username"
            />
          </div>
          
          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border border-gray-200 rounded-md px-4
                focus:border-gray-400 transition-colors bg-gray-50/50 text-base"
              autoComplete="current-password"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-gray-500 hover:text-gray-800 transition-colors"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-md 
              font-normal transition-all h-12 text-base"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        
        <div className="text-center">
          <a href="#" className="text-base text-gray-600 hover:text-gray-900 transition-colors">
            Forgot password?
          </a>
        </div>
      </form>
      
      <div className="mt-12 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} TraceMed. All rights reserved.
      </div>
    </div>
  );
};

export default LoginForm;
