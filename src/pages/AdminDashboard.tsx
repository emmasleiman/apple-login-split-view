
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Mock data for demonstration
// This would normally come from an API call
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

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeCollapsibleA, setActiveCollapsibleA] = useState(true);
  const [activeCollapsibleB, setActiveCollapsibleB] = useState(true);

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
        className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        aria-label="Logout"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-800">Admin Dashboard</h1>
          <p className="text-base text-gray-500">Monitor critical cases and manage hospital data</p>
        </div>

        <Tabs defaultValue="critical" className="w-full">
          <TabsList className="mb-8 bg-gray-100/80 rounded-xl shadow-sm h-16">
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
          <TabsContent value="critical" className="w-full space-y-6">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Critical Cases Management</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Collapsible Section A - Active Critical Cases */}
                <Collapsible 
                  open={activeCollapsibleA} 
                  onOpenChange={setActiveCollapsibleA}
                  className="border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-red-500 h-5 w-5" />
                      <h3 className="text-lg font-medium text-red-700">
                        Patients with Confirmed Carbapenem Resistance (Not in Isolation)
                      </h3>
                    </div>
                    {activeCollapsibleA ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 bg-white">
                    {criticalPatientsData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient ID</TableHead>
                            <TableHead>Current Location</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {criticalPatientsData.map((patient) => (
                            <TableRow key={patient.id} className="bg-red-50/50 hover:bg-red-50">
                              <TableCell className="font-medium">{patient.id}</TableCell>
                              <TableCell>{patient.location}</TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Mark as Isolated
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500 py-4 text-center">No critical cases currently.</p>
                    )}
                    
                    {/* Backend integration comment */}
                    {/* 
                    // ---------------------------------------------------------
                    // Backend API integration for critical cases:
                    // 1. Fetch patients with positive carbapenem-resistant cultures
                    // 2. Filter for patients who are not marked as in isolation
                    // 3. Update patient isolation status when "Mark as Isolated" is clicked
                    // 4. Real-time updates when new results come in
                    // 
                    // API endpoint: GET /api/patients/critical
                    // Response format:
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
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-amber-50 hover:bg-amber-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-amber-500 h-5 w-5" />
                      <h3 className="text-lg font-medium text-amber-700">
                        Patients Awaiting Carbapenem Lab Results
                      </h3>
                    </div>
                    {activeCollapsibleB ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 bg-white">
                    {pendingResultsData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient ID</TableHead>
                            <TableHead>Collection Date</TableHead>
                            <TableHead>Status</TableHead>
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
                    
                    {/* Backend integration comment */}
                    {/* 
                    // ---------------------------------------------------------
                    // Backend API integration for pending lab results:
                    // 1. Fetch patients with pending carbapenem culture tests
                    // 2. Sort by collection date (oldest first)
                    // 3. Enable filtering and searching
                    // 4. Real-time updates when new tests are ordered
                    // 
                    // API endpoint: GET /api/patients/pending-results
                    // Response format:
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
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Input Lab Results</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <p className="text-gray-500">Lab results input functionality will be implemented here.</p>
                
                {/* Backend integration comment */}
                {/* 
                // ---------------------------------------------------------
                // Backend API integration for lab results:
                // 1. Form to input patient ID and lab results
                // 2. Validation of patient existence
                // 3. Submit results to API
                // 4. Update patient status based on results
                // 5. Trigger notifications for positive results
                // 
                // API endpoint: POST /api/lab-results
                // Request format:
                // {
                //   patientId: string,
                //   testType: string,
                //   result: string,
                //   resultDate: string,
                //   performedBy: string
                // }
                // ---------------------------------------------------------
                */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Database Tab */}
          <TabsContent value="database">
            <Card className="border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Full Database</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <p className="text-gray-500">Full database view and search functionality will be implemented here.</p>
                
                {/* Backend integration comment */}
                {/* 
                // ---------------------------------------------------------
                // Backend API integration for database view:
                // 1. Paginated list of all patients
                // 2. Advanced filtering and sorting
                // 3. Search functionality
                // 4. Export options (CSV, PDF)
                // 5. Detailed patient view on click
                // 
                // API endpoint: GET /api/patients
                // Query parameters: page, limit, search, sort, filters
                // Response format:
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
              <CardHeader className="bg-gray-50/60 border-b border-gray-100">
                <CardTitle className="text-2xl font-normal text-gray-700">Discharge Patients</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <p className="text-gray-500">Patient discharge functionality will be implemented here.</p>
                
                {/* Backend integration comment */}
                {/* 
                // ---------------------------------------------------------
                // Backend API integration for patient discharge:
                // 1. Search for patient by ID
                // 2. View patient details including test results
                // 3. Form for discharge notes and summary
                // 4. Update patient status to discharged
                // 5. Generate discharge summary document
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
