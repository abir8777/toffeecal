import { describe, it, expect } from 'vitest';
import { buildWeek, goalsReached } from './activity';

const today = new Date(2026, 9, 18, 12);

describe('weekly activity', () => {
  it('sums entries per day and counts goals reached', () => {
    const week = buildWeek(
      [
        { steps: 5000, calories_burned: 200, logged_at: new Date(2026, 9, 18, 8).toISOString() },
        { steps: 3500, calories_burned: 150, logged_at: new Date(2026, 9, 18, 18).toISOString() },
        { steps: 2000, calories_burned: 400, logged_at: new Date(2026, 9, 17, 9).toISOString() },
        { steps: 99999, calories_burned: 999, logged_at: new Date(2026, 9, 1).toISOString() },
      ],
      today
    );
    expect(week).toHaveLength(7);
    expect(week[6].steps).toBe(8500);
    expect(week[6].calories).toBe(350);
    expect(goalsReached(week)).toBe(3); // today: steps+burn, yesterday: burn
  });
});
