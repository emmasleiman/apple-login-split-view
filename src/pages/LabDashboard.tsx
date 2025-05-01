
import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type Patient = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  discharge_date: string | null;
};

type LabTest = {
  id: string;
  patient_id: string;
  sample_id: string;
  collection_date: string;
  status: "pending" | "completed";
  result: string | null;
};

const generateSampleId = (type: string) => {
  const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MDRO-${uniqueId}`;
};

const LabDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [selectedResult, setSelectedResult] = useState<"positive" | "negative" | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSearch = async () => {
    if (!patientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Find patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_id", patientId.trim())
        .maybeSingle() as { data: Patient | null, error: any };

      if (patientError) throw patientError;

      if (!patientData) {
        toast({
          title: "Patient Not Found",
          description: `No patient found with ID ${patientId}`,
          variant: "destructive",
        });
        setPatient(null);
        setLabTests([]);
        return;
      }

      setPatient(patientData);

      // Find lab tests for this patient
      const { data: labData, error: labError } = await supabase
        .from("lab_results")
        .select("*")
        .eq("patient_id", patientData.id) as { data: any[] | null, error: any };

      if (labError) throw labError;

      if (!labData || labData.length === 0) {
        // If patient exists but no lab tests found, create a new one
        if (patientData.culture_required) {
          const newSampleId = generateSampleId("MDRO");
          
          // Create a new lab result in Supabase
          const { data: newLabResult, error: insertError } = await supabase
            .from("lab_results")
            .insert([{
              patient_id: patientData.id,
              sample_id: newSampleId,
              collection_date: new Date().toISOString(),
            }])
            .select() as { data: any[] | null, error: any };
            
          if (insertError) throw insertError;
          
          if (newLabResult && newLabResult.length > 0) {
            const formattedTests = newLabResult.map(test => ({
              id: test.id,
              patient_id: test.patient_id,
              sample_id: test.sample_id,
              collection_date: test.collection_date,
              status: test.result ? "completed" : "pending" as "pending" | "completed",
              result: test.result
            }));
            
            setLabTests(formattedTests);
            toast({
              title: "New Lab Test Created",
              description: `Created new MDRO test for patient ${patientId}`,
            });
          }
        } else {
          setLabTests([]);
          toast({
            title: "No Lab Tests",
            description: `Patient ${patientId} does not require MDRO culture`,
          });
        }
      } else {
        // Format the existing lab tests
        const formattedTests = labData.map(test => ({
          id: test.id,
          patient_id: test.patient_id,
          sample_id: test.sample_id,
          collection_date: test.collection_date,
          status: test.result ? "completed" : "pending" as "pending" | "completed",
          result: test.result
        }));
        
        setLabTests(formattedTests);
      }
    } catch (error) {
      console.error("Error searching for patient:", error);
      toast({
        title: "Error",
        description: "An error occurred while searching for the patient",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const { mutate: submitLabResult, isLoading: isSubmitting } = useMutation({
    mutationFn: async ({ labId, result }: { labId: string, result: string }) => {
      const { data, error } = await supabase
        .from("lab_results")
        .update({
          result: result,
          processed_by: "Lab Technician",
          processed_date: new Date().toISOString()
        })
        .eq("id", labId)
        .select() as { data: any, error: any };

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Lab result updated successfully`,
      });

      // Update local state
      if (selectedLabTest && selectedResult) {
        const updatedTests = labTests.map(test =>
          test.id === selectedLabTest.id
            ? { ...test, status: "completed" as const, result: selectedResult }
            : test
        );
        setLabTests(updatedTests);
      }

      // Clear selection
      setSelectedLabTest(null);
      setSelectedResult(null);
      setShowConfirmDialog(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["lab_results"] });
    },
    onError: (error) => {
      console.error("Error submitting lab result:", error);
      toast({
        title: "Error",
        description: "Failed to update lab result",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
    }
  });

  const handleSelectResult = (test: LabTest, result: "positive" | "negative") => {
    setSelectedLabTest(test);
    setSelectedResult(result);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    if (selectedLabTest && selectedResult) {
      submitLabResult({
        labId: selectedLabTest.id,
        result: selectedResult
      });
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardHeader title="TraceMed" role="Lab Technician" />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Lab Result</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to submit the following result:
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <p><strong>Patient ID:</strong> {patient?.patient_id}</p>
                <p><strong>Sample ID:</strong> {selectedLabTest?.sample_id}</p>
                <p><strong>Collection Date:</strong> {selectedLabTest?.collection_date && format(new Date(selectedLabTest.collection_date), "MMM dd, yyyy")}</p>
                <p className="mt-2">
                  <strong>Result:</strong>{" "}
                  <Badge variant={selectedResult === "positive" ? "destructive" : "default"}>
                    {selectedResult === "positive" ? "MDRO Positive" : "MDRO Negative"}
                  </Badge>
                </p>
              </div>
              <p className="mt-4">
                This action cannot be undone. Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className={selectedResult === "positive" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Result"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Lab Dashboard</h1>
          <p className="text-gray-500">Process patient samples and record results</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Patient Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="grid gap-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="patientId">Patient ID</Label>
                    <Input
                      id="patientId"
                      placeholder="Enter Patient ID"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="mb-0"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {patient && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Patient Information</h3>
                  <div className="p-4 bg-gray-50 rounded-md mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient ID</p>
                        <p className="font-medium">{patient.patient_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium capitalize">{patient.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">MDRO Culture Required</p>
                        <p className="font-medium">{patient.culture_required ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>

                  {labTests.length > 0 ? (
                    <>
                      <h3 className="text-lg font-medium mb-4">Lab Tests</h3>
                      <div className="space-y-4">
                        {labTests.map((test) => (
                          <Card key={test.id} className={test.status === "completed" ? "border-gray-200 bg-gray-50" : "border-blue-100"}>
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{test.sample_id}</h4>
                                  <p className="text-sm text-gray-500">
                                    Collected: {format(new Date(test.collection_date), "MMM dd, yyyy")}
                                  </p>
                                  {test.status === "completed" && (
                                    <div className="mt-2">
                                      <Badge variant={test.result === "positive" ? "destructive" : "default"}>
                                        {test.result === "positive" ? "MDRO Positive" : "MDRO Negative"}
                                      </Badge>
                                    </div>
                                  )}
                                </div>

                                {test.status === "pending" && (
                                  <div className="space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectResult(test, "negative")}
                                      className="border-green-500 hover:bg-green-50 text-green-700"
                                    >
                                      Susceptible
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectResult(test, "positive")}
                                      className="border-red-500 hover:bg-red-50 text-red-700"
                                    >
                                      Resistant
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : patient.culture_required ? (
                    <div className="text-center p-6 bg-gray-50 rounded-md">
                      <p className="text-gray-500">Creating new MDRO test for this patient...</p>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-md">
                      <p className="text-gray-500">No MDRO tests required for this patient.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabDashboard;
