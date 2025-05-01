
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, User, X, AlertCircle, Activity, Calendar, Beaker } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WardScanLog = {
  id: string;
  patient_id: string;
  ward: string;
  scanned_at: string;
  scanned_by: string;
};

type PatientAdmissionRecord = {
  registration_date: string;
  discharge_date: string | null;
  status: string;
};

type LabResult = {
  id: string;
  sample_id: string;
  collection_date: string;
  processed_date: string | null;
  result: string | null;
  processed_by: string | null;
  notes: string | null;
};

interface PatientHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
}

// Function to extract patient ID from JSON string or return original if not JSON
const extractPatientId = (patientIdStr: string): string => {
  try {
    const parsed = JSON.parse(patientIdStr);
    return parsed.patientId || patientIdStr;
  } catch (e) {
    return patientIdStr;
  }
};

const PatientHistory: React.FC<PatientHistoryProps> = ({
  open,
  onOpenChange,
  patientId
}) => {
  const { toast } = useToast();
  const [scanLogs, setScanLogs] = useState<WardScanLog[]>([]);
  const [admissionRecords, setAdmissionRecords] = useState<PatientAdmissionRecord | null>(null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && patientId) {
      fetchPatientData(patientId);
    }
  }, [open, patientId]);

  const fetchPatientData = async (patientId: string) => {
    setIsLoading(true);
    
    try {
      // Fetch scan logs
      await fetchScanLogs(patientId);
      
      // Fetch patient admission/discharge records
      await fetchAdmissionRecords(patientId);
      
      // Fetch lab results
      await fetchLabResults(patientId);
    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load patient history.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScanLogs = async (patientId: string) => {
    console.log('Fetching scan logs for patient ID:', patientId);
    
    const { data, error } = await supabase
      .from('ward_scan_logs')
      .select('*') as { data: WardScanLog[] | null, error: any };
    
    if (error) {
      console.error('Error fetching patient scan logs:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      setScanLogs([]);
      return;
    }
    
    const filteredLogs = data.filter(log => {
      const extractedId = extractPatientId(log.patient_id);
      return extractedId === patientId;
    }).sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
    
    console.log('Filtered logs for patient:', filteredLogs);
    setScanLogs(filteredLogs);
  };

  const fetchAdmissionRecords = async (patientId: string) => {
    console.log('Fetching admission records for patient ID:', patientId);
    
    const { data, error } = await supabase
      .from('patients')
      .select('registration_date, discharge_date, status')
      .eq('patient_id', patientId)
      .maybeSingle() as { data: PatientAdmissionRecord | null, error: any };
    
    if (error) {
      console.error('Error fetching patient admission records:', error);
      throw error;
    }
    
    if (data) {
      console.log('Patient admission records:', data);
      setAdmissionRecords(data);
    }
  };

  const fetchLabResults = async (patientId: string) => {
    console.log('Fetching lab results for patient ID:', patientId);
    
    try {
      // First get the patient's UUID from the patients table
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .maybeSingle();
      
      if (patientError) throw patientError;
      
      if (!patient) {
        console.log('No patient found with ID:', patientId);
        setLabResults([]);
        return;
      }
      
      // Get lab results using the patient's UUID
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', patient.id)
        .order('collection_date', { ascending: false }) as { data: LabResult[] | null, error: any };
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setLabResults([]);
        return;
      }
      
      console.log('Lab results for patient:', data);
      setLabResults(data);
    } catch (error) {
      console.error('Error fetching lab results:', error);
      throw error;
    }
  };

  const renderAdmissionStatus = () => {
    if (!admissionRecords) return "Unknown";
    
    if (admissionRecords.status === "admitted") {
      return "Currently Admitted";
    } else if (admissionRecords.status === "discharged" && admissionRecords.discharge_date) {
      return `Discharged on ${format(new Date(admissionRecords.discharge_date), 'MMM dd, yyyy')}`;
    } else {
      return admissionRecords.status;
    }
  };

  const formatLabResultStatus = (result: string | null) => {
    if (result === null) return <Badge variant="secondary">Pending</Badge>;
    if (result === "positive") return <Badge variant="destructive">MDRO Positive</Badge>;
    if (result === "negative") return <Badge variant="default">MDRO Negative</Badge>;
    return <Badge variant="outline">{result}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-5/6 overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Patient History</SheetTitle>
          <SheetDescription>
            Complete history for Patient ID: <span className="font-medium text-black">{patientId}</span>
          </SheetDescription>
        </SheetHeader>
        
        <SheetClose className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse text-gray-500">Loading patient history...</div>
          </div>
        ) : (
          <div className="mt-6">
            {/* Admission Summary */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Admission Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className="font-medium">{renderAdmissionStatus()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">First Admitted:</span>
                    <span>
                      {admissionRecords?.registration_date 
                        ? format(new Date(admissionRecords.registration_date), 'MMM dd, yyyy')
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">MDRO Culture Required:</span>
                    <span>{admissionRecords?.status === "admitted" ? "Yes" : "No"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="locations" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="locations">
                  <MapPin className="h-4 w-4 mr-2" />
                  Locations
                </TabsTrigger>
                <TabsTrigger value="lab-results">
                  <Beaker className="h-4 w-4 mr-2" />
                  Lab Results
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Activity className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              {/* Locations Tab */}
              <TabsContent value="locations" className="mt-4">
                {scanLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward</TableHead>
                        <TableHead>Scan Time</TableHead>
                        <TableHead>Scanned By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <Badge variant={log.ward === "isolation_room" ? "destructive" : "outline"}>{log.ward}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              {format(new Date(log.scanned_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              {log.scanned_by}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10 border rounded-md bg-gray-50">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No location data available for this patient.</p>
                    <p className="text-sm text-gray-400 mt-2">Logs will appear when the patient's QR code is scanned at a ward.</p>
                  </div>
                )}
              </TabsContent>

              {/* Lab Results Tab */}
              <TabsContent value="lab-results" className="mt-4">
                {labResults.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sample ID</TableHead>
                        <TableHead>Collection Date</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>
                            <div className="font-medium">{result.sample_id}</div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {formatLabResultStatus(result.result)}
                          </TableCell>
                          <TableCell>
                            {result.processed_date ? (
                              <div className="text-sm text-gray-500">
                                {format(new Date(result.processed_date), 'MMM dd HH:mm')}
                                <div className="text-xs">{result.processed_by}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not processed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10 border rounded-md bg-gray-50">
                    <Beaker className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No lab results available for this patient.</p>
                  </div>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-4">
                <div className="relative border-l border-gray-200 pl-6 ml-6">
                  {/* Admission event */}
                  {admissionRecords?.registration_date && (
                    <div className="mb-10 relative">
                      <div className="absolute -left-10 mt-1.5 h-4 w-4 rounded-full bg-green-500 border-4 border-white"></div>
                      <time className="mb-1 text-sm font-normal leading-none text-gray-400">
                        {format(new Date(admissionRecords.registration_date), 'MMM dd, yyyy')}
                      </time>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Admitted</h3>
                      <p className="mb-4 text-base font-normal text-gray-500">
                        Patient was registered in the system
                      </p>
                    </div>
                  )}

                  {/* Lab Results events */}
                  {labResults.map(result => (
                    <div key={result.id} className="mb-10 relative">
                      <div className={`absolute -left-10 mt-1.5 h-4 w-4 rounded-full ${result.result === 'positive' ? 'bg-red-500' : result.result === 'negative' ? 'bg-blue-500' : 'bg-yellow-500'} border-4 border-white`}></div>
                      <time className="mb-1 text-sm font-normal leading-none text-gray-400">
                        {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                      </time>
                      <h3 className="text-lg font-semibold text-gray-900">Lab Sample Collected</h3>
                      <p className="text-base font-normal text-gray-500">
                        Sample ID: {result.sample_id}
                      </p>
                      {result.processed_date && (
                        <div className="mt-3 ml-4 pl-4 border-l border-dashed border-gray-200">
                          <time className="mb-1 text-sm font-normal leading-none text-gray-400">
                            {format(new Date(result.processed_date), 'MMM dd, yyyy')}
                          </time>
                          <h3 className="text-md font-medium text-gray-900">Results Processed</h3>
                          <p className="text-base font-normal text-gray-500">
                            {result.result === "positive" ? "MDRO Positive" : 
                             result.result === "negative" ? "MDRO Negative" : 
                             "Pending"}
                          </p>
                          {result.notes && (
                            <p className="text-sm italic text-gray-500 mt-1">{result.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Discharge event */}
                  {admissionRecords?.discharge_date && (
                    <div className="mb-10 relative">
                      <div className="absolute -left-10 mt-1.5 h-4 w-4 rounded-full bg-gray-500 border-4 border-white"></div>
                      <time className="mb-1 text-sm font-normal leading-none text-gray-400">
                        {format(new Date(admissionRecords.discharge_date), 'MMM dd, yyyy')}
                      </time>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Discharged</h3>
                      <p className="mb-4 text-base font-normal text-gray-500">
                        Patient was discharged from the system
                      </p>
                    </div>
                  )}

                  {/* If no events */}
                  {(!admissionRecords?.registration_date && labResults.length === 0) && (
                    <div className="text-center py-10">
                      <p className="text-gray-500">No timeline events available.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PatientHistory;
