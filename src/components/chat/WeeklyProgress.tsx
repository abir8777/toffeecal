import { useState } from 'react';
import { Footprints, Flame, Trophy, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAILY_STEP_GOAL, DayStat, goalsReached } from '@/lib/activity';

export function WeeklyProgress({ week }: { week: DayStat[] }) {
  const [open, setOpen] = useState(false);
  const steps = week.reduce((s, d) => s + d.steps, 0);
  const cals = week.reduce((s, d) => s + d.calories, 0);
  const goals = goalsReached(week);
  const max = Math.max(DAILY_STEP_GOAL, ...week.map((d) => d.steps));

  return (
    <div className="mx-4 mt-2 rounded-2xl border border-border bg-card flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-foreground">This week</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Flame className="w-3.5 h-3.5 text-accent" />{cals.toLocaleString()} kcal</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Footprints className="w-3.5 h-3.5 text-primary" />{steps.toLocaleString()}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Trophy className="w-3.5 h-3.5 text-primary" />{goals}/14</span>
        <ChevronDown className={cn('w-4 h-4 ml-auto text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="flex items-end justify-between gap-1.5 h-20">
            {week.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className={cn('w-full rounded-md', d.stepGoalMet ? 'bg-primary' : 'bg-primary/30')}
                  style={{ height: `${Math.max(4, (d.steps / max) * 100)}%` }}
                  title={`${d.steps} steps, ${d.calories} kcal`}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}{d.burnGoalMet ? '🔥' : ''}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Goals: {DAILY_STEP_GOAL.toLocaleString()} steps & 300 kcal burned per day. Tell Coach what you did ("walked 5000 steps") or send a fitness-tracker screenshot to log it.
          </p>
        </div>
      )}
    </div>
  );
}
