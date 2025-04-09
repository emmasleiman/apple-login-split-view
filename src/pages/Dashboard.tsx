
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

type Patient = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  registration_date: string;
  discharge_date: string | null;
  qr_code_url: string | null;
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [cultureRequired, setCultureRequired] = useState<"yes" | "no">("no");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [dischargePatientId, setDischargePatientId] = useState("");

  const handleLogout = () => {
    navigate("/");
  };

  const { mutate: registerPatient } = useMutation({
    mutationFn: async ({ patientId, cultureRequired }: { patientId: string, cultureRequired: boolean }) => {
      const qrData = JSON.stringify({
        patientId: patientId,
        cultureRequired: cultureRequired,
        timestamp: new Date().toISOString(),
      });
      
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([
          {
            patient_id: patientId,
            culture_required: cultureRequired,
            status: 'admitted',
            qr_code_url: qrData // Store the QR data as a string in the database
          }
        ])
        .select() as { data: Patient[] | null, error: any };

      if (patientError) throw patientError;
      
      if (cultureRequired && patientData && patientData.length > 0) {
        const { error: labError } = await supabase
          .from('lab_results')
          .insert([
            {
              patient_id: patientData[0].id,
              sample_id: `${patientId}-${Date.now()}`,
              result: null
            }
          ]);
        
        if (labError) throw labError;
      }
      
      return patientData ? patientData[0] : null;
    },
    onSuccess: (data) => {
      const qrData = JSON.stringify({
        patientId: patientId,
        cultureRequired: cultureRequired === "yes",
        timestamp: new Date().toISOString(),
      });
      setQrCodeData(qrData);

      toast({
        title: "Patient Registered",
        description: `Patient ${patientId} registered successfully`,
      });
    },
    onError: (error) => {
      console.error("Error registering patient:", error);
      toast({
        title: "Registration Error",
        description: "Failed to register patient. Patient ID may already exist.",
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
    },
    onError: (error) => {
      console.error("Error discharging patient:", error);
      toast({
        title: "Discharge Error",
        description: "Failed to discharge patient. Patient may not exist.",
        variant: "destructive",
      });
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient QR Code</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 20px; font-size: 16px; }
              h2 { font-weight: 300; color: #333; font-size: 24px; }
              .container { margin-top: 30px; }
            </style>
          </head>
          <body>
            <h2>TraceMed: Patient ${patientId}</h2>
            <div class="container" id="qrcode"></div>
            <p>Scan for patient information</p>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qrcode'), '${qrCodeData}', function (error) {
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

    dischargePatient(dischargePatientId);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/40">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        aria-label="Logout"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <div className="w-full max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Data Encoder Dashboard</h1>
          <p className="text-base text-gray-500">Manage patient registrations and discharges</p>
        </div>

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="mb-8 bg-gray-100/80 rounded-xl shadow-sm">
            <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1">
              Register Patient
            </TabsTrigger>
            <TabsTrigger value="discharge" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1">
              Discharge Patient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="w-full space-y-6">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Register New Patient</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="patientId" className="text-base text-gray-700">Enter Patient ID</Label>
                    <Input
                      id="patientId"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 text-base"
                      placeholder="e.g. P12345"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base text-gray-700">Carbapenem Culture Required</Label>
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
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base"
                  >
                    Register Patient
                  </Button>
                </form>

                {qrCodeData && (
                  <div className="mt-8 flex flex-col items-center space-y-4 pt-6 border-t border-gray-100">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                      <QRCode value={qrCodeData} size={180} />
                    </div>
                    <p className="text-base text-gray-500">Patient ID: {patientId}</p>
                    <Button 
                      onClick={handlePrint}
                      variant="outline" 
                      className="mt-2 border-gray-200 text-gray-700 hover:bg-gray-50 text-base"
                    >
                      Print QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discharge">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Discharge Patient</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleDischargeSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="dischargePatientId" className="text-base text-gray-700">Enter Patient ID to Discharge</Label>
                    <Input
                      id="dischargePatientId"
                      value={dischargePatientId}
                      onChange={(e) => setDischargePatientId(e.target.value)}
                      className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 text-base"
                      placeholder="e.g. P12345"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base"
                  >
                    Discharge Patient
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

export default Dashboard;
