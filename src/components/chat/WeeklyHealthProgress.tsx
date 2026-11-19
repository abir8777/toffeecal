import { Activity, MessageCircleQuestion, Stethoscope } from 'lucide-react';
import type { DoctorDayStat } from '@/lib/doctor-health';

export function WeeklyHealthProgress({
  week,
  symptomCount,
  followUpCount,
  trackedDays,
}: {
  week: DoctorDayStat[];
  symptomCount: number;
  followUpCount: number;
  trackedDays: number;
}) {
  const progress = Math.round((trackedDays / 7) * 100);

  return (
    <section aria-label="Doctor weekly health tracker" className="mx-4 mt-2 rounded-xl border border-border bg-card px-3 py-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold text-foreground">This week</h2>
        <span className="ml-auto text-xs text-muted-foreground">{trackedDays}/7 days</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Activity className="h-4 w-4 text-accent" />
          <span>{symptomCount} symptoms logged</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
          <span>{followUpCount} follow-ups answered</span>
        </div>
      </div>
      <div className="mt-3" role="progressbar" aria-label="Days with a health check-in this week" aria-valuemin={0} aria-valuemax={7} aria-valuenow={trackedDays}>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-1" aria-hidden="true">
        {week.map((day) => (
          <span key={day.date} className={`flex-1 text-center text-[10px] ${day.symptoms + day.followUps > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
            {day.label}
          </span>
        ))}
      </div>
    </section>
  );
}