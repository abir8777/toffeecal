import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { FoodLog, DailySummary } from '@/types';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';

export function useFoodLogs(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['food-logs', user?.id, format(targetDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay(targetDate).toISOString())
        .lte('logged_at', endOfDay(targetDate).toISOString())
        .order('logged_at', { ascending: true });
      
      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!user,
  });

  const addFoodLog = useMutation({
    mutationFn: async (log: Omit<FoodLog, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          ...log,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', user?.id] });
    },
  });

  const deleteFoodLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', user?.id] });
    },
  });

  // Calculate daily summary
  const dailySummary: DailySummary = {
    date: format(targetDate, 'yyyy-MM-dd'),
    total_calories: logs?.reduce((sum, log) => sum + log.calories, 0) || 0,
    total_protein: logs?.reduce((sum, log) => sum + Number(log.protein_g), 0) || 0,
    total_carbs: logs?.reduce((sum, log) => sum + Number(log.carbs_g), 0) || 0,
    total_fat: logs?.reduce((sum, log) => sum + Number(log.fat_g), 0) || 0,
    meals: logs || [],
  };

  return {
    logs,
    isLoading,
    error,
    dailySummary,
    addFoodLog: addFoodLog.mutate,
    deleteFoodLog: deleteFoodLog.mutate,
    isAdding: addFoodLog.isPending,
  };
}

export function useWeeklySummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-summary', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date();
      const weekAgo = subDays(today, 7);
      
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay(weekAgo).toISOString())
        .lte('logged_at', endOfDay(today).toISOString())
        .order('logged_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by date
      const grouped = (data as FoodLog[]).reduce((acc, log) => {
        const date = format(new Date(log.logged_at), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = {
            date,
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            meals: [],
          };
        }
        acc[date].total_calories += log.calories;
        acc[date].total_protein += Number(log.protein_g);
        acc[date].total_carbs += Number(log.carbs_g);
        acc[date].total_fat += Number(log.fat_g);
        acc[date].meals.push(log);
        return acc;
      }, {} as Record<string, DailySummary>);
      
      return Object.values(grouped);
    },
    enabled: !!user,
  });
}
