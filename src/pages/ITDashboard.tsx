
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeader from "@/components/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LocationInconsistencyAlerts } from "@/components/LocationInconsistencyAlerts";
import { UnauthorizedLoginAttempts } from "@/components/UnauthorizedLoginAttempts";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define role types based on what's accepted in the database
type DatabaseEmployeeRole = "admin" | "data_encoder" | "lab_technician";

type PasswordResetRequest = {
  id: string;
  employeeId: string;
  requestTime: string;
  status: 'pending' | 'cleared';
};

type WardAccount = {
  id: string;
  ward: string;
  username: string;
  created_at: string;
};

const wardOptions = ["wardA", "wardB", "wardC", "wardD", "wardE", "wardF"];

const ITDashboard = () => {
  const { toast } = useToast();
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeTab, setActiveTab] = useState("register-employee");
  const [wardAccounts, setWardAccounts] = useState<WardAccount[]>([]);
  const [loadingWardAccounts, setLoadingWardAccounts] = useState(false);

  // Employee registration state
  const [empForm, setEmpForm] = useState({
    employee_id: "",
    username: "",
    password: "",
    role: "" as DatabaseEmployeeRole,
  });
  const [empLoading, setEmpLoading] = useState(false);

  // Ward registration state
  const [wardForm, setWardForm] = useState({
    ward: "",
    username: "",
    password: "",
  });
  const [wardLoading, setWardLoading] = useState(false);

  // Load ward accounts when the component mounts
  useEffect(() => {
    fetchWardAccounts();
  }, []);
  
  const fetchWardAccounts = async () => {
    setLoadingWardAccounts(true);
    const { data, error } = await supabase
      .from("ward_accounts")
      .select("id, ward, username, created_at");
    
    setLoadingWardAccounts(false);
    if (error) {
      toast({ 
        title: "Error fetching ward accounts", 
        description: error.message, 
        variant: "destructive" 
      });
      return;
    }
    
    setWardAccounts(data || []);
  };

  useEffect(() => {
    const loadPasswordResetRequests = () => {
      const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
      setPasswordResetRequests(requests);
    };
    loadPasswordResetRequests();
    const intervalId = setInterval(loadPasswordResetRequests, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const clearPasswordResetRequest = (id: string) => {
    const updatedRequests = passwordResetRequests.map(request => 
      request.id === id ? { ...request, status: 'cleared' as const } : request
    );
    localStorage.setItem('passwordResetRequests', JSON.stringify(updatedRequests));
    setPasswordResetRequests(updatedRequests);
    toast({
      title: "Request cleared",
      description: "The password reset request has been cleared.",
    });
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const pendingRequests = passwordResetRequests.filter(req => req.status === 'pending');
  const clearedRequests = passwordResetRequests.filter(req => req.status === 'cleared');

  // Handle Employee Registration
  const onEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };
  
  // Handle role selection
  const handleRoleChange = (value: DatabaseEmployeeRole) => {
    setEmpForm(prev => ({ ...prev, role: value }));
  };
  
  const handleEmployeeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpLoading(true);
    
    // Ensure role is properly selected
    if (!empForm.role) {
      toast({
        title: "Registration failed",
        description: "Please select a role",
        variant: "destructive"
      });
      setEmpLoading(false);
      return;
    }
    
    // Create employee with minimal required fields
    const { error } = await supabase.from("employees").insert({
      employee_id: empForm.employee_id,
      username: empForm.username,
      password: empForm.password,
      role: empForm.role,
      first_name: "Not provided", // Adding required fields with default values
      last_name: "Not provided",
      gender: "Not specified"
    });
    
    setEmpLoading(false);
    
    if (!error) {
      toast({
        title: "Employee account created",
        description: "The new employee account was registered successfully.",
      });
      setEmpForm({
        employee_id: "",
        username: "",
        password: "",
        role: "" as DatabaseEmployeeRole,
      });
    } else {
      toast({ 
        title: "Registration failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Handle Ward Registration
  const onWardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWardForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };
  
  const handleWardSelect = (value: string) => {
    setWardForm(prev => ({ ...prev, ward: value }));
  };
  
  const handleWardRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setWardLoading(true);
    
    // Check if the ward already exists
    const { data: existingWard } = await supabase
      .from("ward_accounts")
      .select("id")
      .eq("ward", wardForm.ward)
      .single();
    
    if (existingWard) {
      toast({
        title: "Registration failed",
        description: `Ward ${wardForm.ward} already exists.`,
        variant: "destructive"
      });
      setWardLoading(false);
      return;
    }
    
    const { error } = await supabase.from("ward_accounts").insert([wardForm]);
    setWardLoading(false);
    
    if (!error) {
      toast({
        title: "Ward account created",
        description: "The new ward account was registered successfully.",
      });
      setWardForm({
        ward: "",
        username: "",
        password: "",
      });
      // Refresh ward accounts list
      fetchWardAccounts();
    } else {
      toast({ 
        title: "Registration failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/40">
      <DashboardHeader title="TraceMed" role="IT Officer" />
      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">IT Officer Dashboard</h1>
          <p className="text-base text-gray-500">Manage system alerts and employee/ward accounts</p>
        </div>
        <Tabs defaultValue="register-employee" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-gray-100/80 rounded-xl shadow-sm w-full justify-start flex-wrap">
            <TabsTrigger value="register-employee" className="rounded-lg data-[state=active]:bg-white">Register Employee Account</TabsTrigger>
            <TabsTrigger value="register-ward" className="rounded-lg data-[state=active]:bg-white">Register Ward Account</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white">System Alerts</TabsTrigger>
            <TabsTrigger value="password-resets" className="rounded-lg data-[state=active]:bg-white">
              Password Reset Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="register-employee">
            <Card>
              <CardHeader>
                <CardTitle>Register New Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 max-w-md mx-auto" onSubmit={handleEmployeeRegister}>
                  <div>
                    <label className="block mb-1 text-gray-700">Employee ID</label>
                    <Input name="employee_id" required value={empForm.employee_id} onChange={onEmployeeChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Username</label>
                    <Input name="username" required value={empForm.username} onChange={onEmployeeChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Password</label>
                    <Input name="password" type="password" required value={empForm.password} onChange={onEmployeeChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Role</label>
                    <Select value={empForm.role} onValueChange={(value) => handleRoleChange(value as DatabaseEmployeeRole)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="data_encoder">Data Encoder</SelectItem>
                        <SelectItem value="lab_technician">Lab Technician</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={empLoading}>
                    {empLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="register-ward">
            <Card>
              <CardHeader>
                <CardTitle>Register New Ward Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 max-w-md mx-auto" onSubmit={handleWardRegister}>
                  <div>
                    <label className="block mb-1 text-gray-700">Ward Name</label>
                    <Select value={wardForm.ward} onValueChange={handleWardSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {wardOptions.map((ward) => (
                          <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Username</label>
                    <Input name="username" required value={wardForm.username} onChange={onWardChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Password</label>
                    <Input name="password" type="password" required value={wardForm.password} onChange={onWardChange} />
                  </div>
                  <Button type="submit" disabled={wardLoading}>
                    {wardLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Active Ward Accounts</h3>
                  {loadingWardAccounts ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : wardAccounts.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No ward accounts registered yet</p>
                  ) : (
                    <div className="grid gap-4">
                      {wardAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                          <div>
                            <div className="font-medium">{account.ward}</div>
                            <div className="text-sm text-gray-500">Username: {account.username}</div>
                            <div className="text-xs text-gray-400">
                              Created: {formatDateTime(account.created_at)}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Location Inconsistency Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <LocationInconsistencyAlerts />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unauthorized Login Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <UnauthorizedLoginAttempts />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="password-resets">
            <Card>
              <CardHeader>
                <CardTitle>Password Reset Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending">Pending
                      {pendingRequests.length > 0 && (
                        <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cleared">Cleared
                      {clearedRequests.length > 0 && (
                        <Badge variant="outline" className="ml-2">{clearedRequests.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending">
                    {pendingRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No pending password reset requests</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {pendingRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                              <div>
                                <div className="font-medium">Employee ID: {request.employeeId}</div>
                                <div className="text-sm text-gray-500">
                                  Requested: {formatDateTime(request.requestTime)}
                                </div>
                              </div>
                              <Button onClick={() => clearPasswordResetRequest(request.id)}>
                                Mark as Cleared
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                  <TabsContent value="cleared">
                    {clearedRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No cleared password reset requests</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {clearedRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                              <div>
                                <div className="font-medium">Employee ID: {request.employeeId}</div>
                                <div className="text-sm text-gray-500">
                                  Requested: {formatDateTime(request.requestTime)}
                                </div>
                              </div>
                              <Badge variant="outline" className="px-3 py-1">Cleared</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ITDashboard;
