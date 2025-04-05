
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Users, FileText, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define types based on your database schema
type Patient = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  registration_date: string;
  discharge_date: string | null;
};

type LabResult = {
  id: string;
  patient_id: string;
  sample_id: string;
  result: string | null;
  collection_date: string;
  processed_by: string | null;
  processed_date: string | null;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patientIdFilter, setPatientIdFilter] = useState("");
  const [dischargePatientId, setDischargePatientId] = useState("");
  const [labResult, setLabResult] = useState("");
  const [labTechName, setLabTechName] = useState("");

  // Fetch patients data
  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    refetch: refetchPatients,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*") as { data: Patient[] | null, error: any };
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lab results
  const {
    data: labResults = [],
    isLoading: isLoadingLabResults,
    refetch: refetchLabResults,
  } = useQuery({
    queryKey: ["lab_results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*, patients!inner(patient_id)") as { data: (LabResult & { patients: Pick<Patient, 'patient_id'> })[] | null, error: any };
      
      if (error) throw error;
      return data || [];
    },
  });

  // Filter critical cases (positive results)
  const criticalCases = labResults.filter(result => result.result === "positive");

  // Filter patients based on search input
  const filteredPatients = patientIdFilter
    ? patients.filter(patient => 
        patient.patient_id.toLowerCase().includes(patientIdFilter.toLowerCase())
      )
    : patients;

  const handleLabResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!labTechName || !labResult) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    const sampleIdInput = (document.getElementById("sampleId") as HTMLInputElement).value;
    
    if (!sampleIdInput) {
      toast({
        title: "Error",
        description: "Please enter a sample ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update({
          result: labResult,
          processed_by: labTechName,
          processed_date: new Date().toISOString(),
        })
        .eq("sample_id", sampleIdInput)
        .select() as { data: LabResult[] | null, error: any };
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: `Lab result updated successfully for sample ${sampleIdInput}`,
        });
        
        setLabResult("");
        setLabTechName("");
        (document.getElementById("sampleId") as HTMLInputElement).value = "";
        refetchLabResults();
      } else {
        toast({
          title: "Error",
          description: "No sample found with the provided ID",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating lab result:", error);
      toast({
        title: "Error",
        description: "Failed to update lab result",
        variant: "destructive",
      });
    }
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dischargePatientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID to discharge",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("patients")
        .update({
          status: "discharged",
          discharge_date: new Date().toISOString()
        })
        .eq("patient_id", dischargePatientId)
        .select() as { data: Patient[] | null, error: any };
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: `Patient ${dischargePatientId} discharged successfully`,
        });
        setDischargePatientId("");
        refetchPatients();
      } else {
        toast({
          title: "Error",
          description: "No patient found with the provided ID",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error discharging patient:", error);
      toast({
        title: "Error",
        description: "Failed to discharge patient",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    navigate("/");
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

      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Administrator Dashboard</h1>
          <p className="text-base text-gray-500">Monitor and manage patient data</p>
        </div>

        <Tabs defaultValue="criticalCases" className="w-full">
          <TabsList className="mb-8 bg-gray-100/80 rounded-xl shadow-sm">
            <TabsTrigger 
              value="criticalCases" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="h-5 w-5" />
              Critical Cases
            </TabsTrigger>
            <TabsTrigger 
              value="inputLabResults" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="h-5 w-5" />
              Input Lab Results
            </TabsTrigger>
            <TabsTrigger 
              value="allPatients" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1 flex items-center justify-center gap-2"
            >
              <Users className="h-5 w-5" />
              All Patients
            </TabsTrigger>
            <TabsTrigger 
              value="dischargePatient" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1 flex items-center justify-center gap-2"
            >
              <LogOut className="h-5 w-5" />
              Discharge Patient
            </TabsTrigger>
          </TabsList>

          {/* Critical Cases Tab */}
          <TabsContent value="criticalCases">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases - Positive Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingLabResults ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse text-gray-500">Loading critical cases...</div>
                  </div>
                ) : criticalCases.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {criticalCases.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.sample_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.patients?.patient_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="destructive" className="px-3 py-1">Positive</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.processed_by}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.processed_date && format(new Date(result.processed_date), 'MMM dd, yyyy HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No critical cases found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Input Lab Results Tab */}
          <TabsContent value="inputLabResults">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Input Lab Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleLabResultSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="sampleId" className="text-base text-gray-700">Sample ID</Label>
                    <Input
                      id="sampleId"
                      className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 text-base"
                      placeholder="Enter sample ID"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base text-gray-700">Result</Label>
                    <RadioGroup 
                      value={labResult} 
                      onValueChange={setLabResult}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="positive" id="positive" />
                        <Label htmlFor="positive" className="font-normal text-base text-gray-600">Positive</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="negative" id="negative" />
                        <Label htmlFor="negative" className="font-normal text-base text-gray-600">Negative</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="labTechName" className="text-base text-gray-700">Lab Technician Name</Label>
                    <Input
                      id="labTechName"
                      value={labTechName}
                      onChange={(e) => setLabTechName(e.target.value)}
                      className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 text-base"
                      placeholder="Enter name"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base"
                  >
                    Submit Lab Result
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Patients Tab */}
          <TabsContent value="allPatients">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="text-2xl font-normal text-gray-700">All Patients</CardTitle>
                  <div className="w-full md:w-64">
                    <Input
                      placeholder="Search by patient ID"
                      value={patientIdFilter}
                      onChange={(e) => setPatientIdFilter(e.target.value)}
                      className="h-10 border-gray-200"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingPatients ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse text-gray-500">Loading patients...</div>
                  </div>
                ) : filteredPatients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discharge Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Culture Required</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPatients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.patient_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={patient.status === "discharged" ? "outline" : "default"} className="px-3 py-1">
                                {patient.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(patient.registration_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.discharge_date ? format(new Date(patient.discharge_date), 'MMM dd, yyyy') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.culture_required ? 'Yes' : 'No'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No patients found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discharge Patient Tab */}
          <TabsContent value="dischargePatient">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Discharge Patient</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleDischargeSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="dischargePatientId" className="text-base text-gray-700">Patient ID to Discharge</Label>
                    <Input
                      id="dischargePatientId"
                      value={dischargePatientId}
                      onChange={(e) => setDischargePatientId(e.target.value)}
                      className="h-12 border-gray-200 bg-gray-50/30 focus:border-gray-300 focus:ring-gray-300/30 text-base"
                      placeholder="Enter patient ID"
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

export default AdminDashboard;
