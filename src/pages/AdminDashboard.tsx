
import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/integrations/supabase/types";

// Define types for our data based on the database structure
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

type Patient = {
  id: string;
  patientId: string;
  registrationDate: string;
  status: string;
  dischargeDate: string;
  cultureRequired: boolean;
  labResults: LabResult[];
};

type LabResult = {
  id: string;
  sampleId: string;
  result: string | null;
  collectionDate: string;
  processedBy: string;
  processedDate: string;
};

// Custom type for Supabase tables/views
type Tables = Database['public']['Tables']
type Views = Database['public']['Views']

const AdminDashboard = () => {
  const { toast } = useToast();
  
  // Query to fetch all patients with their lab results
  const { data: patients, error, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_lab_results')
        .select('*')
        .order('registration_date', { ascending: false }) as { data: PatientLabResult[] | null, error: any };
      
      if (error) throw error;
      
      // Process and group data by patient
      const patientMap = new Map<string, Patient>();
      
      if (data) {
        data.forEach(item => {
          if (!patientMap.has(item.patient_id)) {
            patientMap.set(item.patient_id, {
              id: item.patient_uuid,
              patientId: item.patient_id,
              registrationDate: new Date(item.registration_date).toLocaleDateString(),
              status: item.status,
              dischargeDate: item.discharge_date ? new Date(item.discharge_date).toLocaleDateString() : '-',
              cultureRequired: item.culture_required,
              labResults: []
            });
          }
          
          if (item.lab_result_id) {
            const patient = patientMap.get(item.patient_id);
            if (patient) {
              patient.labResults.push({
                id: item.lab_result_id,
                sampleId: item.sample_id || '',
                result: item.result,
                collectionDate: item.collection_date ? new Date(item.collection_date).toLocaleDateString() : '-',
                processedBy: item.processed_by || '-',
                processedDate: item.processed_date ? new Date(item.processed_date).toLocaleDateString() : '-'
              });
            }
          }
        });
      }
      
      return Array.from(patientMap.values());
    }
  });

  // Query to fetch recent lab results
  const { data: recentLabResults, isLoading: labsLoading } = useQuery({
    queryKey: ['recentLabResults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*, patients(patient_id)')
        .order('collection_date', { ascending: false })
        .limit(20) as { data: any[] | null, error: any };
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query to fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Get total patients
      const { count: totalPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });
      
      // Get admitted patients
      const { count: admittedPatients, error: admittedError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'admitted');
      
      // Get positive results
      const { count: positiveResults, error: positiveError } = await supabase
        .from('lab_results')
        .select('*', { count: 'exact', head: true })
        .eq('result', 'positive');
      
      // Get pending results
      const { count: pendingResults, error: pendingError } = await supabase
        .from('lab_results')
        .select('*', { count: 'exact', head: true })
        .eq('result', 'pending');
      
      if (patientsError || admittedError || positiveError || pendingError) 
        throw new Error("Failed to fetch statistics");
        
      return {
        totalPatients: totalPatients || 0,
        admittedPatients: admittedPatients || 0,
        positiveResults: positiveResults || 0,
        pendingResults: pendingResults || 0,
      };
    }
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Data",
        description: "Failed to load patient data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="min-h-screen bg-gray-50/40 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">View all patients and lab results</p>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">All Patients</TabsTrigger>
          <TabsTrigger value="lab-results">Lab Results</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-700">Total Patients</h3>
              <p className="text-3xl font-bold mt-2">{statsLoading ? '...' : stats?.totalPatients}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-700">Currently Admitted</h3>
              <p className="text-3xl font-bold mt-2">{statsLoading ? '...' : stats?.admittedPatients}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-700">Positive Results</h3>
              <p className="text-3xl font-bold mt-2 text-red-600">{statsLoading ? '...' : stats?.positiveResults}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-700">Pending Results</h3>
              <p className="text-3xl font-bold mt-2 text-amber-600">{statsLoading ? '...' : stats?.pendingResults}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-xl font-medium text-gray-700">Recent Lab Results</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Processed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading results...</TableCell>
                    </TableRow>
                  ) : recentLabResults && recentLabResults.length > 0 ? (
                    recentLabResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.patients?.patient_id || 'Unknown'}</TableCell>
                        <TableCell>{result.sample_id}</TableCell>
                        <TableCell>{new Date(result.collection_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              result.result === "positive" ? "destructive" : 
                              result.result === "negative" ? "outline" : 
                              "secondary"
                            }
                          >
                            {result.result === "positive" ? "Resistant" : 
                             result.result === "negative" ? "Susceptible" : 
                             "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.processed_by || 'Not processed'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No lab results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-xl font-medium text-gray-700">All Patients</h2>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discharge Date</TableHead>
                    <TableHead>Culture Required</TableHead>
                    <TableHead>Lab Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading patients...
                      </TableCell>
                    </TableRow>
                  ) : patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.patientId}</TableCell>
                        <TableCell>{patient.registrationDate}</TableCell>
                        <TableCell>
                          <Badge variant={patient.status === "discharged" ? "secondary" : "default"}>
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.dischargeDate}</TableCell>
                        <TableCell>{patient.cultureRequired ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {patient.labResults && patient.labResults.length > 0 ? (
                            <div className="space-y-1">
                              {patient.labResults.map((result, index) => (
                                <div key={index} className="text-sm">
                                  <Badge 
                                    variant={
                                      result.result === "positive" ? "destructive" : 
                                      result.result === "negative" ? "outline" : 
                                      "secondary"
                                    }
                                    className="mr-1"
                                  >
                                    {result.result === "positive" ? "Resistant" : 
                                     result.result === "negative" ? "Susceptible" : 
                                     "Pending"}
                                  </Badge>
                                  {result.sampleId} - {result.collectionDate}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">No lab results</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No patients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Lab Results Tab */}
        <TabsContent value="lab-results" className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-xl font-medium text-gray-700">All Lab Results</h2>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Processed Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading lab results...
                      </TableCell>
                    </TableRow>
                  ) : recentLabResults && recentLabResults.length > 0 ? (
                    recentLabResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.sample_id}</TableCell>
                        <TableCell>{result.patients?.patient_id || 'Unknown'}</TableCell>
                        <TableCell>{new Date(result.collection_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              result.result === "positive" ? "destructive" : 
                              result.result === "negative" ? "outline" : 
                              "secondary"
                            }
                          >
                            {result.result === "positive" ? "Resistant" : 
                             result.result === "negative" ? "Susceptible" : 
                             "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.processed_by || '-'}</TableCell>
                        <TableCell>{result.processed_date ? new Date(result.processed_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{result.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No lab results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium text-gray-700 mb-4">Patient Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500">Total Patients</p>
                  <p className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalPatients}</p>
                </div>
                <div>
                  <p className="text-gray-500">Currently Admitted</p>
                  <p className="text-2xl font-bold">{statsLoading ? '...' : stats?.admittedPatients}</p>
                </div>
                <div>
                  <p className="text-gray-500">Discharged</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : (stats ? stats.totalPatients - stats.admittedPatients : 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-medium text-gray-700 mb-4">Lab Results Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500">Total Lab Results</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : (stats ? stats.positiveResults + stats.pendingResults : 0) + 
                      (recentLabResults?.filter(r => r.result === 'negative').length || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Positive Results</p>
                  <p className="text-2xl font-bold text-red-600">{statsLoading ? '...' : stats?.positiveResults}</p>
                </div>
                <div>
                  <p className="text-gray-500">Negative Results</p>
                  <p className="text-2xl font-bold text-green-600">
                    {labsLoading ? '...' : recentLabResults?.filter(r => r.result === 'negative').length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Pending Results</p>
                  <p className="text-2xl font-bold text-amber-600">{statsLoading ? '...' : stats?.pendingResults}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
