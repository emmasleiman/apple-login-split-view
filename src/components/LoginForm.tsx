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
      setIsLoading(true);

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
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleEmployeeLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('username', values.username)
        .eq('password', values.password)
        .single();

      if (employeeError || !employee) {
        throw new Error('Invalid credentials');
      }

      // Set session timeout for non-ward employees
      if (employee.role !== 'ward') {
        const timeout = setTimeout(() => {
          navigate('/');
          toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
          });
        }, 60 * 60 * 1000); // 1 hour timeout

        // Clear timeout on unmount
        return () => clearTimeout(timeout);
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
          navigate("/lab-technician-dashboard");
          break;
        default:
          navigate("/");
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

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      // Attempt ward login first
      await handleWardLogin(values);
    } catch (wardError) {
      // If ward login fails, attempt employee login
      try {
        await handleEmployeeLogin(values);
      } catch (employeeError: any) {
        toast({
          title: "Login failed",
          description: employeeError.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
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
                    <FormLabel>Username</FormLabel>
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
                    <FormLabel>Password</FormLabel>
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
