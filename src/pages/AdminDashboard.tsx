
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

const AdminDashboard = () => {
  const { toast } = useToast();
  
  // Query to fetch all patients with their lab results
  const { data: patients, error, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_lab_results')
        .select('*')
        .order('registration_date', { ascending: false });
      
      if (error) throw error;
      
      // Process and group data by patient
      const patientMap = new Map();
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
          patient.labResults.push({
            id: item.lab_result_id,
            sampleId: item.sample_id,
            result: item.result,
            collectionDate: new Date(item.collection_date).toLocaleDateString(),
            processedBy: item.processed_by || '-',
            processedDate: item.processed_date ? new Date(item.processed_date).toLocaleDateString() : '-'
          });
        }
      });
      
      return Array.from(patientMap.values());
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
    </div>
  );
};

export default AdminDashboard;
