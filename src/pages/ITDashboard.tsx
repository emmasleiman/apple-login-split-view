
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LogOut, UserPlus, QrCode, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(["admin", "data_encoder", "lab_technician"], {
    required_error: "Please select a role.",
  }),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender.",
  }),
  contactNumber: z.string().optional(),
  employeeId: z.string().min(1, {
    message: "Employee ID is required.",
  }),
});

const ITDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      employeeId: "",
      contactNumber: "",
      gender: "male",
      role: "data_encoder",
    },
  });

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
    toast({
      title: "Employee registered",
      description: `${data.firstName} ${data.lastName} has been registered as a ${data.role.replace('_', ' ')}.`,
    });
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-gray-900">TraceMed</h1>
            <p className="text-gray-500">IT Dashboard</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </Button>
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
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode size={18} />
              <span>QR Code Scanner</span>
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
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                        name="contactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Contact Number" type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Gender</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex space-x-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="male" id="male" />
                                  <Label htmlFor="male">Male</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="female" id="female" />
                                  <Label htmlFor="female">Female</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="other" id="other" />
                                  <Label htmlFor="other">Other</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-lg font-medium mb-4">Access Credentials</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
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
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" className="gap-2">
                        <Save size={18} />
                        Register Employee
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="qrcode" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">QR Code Scanner</h2>
            <p className="text-gray-500">
              This section will contain the QR code scanner functionality.
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ITDashboard;
