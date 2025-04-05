
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Sample data for demonstration
const patientData = [
  { id: "P12345", ward: "ICU", admittedOn: "2025-04-04 09:30", status: "critical", cultureRequired: "Yes", result: "Positive" },
  { id: "P12346", ward: "Pediatrics", admittedOn: "2025-04-03 14:15", status: "clear", cultureRequired: "Yes", result: "Negative" },
  { id: "P12347", ward: "General", admittedOn: "2025-04-03 10:00", status: "pending", cultureRequired: "Yes", result: "Awaiting results" },
  { id: "P12348", ward: "Cardiology", admittedOn: "2025-04-02 16:45", status: "discharged", cultureRequired: "No", result: "N/A" },
  { id: "P12349", ward: "Oncology", admittedOn: "2025-04-01 08:20", status: "discharged", cultureRequired: "Yes", result: "Negative" },
];

// Helper function to ensure status is a valid variant
const getStatusVariant = (status: string): "critical" | "pending" | "clear" | "discharged" => {
  if (status === "critical") return "critical";
  if (status === "pending") return "pending";
  if (status === "clear") return "clear";
  if (status === "discharged") return "discharged";
  return "clear"; // Default fallback
};

// Component for displaying patient history modal
const PatientHistory = ({ patient, onClose }: { patient: any, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">Patient {patient.id} History</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-500">Ward:</div>
          <div>{patient.ward}</div>
          
          <div className="text-gray-500">Admitted On:</div>
          <div>{patient.admittedOn}</div>
          
          <div className="text-gray-500">Status:</div>
          <div>
            <Badge variant={getStatusVariant(patient.status)}>{patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}</Badge>
          </div>
          
          <div className="text-gray-500">Culture Required:</div>
          <div>{patient.cultureRequired}</div>
          
          <div className="text-gray-500">Result:</div>
          <div>{patient.result}</div>
        </div>

        <div className="pt-4">
          <h3 className="text-lg font-medium mb-2">Timeline</h3>
          <div className="space-y-2">
            <div className="border-l-2 border-blue-500 pl-4 py-1">
              <p className="text-sm text-gray-500">{patient.admittedOn}</p>
              <p className="font-medium">Admitted to {patient.ward}</p>
            </div>
            
            {patient.cultureRequired === "Yes" && (
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-sm text-gray-500">{new Date(new Date(patient.admittedOn).getTime() + 2 * 60 * 60 * 1000).toLocaleString()}</p>
                <p className="font-medium">Lab sample collected for culture</p>
              </div>
            )}
            
            {patient.result !== "Awaiting results" && patient.cultureRequired === "Yes" && (
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-sm text-gray-500">{new Date(new Date(patient.admittedOn).getTime() + 24 * 60 * 60 * 1000).toLocaleString()}</p>
                <p className="font-medium">Culture results: {patient.result}</p>
              </div>
            )}
            
            {patient.status === "discharged" && (
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-sm text-gray-500">{new Date(new Date(patient.admittedOn).getTime() + 48 * 60 * 60 * 1000).toLocaleString()}</p>
                <p className="font-medium">Patient discharged</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

// Main Admin Dashboard component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [dischargePatientId, setDischargePatientId] = useState("");

  // Filter patients based on search term
  const filteredPatients = patientData.filter(
    (patient) =>
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    navigate("/");
  };

  const handlePatientClick = (patient: any) => {
    setSelectedPatient(patient);
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

    const patient = patientData.find(p => p.id === dischargePatientId);
    
    if (!patient) {
      toast({
        title: "Error",
        description: "Patient not found",
        variant: "destructive",
      });
      return;
    }
    
    if (patient.status === "discharged") {
      toast({
        title: "Error",
        description: "Patient is already discharged",
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
    <div className="min-h-screen bg-gray-50/40">
      {/* Logout button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        aria-label="Logout"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Admin Dashboard</h1>
          <p className="text-base text-gray-500">Monitor patients and manage system data</p>
        </div>

        <Tabs defaultValue="critical" className="w-full">
          <TabsList className="mb-8 bg-gray-100/80 rounded-xl shadow-sm">
            <TabsTrigger 
              value="critical" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1"
            >
              Critical Cases
            </TabsTrigger>
            <TabsTrigger 
              value="database" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1"
            >
              Full Database
            </TabsTrigger>
            <TabsTrigger 
              value="discharge" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1"
            >
              Discharge Patient
            </TabsTrigger>
          </TabsList>

          {/* Critical Cases Tab */}
          <TabsContent value="critical">
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {patientData
                    .filter((patient) => patient.status === "critical")
                    .map((patient) => (
                      <div 
                        key={patient.id}
                        className="p-4 border border-red-100 rounded-lg bg-red-50/50 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="critical">Critical</Badge>
                          <span className="font-medium text-gray-800 cursor-pointer hover:underline" onClick={() => handlePatientClick(patient)}>
                            {patient.id}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.ward} • {patient.admittedOn}
                        </div>
                      </div>
                    ))}
                  
                  {patientData.filter((patient) => patient.status === "critical").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No critical cases at this time
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Database Tab */}
          <TabsContent value="database">
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Patient Database</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 h-12 border-gray-200 bg-gray-50/30"
                  />
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Patient ID</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Admitted On</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Carbapenem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell 
                              className="font-medium cursor-pointer hover:underline text-blue-600"
                              onClick={() => handlePatientClick(patient)}
                            >
                              {patient.id}
                            </TableCell>
                            <TableCell>{patient.ward}</TableCell>
                            <TableCell>{patient.admittedOn}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(patient.status)}>
                                {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {patient.cultureRequired === "Yes" ? (
                                patient.result === "Positive" ? (
                                  <span className="text-red-500">Detected</span>
                                ) : patient.result === "Negative" ? (
                                  <span className="text-green-500">Clear</span>
                                ) : (
                                  <span className="text-amber-500">Pending</span>
                                )
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No patients found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discharge Patient Tab */}
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

      {/* Patient history modal */}
      {selectedPatient && (
        <PatientHistory patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
