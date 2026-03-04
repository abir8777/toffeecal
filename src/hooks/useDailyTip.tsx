import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDailyTip() {
  const { user } = useAuth();
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTip = useCallback(async () => {
    if (!user) {
      setTip(null);
      setIsLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily-tip-${today}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setTip(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-tip');
      if (error) throw error;

      const newTip = data?.tip || null;
      if (newTip) {
        localStorage.setItem(cacheKey, newTip);
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('daily-tip-') && key !== cacheKey) {
            localStorage.removeItem(key);
          }
        });
      }
      setTip(newTip);
    } catch (err) {
      console.error('Failed to fetch daily tip:', err);
      setTip(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTip();
  }, [fetchTip]);

  return { tip, isLoading, refresh: fetchTip };
}
