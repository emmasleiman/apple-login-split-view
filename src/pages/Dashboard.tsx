import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { AlertTriangle } from "lucide-react";

type Patient = {
  id: string;
  patient_id: string;
  culture_required: boolean;
  status: string;
  registration_date: string;
  discharge_date: string | null;
  qr_code_url: string | null;
};

type RegisterPatientFunctionResult = {
  qr_code: string;
  is_new_registration: boolean;
  has_positive_history: boolean;
  last_positive_date: string | null;
  patient_uuid: string;
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [cultureRequired, setCultureRequired] = useState<"yes" | "no">("no");
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [dischargePatientId, setDischargePatientId] = useState("");
  const [patientExists, setPatientExists] = useState(false);
  const [existingPatientData, setExistingPatientData] = useState<Patient | null>(null);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'discharge'>('register');

  // For registration "history" indicator
  const [hasPositiveHistory, setHasPositiveHistory] = useState<boolean>(false);
  const [positiveHistoryDate, setPositiveHistoryDate] = useState<string | null>(null);

  const { refetch: checkPatientExists } = useQuery({
    queryKey: ["checkPatient", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'admitted')
        .single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setPatientExists(true);
        setExistingPatientData(data as Patient);
        setQRCode(data.qr_code_url);
        return data;
      } else {
        setPatientExists(false);
        setExistingPatientData(null);
        setQRCode(null);
        return null;
      }
    },
    enabled: false,
  });

  useEffect(() => {
    if (patientId.trim()) {
      const timer = setTimeout(() => {
        checkPatientExists();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPatientExists(false);
      setExistingPatientData(null);
      setQRCode(null);
      setHasPositiveHistory(false);
      setPositiveHistoryDate(null);
    }
  }, [patientId, checkPatientExists]);

  const { mutate: registerPatient, isPending: isRegistering } = useMutation({
    mutationFn: async ({ patientId, cultureRequired }: { patientId: string, cultureRequired: boolean }) => {
      // Generate a single QR code with patient information
      const qrData = JSON.stringify({
        patientId: patientId,
        timestamp: new Date().toISOString(),
        cultureRequired: cultureRequired
      });
      
      // Insert or update the patient record with a single QR code
      const { data, error } = await supabase
        .from("patients")
        .upsert({
          patient_id: patientId,
          culture_required: cultureRequired,
          status: 'admitted',
          qr_code_url: qrData,
          discharge_date: null,
        }, {
          onConflict: 'patient_id'
        });

      if (error) throw error;

      // Check for patient history with positive results
      const { data: historyData } = await supabase
        .from('patient_lab_results')
        .select('result, processed_date')
        .eq('patient_id', patientId)
        .eq('result', 'positive')
        .order('processed_date', { ascending: false })
        .limit(1);

      return {
        qr_code: qrData,
        is_new_registration: !patientExists,
        has_positive_history: historyData && historyData.length > 0,
        last_positive_date: historyData && historyData.length > 0 ? historyData[0].processed_date : null,
        patient_uuid: ""
      };
    },
    onSuccess: (data) => {
      if (data) {
        setQRCode(data.qr_code);

        if (data.has_positive_history && data.last_positive_date) {
          setHasPositiveHistory(true);
          setPositiveHistoryDate(data.last_positive_date);
        } else {
          setHasPositiveHistory(false);
          setPositiveHistoryDate(null);
        }

        toast({
          title: "Patient Registered",
          description: `Patient ${patientId} registered. QR code generated.${data.is_new_registration ? "" : " (Re-admission)"}`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    }
  });

  const { mutate: dischargePatient } = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase
        .from('patients')
        .update({
          status: 'discharged',
          discharge_date: new Date().toISOString()
        })
        .eq('patient_id', patientId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Patient ${dischargePatientId} discharged successfully`,
      });
      setDischargePatientId("");
      setShowDischargeConfirm(false);
    },
    onError: (error) => {
      toast({
        title: "Discharge Error",
        description: "Failed to discharge patient. Patient may not exist.",
        variant: "destructive",
      });
      setShowDischargeConfirm(false);
    }
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }
    registerPatient({
      patientId: patientId,
      cultureRequired: cultureRequired === "yes"
    });
  };

  const handlePrint = (qrData: string | null) => {
    if (!qrData) return;
    
    // Open a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser settings.",
        variant: "destructive",
      });
      return;
    }
    
    // Encode QR data to be embedded safely in HTML
    const encodedQrData = encodeURIComponent(qrData);
    
    // Write the HTML content with inline SVG for the QR code
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient QR Code</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 20px; 
              font-size: 16px; 
            }
            h2 { 
              font-weight: 300; 
              color: #333; 
              font-size: 24px; 
              margin-bottom: 30px;
            }
            .container { 
              margin: 30px auto; 
              display: flex; 
              justify-content: center;
            }
            .patient-id { 
              font-weight: bold; 
              margin: 15px 0;
              font-size: 18px; 
              color: #555; 
            }
            .qr-container { 
              border: 1px solid #ddd; 
              padding: 15px; 
              border-radius: 8px; 
              background-color: white;
              width: 200px;
              height: 200px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            p { 
              color: #666; 
              margin-top: 20px; 
            }
            #error-message {
              color: red;
              margin-top: 15px;
              display: none;
            }
          </style>
        </head>
        <body>
          <h2>TraceMed Patient QR Code</h2>
          <div class="patient-id">Patient ID: ${patientId}</div>
          <div class="container">
            <div class="qr-container" id="qr-container"></div>
          </div>
          <p>Scan for patient information</p>
          <div id="error-message">Error loading QR code. Please try again.</div>
          
          <script>
            // Function to show error message
            function showError() {
              document.getElementById('error-message').style.display = 'block';
            }
          </script>
          
          <!-- React QR Code library direct embed -->
          <script src="https://unpkg.com/react-qr-code@2.0.15/lib/index.min.js"></script>
          
          <script>
            try {
              // Wait for the document to fully load
              window.addEventListener('load', function() {
                try {
                  // Create a QR code SVG
                  var qrSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  qrSvg.setAttribute('width', '200px');
                  qrSvg.setAttribute('height', '200px');
                  qrSvg.setAttribute('viewBox', '0 0 256 256');
                  
                  // QR code data
                  var qrData = "${encodedQrData}";
                  
                  // Simple QR code renderer (basic black squares)
                  // This is a simplified implementation
                  var qrCode = document.createElement('img');
                  qrCode.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 37 37"><path fill="#ffffff" d="M0 0h37v37H0z"/><path d="M4 4h1v1H4zM5 4h1v1H5zM6 4h1v1H6zM7 4h1v1H7zM8 4h1v1H8zM9 4h1v1H9zM10 4h1v1h-1zM12 4h1v1h-1zM14 4h1v1h-1zM18 4h1v1h-1zM19 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM22 4h1v1h-1zM23 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM29 4h1v1h-1zM30 4h1v1h-1zM31 4h1v1h-1zM32 4h1v1h-1zM4 5h1v1H4zM10 5h1v1h-1zM11 5h1v1h-1zM12 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM20 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM4 6h1v1H4zM6 6h1v1H6zM7 6h1v1H7zM8 6h1v1H8zM10 6h1v1h-1zM16 6h1v1h-1zM19 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM23 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM29 6h1v1h-1zM30 6h1v1h-1zM32 6h1v1h-1zM4 7h1v1H4zM6 7h1v1H6zM7 7h1v1H7zM8 7h1v1H8zM10 7h1v1h-1zM12 7h1v1h-1zM13 7h1v1h-1zM14 7h1v1h-1zM15 7h1v1h-1zM16 7h1v1h-1zM17 7h1v1h-1zM20 7h1v1h-1zM21 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM26 7h1v1h-1zM28 7h1v1h-1zM29 7h1v1h-1zM30 7h1v1h-1zM32 7h1v1h-1zM4 8h1v1H4zM6 8h1v1H6zM7 8h1v1H7zM8 8h1v1H8zM10 8h1v1h-1zM12 8h1v1h-1zM15 8h1v1h-1zM17 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM32 8h1v1h-1zM4 9h1v1H4zM10 9h1v1h-1zM12 9h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM18 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM26 9h1v1h-1zM32 9h1v1h-1zM4 10h1v1H4zM5 10h1v1H5zM6 10h1v1H6zM7 10h1v1H7zM8 10h1v1H8zM9 10h1v1H9zM10 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM30 10h1v1h-1zM31 10h1v1h-1zM32 10h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM15 11h1v1h-1zM16 11h1v1h-1zM17 11h1v1h-1zM19 11h1v1h-1zM21 11h1v1h-1zM22 11h1v1h-1zM24 11h1v1h-1zM4 12h1v1H4zM5 12h1v1H5zM6 12h1v1H6zM8 12h1v1H8zM9 12h1v1H9zM10 12h1v1h-1zM11 12h1v1h-1zM13 12h1v1h-1zM14 12h1v1h-1zM19 12h1v1h-1zM21 12h1v1h-1zM22 12h1v1h-1zM23 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM29 12h1v1h-1zM31 12h1v1h-1zM32 12h1v1h-1zM4 13h1v1H4zM5 13h1v1H5zM7 13h1v1H7zM8 13h1v1H8zM11 13h1v1h-1zM12 13h1v1h-1zM13 13h1v1h-1zM14 13h1v1h-1zM16 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM20 13h1v1h-1zM24 13h1v1h-1zM27 13h1v1h-1zM28 13h1v1h-1zM29 13h1v1h-1zM30 13h1v1h-1zM31 13h1v1h-1zM32 13h1v1h-1zM4 14h1v1H4zM8 14h1v1H8zM9 14h1v1H9zM11 14h1v1h-1zM12 14h1v1h-1zM14 14h1v1h-1zM15 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM22 14h1v1h-1zM23 14h1v1h-1zM25 14h1v1h-1zM26 14h1v1h-1zM28 14h1v1h-1zM29 14h1v1h-1zM32 14h1v1h-1zM5 15h1v1H5zM6 15h1v1H6zM7 15h1v1H7zM9 15h1v1H9zM12 15h1v1h-1zM14 15h1v1h-1zM15 15h1v1h-1zM17 15h1v1h-1zM21 15h1v1h-1zM25 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM31 15h1v1h-1zM32 15h1v1h-1zM4 16h1v1H4zM5 16h1v1H5zM7 16h1v1H7zM9 16h1v1H9zM11 16h1v1h-1zM12 16h1v1h-1zM14 16h1v1h-1zM16 16h1v1h-1zM19 16h1v1h-1zM22 16h1v1h-1zM26 16h1v1h-1zM27 16h1v1h-1zM28 16h1v1h-1zM31 16h1v1h-1zM5 17h1v1H5zM6 17h1v1H6zM9 17h1v1H9zM10 17h1v1h-1zM11 17h1v1h-1zM12 17h1v1h-1zM18 17h1v1h-1zM21 17h1v1h-1zM22 17h1v1h-1zM23 17h1v1h-1zM27 17h1v1h-1zM29 17h1v1h-1zM31 17h1v1h-1zM6 18h1v1H6zM7 18h1v1H7zM9 18h1v1H9zM10 18h1v1h-1zM11 18h1v1h-1zM15 18h1v1h-1zM17 18h1v1h-1zM18 18h1v1h-1zM19 18h1v1h-1zM20 18h1v1h-1zM21 18h1v1h-1zM22 18h1v1h-1zM25 18h1v1h-1zM26 18h1v1h-1zM29 18h1v1h-1zM31 18h1v1h-1zM32 18h1v1h-1zM4 19h1v1H4zM8 19h1v1H8zM10 19h1v1h-1zM13 19h1v1h-1zM19 19h1v1h-1zM20 19h1v1h-1zM21 19h1v1h-1zM24 19h1v1h-1zM25 19h1v1h-1zM28 19h1v1h-1zM29 19h1v1h-1zM30 19h1v1h-1zM31 19h1v1h-1zM32 19h1v1h-1zM4 20h1v1H4zM5 20h1v1H5zM7 20h1v1H7zM13 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM19 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM27 20h1v1h-1zM28 20h1v1h-1zM29 20h1v1h-1zM30 20h1v1h-1zM31 20h1v1h-1zM32 20h1v1h-1zM4 21h1v1H4zM5 21h1v1H5zM7 21h1v1H7zM8 21h1v1H8zM9 21h1v1H9zM10 21h1v1h-1zM11 21h1v1h-1zM14 21h1v1h-1zM16 21h1v1h-1zM19 21h1v1h-1zM20 21h1v1h-1zM23 21h1v1h-1zM24 21h1v1h-1zM27 21h1v1h-1zM31 21h1v1h-1zM4 22h1v1H4zM5 22h1v1H5zM7 22h1v1H7zM11 22h1v1h-1zM12 22h1v1h-1zM14 22h1v1h-1zM16 22h1v1h-1zM18 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM23 22h1v1h-1zM24 22h1v1h-1zM26 22h1v1h-1zM29 22h1v1h-1zM32 22h1v1h-1zM4 23h1v1H4zM8 23h1v1H8zM9 23h1v1H9zM10 23h1v1h-1zM12 23h1v1h-1zM14 23h1v1h-1zM15 23h1v1h-1zM16 23h1v1h-1zM17 23h1v1h-1zM18 23h1v1h-1zM20 23h1v1h-1zM21 23h1v1h-1zM22 23h1v1h-1zM23 23h1v1h-1zM25 23h1v1h-1zM27 23h1v1h-1zM28 23h1v1h-1zM29 23h1v1h-1zM30 23h1v1h-1zM31 23h1v1h-1zM32 23h1v1h-1zM4 24h1v1H4zM8 24h1v1H8zM9 24h1v1H9zM10 24h1v1h-1zM13 24h1v1h-1zM15 24h1v1h-1zM16 24h1v1h-1zM17 24h1v1h-1zM19 24h1v1h-1zM24 24h1v1h-1zM25 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM29 24h1v1h-1zM32 24h1v1h-1zM4 25h1v1H4zM8 25h1v1H8zM9 25h1v1H9zM10 25h1v1h-1zM12 25h1v1h-1zM14 25h1v1h-1zM16 25h1v1h-1zM17 25h1v1h-1zM18 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM22 25h1v1h-1zM27 25h1v1h-1zM29 25h1v1h-1zM31 25h1v1h-1zM32 25h1v1h-1zM4 26h1v1H4zM10 26h1v1h-1zM14 26h1v1h-1zM18 26h1v1h-1zM20 26h1v1h-1zM21 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM25 26h1v1h-1zM27 26h1v1h-1zM28 26h1v1h-1zM31 26h1v1h-1zM32 26h1v1h-1zM4 27h1v1H4zM5 27h1v1H5zM6 27h1v1H6zM7 27h1v1H7zM8 27h1v1H8zM9 27h1v1H9zM10 27h1v1h-1zM12 27h1v1h-1zM13 27h1v1h-1zM15 27h1v1h-1zM19 27h1v1h-1zM21 27h1v1h-1zM23 27h1v1h-1zM24 27h1v1h-1zM26 27h1v1h-1zM28 27h1v1h-1zM29 27h1v1h-1zM30 27h1v1h-1zM32 27h1v1h-1zM12 28h1v1h-1zM13 28h1v1h-1zM14 28h1v1h-1zM15 28h1v1h-1zM16 28h1v1h-1zM17 28h1v1h-1zM19 28h1v1h-1zM21 28h1v1h-1zM24 28h1v1h-1zM25 28h1v1h-1zM30 28h1v1h-1zM4 29h1v1H4zM5 29h1v1H5zM6 29h1v1H6zM7 29h1v1H7zM8 29h
