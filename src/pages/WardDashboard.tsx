import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Scan, LogOut, Clock, CheckCircle2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'react-qr-scanner';

type WardScanLog = {
  id: string;
  patient_id: string;
  ward: string;
  scanned_at: string;
  scanned_by: string;
}

const WardDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wardName, setWardName] = useState<string>("");
  const [wardUsername, setWardUsername] = useState<string>("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<WardScanLog[]>([]);
  const [scanCount, setScanCount] = useState(0);
  
  useEffect(() => {
    const wardDataStr = localStorage.getItem('wardData');
    if (!wardDataStr) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must be logged in as a ward account to access this dashboard.",
      });
      navigate('/');
      return;
    }
    
    try {
      const wardData = JSON.parse(wardDataStr);
      setWardName(wardData.ward);
      setWardUsername(wardData.username);
      
      fetchRecentScans(wardData.ward);
    } catch (error) {
      console.error('Error parsing ward data:', error);
      navigate('/');
    }
  }, [navigate, toast]);
  
  const fetchRecentScans = async (ward: string) => {
    try {
      const { data, error } = await supabase
        .from('ward_scan_logs')
        .select('*')
        .eq('ward', ward)
        .order('scanned_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching scan logs:', error);
        return;
      }
      
      setRecentScans(data as unknown as WardScanLog[]);
      setScanCount(data ? data.length : 0);
    } catch (error) {
      console.error('Error fetching scan logs:', error);
    }
  };
  
  const handleScan = async (data: { text: string } | null) => {
    if (data && data.text) {
      setIsScanning(false);
      
      try {
        const patientId = data.text;
        console.log("Scanning patient ID:", patientId);
        
        const { error } = await supabase
          .from('ward_scan_logs')
          .insert({
            patient_id: patientId,
            ward: wardName,
            scanned_by: wardUsername,
          }) as unknown as { error: any };
        
        if (error) {
          console.error('Error logging scan:', error);
          toast({
            variant: "destructive",
            title: "Scan Failed",
            description: "Failed to log patient scan. Please try again.",
          });
          return;
        }
        
        toast({
          title: "Scan Successful",
          description: `Patient ID ${patientId} scanned successfully.`,
        });
        
        fetchRecentScans(wardName);
        setIsScannerOpen(false);
      } catch (error) {
        console.error('Error processing scan:', error);
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "Failed to process QR code. Please try again.",
        });
      }
    }
  };
  
  const handleError = (err: any) => {
    console.error('QR Scan error:', err);
    toast({
      variant: "destructive",
      title: "Scanner Error",
      description: "An error occurred with the QR scanner. Please try again.",
    });
  };
  
  const handleLogout = () => {
    localStorage.removeItem('wardData');
    navigate('/');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    const dateTime = new Date(dateTimeStr);
    return dateTime.toLocaleString();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Ward Dashboard - {wardName}
            </h1>
            <p className="text-gray-600 mt-1">
              Scan patient QR codes and view recent scans
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Patient Scans</CardTitle>
              <CardDescription>Latest patient QR codes scanned in this ward</CardDescription>
            </CardHeader>
            <CardContent>
              {recentScans.length > 0 ? (
                <div className="space-y-4">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center p-3 border rounded-md bg-white">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium">Patient ID: {scan.patient_id}</h4>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {formatDateTime(scan.scanned_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p>No scans recorded yet</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">Total scans today: {scanCount}</p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>QR Code Scanner</CardTitle>
              <CardDescription>Scan patient QR codes to log their visit</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <Scan className="h-16 w-16 text-gray-400" />
              </div>
              <Sheet open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <SheetTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full"
                  >
                    <Scan className="h-5 w-5 mr-2" />
                    Scan QR Code
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90%] sm:h-[70%]">
                  <SheetHeader>
                    <SheetTitle>Scan Patient QR Code</SheetTitle>
                    <SheetDescription>
                      Position the QR code within the camera frame
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col items-center justify-center mt-8">
                    {isScannerOpen && (
                      <div className="w-full max-w-md mx-auto">
                        <QrScanner
                          delay={300}
                          onError={handleError}
                          onScan={handleScan}
                          style={{ width: '100%' }}
                          constraints={{
                            audio: false,
                            video: { facingMode: "environment" }
                          }}
                        />
                        <div className="text-center mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsScannerOpen(false)}
                            className="mt-4"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WardDashboard;
