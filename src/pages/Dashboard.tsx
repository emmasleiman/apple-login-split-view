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

  const handlePrint = (qrData: string | null) => {
    if (!qrData) {
      toast({
        title: "Error",
        description: "No QR code data available to print",
        variant: "destructive",
      });
      return;
    }
    
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
    
    // Write the HTML content with QR code
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
            }
            h2 { 
              font-weight: 300; 
              color: #333; 
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
            }
            .qr-container { 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 8px;
              width: 200px;
              height: 200px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            #qr-fallback {
              display: none;
              padding: 10px;
              background: #f8f8f8;
              border: 1px dashed #ccc;
              margin-top: 20px;
              text-align: center;
            }
            p { color: #666; margin-top: 20px; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        </head>
        <body>
          <h2>TraceMed Patient QR Code</h2>
          <div class="patient-id">Patient ID: ${patientId}</div>
          <div class="container">
            <div class="qr-container">
              <canvas id="qr-canvas"></canvas>
            </div>
          </div>
          <p>Scan for patient information</p>
          <div id="qr-fallback">
            Patient ID: ${patientId}<br>
            Unable to display QR code
          </div>
          
          <script>
            // Try to load QRCode library and generate QR
            try {
              window.onload = function() {
                if (typeof QRCode !== 'undefined') {
                  QRCode.toCanvas(
                    document.getElementById('qr-canvas'),
                    '${qrData.replace(/'/g, "\\'")}',
                    {
                      width: 180,
                      margin: 1,
                      color: {
                        dark: '#000000',
                        light: '#ffffff'
                      }
                    },
                    function(error) {
                      if (error) {
                        console.error(error);
                        document.getElementById('qr-fallback').style.display = 'block';
                      }
                    }
                  );
                  // Print after a short delay to ensure QR code is rendered
                  setTimeout(function() { window.print(); }, 1000);
                } else {
                  document.getElementById('qr-fallback').style.display = 'block';
                }
              };
            } catch (e) {
              console.error('QR Code generation failed:', e);
              document.getElementById('qr-fallback').style.display = 'block';
            }
          </script>
        </body>
      </html>
    `);
    
    // Close the document for writing
    printWindow.document.close();
  };

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

  const dischargePatientConfirm = (patientId: string) => {
    setDischargePatientId(patientId);
    setShowDischargeConfirm(true);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Patient Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <Button variant={activeTab === 'register' ? 'default' : 'secondary'} onClick={() => setActiveTab('register')}>Register Patient</Button>
            <Button variant={activeTab === 'discharge' ? 'default' : 'secondary'} onClick={() => setActiveTab('discharge')}>Discharge Patient</Button>
          </div>

          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="grid gap-4">
              <div>
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  type="text"
                  id="patientId"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>
              <div>
                <Label>Culture Required?</Label>
                <RadioGroup defaultValue={cultureRequired} onValueChange={(value) => setCultureRequired(value as "yes" | "no")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="culture-yes" />
                    <Label htmlFor="culture-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="culture-no" />
                    <Label htmlFor="culture-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {hasPositiveHistory && positiveHistoryDate && (
                <div className="rounded-md border p-4 bg-yellow-100 border-yellow-200 text-sm text-yellow-700">
                  <AlertTriangle className="h-4 w-4 mr-2 inline-block align-middle" />
                  <span className="align-middle">
                    <strong>Warning:</strong> Patient has a history of positive lab results as of {new Date(positiveHistoryDate).toLocaleDateString()}.
                  </span>
                </div>
              )}

              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? "Registering..." : "Register Patient"}
              </Button>
            </form>
          )}

          {activeTab === 'discharge' && (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="dischargePatientId">Patient ID to Discharge</Label>
                <Input
                  type="text"
                  id="dischargePatientId"
                  value={dischargePatientId}
                  onChange={(e) => setDischargePatientId(e.target.value)}
                />
              </div>
              <Button onClick={() => dischargePatientConfirm(dischargePatientId)}>Discharge Patient</Button>
            </div>
          )}
        </CardContent>
        {qrCode && (
          <CardFooter className="flex justify-between items-center">
            <Button onClick={() => handlePrint(qrCode)}>Print QR Code</Button>
            {/* <QRCode value={qrCode} size={128} /> */}
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will discharge the patient from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDischargeConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => dischargePatient(dischargePatientId)}>Discharge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
