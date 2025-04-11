import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Users, FileText, LogOut, Search, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import PatientScanLogs from "@/components/PatientScanLogs";

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

type PatientLabResult = {
  patient_uuid: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  registration_date: string;
  discharge_date: string | null;
  lab_result_id: string | null;
  sample_id: string | null;
  result: string | null;
  collection_date: string | null;
  processed_by: string | null;
  processed_date: string | null;
  notes: string | null;
};

type LabTest = {
  id: string;
  type: string;
  requestedOn: string;
  status: string;
  resistanceResult: string | null;
};

type PatientData = {
  id: string;
  labs: LabTest[];
};

type WardScanLog = {
  id: string;
  patient_id: string;
  ward: string;
  scanned_at: string;
  scanned_by: string
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [patientIdFilter, setPatientIdFilter] = useState("");
  const [dischargePatientId, setDischargePatientId] = useState("");
  const [labResult, setLabResult] = useState("");
  const [labTechName, setLabTechName] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [resistance, setResistance] = useState<"positive" | "negative" | null>(null);
  const [isPatientLogsOpen, setIsPatientLogsOpen] = useState(false);
  const [selectedPatientForLogs, setSelectedPatientForLogs] = useState<string | null>(null);
  const [patientScanLogs, setPatientScanLogs] = useState<WardScanLog[]>([]);
  const [isLoadingPatientLogs, setIsLoadingPatientLogs] = useState(false);

  const form = useForm({
    defaultValues: {
      patientId: "",
    }
  });

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

  const criticalCases = labResults.filter(result => result.result === "positive");

  const filteredPatients = patientIdFilter
    ? patients.filter(patient => 
        patient.patient_id.toLowerCase().includes(patientIdFilter.toLowerCase())
      )
    : patients;

  const fetchPatientLabResults = async (patientId: string) => {
    const { data, error } = await supabase
      .from('patient_lab_results')
      .select('*')
      .eq('patient_id', patientId) as { data: PatientLabResult[] | null, error: any };
    
    if (error) throw error;
    return data || [];
  };

  const fetchPatientScanLogs = async (patientId: string) => {
    setIsLoadingPatientLogs(true);
    try {
      console.log('Fetching logs for patient ID:', patientId);
      
      const { data, error } = await supabase
        .from('ward_scan_logs')
        .select('*')
        .eq('patient_id', patientId)
        .order('scanned_at', { ascending: false }) as { data: WardScanLog[] | null, error: any };
      
      if (error) {
        console.error('Error fetching patient scan logs:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load patient scan logs",
        });
        return [];
      }
      
      console.log('Patient scan logs fetched:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching patient scan logs:', error);
      return [];
    } finally {
      setIsLoadingPatientLogs(false);
    }
  };

  const handleViewPatientLogs = async (patientId: string) => {
    console.log('View logs requested for patient ID:', patientId);
    setSelectedPatientForLogs(patientId);
    
    const logs = await fetchPatientScanLogs(patientId);
    console.log('Setting patient scan logs:', logs);
    setPatientScanLogs(logs);
    
    setIsPatientLogsOpen(true);
  };

  const { mutate: searchPatient } = useMutation({
    mutationFn: async (values: { patientId: string }) => {
      const patientId = values.patientId.trim();
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      return await fetchPatientLabResults(patientId);
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        setSelectedPatientId(form.getValues().patientId);
        
        const labTests = data.map(item => ({
          id: item.lab_result_id || '',
          type: item.sample_id ? item.sample_id.split('-')[0] : 'Unknown',
          requestedOn: item.collection_date ? new Date(item.collection_date).toISOString().split('T')[0] : '',
          status: item.result === null ? 'pending' : 'completed',
          resistanceResult: item.result
        })).filter(lab => lab.id);
        
        setPatientData({
          id: form.getValues().patientId,
          labs: labTests
        });
        
        toast({
          title: "Patient Found",
          description: `Found ${labTests.length} lab cultures for patient ${form.getValues().patientId}`,
        });
      } else {
        setPatientData(null);
        toast({
          variant: "destructive",
          title: "Patient Not Found",
          description: "No lab cultures found for the provided patient ID",
        });
      }
    },
    onError: (error) => {
      console.error("Error searching for patient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search for patient",
      });
    }
  });

  const handleSearch = (values: { patientId: string }) => {
    searchPatient(values);
  };

  const { mutate: submitLabResult } = useMutation({
    mutationFn: async ({ labId, result }: { labId: string, result: string }) => {
      const { data, error } = await supabase
        .from('lab_results')
        .update({
          result: result,
          processed_by: 'Admin',
          processed_date: new Date().toISOString()
        })
        .eq('id', labId)
        .select() as { data: any, error: any };
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Lab Result Submitted",
        description: `Recorded ${resistance} result for sample`,
      });
      
      if (patientData) {
        const updatedLabs = patientData.labs.map((lab: LabTest) => 
          lab.id === selectedLabTest?.id 
            ? { ...lab, status: "completed", resistanceResult: resistance } 
            : lab
        );
        
        setPatientData({
          ...patientData,
          labs: updatedLabs
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ['lab_results'] });
      
      setSelectedLabTest(null);
      setResistance(null);
    },
    onError: (error) => {
      console.error("Error submitting lab result:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit lab result",
      });
    }
  });

  const handleSelectLabTest = (lab: LabTest, resistanceStatus: "positive" | "negative") => {
    setSelectedLabTest(lab);
    setResistance(resistanceStatus);
    
    submitLabResult({
      labId: lab.id,
      result: resistanceStatus
    });
  };

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
    
    if (!sampleId) {
      toast({
        title: "Error",
        description: "Please enter a sample ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { data: sampleExists, error: sampleCheckError } = await supabase
        .from("lab_results")
        .select("id, sample_id")
        .eq("sample_id", sampleId)
        .maybeSingle();
      
      if (sampleCheckError) throw sampleCheckError;
      
      if (!sampleExists) {
        toast({
          title: "Error",
          description: "No sample found with the provided ID",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("lab_results")
        .update({
          result: labResult,
          processed_by: labTechName,
          processed_date: new Date().toISOString(),
        })
        .eq("sample_id", sampleId)
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Lab result updated successfully for sample ${sampleId}`,
      });
      
      setSampleId("");
      setLabResult("");
      setLabTechName("");
      refetchLabResults();
    } catch (error) {
      console.error("Error updating lab result:", error);
      toast({
        title: "Error",
        description: "Failed to update lab result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

          <TabsContent value="inputLabResults">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-xl font-medium text-left">Input Lab Results</CardTitle>
                <CardDescription>
                  Enter patient ID to view and update requested lab cultures
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-4 mb-8">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="flex gap-3">
                              <Input 
                                {...field} 
                                placeholder="Enter Patient ID" 
                                className="h-16 text-xl"
                              />
                              <Button type="submit" className="h-16 px-6 text-xl">
                                <Search className="h-5 w-5 mr-2" />
                                Search
                              </Button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>

                {patientData && (
                  <div className="mt-6">
                    <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                      Lab Cultures for Patient {patientData.id}
                    </h3>
                    
                    <div className="rounded-md border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Requested On</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {patientData.labs.length > 0 ? (
                            patientData.labs.map((lab: LabTest) => (
                              <tr key={lab.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lab.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lab.requestedOn}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={lab.status === "completed" ? "default" : "secondary"} className="px-3 py-1">
                                    {lab.status}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  {lab.status === "pending" ? (
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleSelectLabTest(lab, "negative")}
                                        className="border-green-200 text-green-700 hover:bg-green-50"
                                      >
                                        Susceptible
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleSelectLabTest(lab, "positive")}
                                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                      >
                                        Resistant
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">
                                      {lab.resistanceResult === "positive" 
                                        ? "Carbapenem Resistant"
                                        : "Carbapenem Susceptible"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center py-4 text-gray-500">
                                No lab tests found for this patient
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewPatientLogs(patient.patient_id)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                View Logs
                              </Button>
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
      
      <PatientScanLogs 
        open={isPatientLogsOpen}
        onOpenChange={setIsPatientLogsOpen}
        patientId={selectedPatientForLogs}
        scanLogs={patientScanLogs}
        isLoading={isLoadingPatientLogs}
      />
    </div>
  );
};

export default AdminDashboard;
