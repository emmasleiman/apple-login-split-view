
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const payload = await req.json();
  // { new_scan: scan row, patient_row: patient row }
  const { new_scan, patient_row } = payload;

  // Ensure required info exists and patient is discharged
  if (
    patient_row &&
    patient_row.status === "discharged" &&
    new_scan &&
    new_scan.ward
  ) {
    // Insert new notification
    const url = Deno.env.get("SUPABASE_URL") + "/rest/v1/patient_notifications";
    await fetch(url, {
      method: "POST",
      headers: {
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: patient_row.id,
        ward: new_scan.ward,
        notification_type: "qr_code_scan_after_discharge",
        message: `Patient's QR code scanned after discharge. Please get to this ward`,
      }),
    });
  }
  return new Response("ok", { status: 200 });
});
