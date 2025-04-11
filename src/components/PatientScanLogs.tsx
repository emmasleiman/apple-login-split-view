
import React, { useEffect } from "react";
import { format } from "date-fns";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User, X, AlertCircle } from "lucide-react";

type WardScanLog = {
  id: string;
  patient_id: string;
  ward: string;
  scanned_at: string;
  scanned_by: string;
}

interface PatientScanLogsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
  scanLogs: WardScanLog[];
  isLoading: boolean;
}

const PatientScanLogs: React.FC<PatientScanLogsProps> = ({
  open,
  onOpenChange,
  patientId,
  scanLogs,
  isLoading
}) => {
  useEffect(() => {
    if (open) {
      console.log("PatientScanLogs opened for patient:", patientId);
      console.log("Current scan logs:", scanLogs);
    }
  }, [open, patientId, scanLogs]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Patient Location History</SheetTitle>
          <SheetDescription>
            Ward scanning history for Patient ID: <span className="font-medium text-black">{patientId}</span>
          </SheetDescription>
        </SheetHeader>
        
        <SheetClose className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
        
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse text-gray-500">Loading scan logs...</div>
            </div>
          ) : scanLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Scanned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <Badge variant="outline">{log.ward}</Badge>
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
              <p className="text-gray-500">No scan logs found for this patient.</p>
              <p className="text-sm text-gray-400 mt-2">Logs will appear when the patient's QR code is scanned at a ward.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PatientScanLogs;
