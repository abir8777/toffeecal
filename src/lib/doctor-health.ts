export type DoctorHealthEventType = 'symptom' | 'follow_up_answer';

export interface DoctorHealthRow {
  event_type: DoctorHealthEventType;
  logged_at: string;
}

export interface DoctorDayStat {
  date: string;
  label: string;
  symptoms: number;
  followUps: number;
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function classifyDoctorEvent(
  message: string,
  hasImage: boolean,
  latestAssistantMessage = ''
): DoctorHealthEventType | null {
  if (latestAssistantMessage.includes('?') && message.trim()) return 'follow_up_answer';

  const symptomPattern = /\b(pain|hurt|ache|fever|rash|itch|swelling|swollen|bleed|cough|sore|dizzy|nausea|vomit|tired|fatigue|finger|skin|headache|stomach|chest|breath|symptom|injury|wound|feeling|feel|mujhe|mera|meri|dard|bukhar|khujli|sujan|jwala|aswa|ব্যথা|জ্বর)\b/i;
  if (hasImage || symptomPattern.test(message)) return 'symptom';
  return null;
}

/** Build the last seven local calendar days, oldest first. */
export function buildDoctorHealthWeek(rows: DoctorHealthRow[], today = new Date()): DoctorDayStat[] {
  const days: DoctorDayStat[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    days.push({
      date: dateKey(date),
      label: date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
      symptoms: 0,
      followUps: 0,
    });
  }

  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const row of rows) {
    const day = byDate.get(dateKey(new Date(row.logged_at)));
    if (!day) continue;
    if (row.event_type === 'symptom') day.symptoms += 1;
    if (row.event_type === 'follow_up_answer') day.followUps += 1;
  }
  return days;
}