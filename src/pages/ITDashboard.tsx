
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

type PasswordResetRequest = {
  id: string;
  employeeId: string;
  requestTime: string;
  status: 'pending' | 'cleared';
};

const ITDashboard = () => {
  const { toast } = useToast();
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeTab, setActiveTab] = useState("alerts");

  // Employee registration state
  const [empForm, setEmpForm] = useState({
    first_name: "",
    last_name: "",
    employee_id: "",
    username: "",
    password: "",
    contact_number: "",
    role: "",
    gender: "",
  });
  const [empLoading, setEmpLoading] = useState(false);

  // Ward registration state
  const [wardForm, setWardForm] = useState({
    ward: "",
    username: "",
    password: "",
  });
  const [wardLoading, setWardLoading] = useState(false);

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
  const onEmployeeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEmpForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };
  const handleEmployeeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpLoading(true);
    const { error } = await supabase.from("employees").insert([empForm]);
    setEmpLoading(false);
    if (!error) {
      toast({
        title: "Employee account created",
        description: "The new employee account was registered successfully.",
      });
      setEmpForm({
        first_name: "",
        last_name: "",
        employee_id: "",
        username: "",
        password: "",
        contact_number: "",
        role: "",
        gender: "",
      });
    } else {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  };

  // Handle Ward Registration
  const onWardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWardForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };
  const handleWardRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setWardLoading(true);
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
    } else {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/40">
      {/* Remove children prop from DashboardHeader (build error fix) */}
      <DashboardHeader title="TraceMed" role="IT Officer" />
      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">IT Officer Dashboard</h1>
          <p className="text-base text-gray-500">Manage system alerts and employee/ward accounts</p>
        </div>
        <Tabs defaultValue="alerts" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-gray-100/80 rounded-xl shadow-sm w-full justify-start flex-wrap">
            <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white">System Alerts</TabsTrigger>
            <TabsTrigger value="password-resets" className="rounded-lg data-[state=active]:bg-white">
              Password Reset Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="register-employee" className="rounded-lg data-[state=active]:bg-white">Register Employee Account</TabsTrigger>
            <TabsTrigger value="register-ward" className="rounded-lg data-[state=active]:bg-white">Register Ward Account</TabsTrigger>
          </TabsList>
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
          <TabsContent value="register-employee">
            <Card>
              <CardHeader>
                <CardTitle>Register New Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 max-w-md mx-auto" onSubmit={handleEmployeeRegister}>
                  <div>
                    <label className="block mb-1 text-gray-700">First Name</label>
                    <Input name="first_name" required value={empForm.first_name} onChange={onEmployeeChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Last Name</label>
                    <Input name="last_name" required value={empForm.last_name} onChange={onEmployeeChange} />
                  </div>
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
                    <label className="block mb-1 text-gray-700">Contact Number</label>
                    <Input name="contact_number" value={empForm.contact_number} onChange={onEmployeeChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Role</label>
                    <select name="role" required value={empForm.role} onChange={onEmployeeChange} className="w-full border rounded-md px-3 py-2 text-lg focus:outline-none">
                      <option value="">Select role</option>
                      <option value="admin">Admin</option>
                      <option value="Officer">Officer</option>
                      <option value="Staff">Staff</option>
                      <option value="Nurse">Nurse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Gender</label>
                    <select name="gender" required value={empForm.gender} onChange={onEmployeeChange} className="w-full border rounded-md px-3 py-2 text-lg focus:outline-none">
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Button type="submit" loading={empLoading} disabled={empLoading}>
                    {empLoading ? "Registering..." : "Register"}
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
                    <Input name="ward" required value={wardForm.ward} onChange={onWardChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Username</label>
                    <Input name="username" required value={wardForm.username} onChange={onWardChange} />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">Password</label>
                    <Input name="password" type="password" required value={wardForm.password} onChange={onWardChange} />
                  </div>
                  <Button type="submit" loading={wardLoading} disabled={wardLoading}>
                    {wardLoading ? "Registering..." : "Register"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ITDashboard;

