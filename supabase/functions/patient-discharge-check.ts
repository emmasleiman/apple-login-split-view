
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Helper: PostgREST Webhook/Edge for patient early discharge notifications
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = await req.json();
  const { id, registration_date, discharge_date } = payload.record || {};

  // Evaluate only if both dates exist
  if (registration_date && discharge_date) {
    const regTs = new Date(registration_date).getTime();
    const disTs = new Date(discharge_date).getTime();
    // Check if discharge is within 5 min (300,000 ms)
    if (disTs - regTs <= 5 * 60 * 1000) {
      // Insert notification to patient_notifications
      const url = Deno.env.get("SUPABASE_URL") + "/rest/v1/patient_notifications";
      await fetch(url, {
        method: "POST",
        headers: {
          "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: id,
          notification_type: "early_discharge",
          message: "Patient discharged within 5 minutes of registration.",
        }),
      });
    }
  }
  return new Response("ok", { status: 200 });
});
