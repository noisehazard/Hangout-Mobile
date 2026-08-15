import { repeatOptions } from './repeat';

const now = new Date(2026, 7, 16, 12, 0, 0);

describe('repeatOptions', () => {
  it('offers tomorrow and next week for an upcoming hangout', () => {
    const from = new Date(2026, 7, 16, 19, 0, 0);
    const opts = repeatOptions(from, now);
    expect(opts.map((o) => o.label)).toEqual([
      'Tomorrow, same time',
      'Next week, same time',
    ]);
  });

  it('keeps the time of day when moving to next week', () => {
    const from = new Date(2026, 7, 16, 19, 30, 0);
    const next = repeatOptions(from, now)[1].startsAt;
    expect(next.getHours()).toBe(19);
    expect(next.getMinutes()).toBe(30);
    expect(next.getDate()).toBe(23);
  });

  it('never offers a start time in the past', () => {
    const from = new Date(2026, 6, 1, 19, 0, 0);
    for (const o of repeatOptions(from, now)) {
      expect(o.startsAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('still offers next week for a hangout that already happened', () => {
    const from = new Date(2026, 7, 14, 19, 0, 0);
    const labels = repeatOptions(from, now).map((o) => o.label);
    expect(labels).toContain('Next week, same time');
  });
});
