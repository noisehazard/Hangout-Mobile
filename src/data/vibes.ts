export const VIBES = ['Drinks', 'Sports', 'Coffee', 'Music', 'Food', 'Chill'] as const;

export type Vibe = (typeof VIBES)[number];

export function filterEventsByVibe<T extends { theme: string | null }>(
  events: T[],
  vibe: string | null,
): T[] {
  if (!vibe) return events;
  return events.filter((e) => e.theme === vibe);
}
