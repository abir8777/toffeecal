import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay } from 'date-fns';

export interface WaterIntakeLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

export function useWaterIntake() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();

  const { data: todayLogs, isLoading } = useQuery({
    queryKey: ['water-intake', user?.id, today.toDateString()],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('water_intake')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay(today).toISOString())
        .lte('logged_at', endOfDay(today).toISOString())
        .order('logged_at', { ascending: false });
      
      if (error) throw error;
      return data as WaterIntakeLog[];
    },
    enabled: !!user,
  });

  const totalToday = todayLogs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;

  const addWaterIntake = useMutation({
    mutationFn: async (amount_ml: number) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-intake', user?.id] });
    },
  });

  const deleteWaterIntake = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('water_intake')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-intake', user?.id] });
    },
  });

  return {
    todayLogs,
    totalToday,
    isLoading,
    addWaterIntake: addWaterIntake.mutate,
    deleteWaterIntake: deleteWaterIntake.mutate,
    isAdding: addWaterIntake.isPending,
  };
}

// Calculate AI-recommended water goal based on weight
export function calculateWaterGoal(weightKg: number | null | undefined): number {
  if (!weightKg) return 2500; // default
  // General recommendation: 30-35ml per kg of body weight
  return Math.round(weightKg * 33);
}
