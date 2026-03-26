import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  description: string;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export function useWeeklyMealPlan() {
  const [mealPlan, setMealPlan] = useState<DayPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (cuisinePreference: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-meal-plan', {
        body: { cuisinePreference },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setMealPlan(data.mealPlan);
    } catch (err: any) {
      console.error('Meal plan error:', err);
      setError(err.message || 'Failed to generate meal plan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mealPlan, isLoading, error, generatePlan };
}
