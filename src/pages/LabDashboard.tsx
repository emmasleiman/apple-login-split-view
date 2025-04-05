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
import { AlertTriangle, CheckCircle, Search, User, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const LabDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [resistance, setResistance] = useState<"positive" | "negative" | null>(null);
  
  const form = useForm({
    defaultValues: {
      patientId: "",
    }
  });

  // Query for fetching a patient's lab results
  const fetchPatientLabResults = async (patientId: string) => {
    const { data, error } = await supabase
      .from('patient_lab_results')
      .select('*')
      .eq('patient_id', patientId) as { data: PatientLabResult[] | null, error: any };
    
    if (error) throw error;
    return data || [];
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
        
        // Transform data into the expected structure
        const labTests = data.map(item => ({
          id: item.lab_result_id || '',
          type: item.sample_id ? item.sample_id.split('-')[0] : 'Unknown',
          requestedOn: item.collection_date ? new Date(item.collection_date).toISOString().split('T')[0] : '',
          status: item.result === null ? 'pending' : 'completed',
          resistanceResult: item.result
        })).filter(lab => lab.id); // Filter out any null lab results
        
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
          processed_by: 'Lab Technician',
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
        description: `Recorded ${resistance} result for ${selectedLabTest?.type}`,
      });
      
      // Update local state to reflect the change
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['patientLabResults', selectedPatientId] });
      
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
          <p className="text-gray-500 mt-1">Record carbapenem resistance test results</p>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-2 bg-white p-2 rounded-md shadow-sm">
          <User className="h-5 w-5 text-gray-500" />
          <span className="text-lg font-medium">Lab Technician</span>
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
                      <UserCheck className="h-5 w-5 text-green-500" />
                      Lab Cultures for Patient {patientData.id}
                    </h3>
                    
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-lg">Test Type</TableHead>
                            <TableHead className="text-lg">Requested On</TableHead>
                            <TableHead className="text-lg">Status</TableHead>
                            <TableHead className="text-right text-lg">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientData.labs.length > 0 ? (
                            patientData.labs.map((lab: LabTest) => (
                              <TableRow key={lab.id}>
                                <TableCell className="font-medium text-lg">{lab.type}</TableCell>
                                <TableCell className="text-lg">{lab.requestedOn}</TableCell>
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
                                      {lab.resistanceResult === "positive" 
                                        ? "Carbapenem Resistant"
                                        : "Carbapenem Susceptible"}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                No lab tests found for this patient
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
              You are about to submit a carbapenem resistance test result for:
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
                  <span className="text-gray-500 text-lg">Test Type:</span>
                  <span className="font-medium text-lg">{selectedLabTest.type}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 text-lg">Requested On:</span>
                  <span className="font-medium text-lg">{selectedLabTest.requestedOn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-lg">Result:</span>
                  <span className={`font-medium text-lg ${resistance === "positive" ? "text-amber-600" : "text-green-600"}`}>
                    Carbapenem {resistance === "positive" ? "Resistant" : "Susceptible"}
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
