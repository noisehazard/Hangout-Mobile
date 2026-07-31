import { timeAgo } from './timeAgo';

const now = new Date('2026-07-27T12:00:00.000Z');

describe('timeAgo', () => {
  it('shows "just now" under a minute', () => {
    expect(timeAgo('2026-07-27T11:59:30.000Z', now)).toBe('just now');
  });
  it('shows minutes', () => {
    expect(timeAgo('2026-07-27T11:45:00.000Z', now)).toBe('15m');
  });
  it('shows hours', () => {
    expect(timeAgo('2026-07-27T09:00:00.000Z', now)).toBe('3h');
  });
  it('shows days', () => {
    expect(timeAgo('2026-07-25T12:00:00.000Z', now)).toBe('2d');
  });
});
