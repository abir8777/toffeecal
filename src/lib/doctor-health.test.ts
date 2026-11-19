import { describe, expect, it } from 'vitest';
import { buildDoctorHealthWeek, classifyDoctorEvent } from './doctor-health';

describe('Doctor weekly health tracking', () => {
  it('counts symptom check-ins and answered follow-ups across the last seven days', () => {
    const week = buildDoctorHealthWeek(
      [
        { event_type: 'symptom', logged_at: new Date(2026, 9, 18, 8).toISOString() },
        { event_type: 'follow_up_answer', logged_at: new Date(2026, 9, 18, 9).toISOString() },
        { event_type: 'symptom', logged_at: new Date(2026, 9, 17, 10).toISOString() },
        { event_type: 'symptom', logged_at: new Date(2026, 9, 1).toISOString() },
      ],
      new Date(2026, 9, 18, 12)
    );

    expect(week).toHaveLength(7);
    expect(week[6].symptoms).toBe(1);
    expect(week[6].followUps).toBe(1);
    expect(week[5].symptoms).toBe(1);
    expect(week.reduce((total, day) => total + day.symptoms, 0)).toBe(2);
  });

  it('records symptom reports, images, and answers to a Doctor follow-up question', () => {
    expect(classifyDoctorEvent('I have a headache', false)).toBe('symptom');
    expect(classifyDoctorEvent('', true)).toBe('symptom');
    expect(classifyDoctorEvent('It started yesterday', false, 'How long has it been hurting?')).toBe('follow_up_answer');
    expect(classifyDoctorEvent('What should I eat today?', false)).toBeNull();
  });
});