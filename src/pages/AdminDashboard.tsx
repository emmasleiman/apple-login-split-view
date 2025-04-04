
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ----------------------------------------------------------------
// MOCK DATA - DELETE THIS SECTION WHEN CONNECTING TO BACKEND
// Replace with API calls to fetch real data from your backend
// ----------------------------------------------------------------
const criticalPatientsData = [
  { id: "P78945", location: "Ward A", isolationStatus: false },
  { id: "P12367", location: "ICU", isolationStatus: false },
  { id: "P34589", location: "Ward C", isolationStatus: false },
];

const pendingResultsData = [
  { id: "P45678", collectionDate: "2025-04-01", status: "Pending" },
  { id: "P91234", collectionDate: "2025-04-02", status: "Pending" },
  { id: "P56789", collectionDate: "2025-04-03", status: "Pending" },
];

// MOCK LAB RESULTS DATA - DELETE WHEN CONNECTING TO BACKEND
const patientLabsData = {
  "P45678": [
    { id: "L1001", sampleType: "Blood Culture", collectionDate: "2025-04-01", status: "Pending" },
    { id: "L1002", sampleType: "Urine Culture", collectionDate: "2025-04-01", status: "Pending" }
  ],
  "P91234": [
    { id: "L2001", sampleType: "Blood Culture", collectionDate: "2025-04-02", status: "Pending" },
    { id: "L2002", sampleType: "Wound Culture", collectionDate: "2025-04-02", status: "Pending" }
  ],
  "P56789": [
    { id: "L3001", sampleType: "Blood Culture", collectionDate: "2025-04-03", status: "Pending" }
  ],
  "P12345": [
    { id: "L4001", sampleType: "Blood Culture", collectionDate: "2025-04-03", status: "Pending" },
    { id: "L4002", sampleType: "Sputum Culture", collectionDate: "2025-04-03", status: "Pending" }
  ]
};
// ----------------------------------------------------------------
// END OF MOCK DATA SECTION
// ----------------------------------------------------------------

// Form schema for patient ID input
const patientIdSchema = z.object({
  patientId: z.string().min(1, { message: "Patient ID is required" })
});

// Form schema for lab result input
const labResultSchema = z.object({
  labId: z.string(),
  result: z.enum(["positive", "negative"], {
    required_error: "Please select a result option",
  }),
});

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeCollapsibleA, setActiveCollapsibleA] = useState(true);
  const [activeCollapsibleB, setActiveCollapsibleB] = useState(true);
  const [patientLabs, setPatientLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Form for patient ID input
  const patientIdForm = useForm<z.infer<typeof patientIdSchema>>({
    resolver: zodResolver(patientIdSchema),
    defaultValues: {
      patientId: "",
    },
  });

  // Form for lab result input
  const labResultForm = useForm<z.infer<typeof labResultSchema>>({
    resolver: zodResolver(labResultSchema),
    defaultValues: {
      labId: "",
      result: undefined,
    },
  });

  // Handle patient ID form submission
  const onPatientIdSubmit = (values: z.infer<typeof patientIdSchema>) => {
    // Here you would typically fetch the patient's lab data from the backend
    // -----------------------------------------------------------------
    // BACKEND INTEGRATION (REPLACE THIS SECTION)
    // Replace this with an API call to fetch the patient's lab data
    // 
    // API endpoint: GET /api/patients/{patientId}/labs
    // Expected response format:
    // {
    //   labs: [
    //     {
    //       id: string,
    //       sampleType: string,
    //       collectionDate: string,
    //       status: string
    //     }
    //   ]
    // }
    // -----------------------------------------------------------------
    
    // Using mock data for now (DELETE WHEN CONNECTING TO BACKEND)
    const patientId = values.patientId;
    const foundLabs = patientLabsData[patientId as keyof typeof patientLabsData] || [];
    
    if (foundLabs.length === 0) {
      toast({
        title: "No lab results found",
        description: `No pending lab cultures found for patient ${patientId}`,
        variant: "destructive",
      });
    }
    
    setPatientLabs(foundLabs);
  };

  // Handle lab result form submission
  const onLabResultSubmit = (values: z.infer<typeof labResultSchema>) => {
    // Store the values and show confirmation dialog
    setSelectedLab({
      ...values,
      labData: patientLabs.find(lab => lab.id === values.labId)
    });
    setShowConfirmDialog(true);
  };

  // Handle final submission after confirmation
  const handleFinalSubmit = () => {
    // Here you would submit the result to the backend
    // -----------------------------------------------------------------
    // BACKEND INTEGRATION (REPLACE THIS SECTION)
    // Replace this with an API call to submit the lab result
    // 
    // API endpoint: PUT /api/labs/{labId}/result
    // Request body:
    // {
    //   result: "positive" | "negative",
    //   submittedBy: string, // User ID or name
    //   submittedAt: Date
    // }
    // -----------------------------------------------------------------
    
    toast({
      title: "Lab result submitted",
      description: `Result for lab ${selectedLab.labId} has been recorded as ${selectedLab.result}`,
    });
    
    // Update local state to reflect the change (DELETE WHEN CONNECTING TO BACKEND)
    setPatientLabs(prevLabs => 
      prevLabs.map(lab => 
        lab.id === selectedLab.labId 
          ? { ...lab, status: "Completed", result: selectedLab.result } 
          : lab
      )
    );
    
    // Reset forms and state
    setShowConfirmDialog(false);
    setSelectedLab(null);
    labResultForm.reset();
  };

  const handleLogout = () => {
    // Here you would typically clear any auth tokens or user session data
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/40">
      {/* Logout button in the top left */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute top-6 left-6 text-gray-500 hover:text-gray-700"
        aria-label="Logout"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-4 mb-12 text-center">
          <h1 className="text-4xl font-light tracking-tight text-gray-800">Admin Dashboard</h1>
          <p className="text-lg text-gray-500">Monitor critical cases and manage hospital data</p>
        </div>

        <Tabs defaultValue="critical" className="w-full">
          <TabsList className="mb-10 bg-gray-100/80 rounded-xl shadow-sm h-16">
            <TabsTrigger 
              value="critical" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1"
            >
              Critical Cases
            </TabsTrigger>
            <TabsTrigger 
              value="lab-results" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-lg py-3 flex-1"
            >
              Input Lab Results
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
              Discharge Patients
            </TabsTrigger>
          </TabsList>

          {/* Critical Cases Tab */}
          <TabsContent value="critical" className="w-full space-y-8">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases Management</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-6 space-y-8">
                {/* Collapsible Section A - Active Critical Cases */}
                <Collapsible 
                  open={activeCollapsibleA} 
                  onOpenChange={setActiveCollapsibleA}
                  className="border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-5 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-500 h-5 w-5" />
                      <h3 className="text-lg font-medium text-red-700">
                        Patients with Confirmed Carbapenem Resistance (Not in Isolation)
                      </h3>
                    </div>
                    {activeCollapsibleA ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-5 bg-white">
                    {criticalPatientsData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/2">Patient ID</TableHead>
                            <TableHead className="w-1/2">Current Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {criticalPatientsData.map((patient) => (
                            <TableRow key={patient.id} className="bg-red-50/50 hover:bg-red-50">
                              <TableCell className="font-medium">{patient.id}</TableCell>
                              <TableCell>{patient.location}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500 py-4 text-center">No critical cases currently.</p>
                    )}
                    
                    {/* 
                    // ---------------------------------------------------------
                    // BACKEND INTEGRATION (REPLACE THIS SECTION)
                    // Replace this section with your actual API call when connecting to backend
                    // 
                    // API endpoint: GET /api/patients/critical
                    // Expected response format:
                    // {
                    //   patients: [
                    //     {
                    //       id: string,
                    //       location: string,
                    //       isolationStatus: boolean,
                    //       cultureResults: {
                    //         positive: boolean,
                    //         date: string
                    //       }
                    //     }
                    //   ]
                    // }
                    // ---------------------------------------------------------
                    */}
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Collapsible Section B - Pending Results */}
                <Collapsible 
                  open={activeCollapsibleB} 
                  onOpenChange={setActiveCollapsibleB}
                  className="border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-5 bg-amber-50 hover:bg-amber-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-amber-500 h-5 w-5" />
                      <h3 className="text-lg font-medium text-amber-700">
                        Patients Awaiting Carbapenem Lab Results
                      </h3>
                    </div>
                    {activeCollapsibleB ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-5 bg-white">
                    {pendingResultsData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/3">Patient ID</TableHead>
                            <TableHead className="w-1/3">Collection Date</TableHead>
                            <TableHead className="w-1/3">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingResultsData.map((patient) => (
                            <TableRow key={patient.id}>
                              <TableCell className="font-medium">{patient.id}</TableCell>
                              <TableCell>{patient.collectionDate}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm">
                                  {patient.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500 py-4 text-center">No pending test results.</p>
                    )}
                    
                    {/* 
                    // ---------------------------------------------------------
                    // BACKEND INTEGRATION (REPLACE THIS SECTION)
                    // Replace this section with your actual API call when connecting to backend
                    // 
                    // API endpoint: GET /api/patients/pending-results
                    // Expected response format:
                    // {
                    //   patients: [
                    //     {
                    //       id: string,
                    //       collectionDate: string,
                    //       status: string,
                    //       priority: number
                    //     }
                    //   ]
                    // }
                    // ---------------------------------------------------------
                    */}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Input Lab Results Tab */}
          <TabsContent value="lab-results">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Input Lab Results</CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                {/* Patient ID Search Form */}
                <Form {...patientIdForm}>
                  <form onSubmit={patientIdForm.handleSubmit(onPatientIdSubmit)} className="space-y-6">
                    <FormField
                      control={patientIdForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col w-full md:flex-row md:items-end md:gap-6">
                          <div className="flex-1">
                            <FormLabel htmlFor="patientId" className="text-lg mb-2 block">Enter Patient ID</FormLabel>
                            <FormControl>
                              <Input id="patientId" placeholder="Enter patient ID" {...field} className="h-12 text-base" />
                            </FormControl>
                            <FormMessage />
                          </div>
                          <Button type="submit" size="lg" className="mt-4 md:mt-0 gap-2 h-12">
                            <Search className="h-4 w-4" />
                            Search
                          </Button>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>

                {/* Display patient labs if available */}
                {patientLabs.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-xl font-medium mb-6">Pending Lab Cultures</h3>
                    
                    <div className="rounded-lg border overflow-hidden mb-10">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="py-4">Lab ID</TableHead>
                            <TableHead className="py-4">Sample Type</TableHead>
                            <TableHead className="py-4">Collection Date</TableHead>
                            <TableHead className="py-4">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientLabs.map((lab) => (
                            <TableRow key={lab.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium py-4">{lab.id}</TableCell>
                              <TableCell className="py-4">{lab.sampleType}</TableCell>
                              <TableCell className="py-4">{lab.collectionDate}</TableCell>
                              <TableCell className="py-4">
                                <span className={`px-3 py-1 rounded-full text-sm ${
                                  lab.status === "Completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {lab.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Lab Result Input Form */}
                    <div className="mt-10 border-t pt-8">
                      <h3 className="text-xl font-medium mb-6">Input Carbapenem Resistance Result</h3>
                      
                      <Form {...labResultForm}>
                        <form onSubmit={labResultForm.handleSubmit(onLabResultSubmit)} className="space-y-8 max-w-2xl mx-auto">
                          <FormField
                            control={labResultForm.control}
                            name="labId"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-base">Select Lab ID</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="" disabled>Select a lab</option>
                                    {patientLabs
                                      .filter(lab => lab.status === "Pending")
                                      .map(lab => (
                                        <option key={lab.id} value={lab.id}>{lab.id} - {lab.sampleType}</option>
                                      ))
                                    }
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={labResultForm.control}
                            name="result"
                            render={({ field }) => (
                              <FormItem className="space-y-4">
                                <FormLabel className="text-base">Carbapenem Resistance Result</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-3"
                                  >
                                    <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                                      <RadioGroupItem value="positive" id="positive" />
                                      <label htmlFor="positive" className="text-base font-medium cursor-pointer w-full">
                                        Positive (Resistance Detected)
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                                      <RadioGroupItem value="negative" id="negative" />
                                      <label htmlFor="negative" className="text-base font-medium cursor-pointer w-full">
                                        Negative (No Resistance Detected)
                                      </label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button type="submit" size="lg" className="w-full md:w-auto px-8">Submit Result</Button>
                        </form>
                      </Form>
                    </div>
                  </div>
                )}

                {/* Confirmation Dialog */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Lab Result Submission</AlertDialogTitle>
                      <AlertDialogDescription>
                        {selectedLab && (
                          <div className="text-left space-y-3 py-4">
                            <p><strong>Lab ID:</strong> {selectedLab.labId}</p>
                            {selectedLab.labData && (
                              <>
                                <p><strong>Sample Type:</strong> {selectedLab.labData.sampleType}</p>
                                <p><strong>Collection Date:</strong> {selectedLab.labData.collectionDate}</p>
                              </>
                            )}
                            <p>
                              <strong>Result:</strong> 
                              <span className={selectedLab.result === "positive" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                {" "}{selectedLab.result === "positive" ? "Positive (Resistance Detected)" : "Negative (No Resistance Detected)"}
                              </span>
                            </p>
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="font-medium text-gray-700">
                                Are you sure you want to submit this result? This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleFinalSubmit}>
                        Confirm Submission
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {/* 
                // ---------------------------------------------------------
                // BACKEND INTEGRATION (REPLACE THIS SECTION)
                // Replace the static form implementation with your actual API calls when connecting to backend
                // 
                // API endpoints:
                // 1. GET /api/patients/{patientId} - Get patient info
                // 2. GET /api/patients/{patientId}/labs - Get patient lab tests
                // 3. PUT /api/labs/{labId}/result - Submit lab result
                // 
                // The forms and state management can remain similar, but the data fetching and submission
                // should be replaced with actual API calls
                // ---------------------------------------------------------
                */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Database Tab */}
          <TabsContent value="database">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Full Database</CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                <p className="text-gray-500 text-center text-lg py-12">Full database view and search functionality will be implemented here.</p>
                
                {/* 
                // ---------------------------------------------------------
                // BACKEND INTEGRATION (REPLACE THIS SECTION)
                // Replace this section with your actual table and API call when connecting to backend
                // 
                // API endpoint: GET /api/patients
                // Query parameters: page, limit, search, sort, filters
                // Expected response format:
                // {
                //   patients: [...],
                //   total: number,
                //   pages: number,
                //   currentPage: number
                // }
                // ---------------------------------------------------------
                */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discharge Patients Tab */}
          <TabsContent value="discharge">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Discharge Patients</CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                <p className="text-gray-500 text-center text-lg py-12">Patient discharge functionality will be implemented here.</p>
                
                {/* 
                // ---------------------------------------------------------
                // BACKEND INTEGRATION (REPLACE THIS SECTION)
                // Replace this section with your actual form and API call when connecting to backend
                // 
                // API endpoint: PUT /api/patients/:id/discharge
                // Request format:
                // {
                //   dischargeDate: string,
                //   dischargeSummary: string,
                //   followUpRequired: boolean,
                //   followUpNotes: string,
                //   dischargedBy: string
                // }
                // ---------------------------------------------------------
                */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
