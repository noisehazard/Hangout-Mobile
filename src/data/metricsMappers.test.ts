import { MetricsRow, rowToMetrics } from './metrics';

const full = {
  live_per_day: '1.43',
  opens_with_event_pct: '74.0',
  other_hosts_14d: '3',
  repeat_attendance_pct: '38.5',
  joins_per_hangout: '2.60',
  events_14d: '11',
  opens_14d: '52',
} satisfies MetricsRow;

describe('rowToMetrics', () => {
  it('coerces postgres numerics to numbers', () => {
    const m = rowToMetrics(full);
    expect(m.livePerDay).toBe(1.43);
    expect(m.opensWithEventPct).toBe(74);
    expect(m.otherHosts14d).toBe(3);
    expect(m.repeatAttendancePct).toBe(38.5);
    expect(m.joinsPerHangout).toBe(2.6);
    expect(m.events14d).toBe(11);
    expect(m.opens14d).toBe(52);
  });

  it('keeps nulls as null so "no data" is distinguishable from zero', () => {
    const m = rowToMetrics({
      live_per_day: null,
      opens_with_event_pct: null,
      other_hosts_14d: null,
      repeat_attendance_pct: null,
      joins_per_hangout: null,
      events_14d: null,
      opens_14d: null,
    } satisfies MetricsRow);
    expect(m.opensWithEventPct).toBeNull();
    expect(m.repeatAttendancePct).toBeNull();
    expect(m.joinsPerHangout).toBeNull();
  });

  it('treats missing counts as zero', () => {
    const m = rowToMetrics({ ...full, other_hosts_14d: null, events_14d: null });
    expect(m.otherHosts14d).toBe(0);
    expect(m.events14d).toBe(0);
  });
});
