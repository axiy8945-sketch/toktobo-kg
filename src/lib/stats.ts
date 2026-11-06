// Окуу статистикасын reading_days таблицасынан эсептөө (чыныгы маалымат гана)

export interface DayRow { day: string; seconds: number }

export function localDay(d = new Date()) {
  // Кыргызстан убактысы (UTC+6) боюнча күн
  const z = new Date(d.getTime() + 6 * 3600_000);
  return z.toISOString().slice(0, 10);
}

function shift(day: string, n: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function computeStats(rows: DayRow[], goal: number) {
  const map = new Map(rows.map((r) => [r.day, r.seconds]));
  const today = localDay();
  const todayMin = Math.floor((map.get(today) ?? 0) / 60);

  let cur = (map.get(today) ?? 0) >= 60 ? today : shift(today, -1);
  let streak = 0;
  while ((map.get(cur) ?? 0) >= 60) { streak++; cur = shift(cur, -1); }

  const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7; // 0 = дүйшөмбү
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = shift(today, i - dow);
    return { day, min: Math.floor((map.get(day) ?? 0) / 60), today: i === dow };
  });
  const month = today.slice(0, 7);
  const monthMin = Math.floor(rows.filter((r) => r.day.startsWith(month)).reduce((a, r) => a + r.seconds, 0) / 60);
  const totalMin = Math.floor(rows.reduce((a, r) => a + r.seconds, 0) / 60);
  const goalHit = rows.some((r) => r.seconds >= goal * 60);
  let last7Min = 0;
  for (let i = 0; i < 7; i++) last7Min += Math.floor((map.get(shift(today, -i)) ?? 0) / 60);
  return { todayMin, streak, week, monthMin, totalMin, goalHit, last7Min };
}
