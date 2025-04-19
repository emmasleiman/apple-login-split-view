
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type LocationInconsistency = {
  id: string;
  patient_id: string;
  first_ward: string;
  second_ward: string;
  time_difference_mins: number;
  detected_at: string;
  cleared: boolean;
  cleared_by: string | null;
  cleared_at: string | null;
  notes: string | null;
}

export const LocationInconsistencyAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: inconsistencies, isLoading } = useQuery({
    queryKey: ['location-inconsistencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_location_inconsistencies')
        .select('*')
        .eq('cleared', false)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data as LocationInconsistency[];
    }
  });

  const clearInconsistency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_location_inconsistencies')
        .update({
          cleared: true,
          cleared_at: new Date().toISOString(),
          cleared_by: 'Administrator'
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inconsistencies'] });
      toast({
        title: "Success",
        description: "Location inconsistency marked as resolved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to resolve inconsistency. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Patient Location Inconsistencies</CardTitle>
      </CardHeader>
      <CardContent>
        {inconsistencies && inconsistencies.length > 0 ? (
          <div className="space-y-4">
            {inconsistencies.map((inconsistency) => (
              <div
                key={inconsistency.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
              >
                <div className="space-y-1">
                  <p className="font-medium">Patient ID: {inconsistency.patient_id}</p>
                  <p className="text-sm text-gray-500">
                    File located in: {inconsistency.first_ward}
                  </p>
                  <p className="text-sm text-gray-500">
                    Patient scanned at: {inconsistency.second_ward}
                  </p>
                  <p className="text-sm text-gray-500">
                    Detected: {new Date(inconsistency.detected_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearInconsistency.mutate(inconsistency.id)}
                  disabled={clearInconsistency.isPending}
                  className="gap-2"
                >
                  {clearInconsistency.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Clear
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No location inconsistencies detected</p>
        )}
      </CardContent>
    </Card>
  );
};
