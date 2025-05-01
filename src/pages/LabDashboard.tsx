
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem
} from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, User, UserCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";

type PatientInfo = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
};

type LabTest = {
  id: string;
  patient_id: string;
  sample_id: string;
  collection_date: string;
  status: "pending" | "completed";
  result: string | null;
};

const LabDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [resistance, setResistance] = useState<"positive" | "negative" | null>(null);
  
  const form = useForm({
    defaultValues: {
      patientId: "",
    }
  });

  // Fetch patient information by patient ID
  const fetchPatientInfo = async (patientId: string) => {
    console.log("Fetching patient info for:", patientId);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'admitted')
      .single();
    
    if (error) {
      console.error("Error fetching patient:", error);
      throw error;
    }
    
    return data;
  };

  // Fetch lab tests for a patient
  const fetchLabTests = async (patientUuid: string) => {
    console.log("Fetching lab tests for patient UUID:", patientUuid);
    // First check if there are any existing lab results
    const { data: existingTests, error: existingError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('patient_id', patientUuid);
    
    if (existingError) {
      console.error("Error fetching existing lab tests:", existingError);
      throw existingError;
    }

    // If the patient requires culture but doesn't have any lab tests yet, create one
    if (patientInfo?.culture_required && (!existingTests || existingTests.length === 0)) {
      console.log("Creating new lab test for patient with MDRO culture required");
      // Generate a unique sample ID using patient ID and timestamp
      const timestamp = new Date().getTime();
      const sampleId = `MDRO-${patientInfo.patient_id}-${timestamp}`;
      
      const { data: newTest, error: insertError } = await supabase
        .from('lab_results')
        .insert([{
          patient_id: patientUuid,
          sample_id: sampleId,
          collection_date: new Date().toISOString(),
        }])
        .select();
      
      if (insertError) {
        console.error("Error creating lab test:", insertError);
        throw insertError;
      }
      
      return newTest;
    }
    
    return existingTests || [];
  };

  // Submit a lab result
  const { mutate: submitLabResult } = useMutation({
    mutationFn: async ({ labId, result }: { labId: string, result: string }) => {
      console.log("Submitting lab result:", { labId, result });
      const { data, error } = await supabase
        .from('lab_results')
        .update({
          result: result,
          processed_by: 'Lab Technician',
          processed_date: new Date().toISOString()
        })
        .eq('id', labId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Lab Result Submitted",
        description: `Recorded ${resistance === "positive" ? "Resistant" : "Susceptible"} result for MDRO test`,
      });
      
      // Update the lab tests list after submission
      if (patientInfo) {
        queryClient.invalidateQueries({ queryKey: ['labTests', patientInfo.id] });
        
        // Update the local state for immediate UI update
        setLabTests(prevTests => 
          prevTests.map(test => 
            test.id === selectedLabTest?.id 
              ? { ...test, status: "completed", result: resistance } 
              : test
          )
        );
      }
      
      setConfirmDialogOpen(false);
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

  // Search for a patient and fetch their lab tests
  const { mutate: searchPatient, isLoading: isSearching } = useMutation({
    mutationFn: async (values: { patientId: string }) => {
      const patientId = values.patientId.trim();
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      // First, fetch the patient information
      const patient = await fetchPatientInfo(patientId);
      return patient;
    },
    onSuccess: (patient) => {
      if (patient) {
        setPatientInfo(patient);
        setSelectedPatientId(patient.patient_id);
        
        // Fetch lab tests for this patient
        fetchLabTests(patient.id)
          .then(tests => {
            console.log("Lab tests retrieved:", tests);
            
            // Transform to our LabTest type
            const formattedTests = tests.map((test: any) => ({
              id: test.id,
              patient_id: test.patient_id,
              sample_id: test.sample_id,
              collection_date: test.collection_date,
              status: test.result ? "completed" : "pending",
              result: test.result
            }));
            
            setLabTests(formattedTests);
            
            toast({
              title: "Patient Found",
              description: `Found patient ${patient.patient_id} with ${formattedTests.length} lab tests`,
            });
          })
          .catch(error => {
            console.error("Error fetching lab tests:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to fetch lab tests for this patient",
            });
          });
      } else {
        setPatientInfo(null);
        setLabTests([]);
        toast({
          variant: "destructive",
          title: "Patient Not Found",
          description: "No admitted patient found with this ID",
        });
      }
    },
    onError: (error) => {
      console.error("Error searching for patient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to search for patient",
      });
      setPatientInfo(null);
      setLabTests([]);
    }
  });

  const handleSearch = (values: { patientId: string }) => {
    searchPatient(values);
  };

  const handleSelectLabTest = (lab: LabTest, resistanceStatus: "positive" | "negative") => {
    setSelectedLabTest(lab);
    setResistance(resistanceStatus);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (selectedLabTest && resistance) {
      submitLabResult({
        labId: selectedLabTest.id,
        result: resistance
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/40 p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-800 tracking-tight">TraceMed Lab Dashboard</h1>
          <p className="text-gray-500 mt-1">Record MDRO resistance test results</p>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-lg font-medium">Lab Technician</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <Tabs defaultValue="input-results" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="input-results" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-xl py-3 flex-1">
            Input Lab Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="input-results">
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-md">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-xl font-medium text-left">Input Lab Results</CardTitle>
                <CardDescription>
                  Enter patient ID to view and update requested lab cultures
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                              <Button 
                                type="submit" 
                                className="h-16 px-6 text-xl"
                                disabled={isSearching}
                              >
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

                {patientInfo && (
                  <div className="mt-6">
                    <h3 className="text-xl font-medium mb-3 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-500" />
                      Lab Tests for Patient {patientInfo.patient_id}
                    </h3>
                    
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-lg">Test Type</TableHead>
                            <TableHead className="text-lg">Sample ID</TableHead>
                            <TableHead className="text-lg">Collected On</TableHead>
                            <TableHead className="text-lg">Status</TableHead>
                            <TableHead className="text-right text-lg">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {labTests.length > 0 ? (
                            labTests.map((lab) => (
                              <TableRow key={lab.id}>
                                <TableCell className="font-medium text-lg">MDRO Test</TableCell>
                                <TableCell className="text-lg">{lab.sample_id}</TableCell>
                                <TableCell className="text-lg">
                                  {new Date(lab.collection_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={lab.status === "completed" ? "default" : "secondary"} className="text-md">
                                    {lab.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {lab.status === "pending" ? (
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleSelectLabTest(lab, "negative")}
                                        className="border-green-200 text-green-700 hover:bg-green-50 text-lg"
                                      >
                                        <CheckCircle className="h-5 w-5 mr-1" />
                                        Susceptible
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleSelectLabTest(lab, "positive")}
                                        className="border-amber-200 text-amber-700 hover:bg-amber-50 text-lg"
                                      >
                                        <AlertTriangle className="h-5 w-5 mr-1" />
                                        Resistant
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-lg text-gray-500">
                                      {lab.result === "positive" 
                                        ? "MDRO Resistant"
                                        : "MDRO Susceptible"}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : patientInfo.culture_required ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                Loading lab tests...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                No MDRO culture required for this patient
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Test Result</DialogTitle>
            <DialogDescription className="text-lg">
              You are about to submit an MDRO resistance test result for:
            </DialogDescription>
          </DialogHeader>
          
          {selectedLabTest && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-lg">Patient ID:</span>
                  <span className="font-medium text-lg">{selectedPatientId}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-lg">Sample ID:</span>
                  <span className="font-medium text-lg">{selectedLabTest.sample_id}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-lg">Collection Date:</span>
                  <span className="font-medium text-lg">
                    {new Date(selectedLabTest.collection_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-lg">Result:</span>
                  <span className={`font-medium text-lg ${resistance === "positive" ? "text-amber-600" : "text-green-600"}`}>
                    MDRO {resistance === "positive" ? "Resistant" : "Susceptible"}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="text-lg">Cancel</Button>
            <Button onClick={handleConfirmSubmit} className="text-lg">
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabDashboard;
