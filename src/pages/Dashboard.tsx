
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
  wristband_qr_code: string | null;
  culture_qr_code: string | null;
  other_qr_code: string | null;
};

type RegisterPatientFunctionResult = {
  wristband_qr_code: string;
  other_qr_code: string;
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
  const [wristbandQRCode, setWristbandQRCode] = useState<string | null>(null);
  const [otherQRCode, setOtherQRCode] = useState<string | null>(null);
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
        setWristbandQRCode(data.wristband_qr_code);
        setOtherQRCode(data.other_qr_code);
        return data;
      } else {
        setPatientExists(false);
        setExistingPatientData(null);
        setWristbandQRCode(null);
        setOtherQRCode(null);
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
      setWristbandQRCode(null);
      setOtherQRCode(null);
      setHasPositiveHistory(false);
      setPositiveHistoryDate(null);
    }
  }, [patientId, checkPatientExists]);

  const { mutate: registerPatient, isPending: isRegistering } = useMutation({
    mutationFn: async ({ patientId, cultureRequired }: { patientId: string, cultureRequired: boolean }) => {
      // Use the register_or_update_patient function
      const { data, error } = await supabase
        .rpc("register_or_update_patient", {
          p_patient_id: patientId,
          p_culture_required: cultureRequired,
        });
      if (error) {
        throw error;
      }
      // Supabase returns an array (table return), use the first row.
      if (data && data.length > 0) {
        return data[0] as RegisterPatientFunctionResult;
      }
      return null;
    },
    onSuccess: (data) => {
      if (data) {
        setWristbandQRCode(data.wristband_qr_code);
        setOtherQRCode(data.other_qr_code);

        // Only show history alert if has_positive_history is true AND last_positive_date has a value
        if (data.has_positive_history && data.last_positive_date) {
          setHasPositiveHistory(true);
          setPositiveHistoryDate(data.last_positive_date);
        } else {
          setHasPositiveHistory(false);
          setPositiveHistoryDate(null);
        }

        toast({
          title: "Patient Registered",
          description: `Patient ${patientId} registered. QR codes loaded.${data.is_new_registration ? "" : " (Re-admission)"}`
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
        .select() as { data: Patient[] | null, error: any };
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
    // Always do function-driven registration (handles readmission and history)
    registerPatient({
      patientId: patientId,
      cultureRequired: cultureRequired === "yes"
    });
  };

  const handlePrint = (qrType: string, qrData: string | null) => {
    if (!qrData) return;
    const typeLabel = qrType === "wristband" ? "Wristband (W)" : "Other";
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient QR Code - ${typeLabel}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 20px; font-size: 16px; }
              h2 { font-weight: 300; color: #333; font-size: 24px; }
              .container { margin-top: 30px; }
              .type-label { font-weight: bold; margin-top: 10px; font-size: 18px; color: #555; }
            </style>
          </head>
          <body>
            <h2>TraceMed: Patient ${patientId}</h2>
            <p class="type-label">${typeLabel}</p>
            <div class="container" id="qrcode"></div>
            <p>Scan for patient information</p>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qrcode'), '${qrData}', function (error) {
                if (error) console.error(error);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
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
                  
                  {/* QR code section */}
                  {(wristbandQRCode || otherQRCode) && (
                    <div className="mt-8 flex flex-col items-center space-y-6 pt-6 border-t border-gray-100">
                      <p className="text-lg font-medium text-gray-700">Patient ID: {patientId} - QR Codes</p>
                      
                      {wristbandQRCode && (
                        <div className="w-full border rounded-md p-4 bg-gray-50">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col items-center">
                              <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                <QRCode value={wristbandQRCode} size={120} />
                              </div>
                              <p className="mt-2 font-medium text-blue-600 text-sm">Wristband (W)</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="text-xs text-gray-500 text-center md:text-left mb-2">
                                Primary QR code for patient identification.<br />
                                <span className="font-medium">This scan takes priority over other scans.</span>
                              </p>
                              <Button 
                                onClick={() => handlePrint("wristband", wristbandQRCode)}
                                variant="outline" 
                                size="sm"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                Print Wristband QR
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {otherQRCode && (
                        <div className="w-full border rounded-md p-4 bg-gray-50">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col items-center">
                              <div className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                <QRCode value={otherQRCode} size={120} />
                              </div>
                              <p className="mt-2 font-medium text-gray-600 text-sm">Other</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="text-xs text-gray-500 text-center md:text-left mb-2">
                                Additional QR code for other purposes.<br />
                                <span className="font-medium">Lower priority for patient location.</span>
                              </p>
                              <Button 
                                onClick={() => handlePrint("other", otherQRCode)}
                                variant="outline"
                                size="sm"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                Print Other QR
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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
