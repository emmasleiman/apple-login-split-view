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
    
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // Write the HTML content with an inline QR code SVG instead of using an external library
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient QR Code</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 20px; font-size: 16px; }
              h2 { font-weight: 300; color: #333; font-size: 24px; }
              .container { margin-top: 30px; display: flex; justify-content: center; }
              .patient-id { font-weight: bold; margin-top: 15px; font-size: 18px; color: #555; }
              .qr-container { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background-color: white; }
              .qr-svg { display: block; height: 200px; width: 200px; }
              p { color: #666; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h2>TraceMed Patient QR Code</h2>
            <div class="patient-id">Patient ID: ${patientId}</div>
            <div class="container">
              <div class="qr-container" id="qr-container"></div>
            </div>
            <p>Scan for patient information</p>
            <div id="qr-error" style="color: red; margin-top: 15px; display: none;">
              Error loading QR code. Please try again.
            </div>
          </body>
        </html>
      `);

      // Create a React QR Code in the new window
      const qrContainer = printWindow.document.getElementById('qr-container');
      
      try {
        // Create a canvas element in the new window for the QR code
        const canvas = printWindow.document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        qrContainer?.appendChild(canvas);
        
        // Import QR code script dynamically
        const script = printWindow.document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        script.onload = () => {
          // When script is loaded, render the QR code
          try {
            // Use the QRCode library from the print window context
            printWindow.QRCode.toCanvas(canvas, qrData, {
              width: 200,
              margin: 2
            }, function(error) {
              if (error) {
                console.error("QR Code error:", error);
                const errorDiv = printWindow.document.getElementById('qr-error');
                if (errorDiv) errorDiv.style.display = 'block';
              }
            });
          } catch (err) {
            console.error("QR rendering error:", err);
          }
        };
        
        script.onerror = () => {
          // If script fails to load, display error
          const errorDiv = printWindow.document.getElementById('qr-error');
          if (errorDiv) errorDiv.style.display = 'block';
          console.error("Failed to load QR Code library");
        };
        
        printWindow.document.body.appendChild(script);
      } catch (err) {
        console.error("QR initialization error:", err);
      }

      // Add a slight delay before printing to ensure the QR code is rendered
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error("Print error:", e);
        }
      }, 1000); // Increased timeout to 1000ms
    }
  };

  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargePatientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID to discharge",
        variant: "destructive",
      });
      return;
    }
    setShowDischargeConfirm(true);
  };

  const confirmDischarge = () => {
    dischargePatient(dischargePatientId);
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 font-inter">
      {/* Left sidebar with tabs */}
      <div className="w-64 border-r border-gray-200 bg-white shadow-sm flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">TraceMed</h1>
          <p className="text-sm text-gray-500 mt-1">Data Encoder</p>
        </div>
        
        <div className="flex flex-col gap-1 p-3 mt-4">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors 
              ${activeTab === 'register' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Register Patient
          </button>
          
          <button
            onClick={() => setActiveTab('discharge')}
            className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors 
              ${activeTab === 'discharge' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Discharge Patient
          </button>
        </div>
        
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              D
            </div>
            <span className="ml-2 text-sm text-gray-600">Data Encoder</span>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800">
            {activeTab === 'register' ? 'Patient Registration' : 'Patient Discharge'}
          </h1>
        </header>
        
        <div className="p-8">
          {/* Register Patient Tab Content */}
          {activeTab === 'register' && (
            <div className="max-w-3xl">
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardHeader className="bg-gray-50 border-b border-gray-100">
                  <CardTitle className="text-xl font-medium text-gray-700">Register New Patient</CardTitle>
                  {patientExists && (
                    <div className="text-amber-600 text-sm font-medium mt-1 flex items-center gap-1">
                      Patient ID already exists in the system
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="patientId" className="text-base text-gray-700">Enter Patient ID</Label>
                      <Input
                        id="patientId"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className={`h-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400/30 text-base ${patientExists ? 'border-amber-300' : ''}`}
                        placeholder="e.g. P12345"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base text-gray-700">MDRO Culture Required</Label>
                      <RadioGroup 
                        value={cultureRequired} 
                        onValueChange={(value) => setCultureRequired(value as "yes" | "no")}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="yes" />
                          <Label htmlFor="yes" className="font-normal text-base text-gray-600">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="no" />
                          <Label htmlFor="no" className="font-normal text-base text-gray-600">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isRegistering}
                    >
                      {isRegistering ? "Registering..." : "Register Patient"}
                    </Button>
                  </form>
                  
                  {/* Indicate lab culture history if present */}
                  {hasPositiveHistory && positiveHistoryDate && (
                    <div className="mt-8">
                      <div className="flex items-center gap-3 bg-amber-100 border border-amber-300 rounded-md p-4 shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div>
                          <div className="text-amber-800 font-medium text-sm">
                            Previous Positive Lab Result!
                          </div>
                          <div className="text-xs text-amber-700 mt-1">
                            This patient has a history of MDRO resistance.
                            <br />
                            Last positive lab processed:&nbsp;
                            <span className="font-medium">{positiveHistoryDate ? new Date(positiveHistoryDate).toLocaleString() : "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* QR code section - Now showing only one QR code */}
                  {qrCode && (
                    <div className="mt-8 flex flex-col items-center space-y-6 pt-6 border-t border-gray-100">
                      <p className="text-lg font-medium text-gray-700">Patient ID: {patientId} - QR Code</p>
                      
                      <div className="w-full border rounded-md p-4 bg-gray-50">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                              <QRCode value={qrCode} size={120} />
                            </div>
                            <p className="mt-2 font-medium text-blue-600 text-sm">Patient QR Code</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <p className="text-xs text-gray-500 text-center md:text-left mb-2">
                              Unified QR code for patient identification.<br />
                              <span className="font-medium">Used for all patient tracking purposes.</span>
                            </p>
                            <Button 
                              onClick={() => handlePrint(qrCode)}
                              variant="outline" 
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              Print QR Code
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Discharge Patient Tab Content */}
          {activeTab === 'discharge' && (
            <div className="max-w-3xl">
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardHeader className="bg-gray-50 border-b border-gray-100">
                  <CardTitle className="text-xl font-medium text-gray-700">Discharge Patient</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleDischargeSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="dischargePatientId" className="text-base text-gray-700">Enter Patient ID to Discharge</Label>
                      <Input
                        id="dischargePatientId"
                        value={dischargePatientId}
                        onChange={(e) => setDischargePatientId(e.target.value)}
                        className="h-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400/30 text-base"
                        placeholder="e.g. P12345"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Discharge Patient
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Patient Discharge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discharge patient with ID: <strong>{dischargePatientId}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDischarge}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Yes, Discharge Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
