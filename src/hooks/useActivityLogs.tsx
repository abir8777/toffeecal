import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityRow, buildWeek } from '@/lib/activity';
import { toast } from 'sonner';

export function useActivityLogs(userId?: string) {
  const [rows, setRows] = useState<ActivityRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('steps, calories_burned, logged_at')
      .gte('logged_at', since.toISOString());
    if (error) console.error('[activity] load error', error);
    else setRows(data ?? []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  /** Ask AI to pull activity out of a Coach message/photo and log it. */
  const extractFrom = useCallback(async (message: string, imageBase64?: string) => {
    if (!userId) return;
    const { data, error } = await supabase.functions.invoke('extract-activity', {
      body: { message, imageBase64 },
    });
    if (error) { console.error('[activity] extract error', error); return; }
    if (data?.logged) {
      const r = data.logged;
      toast.success(`Logged ${r.activity}: ${r.steps.toLocaleString()} steps, ${r.calories_burned} kcal`);
      load();
    }
  }, [userId, load]);

  const week = useMemo(() => buildWeek(rows), [rows]);
  return { week, extractFrom };
}
