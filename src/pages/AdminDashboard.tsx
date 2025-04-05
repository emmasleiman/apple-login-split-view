import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Search, X, ChevronLeft, User, Check, ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

const allPatientsData = [
  { 
    id: "P78945",
    wardInfo: "Ward A", 
    admissionDate: "2025-03-25", 
    status: "Critical",
    discharged: false,
    history: [
      { date: "2025-03-25", event: "Admitted to Ward A" },
      { date: "2025-03-27", event: "Lab Test Requested" },
      { date: "2025-03-29", event: "Carbapenem Resistance: Positive" },
    ]
  },
  { 
    id: "P12367",
    wardInfo: "ICU", 
    admissionDate: "2025-03-29", 
    status: "Critical",
    discharged: false,
    history: [
      { date: "2025-03-29", event: "Admitted to ICU" },
      { date: "2025-03-30", event: "Lab Test Requested" },
      { date: "2025-04-01", event: "Carbapenem Resistance: Positive" },
    ]
  },
  { 
    id: "P45678",
    wardInfo: "Ward B", 
    admissionDate: "2025-03-30", 
    status: "Pending",
    discharged: false,
    history: [
      { date: "2025-03-30", event: "Admitted to Ward B" },
      { date: "2025-04-01", event: "Lab Test Requested" },
    ]
  },
  { 
    id: "P91234",
    wardInfo: "Ward D", 
    admissionDate: "2025-04-01", 
    status: "Pending",
    discharged: false,
    history: [
      { date: "2025-04-01", event: "Admitted to Ward D" },
      { date: "2025-04-02", event: "Lab Test Requested" },
    ]
  },
  { 
    id: "P56789",
    wardInfo: "Ward C", 
    admissionDate: "2025-04-01", 
    status: "Pending",
    discharged: false,
    history: [
      { date: "2025-04-01", event: "Admitted to Ward C" },
      { date: "2025-04-03", event: "Lab Test Requested" },
    ]
  },
  { 
    id: "P34589",
    wardInfo: "Ward C", 
    admissionDate: "2025-03-28", 
    status: "Critical",
    discharged: false,
    history: [
      { date: "2025-03-28", event: "Admitted to Ward C" },
      { date: "2025-03-29", event: "Lab Test Requested" },
      { date: "2025-03-31", event: "Carbapenem Resistance: Positive" },
    ]
  },
  { 
    id: "P23456",
    wardInfo: "Ward B", 
    admissionDate: "2025-03-25", 
    status: "Clear",
    discharged: true,
    history: [
      { date: "2025-03-25", event: "Admitted to Ward B" },
      { date: "2025-03-26", event: "Lab Test Requested" },
      { date: "2025-03-28", event: "Carbapenem Resistance: Negative" },
      { date: "2025-04-02", event: "Discharged" },
    ]
  },
  { 
    id: "P67890",
    wardInfo: "Ward A", 
    admissionDate: "2025-03-27", 
    status: "Clear",
    discharged: true,
    history: [
      { date: "2025-03-27", event: "Admitted to Ward A" },
      { date: "2025-03-28", event: "Lab Test Requested" },
      { date: "2025-03-30", event: "Carbapenem Resistance: Negative" },
      { date: "2025-04-03", event: "Discharged" },
    ]
  },
];

const patientIdSchema = z.object({
  patientId: z.string().min(1, { message: "Patient ID is required" })
});

const labResultSchema = z.object({
  labId: z.string(),
  result: z.enum(["positive", "negative"], {
    required_error: "Please select a result option",
  }),
});

const dischargePatientSchema = z.object({
  patientId: z.string().min(1, { message: "Patient ID is required" }),
});

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeCollapsibleA, setActiveCollapsibleA] = useState(true);
  const [activeCollapsibleB, setActiveCollapsibleB] = useState(true);
  const [patientLabs, setPatientLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState(allPatientsData);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientHistory, setShowPatientHistory] = useState(false);
  const [showDischargeConfirmDialog, setShowDischargeConfirmDialog] = useState(false);
  const [patientToDischarge, setPatientToDischarge] = useState<string | null>(null);
  const [patientDischargeDetails, setPatientDischargeDetails] = useState<any>(null);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(allPatientsData);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allPatientsData.filter(patient => 
        patient.id.toLowerCase().includes(query) || 
        patient.wardInfo.toLowerCase().includes(query) ||
        patient.status.toLowerCase().includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery]);

  const patientIdForm = useForm<z.infer<typeof patientIdSchema>>({
    resolver: zodResolver(patientIdSchema),
    defaultValues: {
      patientId: "",
    },
  });

  const labResultForm = useForm<z.infer<typeof labResultSchema>>({
    resolver: zodResolver(labResultSchema),
    defaultValues: {
      labId: "",
      result: undefined,
    },
  });

  const dischargeForm = useForm<z.infer<typeof dischargePatientSchema>>({
    resolver: zodResolver(dischargePatientSchema),
    defaultValues: {
      patientId: "",
    },
  });

  const onPatientIdSubmit = (values: z.infer<typeof patientIdSchema>) => {
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

  const onLabResultSubmit = (values: z.infer<typeof labResultSchema>) => {
    setSelectedLab({
      ...values,
      labData: patientLabs.find(lab => lab.id === values.labId)
    });
    setShowConfirmDialog(true);
  };

  const handleFinalSubmit = () => {
    toast({
      title: "Lab result submitted",
      description: `Result for lab ${selectedLab.labId} has been recorded as ${selectedLab.result}`,
    });
    
    setPatientLabs(prevLabs => 
      prevLabs.map(lab => 
        lab.id === selectedLab.labId 
          ? { ...lab, status: "Completed", result: selectedLab.result } 
          : lab
      )
    );
    
    setShowConfirmDialog(false);
    setSelectedLab(null);
    labResultForm.reset();
  };

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientHistory(true);
  };

  const handleBackToList = () => {
    setShowPatientHistory(false);
    setSelectedPatient(null);
  };

  const handleLogout = () => {
    navigate("/");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'pending':
        return 'pending';
      case 'clear':
        return 'clear';
      case 'discharged':
        return 'discharged';
      default:
        return 'default';
    }
  };

  const onDischargeSubmit = (values: z.infer<typeof dischargePatientSchema>) => {
    const patientId = values.patientId;
    
    const foundPatient = allPatientsData.find(p => p.id === patientId);
    
    if (!foundPatient) {
      toast({
        title: "Patient not found",
        description: `No patient found with ID ${patientId}`,
        variant: "destructive",
      });
      return;
    }
    
    if (foundPatient.discharged) {
      toast({
        title: "Already discharged",
        description: `Patient ${patientId} has already been discharged`,
        variant: "destructive",
      });
      return;
    }
    
    setPatientToDischarge(patientId);
    setPatientDischargeDetails(foundPatient);
    setShowDischargeConfirmDialog(true);
  };

  const handleDischargeConfirm = () => {
    if (!patientToDischarge) return;
    
    toast({
      title: "Patient discharged",
      description: `Patient ${patientToDischarge} has been discharged successfully`,
    });
    
    dischargeForm.reset();
    setShowDischargeConfirmDialog(false);
    setPatientToDischarge(null);
    setPatientDischargeDetails(null);
    
    const currentDate = new Date().toISOString().split('T')[0];
    const updatedPatientsData = allPatientsData.map(patient => {
      if (patient.id === patientToDischarge) {
        return {
          ...patient, 
          discharged: true,
          status: "Clear",
          history: [
            ...patient.history, 
            { date: currentDate, event: "Discharged" }
          ]
        };
      }
      return patient;
    });
    
    setFilteredPatients(updatedPatientsData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/40">
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

          <TabsContent value="critical" className="w-full space-y-8">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases Management</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-6 space-y-8 max-h-[70vh] overflow-y-auto">
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
                    <div className="overflow-x-auto w-full">
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
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
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
                    <div className="overflow-x-auto w-full">
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
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lab-results">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Input Lab Results</CardTitle>
              </CardHeader>
              <CardContent className="py-8 max-h-[70vh] overflow-y-auto">
                <Form {...patientIdForm}>
                  <form onSubmit={patientIdForm.handleSubmit(onPatientIdSubmit)} className="space-y-6 max-w-2xl mx-auto">
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

                {patientLabs.length > 0 && (
                  <div className="mt-10 max-w-4xl mx-auto">
                    <h3 className="text-xl font-medium mb-6">Pending Lab Cultures</h3>
                    
                    <div className="rounded-lg border overflow-hidden mb-10">
                      <div className="overflow-x-auto w-full">
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
                    </div>

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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Full Database</CardTitle>
              </CardHeader>
              <CardContent className="py-8 max-h-[70vh] overflow-y-auto">
                {!showPatientHistory ? (
                  <div className="space-y-6">
                    <div className="relative max-w-3xl mx-auto mb-8">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <div className="px-4 text-gray-500">
                          <Search className="h-5 w-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search patients by ID, ward or status..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 py-3 px-2 outline-none bg-transparent text-base"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="px-4 hover:bg-gray-100"
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient ID</TableHead>
                            <TableHead>Ward</TableHead>
                            <TableHead>Admission Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                              <TableRow key={patient.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">
                                  {patient.id}
                                </TableCell>
                                <TableCell>{patient.wardInfo}</TableCell>
                                <TableCell>{patient.admissionDate}</TableCell>
                                <TableCell>
                                  {patient.discharged ? (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                      Discharged
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant={getStatusBadgeVariant(patient.status)}
                                      className={`
                                        ${patient.status.toLowerCase() === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                                        ${patient.status.toLowerCase() === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                        ${patient.status.toLowerCase() === 'clear' ? 'bg-green-500 hover:bg-green-600' : ''}
                                      `}
                                    >
                                      {patient.status}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => handlePatientSelect(patient)}
                                  >
                                    View History
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                No patients found matching your search criteria.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center mb-8">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBackToList}
                        className="mr-4"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Patient List
                      </Button>
                      
                      <h2 className="text-xl font-medium">
                        Patient History: {selectedPatient?.id}
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Patient ID</h3>
                        <p className="text-lg font-medium">{selectedPatient?.id}</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Ward</h3>
                        <p className="text-lg font-medium">{selectedPatient?.wardInfo}</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium mb-2">Status</h3>
                        <div className="flex items-center gap-2">
                          {selectedPatient?.discharged ? (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                              Discharged
                            </Badge>
                          ) : (
                            <Badge 
                              variant={getStatusBadgeVariant(selectedPatient?.status || "")}
                              className={`
                                ${selectedPatient?.status?.toLowerCase() === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                                ${selectedPatient?.status?.toLowerCase() === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                ${selectedPatient?.status?.toLowerCase() === 'clear' ? 'bg-green-500 hover:bg-green-600' : ''}
                              `}
                            >
                              {selectedPatient?.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative pl-6 border-l-2 border-gray-200 space-y-8">
                      {selectedPatient?.history.map((event: any, index: number) => (
                        <div key={index} className="relative pb-8">
                          <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full bg-blue-600 border-4 border-white"></div>
                          <div className="mb-2 text-sm text-gray-500">{event.date}</div>
                          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                            <p className="text-gray-700">{event.event}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discharge">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100 py-6">
                <CardTitle className="text-2xl font-normal text-gray-700">Discharge Patients</CardTitle>
              </CardHeader>
              <CardContent className="py-8 space-y-8">
                <div className="max-w-2xl mx-auto">
                  <Form {...dischargeForm}>
                    <form onSubmit={dischargeForm.handleSubmit(onDischargeSubmit)} className="space-y-6">
                      <FormField
                        control={dischargeForm.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-lg">Enter Patient ID to Discharge</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter patient ID" 
                                {...field} 
                                className="h-12 text-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full h-12 text-base gap-2">
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </form>
                  </Form>
                </div>
                
                <AlertDialog open={showDischargeConfirmDialog} onOpenChange={setShowDischargeConfirmDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Patient Discharge</AlertDialogTitle>
                      <AlertDialogDescription>
                        {patientDischargeDetails && (
                          <div className="text-left space-y-3 py-4">
                            <p><strong>Patient ID:</strong> {patientDischargeDetails.id}</p>
                            <p><strong>Current Ward:</strong> {patientDischargeDetails.wardInfo}</p>
                            <p><strong>Admission Date:</strong> {patientDischargeDetails.admissionDate}</p>
                            <p>
                              <strong>Current Status:</strong> 
                              <Badge 
                                variant={getStatusBadgeVariant(patientDischargeDetails.status)}
                                className="ml-2"
                              >
                                {patientDischargeDetails.status}
                              </Badge>
                            </p>
                            
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="font-medium text-gray-700">
                                Are you sure you want to discharge this patient? This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDischargeConfirm} className="bg-green-500 hover:bg-green-600">
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Discharge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
