export type StatsPeriod = 'day' | 'week' | 'month';

export const toBucketKey = (d: Date, period: StatsPeriod) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  if (period === 'month') return `${y}-${m}`;
  if (period === 'day') return `${y}-${m}-${day}`;

  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const ww = String(weekNo).padStart(2, '0');
  return `${date.getUTCFullYear()}-W${ww}`;
};

