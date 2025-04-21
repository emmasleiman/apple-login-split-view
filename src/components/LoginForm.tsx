
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
import { Link } from "react-router-dom";
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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
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
          // Using the correct schema for unauthorized_login_attempts
          await supabase
            .from('unauthorized_login_attempts')
            .insert({
              ward_id: values.username, // Using ward_id instead of username
              ward_name: values.username, // Required field in the schema
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
      
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', values.username)
        .eq('password', values.password)
        .single();

      if (employeeError || !employee) {
        throw new Error('Invalid credentials');
      }

      // Store employee data in local storage
      localStorage.setItem('employeeData', JSON.stringify({
        id: employee.id,
        username: employee.username,
        role: employee.role,
        firstName: employee.first_name,
        lastName: employee.last_name
      }));

      // Set timeout for non-ward employees
      const needsTimeout = ["admin", "data_encoder", "lab_technician"].includes(employee.role);
      
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

      switch (employee.role) {
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "data_encoder":
          navigate("/data-encoder-dashboard");
          break;
        case "lab_technician":
          navigate("/lab-dashboard");
          break;
        default:
          navigate("/");
      }
      
      return true;
    } catch (error: any) {
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

  return (
    <div>
      <Card className="w-full">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold">Login</h1>
        </CardHeader>
        <CardContent>
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
            <Link to="/register" className="text-sm text-gray-600 hover:underline">
              Don't have an account? Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;
