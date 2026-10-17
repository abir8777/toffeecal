export const DAILY_STEP_GOAL = 8000;
export const DAILY_BURN_GOAL = 300;

export interface ActivityRow {
  steps: number;
  calories_burned: number;
  logged_at: string;
}

export interface DayStat {
  date: string; // YYYY-MM-DD (local)
  label: string;
  steps: number;
  calories: number;
  stepGoalMet: boolean;
  burnGoalMet: boolean;
}

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Build the last 7 days (oldest first, ending today) from activity rows. */
export function buildWeek(rows: ActivityRow[], today = new Date()): DayStat[] {
  const days: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({
      date: key(d),
      label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
      steps: 0,
      calories: 0,
      stepGoalMet: false,
      burnGoalMet: false,
    });
  }
  const map = new Map(days.map((d) => [d.date, d]));
  for (const r of rows) {
    const d = map.get(key(new Date(r.logged_at)));
    if (!d) continue;
    d.steps += r.steps;
    d.calories += r.calories_burned;
  }
  for (const d of days) {
    d.stepGoalMet = d.steps >= DAILY_STEP_GOAL;
    d.burnGoalMet = d.calories >= DAILY_BURN_GOAL;
  }
  return days;
}

/** A goal "reached" = each day the step goal is met plus each day the burn goal is met (max 14/week). */
export function goalsReached(week: DayStat[]): number {
  return week.reduce((n, d) => n + (d.stepGoalMet ? 1 : 0) + (d.burnGoalMet ? 1 : 0), 0);
}
