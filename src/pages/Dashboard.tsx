import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

type Patient = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  registration_date: string;
  discharge_date: string | null;
  qr_code_url: string | null;
};

type RegisterPatientFunctionResult = {
  qr_code: string;
  is_new_registration: boolean;
  has_positive_history: boolean;
  last_positive_date: string | null;
  patient_uuid: string;
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [cultureRequired, setCultureRequired] = useState<"yes" | "no">("no");
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [dischargePatientId, setDischargePatientId] = useState("");
  const [patientExists, setPatientExists] = useState(false);
  const [existingPatientData, setExistingPatientData] = useState<Patient | null>(null);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'discharge'>('register');

  // For registration "history" indicator
  const [hasPositiveHistory, setHasPositiveHistory] = useState<boolean>(false);
  const [positiveHistoryDate, setPositiveHistoryDate] = useState<string | null>(null);

  const { refetch: checkPatientExists } = useQuery({
    queryKey: ["checkPatient", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'admitted')
        .single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setPatientExists(true);
        setExistingPatientData(data as Patient);
        setQRCode(data.qr_code_url);
        return data;
      } else {
        setPatientExists(false);
        setExistingPatientData(null);
        setQRCode(null);
        return null;
      }
    },
    enabled: false,
  });

  useEffect(() => {
    if (patientId.trim()) {
      const timer = setTimeout(() => {
        checkPatientExists();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPatientExists(false);
      setExistingPatientData(null);
      setQRCode(null);
      setHasPositiveHistory(false);
      setPositiveHistoryDate(null);
    }
  }, [patientId, checkPatientExists]);

  const { mutate: registerPatient, isPending: isRegistering } = useMutation({
    mutationFn: async ({ patientId, cultureRequired }: { patientId: string, cultureRequired: boolean }) => {
      // Generate a single QR code with patient information
      const qrData = JSON.stringify({
        patientId: patientId,
        timestamp: new Date().toISOString(),
        cultureRequired: cultureRequired
      });
      
      // Insert or update the patient record with a single QR code
      const { data, error } = await supabase
        .from("patients")
        .upsert({
          patient_id: patientId,
          culture_required: cultureRequired,
          status: 'admitted',
          qr_code_url: qrData,
          discharge_date: null,
        }, {
          onConflict: 'patient_id'
        });

      if (error) throw error;

      // Check for patient history with positive results
      const { data: historyData } = await supabase
        .from('patient_lab_results')
        .select('result, processed_date')
        .eq('patient_id', patientId)
        .eq('result', 'positive')
        .order('processed_date', { ascending: false })
        .limit(1);

      return {
        qr_code: qrData,
        is_new_registration: !patientExists,
        has_positive_history: historyData && historyData.length > 0,
        last_positive_date: historyData && historyData.length > 0 ? historyData[0].processed_date : null,
        patient_uuid: ""
      };
    },
    onSuccess: (data) => {
      if (data) {
        setQRCode(data.qr_code);

        if (data.has_positive_history && data.last_positive_date) {
          setHasPositiveHistory(true);
          setPositiveHistoryDate(data.last_positive_date);
        } else {
          setHasPositiveHistory(false);
          setPositiveHistoryDate(null);
        }

        toast({
          title: "Patient Registered",
          description: `Patient ${patientId} registered. QR code generated.${data.is_new_registration ? "" : " (Re-admission)"}`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    }
  });

  const { mutate: dischargePatient } = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase
        .from('patients')
        .update({
          status: 'discharged',
          discharge_date: new Date().toISOString()
        })
        .eq('patient_id', patientId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Patient ${dischargePatientId} discharged successfully`,
      });
      setDischargePatientId("");
      setShowDischargeConfirm(false);
    },
    onError: (error) => {
      toast({
        title: "Discharge Error",
        description: "Failed to discharge patient. Patient may not exist.",
        variant: "destructive",
      });
      setShowDischargeConfirm(false);
    }
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }
    registerPatient({
      patientId: patientId,
      cultureRequired: cultureRequired === "yes"
    });
  };

  const handlePrint = (qrData: string | null) => {
    if (!qrData) return;
    
    // Open a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser settings.",
        variant: "destructive",
      });
      return;
    }
    
    // Write the HTML content for the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient QR Code</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 20px; 
              font-size: 16px; 
            }
            h2 { 
              font-weight: 300; 
              color: #333; 
              font-size: 24px; 
              margin-bottom: 30px;
            }
            .container { 
              margin: 30px auto; 
              display: flex; 
              justify-content: center;
            }
            .patient-id { 
              font-weight: bold; 
              margin: 15px 0;
              font-size: 18px; 
              color: #555; 
            }
            .qr-container { 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 8px; 
              background-color: white;
              width: 200px;
              height: 200px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            p { 
              color: #666; 
              margin-top: 20px; 
            }
            #error-message {
              color: red;
              margin-top: 15px;
              display: none;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
        </head>
        <body>
          <h2>TraceMed Patient QR Code</h2>
          <div class="patient-id">Patient ID: ${patientId}</div>
          <div class="container">
            <div class="qr-container" id="qr-container"></div>
          </div>
          <p>Scan for patient information</p>
          <div id="error-message">Error loading QR code. Please try printing again.</div>
          
          <script>
            // Function to generate QR code
            function generateQR() {
              try {
                // Get the QR data
                const qrData = ${JSON.stringify(qrData)};
                
                // Generate QR code in the container
                QRCode.toCanvas(
                  document.getElementById('qr-container'), 
                  qrData, 
                  { 
                    width: 180,
                    margin: 1,
                    errorCorrectionLevel: 'H'
                  },
                  function(error) {
                    if (error) {
                      document.getElementById('error-message').style.display = 'block';
                      console.error('Error generating QR code:', error);
                    }
                  }
                );
                
                // Print automatically after a short delay
                setTimeout(() => {
                  window.print();
                }, 500);
              } catch (err) {
                document.getElementById('error-message').style.display = 'block';
                console.error('Error in QR generation:', err);
              }
            }
            
            // Run when document is loaded
            window.onload = generateQR;
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Data Entry Dashboard</h1>
      </div>
      
      <div className="flex space-x-2 border-b pb-2">
        <Button 
          variant={activeTab === 'register' ? "default" : "outline"} 
          onClick={() => setActiveTab('register')}
        >
          Register Patient
        </Button>
        <Button 
          variant={activeTab === 'discharge' ? "default" : "outline"} 
          onClick={() => setActiveTab('discharge')}
        >
          Discharge Patient
        </Button>
      </div>
      
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Register New Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input
                    id="patientId"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                    required
                  />
                  {patientExists && (
                    <div className="text-amber-600 text-sm flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" /> 
                      Patient already registered. Re-registering will update their information.
                    </div>
                  )}
                  {hasPositiveHistory && positiveHistoryDate && (
                    <div className="text-red-600 text-sm flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" /> 
                      Patient has positive history from {new Date(positiveHistoryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Culture Required</Label>
                  <RadioGroup 
                    value={cultureRequired} 
                    onValueChange={(val) => setCultureRequired(val as "yes" | "no")} 
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no">No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes">Yes</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Button type="submit" disabled={isRegistering}>
                  {isRegistering ? "Registering..." : "Register Patient"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {qrCode && (
            <Card>
              <CardHeader>
                <CardTitle>Patient QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-48 h-48 border p-2 bg-white">
                  <QRCode
                    value={qrCode}
                    size={176}
                    level="H"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center space-x-4">
                <Button onClick={() => handlePrint(qrCode)}>
                  Print QR Code
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'discharge' && (
        <Card>
          <CardHeader>
            <CardTitle>Discharge Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dischargePatientId">Patient ID</Label>
                <Input
                  id="dischargePatientId"
                  value={dischargePatientId}
                  onChange={(e) => setDischargePatientId(e.target.value)}
                  placeholder="Enter patient ID to discharge"
                  required
                />
              </div>
              
              <Button
                disabled={!dischargePatientId.trim()}
                onClick={() => setShowDischargeConfirm(true)}
              >
                Discharge Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discharge Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discharge patient {dischargePatientId}? This will mark them as discharged in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => dischargePatient(dischargePatientId)}>
              Yes, Discharge Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
