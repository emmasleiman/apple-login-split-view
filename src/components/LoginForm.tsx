
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff } from "lucide-react";

const LoginForm = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      if (username && password) {
        toast({
          title: "Success",
          description: "You have successfully logged in.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter both username and password.",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col justify-center px-8 md:px-16 lg:px-24">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-light tracking-tight">Welcome back</h1>
          <p className="text-gray-500 text-sm">
            Enter your details to sign in to your account
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Username handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 border-0 border-b border-gray-200 rounded-none px-0 
                  focus:ring-0 focus:border-gray-900 transition-colors"
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2 relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-0 border-b border-gray-200 rounded-none px-0 
                  focus:ring-0 focus:border-gray-900 transition-colors"
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-3 text-gray-500 hover:text-gray-800"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white py-6 rounded-xl 
                font-normal transition-all"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
          
          <div className="text-center">
            <a href="#" className="text-sm text-blue-500 hover:underline">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
      
      <div className="mt-auto py-6 text-center text-gray-500 text-xs">
        &copy; {new Date().getFullYear()} Serene App. All rights reserved.
      </div>
    </div>
  );
};

export default LoginForm;
