
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type UnauthorizedAttempt = {
  id: string;
  ward_name: string;
  device_info: string | null;
  attempt_time: string;
  cleared: boolean;
  cleared_at: string | null;
  cleared_by: string | null;
}

export const UnauthorizedLoginAttempts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['unauthorized-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unauthorized_login_attempts')
        .select('*')
        .eq('cleared', false)
        .order('attempt_time', { ascending: false });

      if (error) throw error;
      return data as UnauthorizedAttempt[];
    }
  });

  const clearAttempt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unauthorized_login_attempts')
        .update({
          cleared: true,
          cleared_at: new Date().toISOString(),
          cleared_by: 'IT Officer'
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unauthorized-attempts'] });
      toast({
        title: "Success",
        description: "Attempt marked as cleared.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear attempt. Please try again.",
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
        <CardTitle className="text-lg font-medium">Unauthorized Login Attempts</CardTitle>
      </CardHeader>
      <CardContent>
        {attempts && attempts.length > 0 ? (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
              >
                <div className="space-y-1">
                  <p className="font-medium">{attempt.ward_name}</p>
                  <p className="text-sm text-gray-500">
                    Device: {attempt.device_info || 'Unknown device'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Attempted: {new Date(attempt.attempt_time).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearAttempt.mutate(attempt.id)}
                  disabled={clearAttempt.isPending}
                  className="gap-2"
                >
                  {clearAttempt.isPending ? (
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
          <p className="text-center text-gray-500 py-4">No unauthorized login attempts</p>
        )}
      </CardContent>
    </Card>
  );
};
