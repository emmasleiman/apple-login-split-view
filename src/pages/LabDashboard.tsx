
import React, { useState } from "react";
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

// Sample lab culture data
const sampleLabData = {
  "PT001": [
    { id: 1, type: "Blood Culture", requestedOn: "2024-04-01", status: "pending" },
    { id: 2, type: "Urine Culture", requestedOn: "2024-04-02", status: "pending" },
    { id: 3, type: "Wound Culture", requestedOn: "2024-03-29", status: "completed" }
  ],
  "PT002": [
    { id: 4, type: "Sputum Culture", requestedOn: "2024-04-03", status: "pending" },
    { id: 5, type: "Blood Culture", requestedOn: "2024-03-28", status: "completed" }
  ],
  "PT003": [
    { id: 6, type: "CSF Culture", requestedOn: "2024-04-04", status: "pending" }
  ]
};

const LabDashboard = () => {
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientData, setPatientData] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<any>(null);
  const [resistance, setResistance] = useState<"resistant" | "susceptible" | null>(null);
  
  const form = useForm({
    defaultValues: {
      patientId: "",
    }
  });

  const handleSearch = (values: { patientId: string }) => {
    const patientId = values.patientId.trim();
    setSelectedPatientId(patientId);
    
    // This would be an API call in a real application
    // GET /api/patients/{patientId}/lab-cultures
    const patientLabs = sampleLabData[patientId as keyof typeof sampleLabData];
    
    if (patientLabs) {
      setPatientData({
        id: patientId,
        labs: patientLabs
      });
      toast({
        title: "Patient Found",
        description: `Found ${patientLabs.length} lab cultures for patient ${patientId}`,
      });
    } else {
      setPatientData(null);
      toast({
        variant: "destructive",
        title: "Patient Not Found",
        description: "No lab cultures found for the provided patient ID",
      });
    }
  };

  const handleSelectLabTest = (lab: any, resistanceStatus: "resistant" | "susceptible") => {
    setSelectedLabTest(lab);
    setResistance(resistanceStatus);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = () => {
    // This would be an API call in a real application
    // PUT /api/lab-cultures/{labId}/results
    /*
      Backend integration:
      1. Validate that the lab test exists and is pending
      2. Update the lab test status to completed
      3. Record the carbapenem resistance status
      4. Record the technician who performed the test
      5. Record the date/time the result was submitted
      6. Update patient record with new lab result
      7. Notify relevant healthcare providers of critical results if needed
    */
    
    toast({
      title: "Lab Result Submitted",
      description: `Recorded ${resistance} result for ${selectedLabTest.type}`,
    });
    
    // Update local state to reflect the change
    if (patientData) {
      const updatedLabs = patientData.labs.map((lab: any) => 
        lab.id === selectedLabTest.id 
          ? { ...lab, status: "completed", resistanceResult: resistance } 
          : lab
      );
      
      setPatientData({
        ...patientData,
        labs: updatedLabs
      });
    }
    
    setConfirmDialogOpen(false);
    setSelectedLabTest(null);
    setResistance(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-800 tracking-tight">TraceMed Lab Dashboard</h1>
          <p className="text-gray-500 mt-1">Record carbapenem resistance test results</p>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-2 bg-white p-2 rounded-md shadow-sm">
          <User className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium">Lab Technician</span>
        </div>
      </header>

      <Tabs defaultValue="input-results" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="input-results">Input Lab Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input-results">
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-medium">Input Lab Results</CardTitle>
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
                                className="h-12 text-lg"
                              />
                              <Button type="submit" className="h-12 px-5">
                                <Search className="h-4 w-4 mr-2" />
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
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-500" />
                      Lab Cultures for Patient {patientData.id}
                    </h3>
                    
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Test Type</TableHead>
                            <TableHead>Requested On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientData.labs.map((lab: any) => (
                            <TableRow key={lab.id}>
                              <TableCell className="font-medium">{lab.type}</TableCell>
                              <TableCell>{lab.requestedOn}</TableCell>
                              <TableCell>
                                <Badge variant={lab.status === "completed" ? "default" : "secondary"}>
                                  {lab.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {lab.status === "pending" ? (
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleSelectLabTest(lab, "susceptible")}
                                      className="border-green-200 text-green-700 hover:bg-green-50"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Susceptible
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleSelectLabTest(lab, "resistant")}
                                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                    >
                                      <AlertTriangle className="h-4 w-4 mr-1" />
                                      Resistant
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    {lab.resistanceResult === "resistant" 
                                      ? "Carbapenem Resistant"
                                      : "Carbapenem Susceptible"}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
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
            <DialogTitle>Confirm Test Result</DialogTitle>
            <DialogDescription>
              You are about to submit a carbapenem resistance test result for:
            </DialogDescription>
          </DialogHeader>
          
          {selectedLabTest && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Patient ID:</span>
                  <span className="font-medium">{selectedPatientId}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Test Type:</span>
                  <span className="font-medium">{selectedLabTest.type}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Requested On:</span>
                  <span className="font-medium">{selectedLabTest.requestedOn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Result:</span>
                  <span className={`font-medium ${resistance === "resistant" ? "text-amber-600" : "text-green-600"}`}>
                    Carbapenem {resistance === "resistant" ? "Resistant" : "Susceptible"}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmSubmit}>
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabDashboard;
