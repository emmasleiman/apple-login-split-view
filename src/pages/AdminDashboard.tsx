
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Users, FileText, Search, Loader2, Clock, CheckCircle } from "lucide-react";
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
import DashboardHeader from "@/components/DashboardHeader";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  notes: string | null;
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

type CriticalCaseWithLocation = LabResult & { 
  patients: Pick<Patient, 'patient_id'>;
  lastLocation?: string | null;
  lastScanTime?: string | null;
  notes?: string | null;
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
  const [criticalCasesLocations, setCriticalCasesLocations] = useState<Record<string, string>>({});

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

  const {
    data: wardScanLogs = [],
    isLoading: isLoadingWardScanLogs,
  } = useQuery({
    queryKey: ["ward_scan_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ward_scan_logs")
        .select("*") as { data: WardScanLog[] | null, error: any };
      
      if (error) throw error;
      return data || [];
    },
  });

  const isPatientInIsolation = (patientId: string): boolean => {
    if (!wardScanLogs.length) return false;
    
    const patientLogs = wardScanLogs.filter(log => {
      try {
        const logData = typeof log.patient_id === 'string' ? JSON.parse(log.patient_id) : log.patient_id;
        return logData.patientId === patientId;
      } catch (e) {
        return false;
      }
    });
    
    const sortedLogs = [...patientLogs].sort((a, b) => 
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
    );
    
    return sortedLogs.length > 0 && sortedLogs[0].ward === 'isolation_room';
  };

  const filteredLabResults = labResults.map(result => {
    const patientId = result.patients?.patient_id;
    const inIsolation = patientId ? isPatientInIsolation(patientId) : false;
    
    return {
      ...result,
      isInIsolation: inIsolation
    };
  });

  const criticalCases = filteredLabResults.filter(result => 
    result.result === "positive" && 
    !result.isInIsolation &&
    result.notes !== "Patient moved to isolation room. Previously marked as positive."
  );

  const resolvedCases = filteredLabResults.filter(result => 
    result.result === "resolved" || 
    result.isInIsolation ||
    (result.result === "positive" && result.notes === "Patient moved to isolation room. Previously marked as positive.")
  );
  
  const extractPatientId = (patientIdStr: string): string => {
    try {
      const parsed = JSON.parse(patientIdStr);
      return parsed.patientId || patientIdStr;
    } catch (e) {
      return patientIdStr;
    }
  };

  const getLastPatientLocation = (patientId: string): { ward: string | null, scannedAt: string | null } => {
    const patientLogs = wardScanLogs.filter(log => {
      const extractedId = extractPatientId(log.patient_id);
      return extractedId === patientId;
    });
    
    if (patientLogs.length === 0) {
      return { ward: null, scannedAt: null };
    }
    
    const sortedLogs = [...patientLogs].sort((a, b) => 
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
    );
    
    return { 
      ward: sortedLogs[0].ward,
      scannedAt: sortedLogs[0].scanned_at
    };
  };

  const enhancedCriticalCases: CriticalCaseWithLocation[] = criticalCases.map(result => {
    const patientId = result.patients?.patient_id;
    const { ward, scannedAt } = patientId ? getLastPatientLocation(patientId) : { ward: null, scannedAt: null };
    
    return {
      ...result,
      lastLocation: ward,
      lastScanTime: scannedAt
    };
  });

  const enhancedResolvedCases: CriticalCaseWithLocation[] = resolvedCases.map(result => {
    const patientId = result.patients?.patient_id;
    const { ward, scannedAt } = patientId ? getLastPatientLocation(patientId) : { ward: null, scannedAt: null };
    
    return {
      ...result,
      lastLocation: ward,
      lastScanTime: scannedAt
    };
  });

  const pendingCases = labResults.filter(result => result.result === null);
  
  const enhancedPendingCases = pendingCases.map(result => {
    const patientId = result.patients?.patient_id;
    const { ward, scannedAt } = patientId ? getLastPatientLocation(patientId) : { ward: null, scannedAt: null };
    
    return {
      ...result,
      lastLocation: ward,
      lastScanTime: scannedAt
    };
  });

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
    try {
      console.log('Fetching logs for patient ID:', patientId);
      
      const { data, error } = await supabase
        .from('ward_scan_logs')
        .select('*') as { data: WardScanLog[] | null, error: any };
      
      if (error) {
        console.error('Error fetching patient scan logs:', error);
        toast({
          variant: "destructive",
          title: "Failed to Load",
          description: "Could not load patient scan logs.",
        });
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No scan logs found');
        return [];
      }
      
      const filteredLogs = data.filter(log => {
        const extractedId = extractPatientId(log.patient_id);
        return extractedId === patientId;
      });
      
      console.log('Patient scan logs fetched:', data);
      console.log('Filtered logs for patient:', filteredLogs);
      
      return filteredLogs;
    } catch (error) {
      console.error('Error fetching patient scan logs:', error);
      return [];
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
    <div className="flex flex-col min-h-screen bg-gray-50/40">
      <DashboardHeader title="TraceMed" role="Administrator" />

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
              value="resolvedCases" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Resolved Cases
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
              <Users className="h-5 w-5" />
              Discharge Patient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="criticalCases">
            <Card className="border-gray-100 shadow-sm mb-8">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases - Positive Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingLabResults || isLoadingWardScanLogs ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse text-gray-500">Loading critical cases...</div>
                  </div>
                ) : enhancedCriticalCases.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Location</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {enhancedCriticalCases.map((result) => (
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.lastLocation ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {result.lastLocation}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Not scanned yet</span>
                              )}
                            </td>
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
            
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Pending Cases - Awaiting Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingLabResults || isLoadingWardScanLogs ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse text-gray-500">Loading pending cases...</div>
                  </div>
                ) : enhancedPendingCases.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Location</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time in System</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {enhancedPendingCases.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.sample_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.patients?.patient_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="secondary" className="px-3 py-1">Pending</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.lastLocation ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {result.lastLocation}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Not scanned yet</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No pending cases found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolvedCases">
            <Card className="border-gray-100 shadow-sm mb-8">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Resolved Cases - Previously Positive</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingLabResults || isLoadingWardScanLogs ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse text-gray-500">Loading resolved cases...</div>
                  </div>
                ) : enhancedResolvedCases.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Location</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {enhancedResolvedCases.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.sample_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.patients?.patient_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">Resolved</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.processed_by}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.lastLocation ? (
                                <Badge variant={result.lastLocation === 'isolation_room' ? "secondary" : "outline"} className="px-3 py-1">
                                  {result.lastLocation}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Not scanned yet</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No resolved cases found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inputLabResults">
            <Card className="border-gray-100 shadow-sm mb-8">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Input Lab Results</CardTitle>
                <CardDescription>Enter lab test results for patient samples</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleLabResultSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sampleId">Sample ID</Label>
                      <Input
                        id="sampleId"
                        placeholder="Enter sample ID"
                        value={sampleId}
                        onChange={(e) => setSampleId(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="labResult">Result</Label>
                      <RadioGroup 
                        value={labResult} 
                        onValueChange={setLabResult}
                        className="flex space-x-4 mt-1"
                        required
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="positive" id="positive" />
                          <Label htmlFor="positive">Positive</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="negative" id="negative" />
                          <Label htmlFor="negative">Negative</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label htmlFor="labTechName">Lab Technician Name</Label>
                      <Input
                        id="labTechName"
                        placeholder="Enter your name"
                        value={labTechName}
                        onChange={(e) => setLabTechName(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit Lab Result"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Search Patient Lab History</CardTitle>
                <CardDescription>Find lab results for a specific patient</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="patientId">Patient ID</Label>
                          <FormControl>
                            <div className="flex">
                              <Input
                                id="patientId"
                                placeholder="Enter patient ID"
                                {...field}
                                className="mr-2"
                              />
                              <Button type="submit" disabled={isSearching}>
                                {isSearching ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                                <span className="ml-2">Search</span>
                              </Button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
                
                {patientData && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Lab Culture Results for Patient {patientData.id}</h3>
                    {patientData.labs.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Requested On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientData.labs.map((lab) => (
                            <TableRow key={lab.id}>
                              <TableCell>{lab.type}</TableCell>
                              <TableCell>{lab.requestedOn}</TableCell>
                              <TableCell>
                                {lab.status === "pending" ? (
                                  <Badge variant="secondary">Pending</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Completed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {lab.resistanceResult === "positive" ? (
                                  <Badge variant="destructive">Positive</Badge>
                                ) : lab.resistanceResult === "negative" ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Negative</Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {lab.status === "pending" && (
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleSelectLabTest(lab, "positive")}
                                    >
                                      Set Positive
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleSelectLabTest(lab, "negative")}
                                    >
                                      Set Negative
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-gray-50">
                        <p className="text-gray-500">No lab cultures found for this patient.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allPatients">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">All Patients</CardTitle>
                <div className="flex items-center mt-2">
                  <Input
                    placeholder="Filter by patient ID..."
                    value={patientIdFilter}
                    onChange={(e) => setPatientIdFilter(e.target.value)}
                    className="max-w-sm"
                  />
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
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Location History</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPatients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.patient_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={patient.status === "active" ? "outline" : "secondary"} className="px-3 py-1">
                                {patient.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(patient.registration_date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.discharge_date ? format(new Date(patient.discharge_date), 'MMM dd, yyyy') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewPatientLogs(patient.patient_id)}
                                className="flex items-center gap-1"
                              >
                                <Clock className="h-4 w-4" />
                                <span>View Logs</span>
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
                <CardDescription>Update patient status to discharged</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleDischargeSubmit} className="space-y-6 max-w-md mx-auto">
                  <div>
                    <Label htmlFor="dischargePatientId">Patient ID</Label>
                    <Input
                      id="dischargePatientId"
                      placeholder="Enter patient ID to discharge"
                      value={dischargePatientId}
                      onChange={(e) => setDischargePatientId(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Discharge Patient
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isPatientLogsOpen && selectedPatientForLogs && (
        <PatientScanLogs 
          open={isPatientLogsOpen}
          onOpenChange={setIsPatientLogsOpen}
          patientId={selectedPatientForLogs}
          scanLogs={patientScanLogs}
          isLoading={isLoadingPatientLogs}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
