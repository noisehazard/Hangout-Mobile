export function isLive(startIso: string, now: number = Date.now()): boolean {
  return Date.parse(startIso) <= now;
}

export function startLabel(startIso: string, now: number = Date.now()): string {
  const start = Date.parse(startIso);
  if (start <= now) return 'Now';

  const minutes = Math.round((start - now) / 60000);
  if (minutes < 60) return `in ${minutes}m`;

  const startDate = new Date(start);
  const sameDay = new Date(now).toDateString() === startDate.toDateString();
  if (sameDay) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
  }

  return startDate.toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
