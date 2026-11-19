import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildDoctorHealthWeek, classifyDoctorEvent, type DoctorHealthRow } from '@/lib/doctor-health';
import { toast } from 'sonner';

export function useDoctorHealthLogs(userId?: string) {
  const [rows, setRows] = useState<DoctorHealthRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      return;
    }
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);
    const { data, error } = await supabase
      .from('doctor_health_events')
      .select('event_type, logged_at')
      .gte('logged_at', since.toISOString());

    if (error) {
      console.error('[doctor health] load error', error);
      return;
    }
    setRows((data ?? []) as DoctorHealthRow[]);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const recordMessage = useCallback(async (message: string, hasImage: boolean, latestAssistantMessage: string) => {
    if (!userId) return;
    const eventType = classifyDoctorEvent(message, hasImage, latestAssistantMessage);
    if (!eventType) return;

    const { error } = await supabase
      .from('doctor_health_events')
      .insert({ user_id: userId, event_type: eventType });
    if (error) {
      console.error('[doctor health] save error', error);
      toast.error('Could not update your Doctor weekly tracker.');
      return;
    }
    await load();
  }, [load, userId]);

  const week = useMemo(() => buildDoctorHealthWeek(rows), [rows]);
  const symptomCount = week.reduce((total, day) => total + day.symptoms, 0);
  const followUpCount = week.reduce((total, day) => total + day.followUps, 0);
  const trackedDays = week.filter((day) => day.symptoms + day.followUps > 0).length;

  return { week, symptomCount, followUpCount, trackedDays, recordMessage };
}