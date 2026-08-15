import { formatMetricsMail, toLines, type MetricsRow } from './format.ts';

const row: MetricsRow = {
  live_per_day: '1.43',
  opens_with_event_pct: '74.0',
  other_hosts_14d: '3',
  repeat_attendance_pct: '38.5',
  joins_per_hangout: '2.60',
  events_14d: '11',
  opens_14d: '52',
};

describe('toLines', () => {
  it('coerces postgres numeric strings', () => {
    const lines = toLines(row);
    expect(lines[0].value).toBe(1.43);
    expect(lines[1].value).toBe(74);
  });

  it('keeps null where there is no data', () => {
    const lines = toLines({ ...row, joins_per_hangout: null });
    expect(lines[4].value).toBeNull();
  });
});

describe('formatMetricsMail', () => {
  it('counts how many targets were met in the subject', () => {
    expect(formatMetricsMail(row).subject).toContain('3/5');
  });

  it('calls out zero other hosts as the number to move', () => {
    const mail = formatMetricsMail({ ...row, other_hosts_14d: '0' });
    expect(mail.text).toContain('Nobody but you has hosted');
  });

  it('acknowledges when the host target is met', () => {
    expect(formatMetricsMail(row).text).toContain('being met');
  });

  it('renders a dash rather than zero for missing data', () => {
    const mail = formatMetricsMail({ ...row, repeat_attendance_pct: null });
    expect(mail.text).toContain('—');
  });
});
