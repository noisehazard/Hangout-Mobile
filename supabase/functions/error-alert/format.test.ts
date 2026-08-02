import { formatCrashMail, formatDigestMail, type DigestRow, type ErrorRow } from './format';

const crash: ErrorRow = {
  tag: 'unhandled',
  code: null,
  message: "Cannot read property 'id' of undefined",
  fatal: true,
  app_version: '1.0.0',
  os_name: 'Android',
  os_version: '15',
  device_model: 'Pixel 6',
  created_at: '2026-08-03T10:00:00.000Z',
};

describe('formatCrashMail', () => {
  it('names the tag in the subject', () => {
    expect(formatCrashMail(crash).subject).toBe('[HangoutAI] Crash in unhandled');
  });

  it('includes the message and device context', () => {
    const { text } = formatCrashMail(crash);
    expect(text).toContain("Cannot read property 'id' of undefined");
    expect(text).toContain('Pixel 6 · Android 15 · app 1.0.0');
  });

  it('survives missing device fields', () => {
    const bare = {
      ...crash,
      app_version: null,
      os_name: null,
      os_version: null,
      device_model: null,
      message: null,
    };
    expect(formatCrashMail(bare).text).toContain('unknown device');
    expect(formatCrashMail(bare).text).toContain('(none)');
  });
});

describe('formatDigestMail', () => {
  const rows: DigestRow[] = [
    { tag: 'joinEvent', code: 'P0001', message: 'Verify your email', fatal: false, occurrences: 12, users: 5 },
    { tag: 'unhandled', code: null, message: 'boom', fatal: true, occurrences: 2, users: 1 },
  ];

  it('returns null when there is nothing to report', () => {
    expect(formatDigestMail([], '2026-08-02')).toBeNull();
  });

  it('totals occurrences in the subject', () => {
    expect(formatDigestMail(rows, '2026-08-02')!.subject).toContain('14 errors');
  });

  it('calls out crash types in the subject', () => {
    expect(formatDigestMail(rows, '2026-08-02')!.subject).toContain('1 crash type');
  });

  it('omits the crash note when there are none', () => {
    const clean = [rows[0]];
    expect(formatDigestMail(clean, '2026-08-02')!.subject).not.toContain('crash');
  });

  it('lists each group with counts', () => {
    const { text } = formatDigestMail(rows, '2026-08-02')!;
    expect(text).toContain('12x  5 user(s)  [P0001]  joinEvent: Verify your email');
    expect(text).toContain('[CRASH]  unhandled: boom');
  });

  it('uses a singular subject for one error', () => {
    const one: DigestRow[] = [{ ...rows[0], occurrences: 1, fatal: false }];
    expect(formatDigestMail(one, '2026-08-02')!.subject).toContain('1 error in');
  });
});
