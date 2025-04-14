import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Scan, Clock, CheckCircle2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from 'react-qr-scanner';
import LogoutButton from "@/components/LogoutButton";

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
  const scanCooldownRef = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const extractPatientId = (qrData: string): string => {
    try {
      const parsed = JSON.parse(qrData);
      return parsed.patientId || qrData;
    } catch (e) {
      return qrData;
    }
  };

  const extractQRType = (qrData: string): string => {
    try {
      const parsed = JSON.parse(qrData);
      return parsed.type || "other";
    } catch (e) {
      return "other";
    }
  };
  
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

    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [navigate, toast]);
  
  const fetchRecentScans = async (ward: string) => {
    try {
      console.log('Fetching recent scans for ward:', ward);
      
      const { data, error } = await supabase
        .from('ward_scan_logs')
        .select('*')
        .eq('ward', ward)
        .order('scanned_at', { ascending: false })
        .limit(10) as { data: WardScanLog[] | null, error: any };
      
      if (error) {
        console.error('Error fetching scan logs:', error);
        return;
      }
      
      console.log('Scans fetched:', data);
      setRecentScans(data || []);
      setScanCount(data ? data.length : 0);
    } catch (error) {
      console.error('Error fetching scan logs:', error);
    }
  };
  
  const updatePatientLabStatus = async (patientId: string) => {
    try {
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .maybeSingle() as { data: { id: string } | null, error: any };
      
      if (patientError) {
        console.error('Error fetching patient data:', patientError);
        return;
      }
      
      if (!patientData) {
        console.error('Patient not found:', patientId);
        return;
      }
      
      const { data: updateData, error: updateError } = await supabase
        .from('lab_results')
        .update({ 
          result: 'resolved',
          notes: 'Patient moved to isolation room. Previously marked as positive.'
        })
        .eq('patient_id', patientData.id)
        .eq('result', 'positive')
        .select() as { data: any, error: any };
      
      if (updateError) {
        console.error('Error updating lab results:', updateError);
        return;
      }
      
      console.log('Updated lab results:', updateData);
      if (updateData && updateData.length > 0) {
        toast({
          title: "Status Updated",
          description: "Patient marked as resolved since they're now in isolation.",
        });
      }
    } catch (error) {
      console.error('Error updating patient lab status:', error);
    }
  };
  
  const handleScan = async (data: { text: string } | null) => {
    if (!data || !data.text || scanCooldownRef.current) {
      return;
    }
    
    scanCooldownRef.current = true;
    console.log('QR scan detected:', data.text);
    
    setIsScanning(false);
    
    try {
      const qrData = data.text.trim();
      const patientId = extractPatientId(qrData);
      const qrType = extractQRType(qrData);
      
      console.log("Raw QR data:", qrData);
      console.log("Extracted patient ID:", patientId);
      console.log("QR code type:", qrType);
      
      const { data: patientExists, error: patientCheckError } = await supabase
        .from('patients')
        .select('id, patient_id')
        .eq('patient_id', patientId)
        .maybeSingle() as { data: any, error: any };
      
      if (patientCheckError) {
        console.error('Error checking patient:', patientCheckError);
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Failed to verify patient record. Please try again.",
        });
        return;
      }
      
      if (!patientExists) {
        console.warn('Patient not found in database:', patientId);
        toast({
          variant: "destructive",
          title: "Unknown Patient",
          description: `No record found for patient ID: ${patientId}`,
        });
        return;
      }
      
      console.log('Patient verified:', patientExists);
      
      if (qrType === "wristband") {
        const { data: insertData, error } = await supabase
          .from('ward_scan_logs')
          .insert({
            patient_id: qrData,
            ward: wardName,
            scanned_by: wardUsername,
          })
          .select() as { data: WardScanLog[] | null, error: any };
        
        if (error) {
          console.error('Error logging scan:', error);
          toast({
            variant: "destructive",
            title: "Scan Failed",
            description: "Failed to log patient scan. Please try again.",
          });
          return;
        }
        
        console.log('Wristband scan log inserted:', insertData);
        
        if (wardName === 'isolation_room') {
          await updatePatientLabStatus(patientId);
        }
        
        toast({
          title: "Wristband Scan Successful",
          description: `Patient ID ${patientId} location updated to ${wardName}.`,
        });
      } else {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        const { data: recentWristbandScans, error: recentScansError } = await supabase
          .from('ward_scan_logs')
          .select('*')
          .eq('patient_id', qrData.includes("wristband") ? qrData : `{"patientId":"${patientId}","type":"wristband"}`)
          .gt('scanned_at', fiveMinutesAgo.toISOString())
          .order('scanned_at', { ascending: false })
          .limit(1) as { data: WardScanLog[] | null, error: any };
        
        if (recentScansError) {
          console.error('Error checking recent scans:', recentScansError);
        }
        
        if (!recentWristbandScans || recentWristbandScans.length === 0) {
          const { data: insertData, error } = await supabase
            .from('ward_scan_logs')
            .insert({
              patient_id: qrData,
              ward: wardName,
              scanned_by: wardUsername,
            })
            .select() as { data: WardScanLog[] | null, error: any };
          
          if (error) {
            console.error('Error logging scan:', error);
            toast({
              variant: "destructive",
              title: "Scan Failed",
              description: "Failed to log patient scan. Please try again.",
            });
            return;
          }
          
          console.log(`${qrType} scan log inserted:`, insertData);
          
          if (wardName === 'isolation_room') {
            await updatePatientLabStatus(patientId);
          }
          
          toast({
            title: "Scan Successful",
            description: `Patient ID ${patientId} location updated to ${wardName}.`,
          });
        } else {
          const { data: insertData, error } = await supabase
            .from('ward_scan_logs')
            .insert({
              patient_id: qrData,
              ward: wardName,
              scanned_by: wardUsername,
            })
            .select() as { data: WardScanLog[] | null, error: any };
          
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
            title: "Scan Recorded",
            description: `Note: A wristband scan may override this location update.`,
          });
        }
      }
      
      fetchRecentScans(wardName);
      setIsScannerOpen(false);
    } catch (error) {
      console.error('Error processing scan:', error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Failed to process QR code. Please try again.",
      });
    } finally {
      scanTimeoutRef.current = setTimeout(() => {
        scanCooldownRef.current = false;
        console.log('Scanner cooldown reset, ready for next scan');
      }, 3000);
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
  
  const handleScannerClose = () => {
    setIsScannerOpen(false);
    scanCooldownRef.current = false;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
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
          
          <LogoutButton />
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
                        <h4 className="font-medium">Patient ID: {extractPatientId(scan.patient_id)}</h4>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {formatDateTime(scan.scanned_at)}
                          {scan.patient_id.includes("wristband") && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Wristband</span>
                          )}
                          {scan.patient_id.includes("culture") && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Culture</span>
                          )}
                          {scan.patient_id.includes("other") && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Other</span>
                          )}
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
                          delay={500}
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
                            onClick={handleScannerClose}
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
