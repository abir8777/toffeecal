import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCuisine, setCurrentCuisine] = useState<string | null>(null);

  // Load saved plan on mount
  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoadingSaved(false); return; }

        const { data, error } = await supabase
          .from('saved_meal_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && data) {
          setMealPlan(data.plan_data as unknown as DayPlan[]);
          setCurrentCuisine(data.cuisine);
        }
      } catch (err) {
        console.error('Failed to load saved plan:', err);
      } finally {
        if (!cancelled) setIsLoadingSaved(false);
      }
    }
    loadSaved();
    return () => { cancelled = true; };
  }, []);

  const generatePlan = useCallback(async (cuisinePreference: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentCuisine(cuisinePreference);

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

  const savePlan = useCallback(async () => {
    if (!mealPlan || !currentCuisine) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('saved_meal_plans').insert({
        user_id: user.id,
        cuisine: currentCuisine,
        plan_data: mealPlan as any,
      });
      if (error) throw error;
      toast.success('Meal plan saved!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save meal plan');
    } finally {
      setIsSaving(false);
    }
  }, [mealPlan, currentCuisine]);

  return { mealPlan, isLoading, isLoadingSaved, isSaving, error, generatePlan, savePlan, currentCuisine };
}
