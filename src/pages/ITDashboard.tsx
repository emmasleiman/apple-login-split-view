import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { UserPlus, Save, Loader2, Building2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import LogoutButton from "@/components/LogoutButton";
import { createWardAccount, getWardAccounts, WardAccount as WardAccountType } from "@/lib/supabase/ward-accounts";

type Employee = {
  username: string;
  password: string;
  role: "admin" | "data_encoder" | "lab_technician";
  employee_id: string;
}

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(["admin", "data_encoder", "lab_technician"], {
    required_error: "Please select a role.",
  }),
  employeeId: z.string().min(1, {
    message: "Employee ID is required.",
  }),
});

const wardAccountSchema = z.object({
  ward: z.string().min(1, "Please select a ward"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const ITDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");
  
  const { 
    data: wardAccountsData, 
    isLoading: isLoadingWardAccounts, 
    refetch: refetchWardAccounts 
  } = useQuery({
    queryKey: ['wardAccounts'],
    queryFn: async () => {
      const { data, error } = await getWardAccounts();
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data || [];
    },
  });

  const [wardAccounts, setWardAccounts] = useState<WardAccountType[]>([]);

  useEffect(() => {
    if (wardAccountsData) {
      setWardAccounts(wardAccountsData);
    }
  }, [wardAccountsData]);

  const availableWards = [
    { id: "ward_a", label: "Ward A" },
    { id: "ward_b", label: "Ward B" },
    { id: "ward_c", label: "Ward C" },
    { id: "ward_d", label: "Ward D" },
    { id: "ward_e", label: "Ward E" },
    { id: "ward_f", label: "Ward F" },
    { id: "isolation_room", label: "Isolation Room" },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      employeeId: "",
      role: "data_encoder",
    },
  });

  const wardForm = useForm<z.infer<typeof wardAccountSchema>>({
    resolver: zodResolver(wardAccountSchema),
    defaultValues: {
      ward: "",
      username: "",
      password: "",
    },
  });

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const { mutate: submitWardAccount, isPending: isCreatingWardAccount } = useMutation({
    mutationFn: async (data: z.infer<typeof wardAccountSchema>) => {
      return await createWardAccount({
        ward: data.ward,
        username: data.username, 
        password: data.password,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Ward Account Created",
        description: `Account for ${availableWards.find(w => w.id === result.data?.ward)?.label} has been created successfully.`,
      });
      
      setWardAccounts(prev => [...prev, result.data!]);
      
      wardForm.reset();

      refetchWardAccounts();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating ward account",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateWardAccount = (data: z.infer<typeof wardAccountSchema>) => {
    submitWardAccount(data);
  };

  const registerEmployee = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { data: existingUsername } = await supabase
        .from('employees' as any)
        .select("username")
        .eq("username", data.username)
        .maybeSingle();

      if (existingUsername) {
        throw new Error("Username already exists. Please choose another username.");
      }

      const { data: existingEmployeeId } = await supabase
        .from('employees' as any)
        .select("employee_id")
        .eq("employee_id", data.employeeId)
        .maybeSingle();

      if (existingEmployeeId) {
        throw new Error("Employee ID already exists. Please use a different ID.");
      }

      const employeeData: Employee & { first_name: string, last_name: string, gender: string } = {
        username: data.username,
        password: data.password,
        role: data.role,
        employee_id: data.employeeId,
        first_name: "Employee",
        last_name: data.username,
        gender: "other"
      };

      const { data: newEmployee, error } = await supabase
        .from('employees' as any)
        .insert([employeeData]);

      if (error) throw error;
      return newEmployee;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Employee registered successfully",
        description: `${variables.username} has been registered as a ${variables.role.replace('_', ' ')}.`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    registerEmployee.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-gray-900">TraceMed</h1>
            <p className="text-gray-500">IT Dashboard</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs 
          defaultValue="register" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full max-w-5xl mx-auto"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus size={18} />
              <span>Employee Registration</span>
            </TabsTrigger>
            <TabsTrigger value="ward" className="flex items-center gap-2">
              <Building2 size={18} />
              <span>Assign Ward Account</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="register" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">Employee Registration</h2>
            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Employee ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select work type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Administrator</SelectItem>
                                <SelectItem value="data_encoder">Data Encoder</SelectItem>
                                <SelectItem value="lab_technician">Lab Technician</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
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
                              <Input placeholder="Password" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="gap-2"
                        disabled={registerEmployee.isPending}
                      >
                        {registerEmployee.isPending ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            Register Employee
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ward" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">Assign Ward Account</h2>
            <Card>
              <CardContent className="pt-6">
                <Form {...wardForm}>
                  <form onSubmit={wardForm.handleSubmit(handleCreateWardAccount)} className="space-y-6">
                    <FormField
                      control={wardForm.control}
                      name="ward"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Ward</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a ward" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableWards.map((ward) => (
                                <SelectItem
                                  key={ward.id}
                                  value={ward.id}
                                  disabled={wardAccounts.some(acc => acc.ward === ward.id)}
                                >
                                  {ward.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={wardForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={wardForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full sm:w-auto gap-2"
                      disabled={isCreatingWardAccount}
                    >
                      {isCreatingWardAccount ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {isLoadingWardAccounts ? (
                  <div className="mt-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : wardAccounts.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Assigned Ward Accounts</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <div className="grid grid-cols-3 font-medium text-sm text-gray-500 mb-2">
                        <div>Ward</div>
                        <div>Username</div>
                        <div>Status</div>
                      </div>
                      <div className="space-y-2">
                        {wardAccounts.map((account, index) => (
                          <div key={index} className="grid grid-cols-3 py-2 border-t">
                            <div>{availableWards.find(w => w.id === account.ward)?.label}</div>
                            <div>{account.username}</div>
                            <div className="flex items-center text-green-600">
                              <Check size={16} className="mr-1" />
                              Active
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ITDashboard;
