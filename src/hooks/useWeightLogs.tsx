import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WeightLog } from '@/types';

export function useWeightLogs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['weight-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as WeightLog[];
    },
    enabled: !!user,
  });

  const addWeightLog = useMutation({
    mutationFn: async (weight_kg: number) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('weight_logs')
        .insert({
          user_id: user.id,
          weight_kg,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Also update profile weight
      await supabase
        .from('profiles')
        .update({ weight_kg })
        .eq('user_id', user.id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    logs,
    isLoading,
    error,
    addWeightLog: addWeightLog.mutate,
    isAdding: addWeightLog.isPending,
  };
}
