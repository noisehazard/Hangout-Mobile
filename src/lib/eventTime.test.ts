import { isLive, startLabel } from './eventTime';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const now = new Date(2026, 7, 16, 12, 0, 0).getTime();
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

describe('isLive', () => {
  it('is live once the start time has passed', () => {
    expect(isLive(at(-MIN), now)).toBe(true);
  });

  it('is not live before the start time', () => {
    expect(isLive(at(MIN), now)).toBe(false);
  });
});

describe('startLabel', () => {
  it('says Now for an event already under way', () => {
    expect(startLabel(at(-30 * MIN), now)).toBe('Now');
  });

  it('counts down in minutes under an hour', () => {
    expect(startLabel(at(45 * MIN), now)).toBe('in 45m');
  });

  it('counts down in hours and minutes later the same day', () => {
    expect(startLabel(at(3 * HOUR + 30 * MIN), now)).toBe('in 3h 30m');
  });

  it('drops the minutes on a whole number of hours', () => {
    expect(startLabel(at(3 * HOUR), now)).toBe('in 3h');
  });

  it('switches to an absolute weekday and time on a later day', () => {
    const label = startLabel(at(48 * HOUR), now);
    expect(label).not.toMatch(/^in /);
    expect(label).not.toBe('Now');
  });
});
