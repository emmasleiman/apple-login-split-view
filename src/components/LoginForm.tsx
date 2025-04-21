
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const forgotPasswordSchema = z.object({
  employeeId: z.string().min(1, {
    message: "Employee ID is required.",
  }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      employeeId: "",
    },
  });

  async function handleWardLogin(values: z.infer<typeof loginSchema>) {
    try {
      // Check if ward has an active session already
      const { data: existingSession, error: sessionQueryError } = await supabase
        .from('ward_active_sessions')
        .select('*')
        .eq('ward_id', values.username)
        .single();

      if (existingSession) {
        throw new Error('This ward account is already logged in on another device');
      }

      const { data: ward, error: wardError } = await supabase
        .from('ward_accounts')
        .select('*')
        .eq('username', values.username)
        .eq('password', values.password)
        .single();

      if (wardError || !ward) {
        throw new Error('Invalid credentials');
      }

      // Create active session
      const { data: session, error: sessionError } = await supabase
        .from('ward_active_sessions')
        .insert({
          ward_id: ward.id,
          session_id: Math.random().toString(36).substring(2, 15),
          device_info: navigator.userAgent,
        })
        .select()
        .single();

      if (sessionError || !session) {
        throw new Error('Failed to create session');
      }

      // Store ward data in local storage
      localStorage.setItem('wardData', JSON.stringify({
        id: ward.id,
        username: ward.username,
        ward: ward.ward,
        sessionId: session.session_id,
      }));

      toast({
        title: "Login successful",
        description: `Welcome, ${ward.username}!`,
      });

      navigate("/ward-dashboard");
      return true;
    } catch (error: any) {
      // Log unauthorized attempt if it's a ward login
      if (error.message === 'This ward account is already logged in on another device') {
        try {
          await supabase
            .from('unauthorized_login_attempts')
            .insert({
              ward_id: values.username, 
              ward_name: values.username,
              device_info: navigator.userAgent
            });
        } catch (logError) {
          console.error('Failed to log unauthorized attempt:', logError);
        }
      }
      
      throw error;
    }
  }

  const handleEmployeeLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      
      // Debug the query
      console.log(`Attempting to log in with username: ${values.username}`);
      
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', values.username)
        .eq('password', values.password)
        .single();

      if (employeeError || !employee) {
        console.error("Employee login error:", employeeError);
        throw new Error('Invalid credentials');
      }

      console.log("Employee login successful:", employee);

      // Store employee data in local storage
      localStorage.setItem('employeeData', JSON.stringify({
        id: employee.id,
        username: employee.username,
        role: employee.role,
        firstName: employee.first_name,
        lastName: employee.last_name
      }));

      // Define roles that need timeout
      const needsTimeout = ["admin", "data_encoder", "lab_technician", "it_officer"].includes(employee.role);
      
      if (needsTimeout) {
        const timeout = setTimeout(() => {
          localStorage.removeItem('employeeData');
          navigate('/');
          toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
          });
        }, 60 * 60 * 1000); // 1 hour timeout

        // Store the timeout ID
        sessionStorage.setItem('sessionTimeoutId', timeout.toString());
      }

      toast({
        title: "Login successful",
        description: `Welcome, ${employee.username}!`,
      });

      // Correct redirection based on employee role 
      // Using string comparison instead of relying on the enum type
      if (employee.role === "admin") {
        navigate("/admin-dashboard");
      } else if (employee.role === "data_encoder") {
        navigate("/dashboard");
      } else if (employee.role === "lab_technician") {
        navigate("/lab-dashboard");
      } else if (employee.role === "it_officer") {
        navigate("/it-dashboard");
      } else {
        console.log("Unknown role:", employee.role);
        navigate("/");
      }
      
      return true;
    } catch (error: any) {
      console.error("Employee login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      // Try ward login first
      try {
        const wardLoginSuccess = await handleWardLogin(values);
        if (wardLoginSuccess) return;
      } catch (wardError: any) {
        console.log("Ward login failed, trying employee login");
      }

      // If ward login fails, try employee login
      try {
        const employeeLoginSuccess = await handleEmployeeLogin(values);
        if (employeeLoginSuccess) return;
      } catch (employeeError: any) {
        toast({
          title: "Login failed",
          description: employeeError.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      setIsLoading(true);
      
      // Store password reset request in localStorage for IT officers to see
      const existingRequests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
      const newRequest = {
        id: Math.random().toString(36).substring(2, 9),
        employeeId: values.employeeId,
        requestTime: new Date().toISOString(),
        status: 'pending'
      };
      
      localStorage.setItem('passwordResetRequests', JSON.stringify([...existingRequests, newRequest]));
      
      toast({
        title: "Request submitted",
        description: "Your password reset request has been sent to IT support.",
      });
      
      setShowForgotPassword(false);
      forgotPasswordForm.reset();
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card className="w-full">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold">
            {showForgotPassword ? "Forgot Password" : "Login"}
          </h1>
        </CardHeader>
        <CardContent>
          {!showForgotPassword ? (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="username">Username</Label>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="password">Password</Label>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center">
                <Button 
                  variant="link" 
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </Button>
              </div>
            </>
          ) : (
            <>
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-6">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="employeeId">Employee ID</Label>
                        <FormControl>
                          <Input placeholder="Enter your employee ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Login
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;
