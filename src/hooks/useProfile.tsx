import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, OnboardingData } from '@/types';
import { calculateDailyCalories } from '@/lib/calories';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<OnboardingData> & { onboarding_completed?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Calculate daily calorie target if we have enough data
      let daily_calorie_target = profile?.daily_calorie_target;
      if (data.age && data.gender && data.height_cm && data.weight_kg && data.activity_level && data.goal) {
        daily_calorie_target = calculateDailyCalories(data as OnboardingData);
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          daily_calorie_target,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
}
