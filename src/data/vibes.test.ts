import { filterEventsByVibe, VIBES } from './vibes';

type E = { id: string; theme: string | null };
const events: E[] = [
  { id: 'a', theme: 'Sports' },
  { id: 'b', theme: 'Food' },
  { id: 'c', theme: 'Sports' },
  { id: 'd', theme: null },
];

describe('filterEventsByVibe', () => {
  it('returns all events when vibe is null', () => {
    expect(filterEventsByVibe(events, null)).toHaveLength(4);
  });

  it('returns only events matching the vibe', () => {
    expect(filterEventsByVibe(events, 'Sports').map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('excludes events with a null theme when a vibe is active', () => {
    expect(filterEventsByVibe(events, 'Food').map((e) => e.id)).toEqual(['b']);
  });
});

describe('VIBES', () => {
  it('is the fixed set of six vibes', () => {
    expect(VIBES).toEqual(['Drinks', 'Sports', 'Coffee', 'Music', 'Food', 'Chill']);
  });
});
