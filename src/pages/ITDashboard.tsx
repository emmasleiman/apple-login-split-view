
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LogOut, UserPlus, QrCode, Save, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

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
  const [qrScanner, setQrScanner] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPatientId, setScannedPatientId] = useState("");
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

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

  const { mutate: registerEmployee, isPending: isRegistering } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Check if username already exists
      const { data: existingUsername } = await supabase
        .from("employees")
        .select("username")
        .eq("username", data.username)
        .maybeSingle();

      if (existingUsername) {
        throw new Error("Username already exists. Please choose another username.");
      }

      // Check if employee ID already exists
      const { data: existingEmployeeId } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("employee_id", data.employeeId)
        .maybeSingle();

      if (existingEmployeeId) {
        throw new Error("Employee ID already exists. Please use a different ID.");
      }

      // Insert new employee
      const { data: newEmployee, error } = await supabase.from("employees").insert([
        {
          first_name: data.firstName,
          last_name: data.lastName,
          username: data.username,
          password: data.password, // In production, you should hash this password
          role: data.role,
          gender: data.gender,
          employee_id: data.employeeId,
          contact_number: data.contactNumber || null,
        },
      ]);

      if (error) throw error;
      return newEmployee;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Employee registered successfully",
        description: `${variables.firstName} ${variables.lastName} has been registered as a ${variables.role.replace('_', ' ')}.`,
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
    registerEmployee(data);
  };

  const { mutate: fetchPatientInfo, isPending } = useMutation({
    mutationFn: async (patientId: string) => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setPatientInfo(data);
        toast({
          title: "Patient found",
          description: `Patient ${data.patient_id} information retrieved.`,
        });
      } else {
        setPatientInfo(null);
        toast({
          title: "Patient not found",
          description: "No patient found with that ID.",
          variant: "destructive",
        });
      }
      setIsSearching(false);
    },
    onError: (error) => {
      console.error("Error fetching patient:", error);
      toast({
        title: "Error",
        description: "Failed to fetch patient information.",
        variant: "destructive",
      });
      setIsSearching(false);
    }
  });

  const handleScanQR = async () => {
    try {
      if (!isScanning) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setQrScanner(stream);
        setIsScanning(true);
        
        // This is a simplified implementation. In a real app, you'd use a library like
        // jsQR or a React QR scanner component to detect QR codes from the video stream
        toast({
          title: "QR Scanner activated",
          description: "Please scan a patient QR code.",
        });
      } else {
        // Stop scanning
        if (qrScanner) {
          qrScanner.getTracks().forEach(track => track.stop());
        }
        setQrScanner(null);
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please ensure you've granted camera permissions.",
        variant: "destructive",
      });
    }
  };

  const handlePatientSearch = () => {
    if (!scannedPatientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }
    
    fetchPatientInfo(scannedPatientId);
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
                      <Button 
                        type="submit" 
                        className="gap-2"
                        disabled={isRegistering}
                      >
                        {isRegistering ? (
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
          
          <TabsContent value="qrcode" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">QR Code Scanner</h2>
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <div className="flex mt-2">
                        <Input 
                          id="patientId" 
                          placeholder="Enter patient ID" 
                          value={scannedPatientId}
                          onChange={(e) => setScannedPatientId(e.target.value)}
                          className="rounded-r-none"
                        />
                        <Button 
                          type="button" 
                          onClick={handlePatientSearch}
                          disabled={isPending || isSearching}
                          className="rounded-l-none"
                        >
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      variant={isScanning ? "destructive" : "default"}
                      className="mt-4 md:mt-0"
                      onClick={handleScanQR}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      {isScanning ? "Stop Scanning" : "Scan QR Code"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isScanning && (
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <video autoPlay playsInline className="w-full h-full object-cover"></video>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-white w-64 h-64 rounded-lg opacity-70"></div>
                    </div>
                  </div>
                )}

                {patientInfo && (
                  <div className="mt-6 bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Patient Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient ID</p>
                        <p className="font-medium">{patientInfo.patient_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium capitalize">{patientInfo.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Registration Date</p>
                        <p className="font-medium">{new Date(patientInfo.registration_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Culture Required</p>
                        <p className="font-medium">{patientInfo.culture_required ? "Yes" : "No"}</p>
                      </div>
                      {patientInfo.discharge_date && (
                        <div>
                          <p className="text-sm text-gray-500">Discharge Date</p>
                          <p className="font-medium">{new Date(patientInfo.discharge_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {patientInfo.qr_code_url && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 mb-2">QR Code Data</p>
                          <div className="bg-white p-3 rounded border overflow-x-auto">
                            <code className="text-xs">{patientInfo.qr_code_url}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isScanning && !patientInfo && (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                    <QrCode size={48} className="mb-2 opacity-50" />
                    <p>Scan a QR code or enter a patient ID to view information</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ITDashboard;
