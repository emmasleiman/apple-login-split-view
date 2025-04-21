
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardHeader from "@/components/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import LocationInconsistencyAlerts from "@/components/LocationInconsistencyAlerts";
import UnauthorizedLoginAttempts from "@/components/UnauthorizedLoginAttempts";

type PasswordResetRequest = {
  id: string;
  employeeId: string;
  requestTime: string;
  status: 'pending' | 'cleared';
};

const ITDashboard = () => {
  const { toast } = useToast();
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  
  useEffect(() => {
    // Load password reset requests from localStorage
    const loadPasswordResetRequests = () => {
      const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
      setPasswordResetRequests(requests);
    };
    
    loadPasswordResetRequests();
    
    // Set up an interval to check for new requests every 30 seconds
    const intervalId = setInterval(loadPasswordResetRequests, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const clearPasswordResetRequest = (id: string) => {
    // Update the request status to 'cleared' in localStorage
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
  
  // Filter requests by status
  const pendingRequests = passwordResetRequests.filter(req => req.status === 'pending');
  const clearedRequests = passwordResetRequests.filter(req => req.status === 'cleared');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/40">
      <DashboardHeader title="TraceMed" role="IT Officer" />
      
      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">IT Officer Dashboard</h1>
          <p className="text-base text-gray-500">Manage system alerts and employee accounts</p>
        </div>
        
        <Tabs defaultValue="alerts" className="space-y-8">
          <TabsList className="bg-gray-100/80 rounded-xl shadow-sm w-full justify-start">
            <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white">
              System Alerts
            </TabsTrigger>
            <TabsTrigger value="password-resets" className="rounded-lg data-[state=active]:bg-white">
              Password Reset Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
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
                    <TabsTrigger value="pending">
                      Pending
                      {pendingRequests.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {pendingRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cleared">
                      Cleared
                      {clearedRequests.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {clearedRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pending">
                    {pendingRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No pending password reset requests
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {pendingRequests.map((request) => (
                            <div 
                              key={request.id} 
                              className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
                            >
                              <div>
                                <div className="font-medium">Employee ID: {request.employeeId}</div>
                                <div className="text-sm text-gray-500">
                                  Requested: {formatDateTime(request.requestTime)}
                                </div>
                              </div>
                              <Button 
                                onClick={() => clearPasswordResetRequest(request.id)}
                              >
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
                      <div className="text-center py-8 text-gray-500">
                        No cleared password reset requests
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {clearedRequests.map((request) => (
                            <div 
                              key={request.id} 
                              className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
                            >
                              <div>
                                <div className="font-medium">Employee ID: {request.employeeId}</div>
                                <div className="text-sm text-gray-500">
                                  Requested: {formatDateTime(request.requestTime)}
                                </div>
                              </div>
                              <Badge variant="outline" className="px-3 py-1">
                                Cleared
                              </Badge>
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
