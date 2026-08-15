export type RepeatOption = { label: string; startsAt: Date };

export function repeatOptions(from: Date, now: Date = new Date()): RepeatOption[] {
  const base = from.getTime() > now.getTime() ? from : now;

  const nextWeek = new Date(from);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const tomorrow = new Date(from);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getTime() <= now.getTime()) {
    tomorrow.setTime(new Date(base).setDate(new Date(base).getDate() + 1));
  }

  return [
    { label: 'Tomorrow, same time', startsAt: tomorrow },
    { label: 'Next week, same time', startsAt: nextWeek },
  ].filter((o) => o.startsAt.getTime() > now.getTime());
}
