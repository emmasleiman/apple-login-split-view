
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Notification = {
  id: string;
  patient_id: string;
  notification_type: string;
  ward?: string | null;
  message: string;
  is_cleared: boolean;
  created_at: string;
  cleared_at?: string | null;
};

export default function AdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["patient_notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_notifications")
        .select("*")
        .order("created_at", { ascending: false }) as { data: Notification[], error: any };
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (notifId: string) => {
      setLoadingId(notifId);
      const { error } = await supabase
        .from("patient_notifications")
        .update({ is_cleared: true, cleared_at: new Date().toISOString() })
        .eq("id", notifId)
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient_notifications"] });
      setLoadingId(null);
      toast({ title: "Notification cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear notification", variant: "destructive" });
      setLoadingId(null);
    }
  });

  // Function to get badge styling based on notification type
  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "early_discharge":
        return { variant: "destructive" as const, label: "Early Discharge", icon: <AlertTriangle className="w-3 h-3 mr-1" /> };
      case "scan_after_discharge":
        return { variant: "outline" as const, label: "Scan After Discharge", icon: null };
      case "location_inconsistency":
        return { variant: "warning" as const, label: "Location Inconsistency", icon: <AlertTriangle className="w-3 h-3 mr-1" /> };
      default:
        return { variant: "outline" as const, label: type, icon: null };
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Patient Discharge & QR Scan Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {notifications.length === 0 && <div className="text-gray-500 py-6 text-center">No notifications.</div>}

            {notifications.map(notif => {
              const badgeInfo = getNotificationBadge(notif.notification_type);
              
              return (
                <div
                  key={notif.id}
                  className={`flex flex-col md:flex-row md:justify-between items-start md:items-center border border-gray-200 rounded-lg p-4 ${notif.is_cleared ? "opacity-60" : ""} ${
                    notif.notification_type === "location_inconsistency" && !notif.is_cleared ? "bg-yellow-50" : ""
                  }`}
                >
                  <div>
                    <div className="text-base">
                      <Badge variant={badgeInfo.variant} className="inline-flex items-center">
                        {badgeInfo.icon}
                        {badgeInfo.label}
                      </Badge>
                      <span className="ml-2">{notif.message}</span>
                    </div>
                    <div className="text-sm text-gray-500">Patient ID: {notif.patient_id}</div>
                    {notif.ward && (
                      <div className="text-sm text-blue-700 mt-1">
                        Ward: {notif.ward}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">Created {format(new Date(notif.created_at), "PPpp")}</div>
                    {notif.is_cleared && notif.cleared_at && (
                      <div className="text-xs text-green-600">Cleared at: {format(new Date(notif.cleared_at), "PPpp")}</div>
                    )}
                  </div>
                  {!notif.is_cleared && (
                    <Button
                      variant="secondary"
                      className="mt-4 md:mt-0"
                      onClick={() => mutation.mutate(notif.id)}
                      disabled={loadingId === notif.id}
                    >
                      {loadingId === notif.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Clear
                        </>
                      )}
                    </Button>
                  )}
                  {notif.is_cleared && <Badge variant="outline" className="ml-6">Cleared</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
