
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

const Dashboard = () => {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState("");
  const [cultureRequired, setCultureRequired] = useState<"yes" | "no">("no");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [dischargePatientId, setDischargePatientId] = useState("");

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

    // Generate QR code with patient data
    const qrData = JSON.stringify({
      patientId: patientId,
      cultureRequired: cultureRequired,
      timestamp: new Date().toISOString(),
    });
    setQrCodeData(qrData);

    toast({
      title: "Patient Registered",
      description: `Patient ${patientId} registered successfully`,
    });

    // ---------------------------------------------------------
    // This is where backend code for registering a patient should go.
    // It should:
    // 1. Validate the patientId format
    // 2. Check if patient already exists in database
    // 3. Create a new patient record with the following data:
    //    - patientId (string)
    //    - registrationDate (timestamp)
    //    - cultureRequired (boolean)
    //    - status (string) = "admitted"
    // 4. Generate unique QR code identifier and associate with patient
    // 5. Return success/failure status to frontend
    // 6. Log the registration event for auditing
    // ---------------------------------------------------------
  };

  const handlePrint = () => {
    // Open print dialog
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient QR Code</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 20px; }
              h2 { font-weight: 300; color: #333; }
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

    toast({
      title: "Processing",
      description: `Discharging patient ${dischargePatientId}...`,
    });

    // ---------------------------------------------------------
    // This is where backend code for discharging a patient should go.
    // It should:
    // 1. Validate the patient ID exists in the database
    // 2. Check current patient status (cannot discharge if already discharged)
    // 3. Update patient record with:
    //    - status = "discharged"
    //    - dischargeDate (timestamp)
    // 4. Generate discharge summary document (optional)
    // 5. Update any related records (e.g., room availability)
    // 6. Return success/failure status to frontend
    // 7. Log discharge event for auditing
    // ---------------------------------------------------------

    // Simulate successful discharge
    setTimeout(() => {
      toast({
        title: "Success",
        description: `Patient ${dischargePatientId} discharged successfully`,
      });
      setDischargePatientId("");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-light tracking-tight mb-6">Data Encoder Dashboard</h1>
        <Separator className="mb-6" />

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="register">Register Patient</TabsTrigger>
            <TabsTrigger value="discharge">Discharge Patient</TabsTrigger>
          </TabsList>

          {/* Register Patient Tab */}
          <TabsContent value="register" className="w-full">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-light">Register Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Enter Patient ID</Label>
                    <Input
                      id="patientId"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="h-12 border border-gray-200 bg-gray-50/50"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Carbapenem Culture Required</Label>
                    <RadioGroup 
                      value={cultureRequired} 
                      onValueChange={(value) => setCultureRequired(value as "yes" | "no")}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes" />
                        <Label htmlFor="yes" className="font-normal text-sm">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no" />
                        <Label htmlFor="no" className="font-normal text-sm">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gray-900 hover:bg-gray-800 h-12 mt-4"
                  >
                    Submit
                  </Button>
                </form>

                {qrCodeData && (
                  <div className="mt-8 flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <QRCode value={qrCodeData} size={180} />
                    </div>
                    <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
                    <Button 
                      onClick={handlePrint}
                      variant="outline" 
                      className="mt-2"
                    >
                      Print QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discharge Patient Tab */}
          <TabsContent value="discharge">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-light">Discharge Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDischargeSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="dischargePatientId">Enter Patient ID to Discharge</Label>
                    <Input
                      id="dischargePatientId"
                      value={dischargePatientId}
                      onChange={(e) => setDischargePatientId(e.target.value)}
                      className="h-12 border border-gray-200 bg-gray-50/50"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gray-900 hover:bg-gray-800 h-12 mt-4"
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
